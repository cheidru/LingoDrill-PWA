// app/components/OperationProgressIndicator.tsx
//
// Progress of a long editor operation (see utils/operationProgress.ts), in two
// places: a compact bar beside the action buttons, and a pop-up with the
// up-front estimate, the current step and the time left. The pop-up opens on
// its own when the run is expected to be long (or turns out to be), can be
// hidden to keep working, and the compact bar brings it back.
//
// Polls the tracker on its own timer, so the page re-renders only when an
// operation starts or ends — not on every progress callback.

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useT, type TFunc } from "../../utils/i18n"
import type { OperationProgress, OperationSnapshot } from "../../utils/operationProgress"

/** Runs expected to take at least this long open the pop-up straight away. */
const LENGTHY_ESTIMATE_SEC = 8
/** Any run still going after this long opens it too — the estimate was off. */
const OPEN_AFTER_SEC = 3
const TICK_MS = 500
/** Share of each new time-left reading taken per tick, so it doesn't jitter. */
const REMAINING_SMOOTHING = 0.35

interface Props {
  op: OperationProgress
  /** Short running label for the action bar ("Trimming…"). */
  label: string
}

function useSnapshot(op: OperationProgress): OperationSnapshot {
  const [snap, setSnap] = useState(() => op.snapshot())
  const smoothedRef = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      const next = op.snapshot()
      const prev = smoothedRef.current
      const remainingSec = prev === null
        ? next.remainingSec
        : prev + (next.remainingSec - prev) * REMAINING_SMOOTHING
      smoothedRef.current = remainingSec
      setSnap({ ...next, remainingSec })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [op])

  return snap
}

/** "25 s" / "4 min" / "1 h 20 min" — rounded, since it is an estimate. */
function formatApprox(sec: number, t: TFunc): string {
  if (sec < 60) return t("op.seconds", { n: Math.max(5, Math.ceil(sec / 5) * 5) })
  const totalMin = Math.round(sec / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} ${t("common.minutesShort")}`
  return m === 0
    ? `${h} ${t("common.hoursShort")}`
    : `${h} ${t("common.hoursShort")} ${m} ${t("common.minutesShort")}`
}

/** "1:05" / "1:02:05" — elapsed time, exact. */
function formatClock(sec: number): string {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, "0")
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

function remainingText(sec: number, t: TFunc): string {
  return sec < 10 ? t("op.leftFew") : t("op.left", { time: formatApprox(sec, t) })
}

export function OperationProgressIndicator({ op, label }: Props) {
  const t = useT()
  const snap = useSnapshot(op)
  const [hidden, setHidden] = useState(false)

  const pct = Math.floor(snap.progress * 100)
  const left = remainingText(snap.remainingSec, t)
  const lengthy = op.estimatedTotalSec >= LENGTHY_ESTIMATE_SEC || snap.elapsedSec >= OPEN_AFTER_SEC
  const stage = snap.stageCount > 1
    ? t("op.step", { i: snap.stageIndex + 1, n: snap.stageCount, stage: snap.stageLabel })
    : snap.stageLabel

  return (
    <>
      <button type="button" className="op-inline" onClick={() => setHidden(false)}
        title={t("op.showProgress")}>
        <span className="op-inline__label">{label} {pct}%</span>
        <progress className="op-progress-bar op-inline__bar" value={pct} max={100} />
        <span className="op-inline__left">{left}</span>
      </button>

      {lengthy && !hidden && createPortal(
        <div className="modal-overlay" onClick={() => setHidden(true)}>
          <div className="modal-box op-progress" role="dialog" aria-modal="true"
            aria-labelledby="op-progress-title" onClick={e => e.stopPropagation()}>
            <h3 id="op-progress-title" className="modal-box__title">{op.title}</h3>
            <p className="op-progress__estimate">
              {t("op.estimate", { time: formatApprox(op.estimatedTotalSec, t) })}
            </p>
            <p className="op-progress__stage">{stage}</p>
            <progress className="op-progress-bar" value={pct} max={100} aria-label={op.title} />
            <div className="op-progress__stats">
              <span className="op-progress__pct">{pct}%</span>
              <span>{left}</span>
            </div>
            <p className="op-progress__elapsed">{t("op.elapsed", { time: formatClock(snap.elapsedSec) })}</p>
            <p className="op-progress__hint">{t("op.hint")}</p>
            <div className="modal-actions">
              <button onClick={() => setHidden(true)}>{t("op.hide")}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
