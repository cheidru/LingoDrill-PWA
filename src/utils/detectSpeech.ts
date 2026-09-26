// utils/detectSpeech.ts
//
// Speech detection with Silero VAD, run in a Web Worker (vadWorker.ts).
//
// WHY A WORKER: onnxruntime runs the model synchronously, one ~1 ms inference
// per 96 ms frame, so on the main thread a 30-minute file froze the page solid
// for ~25 s on desktop and for minutes on a phone — no progress, no taps, and
// mobile browsers offering to kill the "unresponsive" tab. It is Auto-detect
// speech and the first half of Trim silence on a file with no fragments. The
// worker takes the same time but the page stays live and shows progress.
//
// If the worker cannot start (no Worker support, a browser that will not
// importScripts the CDN builds), detection falls back to the main thread.

export interface SpeechSegment {
  start: number  // в секундах
  end: number    // в секундах
}

// Типы для глобальных объектов загружаемых из CDN
interface VadGlobal {
  NonRealTimeVAD: {
    new: (options: Record<string, unknown>) => Promise<{
      run: (audio: Float32Array, sampleRate: number) => AsyncIterable<{ audio: Float32Array; start: number; end: number }>
    }>
  }
}

declare global {
  interface Window {
    ort?: unknown
    vad?: VadGlobal
  }
}

const ORT_DIST = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/"
const VAD_DIST = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/"
const ORT_SCRIPT = `${ORT_DIST}ort.wasm.min.js`
const VAD_SCRIPT = `${VAD_DIST}bundle.min.js`

const VAD_OPTIONS = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  minSpeechMs: 100,
  preSpeechPadMs: 30,
  redemptionMs: 250,
}

/** Messages the page sends to vadWorker.ts. */
export type VadWorkerRequest =
  | {
      type: "init"
      ortScriptUrl: string
      vadScriptUrl: string
      /** Directory of the onnxruntime .wasm/.mjs files. */
      wasmPaths: string
      modelUrl: string
      options: Record<string, unknown>
    }
  | { type: "run"; samples: Float32Array; sampleRate: number }

/** Messages vadWorker.ts sends back. Times are in milliseconds. */
export type VadWorkerMessage =
  | { type: "ready" }
  | { type: "segment"; start: number; end: number }
  | { type: "done" }
  | { type: "error"; stage: "init" | "run"; message: string }

/** The worker could not be brought up; the samples are still ours to use. */
class VadWorkerUnavailable extends Error {}

/**
 * Определяет фрагменты с речью через Silero VAD.
 *
 * Принимает моно-PCM, а не AudioBuffer: длинный файл декодируется в моно 16 кГц
 * (см. decodeMonoPcm), чтобы не аллоцировать многогигабайтный AudioBuffer.
 *
 * The samples are transferred to the worker, so `channelData` is detached
 * (length 0) once this returns — callers must not read it afterwards.
 */
export async function detectSpeechSegments(
  channelData: Float32Array,
  sampleRate: number,
  onProgress?: (progress: number) => void,
): Promise<SpeechSegment[]> {
  let segments: SpeechSegment[]
  try {
    segments = await detectInWorker(channelData, sampleRate, onProgress)
  } catch (err) {
    if (!(err instanceof VadWorkerUnavailable)) throw err
    console.warn("[detectSpeech] VAD worker unavailable, running on the main thread:", err.message)
    segments = await detectOnMainThread(channelData, sampleRate, onProgress)
  }
  onProgress?.(1)
  return segments
}

function detectInWorker(
  channelData: Float32Array,
  sampleRate: number,
  onProgress?: (progress: number) => void,
): Promise<SpeechSegment[]> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL("./vadWorker.ts", import.meta.url))
    } catch (err) {
      reject(new VadWorkerUnavailable(String(err)))
      return
    }

    const durationMs = (channelData.length / sampleRate) * 1000
    const segments: SpeechSegment[] = []
    let running = false

    const finish = (err: Error | null) => {
      worker.terminate()
      if (err) reject(err)
      else resolve(segments)
    }

    worker.onmessage = (event: MessageEvent<VadWorkerMessage>) => {
      const msg = event.data
      switch (msg.type) {
        case "ready": {
          running = true
          const run: VadWorkerRequest = { type: "run", samples: channelData, sampleRate }
          worker.postMessage(run, [channelData.buffer])
          break
        }
        case "segment":
          segments.push({ start: msg.start / 1000, end: msg.end / 1000 })
          if (durationMs > 0) onProgress?.(Math.min(1, msg.end / durationMs))
          break
        case "done":
          finish(null)
          break
        case "error":
          finish(msg.stage === "init" ? new VadWorkerUnavailable(msg.message) : new Error(msg.message))
          break
      }
    }

    // A script that fails to load or parse lands here rather than in onmessage.
    worker.onerror = (event) => {
      event.preventDefault()
      const message = event.message || "VAD worker failed"
      finish(running ? new Error(message) : new VadWorkerUnavailable(message))
    }

    const init: VadWorkerRequest = {
      type: "init",
      ortScriptUrl: ORT_SCRIPT,
      vadScriptUrl: VAD_SCRIPT,
      wasmPaths: ORT_DIST,
      modelUrl: `${VAD_DIST}silero_vad_legacy.onnx`,
      options: VAD_OPTIONS,
    }
    worker.postMessage(init)
  })
}

// ---------------------------------------------------------------------------
// Main-thread fallback — the original implementation
// ---------------------------------------------------------------------------

// Загружаем VAD скрипты из CDN динамически
let vadLoaded = false

async function ensureVadLoaded(): Promise<void> {
  if (vadLoaded) return

  if (!window.ort) {
    await loadScript(ORT_SCRIPT)
  }

  if (!window.vad) {
    await loadScript(VAD_SCRIPT)
  }

  vadLoaded = true
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

async function detectOnMainThread(
  channelData: Float32Array,
  sampleRate: number,
  onProgress?: (progress: number) => void,
): Promise<SpeechSegment[]> {
  await ensureVadLoaded()

  if (!window.vad?.NonRealTimeVAD) {
    throw new Error("VAD library not loaded")
  }

  const detector = await window.vad.NonRealTimeVAD.new({
    ...VAD_OPTIONS,
    onnxWASMBasePath: ORT_DIST,
    baseAssetPath: VAD_DIST,
  })

  const segments: SpeechSegment[] = []
  const totalSamples = channelData.length

  for await (const { start, end } of detector.run(channelData, sampleRate)) {
    segments.push({
      start: start / 1000,
      end: end / 1000,
    })

    const processedSamples = Math.min((end / 1000) * sampleRate, totalSamples)
    if (onProgress) {
      onProgress(processedSamples / totalSamples)
    }
  }

  return segments
}
