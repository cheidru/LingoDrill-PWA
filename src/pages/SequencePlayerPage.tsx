// pages/SequencePlayerPage.tsx
//
// Sequence Player page — navigated to from Fragment Library play button.
// Displays:
// - Page header with sequence label and audio file name
// - Play-all button for consecutive playback
// - Fragment list with expandable control panels
// - Fragment control panel: play, pause, stop, infinite rewind, disable, repeat, speed, nav, close
// - Subtitle display for selected fragment

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useSequences } from "../app/hooks/useSequences"
import { useSubtitles } from "../app/hooks/useSubtitles"
import { useVocabularies } from "../app/hooks/useVocabularies"
import { useSharedAudioEngine } from "../app/hooks/useSharedAudioEngine"
import type { Sequence, SequenceFragment } from "../core/domain/types"
import { sequenceAudioId } from "../core/domain/sequenceAudio"
import type { PlayableFragment } from "../core/audio/audioEngine"
import { VolumeControl } from "../app/components/VolumeControl"
import { setLastSequence, getFragmentGap } from "../utils/settings"
import {
  setMediaMetadata,
  setActionHandlers,
  setPlaybackState,
  clearMediaSession,
} from "../infrastructure/audio/mediaSession"

// --- Utility ---
import { useT } from "../utils/i18n"

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec % 1) * 10)
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`
}

// --- Icons ---
// Control panel icons use "1em" so CSS font-size on the button controls their size.
// PlayAllIcon keeps an explicit px size since it's used outside the control panel.
const PlayIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
)
const PauseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
)
const StopIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
)
const InfiniteRewindIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.828 9.172a4 4 0 1 0 0 5.656a10 10 0 0 0 2.172 -2.828a10 10 0 0 1 2.172 -2.828a4 4 0 1 1 0 5.656a10 10 0 0 1 -2.172 -2.828a10 10 0 0 0 -2.172 -2.828" />
  </svg>
)
const SkipIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><line x1="5.7" y1="5.7" x2="18.3" y2="18.3" />
  </svg>
)
const EditIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)
const PrevIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
)
const NextIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
)
const CloseIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const PlayAllIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4v16l8.5-8L4 4zm9 0v16l8.5-8L13 4z" />
  </svg>
)
const SpeedIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 4C6.48 4 2 8.48 2 14h3a7 7 0 0 1 14 0h3c0-5.52-4.48-10-10-10z" />
    <path d="M14.5 15c0 1.38-1.12 2.5-2.5 2.5S9.5 16.38 9.5 15c0-1.16.79-2.13 1.86-2.41l5.92-5.18-3.92 6.65c.69.41 1.14 1.17 1.14 2.04z" />
  </svg>
)
// Replay / rewind-count icon: circular arrow with a play triangle inside.
const RewindCountIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    <path d="M10.5 10v5L15 12.5z" />
  </svg>
)

// Focus loop icon: brackets around a filled span.
const FocusIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4H4v16h3" /><path d="M17 4h3v16h-3" />
    <rect x="9" y="10" width="6" height="4" fill="currentColor" stroke="none" />
  </svg>
)

/* A temporary sub-range of a fragment. Session-only, never saved. While the
   fragment's Focus button is on it replaces the fragment's bounds everywhere,
   Play all included; switched off, the range is kept but not played. */
type FocusRange = { start: number; end: number }
const FOCUS_MIN = 0.3

/** Orders a/b, keeps them inside the fragment and at least FOCUS_MIN apart. */
function normalizeFocus(a: number, b: number, fragStart: number, fragEnd: number): FocusRange {
  const clamp = (v: number) => Math.min(fragEnd, Math.max(fragStart, v))
  let start = clamp(Math.min(a, b))
  let end = clamp(Math.max(a, b))
  if (end - start < FOCUS_MIN) {
    end = Math.min(fragEnd, start + FOCUS_MIN)
    start = Math.max(fragStart, end - FOCUS_MIN)
  }
  return { start, end }
}

/** First fragment that is not switched off, or null when every one is. */
function findFirstEnabled(seq: Sequence, disabled: Record<number, boolean>): number | null {
  for (let i = 0; i < seq.fragments.length; i++) {
    if (!disabled[i]) return i
  }
  return null
}

// --- Subtitle display for a fragment ---
function SubtitleDisplay({
  fragment, subtitleFiles,
}: {
  fragment: SequenceFragment
  subtitleFiles: { id: string; content: string; name: string }[]
}) {
  if (!fragment.subtitles || fragment.subtitles.length === 0) return null

  return (
    <div className="sp-subtitle-display">
      {fragment.subtitles.map((sub, i) => {
        const file = subtitleFiles.find(sf => sf.id === sub.subtitleFileId)
        const text = file ? file.content.slice(sub.charStart, sub.charEnd) : "(file not found)"
        return (
          <div key={i} style={{ marginBottom: i < fragment.subtitles.length - 1 ? 6 : 0 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{sub.subtitleFileName}</div>
            <div style={{ fontSize: "var(--sub-font-size, 14px)", whiteSpace: "pre-wrap", lineHeight: 1.5, color: "var(--color-text)" }}>{text}</div>
          </div>
        )
      })}
    </div>
  )
}

// --- Vocabulary display for a fragment (collapsible, collapsed by default) ---
function VocabularyDisplay({
  fragment, vocabularyFiles,
}: {
  fragment: SequenceFragment
  vocabularyFiles: { id: string; content: string; name: string }[]
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const vocabularies = fragment.vocabularies ?? []
  if (vocabularies.length === 0) return null

  return (
    <div className="sp-vocab-display">
      <button
        type="button"
        className="sp-vocab-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={`sp-vocab-toggle__chevron${open ? " sp-vocab-toggle__chevron--open" : ""}`}>▶</span>
        <span>{t("player.vocab")}</span>
        <span className="sp-vocab-toggle__count">{vocabularies.length}</span>
      </button>
      {open && (
        <div className="sp-vocab-content">
          {vocabularies.map((v, i) => {
            const file = vocabularyFiles.find(vf => vf.id === v.vocabularyFileId)
            const text = file ? file.content.slice(v.charStart, v.charEnd) : "(file not found)"
            return (
              <div key={i} style={{ marginBottom: i < vocabularies.length - 1 ? 6 : 0 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{v.vocabularyFileName}</div>
                <div style={{ fontSize: "var(--sub-font-size, 14px)", whiteSpace: "pre-wrap", lineHeight: 1.5, color: "var(--color-text)" }}>{text}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Focus strip: pick a temporary A–B range inside the fragment ---
function FocusStrip({
  fragStart,
  fragEnd,
  range,
  currentTime,
  showCursor,
  onChange,
  onRestart,
}: {
  fragStart: number
  fragEnd: number
  range: FocusRange | null
  currentTime: number
  /** This fragment is the one playing or paused, so the playhead means something. */
  showCursor: boolean
  /** restart: replay the focus now if this fragment is playing. */
  onChange: (range: FocusRange | null, restart: boolean) => void
  onRestart: () => void
}) {
  const t = useT()
  const start = range?.start ?? fragStart
  const end = range?.end ?? fragEnd
  const span = Math.max(0.001, fragEnd - fragStart)
  const now = Math.min(fragEnd, Math.max(fragStart, currentTime))

  const set = (a: number, b: number) =>
    onChange(normalizeFocus(a, b, fragStart, fragEnd), false)

  return (
    <div className="sp-focus-strip">
      <div className="sp-focus-strip__head">
        <span className="sp-focus-strip__title">{t("player.focus.title")}</span>
        <span className="sp-focus-strip__readout">
          {range
            ? `${formatTime(start)} – ${formatTime(end)} · ${(end - start).toFixed(1)}s`
            : t("player.focus.none")}
        </span>
        {range && (
          <button
            className="sp-ctrl-btn sp-focus-strip__clear"
            onClick={() => onChange(null, true)}
            title={t("player.focus.clear")}
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="sp-focus-range">
        <div className="sp-focus-range__track" />
        <div
          className="sp-focus-range__fill"
          style={{ left: `${((start - fragStart) / span) * 100}%`, width: `${((end - start) / span) * 100}%` }}
        />
        {showCursor && (
          <div className="sp-focus-range__cursor" style={{ left: `${((now - fragStart) / span) * 100}%` }} />
        )}
        <input
          type="range"
          className="sp-focus-range__input"
          min={fragStart}
          max={fragEnd}
          step={0.05}
          value={start}
          onChange={e => set(Math.min(parseFloat(e.target.value), end - FOCUS_MIN), end)}
          onPointerUp={onRestart}
          onKeyUp={onRestart}
          aria-label={t("player.focus.startLabel")}
        />
        <input
          type="range"
          className="sp-focus-range__input"
          min={fragStart}
          max={fragEnd}
          step={0.05}
          value={end}
          onChange={e => set(start, Math.max(parseFloat(e.target.value), start + FOCUS_MIN))}
          onPointerUp={onRestart}
          onKeyUp={onRestart}
          aria-label={t("player.focus.endLabel")}
        />
      </div>
    </div>
  )
}

// --- Fragment control panel ---
function FragmentControlPanel({
  fragmentIndex,
  totalFragments,
  isPlaying,
  isPaused,
  isInfiniteRewind,
  localRepeat,
  fragmentSpeed,
  isDisabled,
  onPlay,
  onPause,
  onStop,
  onInfiniteRewind,
  onToggleDisabled,
  onPrev,
  onNext,
  onClose,
  onEdit,
  onRepeatChange,
  onFragmentSpeedChange,
  fragStart,
  fragEnd,
  focusRange,
  currentTime,
  isCurrentFragment,
  isFocusOn,
  onFocusToggle,
  onFocusChange,
  onFocusRestart,
}: {
  fragStart: number
  fragEnd: number
  focusRange: FocusRange | null
  currentTime: number
  isCurrentFragment: boolean
  isFocusOn: boolean
  onFocusToggle: () => void
  onFocusChange: (range: FocusRange | null, restart: boolean) => void
  onFocusRestart: () => void
  fragmentIndex: number
  totalFragments: number
  isPlaying: boolean
  isPaused: boolean
  isInfiniteRewind: boolean
  localRepeat: number
  fragmentSpeed: number
  isDisabled: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onInfiniteRewind: () => void
  onToggleDisabled: () => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onEdit: () => void
  onRepeatChange: (value: number) => void
  onFragmentSpeedChange: (value: number) => void
}) {
  const t = useT()
  const [speedModalOpen, setSpeedModalOpen] = useState(false)
  const [rewindModalOpen, setRewindModalOpen] = useState(false)
  const isMobile = document.documentElement.classList.contains("mobile")
  return (
    <div className="sp-control-panel">
      {isFocusOn && (
        <FocusStrip
          fragStart={fragStart}
          fragEnd={fragEnd}
          range={focusRange}
          currentTime={currentTime}
          showCursor={isCurrentFragment}
          onChange={onFocusChange}
          onRestart={onFocusRestart}
        />
      )}
      <div className="sp-control-row">
        {/* Play / Pause */}
        {isPlaying ? (
          <button className="sp-ctrl-btn" onClick={onPause} title={t("common.pause")}>
            <PauseIcon />
          </button>
        ) : (
          <button className="sp-ctrl-btn" onClick={onPlay} title={isPaused ? t("common.resume") : t("common.play")}>
            <PlayIcon />
          </button>
        )}

        {/* Stop */}
        <button className="sp-ctrl-btn" onClick={onStop} title={t("common.stop")}>
          <StopIcon />
        </button>

        {/* Disable/enable for play-all */}
        <button
          className={`sp-ctrl-btn ${isDisabled ? "sp-ctrl-btn--disabled" : ""}`}
          onClick={onToggleDisabled}
          title={isDisabled ? t("player.ctrl.include") : t("player.ctrl.exclude")}
        >
          <SkipIcon />
        </button>

        {/* Separator */}
        <div className="sp-ctrl-separator" />

        {/* Rewind count — opens a modal to pick the repeat count */}
        <button
          className="sp-ctrl-btn sp-speed-btn sp-rewind-btn"
          onClick={() => setRewindModalOpen(true)}
          title={t("player.ctrl.rewindCount", { n: localRepeat })}
        >
          <RewindCountIcon />
          <span className="sp-speed-btn__value">×{localRepeat}</span>
        </button>

        {/* Infinite rewind — sits next to the playout count */}
        <button
          className={`sp-ctrl-btn ${isInfiniteRewind ? "sp-ctrl-btn--active" : ""}`}
          onClick={onInfiniteRewind}
          title={isInfiniteRewind ? t("player.ctrl.infiniteOn") : t("player.ctrl.infiniteOff")}
        >
          <InfiniteRewindIcon />
        </button>

        {/* Focus loop — on: plays the slider's range and shows the slider; off: range kept, not played */}
        <button
          className={`sp-ctrl-btn ${isFocusOn ? "sp-ctrl-btn--active" : ""}`}
          onClick={onFocusToggle}
          aria-pressed={isFocusOn}
          title={isFocusOn ? t("player.ctrl.focusOn") : t("player.ctrl.focusOff")}
        >
          <FocusIcon />
        </button>

        {/* Speed (controls this fragment's playback speed; saved per fragment) */}
        {isMobile ? (
          <button
            className="sp-ctrl-btn sp-speed-btn"
            onClick={() => setSpeedModalOpen(true)}
            title={t("player.ctrl.fragmentSpeed", { v: fragmentSpeed.toFixed(2) })}
          >
            <SpeedIcon />
            <span className="sp-speed-btn__value">{fragmentSpeed.toFixed(2)}×</span>
          </button>
        ) : (
          <label className="sp-speed-slider" title={t("player.ctrl.speedSlider")}>
            <span className="sp-speed-slider__icon"><SpeedIcon /></span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={fragmentSpeed}
              onChange={e => onFragmentSpeedChange(parseFloat(e.target.value))}
              className="sp-speed-slider__input"
            />
            <span className="sp-speed-slider__value">{fragmentSpeed.toFixed(2)}×</span>
          </label>
        )}

        {/* Separator */}
        <div className="sp-ctrl-separator" />

        {/* Prev / Next */}
        <button
          className="sp-ctrl-btn"
          onClick={onPrev}
          disabled={fragmentIndex <= 0}
          title={t("player.ctrl.prev")}
        >
          <PrevIcon />
        </button>
        <button
          className="sp-ctrl-btn"
          onClick={onNext}
          disabled={fragmentIndex >= totalFragments - 1}
          title={t("player.ctrl.next")}
        >
          <NextIcon />
        </button>

        {/* Edit in Fragment Editor */}
        <button className="sp-ctrl-btn" onClick={onEdit} title={t("player.ctrl.edit")}>
          <EditIcon />
        </button>

        {/* Close */}
        <button className="sp-ctrl-btn sp-ctrl-btn--close" onClick={onClose} title={t("player.ctrl.close")}>
          <CloseIcon />
        </button>
      </div>

      {speedModalOpen && (
        <div className="modal-overlay" onClick={() => setSpeedModalOpen(false)}>
          <div className="modal-box sp-speed-modal" onClick={e => e.stopPropagation()}>
            <h3 className="sp-speed-modal__title">{t("player.speedModal")}</h3>
            <div className="sp-speed-modal__value">{fragmentSpeed.toFixed(2)}×</div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={fragmentSpeed}
              onChange={e => onFragmentSpeedChange(parseFloat(e.target.value))}
              className="sp-speed-modal__input"
            />
            <div className="sp-speed-modal__range">
              <span>0.5×</span>
              <span>1.5×</span>
            </div>
            <div className="modal-actions">
              <button className="sp-ctrl-btn" onClick={() => onFragmentSpeedChange(1)} title={t("player.resetSpeed")} style={{ width: "auto", padding: "0 16px" }}>
                {t("common.reset")}
              </button>
              <button onClick={() => setSpeedModalOpen(false)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}

      {rewindModalOpen && (
        <div className="modal-overlay" onClick={() => setRewindModalOpen(false)}>
          <div className="modal-box sp-speed-modal sp-rewind-modal" onClick={e => e.stopPropagation()}>
            <h3 className="sp-speed-modal__title">{t("player.rewindModal")}</h3>
            <div className="sp-speed-modal__value">×{localRepeat}</div>
            <div className="sp-rewind-stepper">
              <button
                className="sp-ctrl-btn"
                onClick={() => onRepeatChange(Math.max(1, localRepeat - 1))}
                disabled={localRepeat <= 1}
                title={t("player.decrease")}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={99}
                step={1}
                value={localRepeat}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 1) onRepeatChange(Math.min(99, v))
                }}
                className="sp-ctrl-input sp-rewind-stepper__input"
              />
              <button
                className="sp-ctrl-btn"
                onClick={() => onRepeatChange(Math.min(99, localRepeat + 1))}
                disabled={localRepeat >= 99}
                title={t("player.increase")}
              >
                +
              </button>
            </div>
            <div className="modal-actions">
              <button className="sp-ctrl-btn" onClick={() => onRepeatChange(1)} title={t("player.resetRewind")} style={{ width: "auto", padding: "0 16px" }}>
                Reset
              </button>
              <button onClick={() => setRewindModalOpen(false)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main page ---
export function SequencePlayerPage() {
  return <SequencePlayerPageInner />
}

function SequencePlayerPageInner() {
  const { id: audioId, seqId } = useParams<{ id: string; seqId: string }>()
  const navigate = useNavigate()
  const t = useT()

  const {
    files,
    loadById, playFragment, pause, play, stop,
    isPlaying, isPaused, setOnEnded, currentTime,
    volume, setVolume,
  } = useSharedAudioEngine()

  const { sequences, updateSequence } = useSequences(audioId ?? null)
  const { subtitleFiles } = useSubtitles(audioId ?? null)
  const { vocabularyFiles } = useVocabularies(audioId ?? null)

  // Find the sequence
  const sequence = sequences.find(s => s.id === seqId) ?? null

  // Track last played sequence for the "Last sequence" start page setting
  useEffect(() => {
    if (audioId && seqId) setLastSequence({ audioId, seqId })
  }, [audioId, seqId])

  // --- State ---
  const [playAllMode, setPlayAllMode] = useState(false)
  const [playingFragIdx, setPlayingFragIdx] = useState<number | null>(null)
  const [selectedFragIdx, setSelectedFragIdx] = useState<number | null>(null)
  const [infiniteRewind, setInfiniteRewind] = useState(false)
  // Loop the whole sequence: on reaching the end, play-all starts over.
  const [infiniteSequence, setInfiniteSequence] = useState(false)
  const [sequenceSpeed, setSequenceSpeed] = useState(1)

  // Sync sequenceSpeed from the loaded sequence (persisted as sequence.playbackSpeed)
  const sequenceSpeedSyncedRef = useRef<string | null>(null)
  if (sequence && sequenceSpeedSyncedRef.current !== sequence.id) {
    sequenceSpeedSyncedRef.current = sequence.id
    setSequenceSpeed(sequence.playbackSpeed ?? 1)
  }

  // Local fragment overrides (repeat) — keyed by fragment index
  const [localRepeats, setLocalRepeats] = useState<Record<number, number>>({})
  // Temporary focus ranges (A–B loop inside a fragment) — keyed by fragment index, never persisted
  const [localRanges, setLocalRanges] = useState<Record<number, FocusRange>>({})
  // Fragments whose Focus button is on — only these play their range
  const [focusOn, setFocusOn] = useState<Record<number, boolean>>({})
  // Disabled fragments — excluded from Play-all
  const [disabledFragments, setDisabledFragments] = useState<Record<number, boolean>>({})

  // Refs for callbacks
  const playAllModeRef = useRef(false)
  const playingFragIdxRef = useRef<number | null>(null)
  const infiniteRewindRef = useRef(false)
  const infiniteSequenceRef = useRef(false)
  const sequenceRef = useRef<Sequence | null>(null)
  const sequenceSpeedRef = useRef(1)
  const localRepeatsRef = useRef<Record<number, number>>({})
  // Written synchronously by handleFocusChange so a restart sees the new range
  const localRangesRef = useRef<Record<number, FocusRange>>({})
  const focusOnRef = useRef<Record<number, boolean>>({})
  const disabledFragmentsRef = useRef<Record<number, boolean>>({})
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
  }, [])

  const scheduleAfterGap = useCallback((cb: () => void) => {
    clearGapTimer()
    const gapMs = Math.max(0, getFragmentGap()) * 1000
    if (gapMs === 0) {
      cb()
      return
    }
    gapTimerRef.current = setTimeout(() => {
      gapTimerRef.current = null
      cb()
    }, gapMs)
  }, [clearGapTimer])

  // Sync refs
  useEffect(() => { playAllModeRef.current = playAllMode }, [playAllMode])
  useEffect(() => { playingFragIdxRef.current = playingFragIdx }, [playingFragIdx])
  useEffect(() => { infiniteRewindRef.current = infiniteRewind }, [infiniteRewind])
  useEffect(() => { infiniteSequenceRef.current = infiniteSequence }, [infiniteSequence])
  useEffect(() => { sequenceSpeedRef.current = sequenceSpeed }, [sequenceSpeed])
  useEffect(() => { sequenceRef.current = sequence }, [sequence])
  useEffect(() => { localRepeatsRef.current = localRepeats }, [localRepeats])
  useEffect(() => { disabledFragmentsRef.current = disabledFragments }, [disabledFragments])

  // Auto-select (expand) the playing fragment
  const [prevPlayingFragIdx, setPrevPlayingFragIdx] = useState<number | null>(null)
  if (playingFragIdx !== prevPlayingFragIdx) {
    setPrevPlayingFragIdx(playingFragIdx)
    if (playingFragIdx !== null) {
      setSelectedFragIdx(playingFragIdx)
    }
  }

  // Display order: playing fragment goes to top
  const displayOrder = useMemo(() => {
    if (!sequence) return []
    const indices = sequence.fragments.map((_, i) => i)
    if (playingFragIdx !== null && playingFragIdx >= 0 && playingFragIdx < sequence.fragments.length) {
      const rest = indices.filter(i => i !== playingFragIdx)
      return [playingFragIdx, ...rest]
    }
    return indices
  }, [sequence, playingFragIdx])

  /* Load audio. Fragments play straight from the streamed file via start/end
     time bounds — no AudioBuffer decode is needed, so just load.

     Which audio, though, is the sequence's to say: a trimmed or volume-raised
     sequence lives in this file's list but plays a processed copy, and its
     fragment times only line up with that copy. So this waits for the sequence
     to come back from IndexedDB rather than loading the file in the URL. */
  useEffect(() => {
    if (!sequence) return
    const playedId = sequenceAudioId(sequence)
    console.log("[SequencePlayerPage] Loading audio:", playedId)
    loadById(playedId).catch(() => {})
  }, [sequence, loadById])

  // Stop playback on unmount
  const stopRef = useRef(stop)
  useEffect(() => { stopRef.current = stop }, [stop])
  useEffect(() => {
    return () => {
      console.log("[SequencePlayerPage] unmounting, stopping playback")
      stopRef.current()
    }
  }, [])

  // --- Effective speed: per-fragment speed (global propagates to fragments on change) ---
  const getEffectiveSpeed = useCallback((f: SequenceFragment) => {
    return f.speed
  }, [])

  /* The one place a fragment becomes something the engine plays. While the
     fragment's Focus is on, start/end narrow to its focus range — in every
     mode, Play all included. */
  const buildPlayable = useCallback((f: SequenceFragment, fragIdx: number): PlayableFragment => {
    const focus = focusOnRef.current[fragIdx] ? localRangesRef.current[fragIdx] : undefined
    return {
      start: focus?.start ?? f.start,
      end: focus?.end ?? f.end,
      repeat: localRepeatsRef.current[fragIdx] ?? f.repeat,
      speed: getEffectiveSpeed(f),
      gap: getFragmentGap(),
    }
  }, [getEffectiveSpeed])

  // --- Play a single fragment with local overrides ---
  const playFragmentWithOverrides = useCallback((seq: Sequence, fragIdx: number) => {
    if (fragIdx < 0 || fragIdx >= seq.fragments.length) {
      console.log("[SequencePlayerPage] Fragment index out of bounds:", fragIdx)
      return
    }
    clearGapTimer()
    const fragment = buildPlayable(seq.fragments[fragIdx], fragIdx)
    console.log("[SequencePlayerPage] Playing fragment", fragIdx, "start:", fragment.start.toFixed(2), "end:", fragment.end.toFixed(2), "repeat:", fragment.repeat, "speed:", fragment.speed)
    playFragment(fragment)
    setPlayingFragIdx(fragIdx)
  }, [playFragment, buildPlayable, clearGapTimer])

  // --- Play all (skips disabled fragments) ---
  const handlePlayAll = useCallback(() => {
    if (!sequence || sequence.fragments.length === 0) return
    const firstIdx = findFirstEnabled(sequence, disabledFragments)
    if (firstIdx === null) return // all disabled
    console.log("[SequencePlayerPage] Starting play-all mode from fragment", firstIdx)
    setPlayAllMode(true)
    playAllModeRef.current = true
    playFragmentWithOverrides(sequence, firstIdx)

    // On mobile, scroll the active fragment to just below the sticky header
    if (document.documentElement.classList.contains("mobile")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(".sp-frag-item--playing")
          if (el) el.scrollIntoView({ block: "start", behavior: "smooth" })
        })
      })
    }
  }, [sequence, disabledFragments, playFragmentWithOverrides])

  // --- Stop all ---
  const handleStopAll = useCallback(() => {
    console.log("[SequencePlayerPage] Stopping playback")
    clearGapTimer()
    setPlayAllMode(false)
    playAllModeRef.current = false
    setPlayingFragIdx(null)
    playingFragIdxRef.current = null
    setSelectedFragIdx(null)
    stop()
  }, [stop, clearGapTimer])

  // --- onEnded: advance to next fragment in play-all, or loop in infinite rewind ---
  useEffect(() => {
    setOnEnded(() => {
      const seq = sequenceRef.current
      if (!seq) return

      const currentIdx = playingFragIdxRef.current
      if (currentIdx === null) return

      // Infinite rewind: replay same fragment after the configured gap
      if (infiniteRewindRef.current) {
        console.log("[SequencePlayerPage] Infinite rewind: replaying fragment", currentIdx)
        const fragment = buildPlayable(seq.fragments[currentIdx], currentIdx)
        scheduleAfterGap(() => {
          if (playingFragIdxRef.current !== currentIdx) return
          if (!infiniteRewindRef.current) return
          playFragment(fragment)
        })
        return
      }

      // Play-all mode: advance to next enabled fragment after the configured gap
      if (playAllModeRef.current) {
        let nextIdx = currentIdx + 1
        // Skip disabled fragments
        while (nextIdx < seq.fragments.length && disabledFragmentsRef.current[nextIdx]) {
          nextIdx++
        }
        if (nextIdx >= seq.fragments.length) {
          /* End of the sequence. Looping restarts from the top rather than
             stopping — but only if there is still something enabled to play,
             otherwise the wrap would spin on an empty sequence forever. */
          const firstIdx = infiniteSequenceRef.current
            ? findFirstEnabled(seq, disabledFragmentsRef.current)
            : null
          if (firstIdx === null) {
            console.log("[SequencePlayerPage] Play-all finished")
            setPlayAllMode(false)
            playAllModeRef.current = false
            setPlayingFragIdx(null)
            playingFragIdxRef.current = null
            setSelectedFragIdx(null)
            return
          }
          console.log("[SequencePlayerPage] Play-all looping back to fragment", firstIdx)
          nextIdx = firstIdx
        }
        console.log("[SequencePlayerPage] Play-all advancing to fragment", nextIdx)
        const fragment = buildPlayable(seq.fragments[nextIdx], nextIdx)
        scheduleAfterGap(() => {
          if (!playAllModeRef.current) return
          playFragment(fragment)
          setPlayingFragIdx(nextIdx)
          playingFragIdxRef.current = nextIdx
        })
        return
      }

      // Single fragment mode ended
      console.log("[SequencePlayerPage] Fragment", currentIdx, "playback ended")
      setPlayingFragIdx(null)
      playingFragIdxRef.current = null
    })
    return () => {
      setOnEnded(null)
      clearGapTimer()
    }
  }, [setOnEnded, playFragment, buildPlayable, scheduleAfterGap, clearGapTimer])

  // --- Fragment control panel handlers ---
  const handleFragPlay = useCallback((fragIdx: number) => {
    if (!sequence) return
    setPlayAllMode(false)
    playAllModeRef.current = false
    playFragmentWithOverrides(sequence, fragIdx)
  }, [sequence, playFragmentWithOverrides])

  const handleFragPause = useCallback(() => {
    pause()
  }, [pause])

  const handleFragResume = useCallback(() => {
    play()
  }, [play])

  const handleFragStop = useCallback(() => {
    clearGapTimer()
    stop()
    setPlayingFragIdx(null)
    playingFragIdxRef.current = null
    setPlayAllMode(false)
    playAllModeRef.current = false
  }, [stop, clearGapTimer])

  /* Step to the neighbouring enabled fragment. Shared by the lock-screen
     prev/next keys; reads through refs because the Media Session handlers are
     registered once and would otherwise close over a stale sequence. */
  const stepFragment = useCallback((delta: 1 | -1) => {
    const seq = sequenceRef.current
    if (!seq || seq.fragments.length === 0) return
    const from = playingFragIdxRef.current
    // Nothing playing yet: prev/next start the sequence from its first fragment.
    let idx = from === null ? (delta === 1 ? -1 : seq.fragments.length) : from
    do {
      idx += delta
    } while (idx >= 0 && idx < seq.fragments.length && disabledFragmentsRef.current[idx])
    if (idx < 0 || idx >= seq.fragments.length) return
    clearGapTimer()
    playFragmentWithOverrides(seq, idx)
    playingFragIdxRef.current = idx
  }, [playFragmentWithOverrides, clearGapTimer])

  const handleInfiniteRewind = useCallback(() => {
    setInfiniteRewind(prev => {
      const next = !prev
      console.log("[SequencePlayerPage] Infinite rewind:", next ? "ON" : "OFF")
      return next
    })
  }, [])

  const handlePrevFragment = useCallback(() => {
    if (selectedFragIdx === null || selectedFragIdx <= 0 || !sequence) return
    const newIdx = selectedFragIdx - 1
    playFragmentWithOverrides(sequence, newIdx)
  }, [selectedFragIdx, sequence, playFragmentWithOverrides])

  const handleNextFragment = useCallback(() => {
    if (selectedFragIdx === null || !sequence || selectedFragIdx >= sequence.fragments.length - 1) return
    const newIdx = selectedFragIdx + 1
    playFragmentWithOverrides(sequence, newIdx)
  }, [selectedFragIdx, sequence, playFragmentWithOverrides])

  const handleClosePanel = useCallback(() => {
    setSelectedFragIdx(null)
  }, [])

  const handleRepeatChange = useCallback((fragIdx: number, value: number) => {
    setLocalRepeats(prev => ({ ...prev, [fragIdx]: value }))
    console.log("[SequencePlayerPage] Repeat for fragment", fragIdx, "set to", value)
    // Also persist to sequence
    if (sequence) {
      const updatedFragments = sequence.fragments.map((f, i) =>
        i === fragIdx ? { ...f, repeat: value } : f
      )
      updateSequence({ ...sequence, fragments: updatedFragments })
    }
  }, [sequence, updateSequence])

  const handleSequenceSpeedChange = useCallback((value: number) => {
    setSequenceSpeed(value)
    if (sequence) {
      // Propagate the new global to each fragment's individual speed so the
      // per-fragment slider's default tracks the global. Per-fragment
      // customizations are reset to the new global (they can be re-tuned after).
      const updatedFragments = sequence.fragments.map(f => ({ ...f, speed: value }))
      updateSequence({ ...sequence, fragments: updatedFragments, playbackSpeed: value })
    }
  }, [sequence, updateSequence])

  const handleFragmentSpeedChange = useCallback((fragIdx: number, value: number) => {
    if (!sequence) return
    const updatedFragments = sequence.fragments.map((f, i) =>
      i === fragIdx ? { ...f, speed: value } : f
    )
    updateSequence({ ...sequence, fragments: updatedFragments })
  }, [sequence, updateSequence])

  /* Replays the fragment with its current bounds, but only when it is actually
     sounding — adjusting while paused or stopped just takes effect on the next
     play. In Play all the sequence carries on from there as usual. */
  const restartFocus = useCallback((fragIdx: number) => {
    const seq = sequenceRef.current
    if (!seq || !isPlaying || playingFragIdxRef.current !== fragIdx) return
    playFragmentWithOverrides(seq, fragIdx)
  }, [isPlaying, playFragmentWithOverrides])

  const handleFocusToggle = useCallback((fragIdx: number) => {
    const next = { ...focusOnRef.current }
    if (next[fragIdx]) delete next[fragIdx]
    else next[fragIdx] = true
    focusOnRef.current = next
    setFocusOn(next)
    // Only audible when a range differs from the whole fragment
    if (localRangesRef.current[fragIdx]) restartFocus(fragIdx)
  }, [restartFocus])

  const handleFocusChange = useCallback((fragIdx: number, range: FocusRange | null, restart: boolean) => {
    const next = { ...localRangesRef.current }
    if (range) next[fragIdx] = range
    else delete next[fragIdx]
    localRangesRef.current = next
    setLocalRanges(next)
    if (restart) restartFocus(fragIdx)
  }, [restartFocus])

  const handleToggleDisabled = useCallback((fragIdx: number) => {
    setDisabledFragments(prev => {
      const next = { ...prev }
      if (next[fragIdx]) {
        delete next[fragIdx]
      } else {
        next[fragIdx] = true
      }
      return next
    })
  }, [])

  /* Top-row switch: excludes every fragment from Play all, or — when they are
     all excluded already — brings them all back. */
  const handleToggleAllDisabled = useCallback(() => {
    if (!sequence || sequence.fragments.length === 0) return
    setDisabledFragments(prev => {
      const allOff = sequence.fragments.every((_, i) => prev[i])
      if (allOff) return {}
      const next: Record<number, boolean> = {}
      sequence.fragments.forEach((_, i) => { next[i] = true })
      return next
    })
  }, [sequence])

  const handleEditFragment = useCallback((fragIdx: number) => {
    if (!sequence) return
    const frag = sequence.fragments[fragIdx]
    stop()
    navigate(`/file/${audioId}/editor/${seqId}`, { state: { fragmentId: frag.id } })
  }, [sequence, audioId, seqId, navigate, stop])

  // --- Select fragment (toggle) ---
  const handleSelectFragment = useCallback((fragIdx: number) => {
    setSelectedFragIdx(prev => prev === fragIdx ? null : fragIdx)
  }, [])

  // --- Derived ---
  const fileName = files.find(f => f.id === audioId)?.name ?? t("common.unknown")

  /* Lock-screen transport. The browser dispatches these itself, so unlike our
     own timers they survive the screen going off — which is exactly when the
     user has no other way to reach the controls. Registered for the whole life
     of the page rather than only while playing: the OS keeps the notification
     around briefly after a pause, and play must still work from it. */
  useEffect(() => {
    if (!sequence) return
    setMediaMetadata(sequence.label, fileName)
    setActionHandlers({
      play: () => play(),
      pause: () => pause(),
      previoustrack: () => stepFragment(-1),
      nexttrack: () => stepFragment(1),
    })
    return () => clearMediaSession()
  }, [sequence, fileName, play, pause, stepFragment])

  useEffect(() => {
    setPlaybackState(isPlaying ? "playing" : isPaused ? "paused" : "none")
  }, [isPlaying, isPaused])

  if (!audioId || !seqId) {
    return (
      <div className="page">
        <p>{t("player.invalidUrl")}</p>
        <button onClick={() => navigate("/")}>{t("player.backToLibrary")}</button>
      </div>
    )
  }

  if (!sequence) {
    return (
      <div className="page">
        <h2>{t("player.title")}</h2>
        <p className="empty-state">{t("player.loading")}</p>
        <button onClick={() => navigate(-1)}>{t("common.back")}</button>
      </div>
    )
  }

  const isPlayAllActive = playAllMode && playingFragIdx !== null
  const allExcluded = sequence.fragments.length > 0 && sequence.fragments.every((_, i) => disabledFragments[i])

  return (
    <div className="page">
      {/* Header */}
      <h2>{t("player.title")}</h2>
      <p className="sp-file-info">
        <strong>#{sequence.label}</strong>
        <span className="sp-file-info-separator">·</span>
        <span className="selectable-text">{fileName}</span>
        <span className="sp-file-info-separator">·</span>
        {t.n("player.fragments", sequence.fragments.length)}
      </p>

      {/* Back + Play-all / Stop-all + Volume */}
      <div className="sp-playall-row">
        <button className="sp-playall-btn" onClick={() => navigate(-1)}>
          <span>{t("common.back")}</span>
        </button>
        {isPlayAllActive ? (
          <>
            {isPaused ? (
              <button className="sp-playall-btn" onClick={() => play()}>
                <PlayIcon />
                <span>{t("player.resumeAll")}</span>
              </button>
            ) : (
              /* In the gap between two fragments the engine is momentarily
                 neither playing nor paused. Rendering nothing there made the
                 button vanish and the row jump on every fragment change, so the
                 control keeps its place and goes disabled for the handover. */
              <button className="sp-playall-btn" onClick={() => pause()} disabled={!isPlaying}>
                <PauseIcon />
                <span>{t("player.pauseAll")}</span>
              </button>
            )}
            <button className="sp-playall-btn" onClick={handleStopAll}>
              <StopIcon />
              <span>{t("common.stop")}</span>
            </button>
          </>
        ) : (
          <button
            className="sp-playall-btn"
            onClick={handlePlayAll}
            disabled={sequence.fragments.length === 0 || allExcluded}
            title={t("player.playAllTitle")}
          >
            <PlayAllIcon size={20} />
            <span>{t("player.playAll")}</span>
          </button>
        )}
        {/* Same infinity glyph as the fragment control panel: one symbol means
            "loop forever" everywhere, and what it loops is given by where it
            sits — this row for the sequence, a fragment's panel for that
            fragment. Stays put whether or not playback is running, so the loop
            can be armed mid-sequence and not only before starting. */}
        <button
          className={`sp-playall-btn sp-loop-btn${infiniteSequence ? " sp-loop-btn--active" : ""}`}
          onClick={() => setInfiniteSequence(v => !v)}
          aria-pressed={infiniteSequence}
          title={infiniteSequence ? t("player.repeatOn") : t("player.repeatOff")}
        >
          <InfiniteRewindIcon />
        </button>
        {/* Same skip glyph as each fragment's exclude button, applied to all of them */}
        <button
          className={`sp-playall-btn sp-loop-btn sp-exclude-all-btn${allExcluded ? " sp-exclude-all-btn--active" : ""}`}
          onClick={handleToggleAllDisabled}
          disabled={sequence.fragments.length === 0}
          aria-pressed={allExcluded}
          title={allExcluded ? t("player.includeAll") : t("player.excludeAll")}
        >
          <SkipIcon />
        </button>
        <label className="sp-global-speed" title={t("player.globalSpeed")}>
          <span className="sp-global-speed__icon"><SpeedIcon /></span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={sequenceSpeed}
            onChange={e => handleSequenceSpeedChange(parseFloat(e.target.value))}
            className="sp-global-speed__input"
          />
          <span className="sp-global-speed__value">{sequenceSpeed.toFixed(2)}×</span>
        </label>
        <VolumeControl volume={volume} onVolumeChange={setVolume} />
      </div>

      {/* Fragment list */}
      <div className="sp-fragment-list">
        {displayOrder.map(idx => {
          const frag = sequence.fragments[idx]
          const isSelected = selectedFragIdx === idx
          const isCurrentlyPlaying = playingFragIdx === idx
          const repeat = localRepeats[idx] ?? frag.repeat
          const isFragDisabled = !!disabledFragments[idx]
          const focus = localRanges[idx] ?? null
          const isFocusOn = !!focusOn[idx]

          return (
            <div key={frag.id} className={`sp-frag-item ${isCurrentlyPlaying ? "sp-frag-item--playing" : ""} ${isSelected ? "sp-frag-item--selected" : ""} ${isFragDisabled ? "sp-frag-item--disabled" : ""}`}>
              {/* Fragment row */}
              <div
                className="sp-frag-row"
                onClick={() => handleSelectFragment(idx)}
              >
                <span className="sp-frag-idx">{idx + 1}</span>
                <span className="sp-frag-time">
                  {formatTime(frag.start)} – {formatTime(frag.end)}
                </span>
                <span className="sp-frag-duration">
                  {((frag.end - frag.start)).toFixed(1)}s
                </span>
                {frag.repeat > 1 && (
                  <span className="sp-frag-repeat">×{repeat}</span>
                )}
                {frag.speed !== 1 && (
                  <span className="sp-frag-speed">{frag.speed}×</span>
                )}
                {isFocusOn && focus && (
                  <span className="sp-frag-focus" title={t("player.focus.badge")}>
                    ⟦{(focus.start - frag.start).toFixed(1)}–{(focus.end - frag.start).toFixed(1)}⟧
                  </span>
                )}
                {frag.subtitles.length > 0 && (
                  <span className="sp-frag-sub-indicator" title={t("player.hasSubtitles")}>📝</span>
                )}
                {isFragDisabled && (
                  <span className="sp-frag-disabled-indicator" title={t("player.excluded")}>{t("player.skip")}</span>
                )}
                {isCurrentlyPlaying && (
                  <span className="sp-frag-playing-indicator">▶</span>
                )}
              </div>

              {/* Expansion (when selected): subtitles + vocab on top, control panel pinned at the bottom */}
              {isSelected && (
                <>
                  {/* Subtitle display */}
                  <SubtitleDisplay fragment={frag} subtitleFiles={subtitleFiles} />

                  {/* Vocabulary display (collapsible, collapsed by default) */}
                  <VocabularyDisplay fragment={frag} vocabularyFiles={vocabularyFiles} />

                  {/* Control panel — anchored at the bottom of the fragment box */}
                  <FragmentControlPanel
                    fragmentIndex={idx}
                    totalFragments={sequence.fragments.length}
                    isPlaying={isCurrentlyPlaying && isPlaying}
                    isPaused={isCurrentlyPlaying && isPaused}
                    isInfiniteRewind={infiniteRewind}
                    localRepeat={repeat}
                    fragmentSpeed={frag.speed}
                    isDisabled={isFragDisabled}
                    onPlay={() => isCurrentlyPlaying && isPaused ? handleFragResume() : handleFragPlay(idx)}
                    onPause={handleFragPause}
                    onStop={handleFragStop}
                    onInfiniteRewind={handleInfiniteRewind}
                    onToggleDisabled={() => handleToggleDisabled(idx)}
                    onPrev={handlePrevFragment}
                    onNext={handleNextFragment}
                    onClose={handleClosePanel}
                    onEdit={() => handleEditFragment(idx)}
                    onRepeatChange={(v) => handleRepeatChange(idx, v)}
                    onFragmentSpeedChange={(v) => handleFragmentSpeedChange(idx, v)}
                    fragStart={frag.start}
                    fragEnd={frag.end}
                    focusRange={focus}
                    currentTime={currentTime}
                    isCurrentFragment={isCurrentlyPlaying && (isPlaying || isPaused)}
                    isFocusOn={isFocusOn}
                    onFocusToggle={() => handleFocusToggle(idx)}
                    onFocusChange={(r, restart) => handleFocusChange(idx, r, restart)}
                    onFocusRestart={() => restartFocus(idx)}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
