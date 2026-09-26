// utils/operationProgress.ts
//
// Overall progress and time-left estimate for the editor's long operations
// (auto-detect, trim silence, normalize, maximize).
//
// Each operation is a chain of stages — Trim silence on a file with no
// fragments is decode → VAD → trim → save — and each stage reports its own
// 0..1. Shown raw, that number ran to 100% and dropped back to 0 at every stage
// boundary, and sat still through the steps that report nothing (the VAD model
// load, the IndexedDB write), which read as a hung app on a phone.
//
// Here every stage gets an expected duration, `rate × audio seconds + overhead`,
// which weights it inside one 0..100% bar and gives the up-front estimate. The
// rates start from a rough per-device guess and are corrected after every run
// from what the stage actually took (localStorage, so per device), so the
// estimate is close from the second run on. While running, the time left leans
// on the observed speed more the further a stage gets.

export type OpStageKey = "decode" | "vad" | "trim" | "normalize" | "maximize" | "save"

/** How the source audio is read: MP3 is decoded in chunks, WAV read directly. */
export type OpAudioFormat = "mp3" | "wav" | "other"

interface StageCost {
  /** Seconds of work per second of audio. */
  rate: number
  /** Fixed seconds on top — library/model loading, context setup. */
  overhead: number
}

/*
 * First-run guesses, before this device has measured anything. Rough on
 * purpose: the phone VAD figure comes from "minutes for a 30-minute file", the
 * desktop one from ~25 s for the same file.
 */
const DEFAULT_COSTS: Record<"mobile" | "desktop", Record<OpStageKey, StageCost>> = {
  mobile: {
    decode: { rate: 0.012, overhead: 0.5 },
    vad: { rate: 0.1, overhead: 4 },
    trim: { rate: 0.006, overhead: 0.5 },
    normalize: { rate: 0.012, overhead: 0.5 },
    maximize: { rate: 0.012, overhead: 0.5 },
    save: { rate: 0.002, overhead: 0.5 },
  },
  desktop: {
    decode: { rate: 0.003, overhead: 0.2 },
    vad: { rate: 0.015, overhead: 2 },
    trim: { rate: 0.0025, overhead: 0.2 },
    normalize: { rate: 0.004, overhead: 0.2 },
    maximize: { rate: 0.004, overhead: 0.2 },
    save: { rate: 0.0005, overhead: 0.2 },
  },
}

const KEY_RATES = "lingodrill.opRates"

/** Shorter files are all overhead and would teach a meaningless rate. */
const MIN_AUDIO_SEC_TO_LEARN = 60

/** Weight of a new measurement against the stored rate. */
const LEARN_WEIGHT = 0.5

/** Below this much measured stage progress the observed speed is too noisy to use. */
const MIN_OBSERVED_PROGRESS = 0.05

/** Measured stage progress at which the observed speed fully replaces the prediction. */
const FULL_TRUST_PROGRESS = 0.3

/**
 * While a stage has reported nothing, its countdown stops at this share of its
 * prediction rather than at zero: overrunning the guess means the guess was
 * low, not that the stage is about to end.
 */
const SILENT_STAGE_FLOOR = 0.3

function isMobileDevice(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("mobile")
}

function rateKey(stage: OpStageKey, format: OpAudioFormat): string {
  return `${stage}:${format}`
}

function loadRates(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY_RATES) ?? "{}")
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function learnRate(stage: OpStageKey, format: OpAudioFormat, measured: number): void {
  if (!Number.isFinite(measured) || measured < 0) return
  const rates = loadRates()
  const key = rateKey(stage, format)
  const old = rates[key]
  rates[key] = typeof old === "number" && Number.isFinite(old)
    ? old * (1 - LEARN_WEIGHT) + measured * LEARN_WEIGHT
    : measured
  try {
    localStorage.setItem(KEY_RATES, JSON.stringify(rates))
  } catch {
    // Storage full or blocked — the estimate just stays on the defaults.
  }
}

/** Which reader the audio will go through, from the blob's MIME type. */
export function audioFormatOf(blob: Blob): OpAudioFormat {
  const type = blob.type.toLowerCase()
  if (type.includes("wav")) return "wav"
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3"
  return "other"
}

export interface OpStagePlan {
  key: OpStageKey
  label: string
}

interface Stage extends OpStagePlan {
  cost: StageCost
  expectedSec: number
  /** Seconds it actually took, once finished. */
  actualSec: number | null
}

export interface OperationSnapshot {
  /** Whole-operation progress, 0..1. */
  progress: number
  elapsedSec: number
  /** Best current guess at the time still needed. */
  remainingSec: number
  /** Up-front estimate of the whole run, fixed at the start. */
  estimatedTotalSec: number
  stageIndex: number
  stageCount: number
  stageLabel: string
}

let nextOperationId = 1

/**
 * One running operation. The page creates it, passes `setProgress` to the
 * stage's worker as its progress callback, calls `startStage` between stages
 * and `finish` on success. Views poll `snapshot()` on their own timer, so a
 * progress callback firing hundreds of times never re-renders the page.
 */
export class OperationProgress {
  /** Distinguishes runs, e.g. as a React key. */
  readonly id = nextOperationId++
  readonly title: string
  readonly estimatedTotalSec: number
  private readonly stages: Stage[]
  private readonly audioSec: number
  private readonly format: OpAudioFormat
  private readonly startedAt = performance.now()
  private stageIndex = 0
  private stageStartedAt = this.startedAt
  private stageProgress = 0
  /**
   * When, and at what progress, the current stage first reported. Speed is
   * measured from here, not from the stage start: VAD spends its first seconds
   * loading the model, and counting those as work made the first reading
   * several times too slow, so the time left jumped up just after it began.
   */
  private firstReport: { at: number; progress: number } | null = null

  constructor(title: string, plan: OpStagePlan[], audioSec: number, format: OpAudioFormat) {
    this.title = title
    this.audioSec = Math.max(0, audioSec)
    this.format = format

    const defaults = DEFAULT_COSTS[isMobileDevice() ? "mobile" : "desktop"]
    const learned = loadRates()
    this.stages = plan.map(({ key, label }) => {
      const stored = learned[rateKey(key, format)]
      const cost: StageCost = {
        rate: typeof stored === "number" && Number.isFinite(stored) ? stored : defaults[key].rate,
        overhead: defaults[key].overhead,
      }
      return { key, label, cost, expectedSec: cost.rate * this.audioSec + cost.overhead, actualSec: null }
    })
    this.estimatedTotalSec = this.stages.reduce((sum, s) => sum + s.expectedSec, 0)
  }

  /** Progress of the current stage, 0..1. Stable, so it can go straight into callbacks. */
  setProgress = (p: number): void => {
    if (!Number.isFinite(p)) return
    this.stageProgress = Math.min(1, Math.max(this.stageProgress, p))
    if (!this.firstReport && this.stageProgress > 0) {
      this.firstReport = { at: performance.now(), progress: this.stageProgress }
    }
  }

  /** Move on to `key`, closing every stage before it. Stages missing from the plan are ignored. */
  startStage(key: OpStageKey): void {
    const target = this.stages.findIndex((s, i) => i >= this.stageIndex && s.key === key)
    if (target < 0) return
    while (this.stageIndex < target) this.closeStage()
  }

  /** The run succeeded: close what is still open and learn from the timings. */
  finish(): void {
    while (this.stageIndex < this.stages.length) this.closeStage()
    if (this.audioSec < MIN_AUDIO_SEC_TO_LEARN) return
    for (const s of this.stages) {
      if (s.actualSec === null) continue
      learnRate(s.key, this.format, Math.max(0, s.actualSec - s.cost.overhead) / this.audioSec)
    }
  }

  private closeStage(): void {
    const now = performance.now()
    this.stages[this.stageIndex].actualSec = (now - this.stageStartedAt) / 1000
    this.stageIndex++
    this.stageStartedAt = now
    this.stageProgress = 0
    this.firstReport = null
  }

  snapshot(): OperationSnapshot {
    const now = performance.now()
    const elapsedSec = (now - this.startedAt) / 1000
    const count = this.stages.length
    const index = Math.min(this.stageIndex, count - 1)
    const total = this.estimatedTotalSec
    const cur = this.stages[index]
    const done = this.stageIndex >= count
    const q = done ? 1 : this.stageProgress
    const inStageSec = done ? 0 : (now - this.stageStartedAt) / 1000

    // Share of the bar: finished stages in full, the current one by its progress.
    let doneExpected = 0
    let doneActual = 0
    for (let i = 0; i < index; i++) {
      doneExpected += this.stages[i].expectedSec
      doneActual += this.stages[i].actualSec ?? 0
    }
    const progress = total > 0 ? Math.min(1, (doneExpected + cur.expectedSec * q) / total) : 0

    // How much slower (>1) or faster (<1) than predicted this device is running.
    let speed = doneExpected > 0 ? doneActual / doneExpected : 1
    const priorCur = cur.expectedSec * speed * (1 - q)
    let remainingCur: number
    const first = done ? null : this.firstReport
    const measured = first ? q - first.progress : 0
    const workSec = cur.cost.rate * this.audioSec
    if (first && measured >= MIN_OBSERVED_PROGRESS && workSec > 0) {
      const secPerUnit = (now - first.at) / 1000 / measured
      const trust = Math.min(1, measured / FULL_TRUST_PROGRESS)
      remainingCur = secPerUnit * (1 - q) * trust + priorCur * (1 - trust)
      speed = speed * (1 - trust) + (secPerUnit / workSec) * trust
    } else {
      // Not enough reported yet (model loading, a write with no callback):
      // count the prediction down, but not below a floor.
      remainingCur = Math.max(cur.expectedSec * speed - inStageSec, priorCur * SILENT_STAGE_FLOOR)
    }

    let remainingLater = 0
    for (let i = index + 1; i < count; i++) remainingLater += this.stages[i].expectedSec * speed

    return {
      progress,
      elapsedSec,
      remainingSec: done ? 0 : remainingCur + remainingLater,
      estimatedTotalSec: total,
      stageIndex: index,
      stageCount: count,
      stageLabel: cur.label,
    }
  }
}
