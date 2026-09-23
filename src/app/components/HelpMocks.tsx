// app/components/HelpMocks.tsx
//
// The "screenshots" the Help window numbers. Like OnboardingDemo's mocks these
// are built from the app's own CSS classes rather than redrawn or captured, so
// they follow the active theme, the chosen language's metrics and any future
// restyle — and stay sharp at every scale. Unlike those they are static: no
// script, no cursor, just the finished state of each page.
//
// `data-help="N"` marks a significant element. HelpScreen measures those nodes
// after layout and pins a numbered badge to each, and the explanation list under
// the shot is an <ol>, so the numbers line up without being written twice.

import { PlayIcon, EditIcon, DeleteIcon, CopyIcon, FavouriteIcon, ExportIcon } from "./SequenceIcons"
import { VolumeControl } from "./VolumeControl"
import { APP_VERSION } from "../../utils/version"
import type { HelpTopic } from "./helpTopics"
import { useT } from "../../utils/i18n"

/* ── Audio Library ──────────────────────────────────────────────────────── */

function LibraryMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("library.title")}</h2>

      <div className="hl-mock__row">
        <button data-help="1">{t("library.upload")}</button>
        <button data-help="6">{t("bundle.import")}</button>
      </div>

      <ul className="audio-list">
        <li className="audio-list__item audio-list__item--selected" data-help="2">
          <span>lesson-01.mp3</span>
          <button className="btn-delete" data-help="3">{t("common.delete")}</button>
        </li>
        <li className="audio-list__item">
          <span>interview-bbc.mp3</span>
          <button className="btn-delete">{t("common.delete")}</button>
        </li>
      </ul>

      <div className="hl-mock__block">
        <h3>{t("library.player")}</h3>
        <div className="progress-wrap" data-help="4">
          <div className="progress-bar">
            <div className="progress-track">
              <div className="progress-fill hl-mock__progress-fill" />
            </div>
            <div className="progress-handle hl-mock__progress-handle" />
          </div>
          <div className="progress-time">
            <span>0:41</span>
            <span>3:40</span>
          </div>
        </div>
        <div className="player-controls">
          <button>{t("common.play")}</button>
          <button>{t("common.stop")}</button>
          <VolumeControl volume={0.8} onVolumeChange={() => {}} />
        </div>
        <div className="player-nav">
          <button data-help="5">{t("library.fragments")}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Fragment Library ───────────────────────────────────────────────────── */

/* Mirrors SequenceBar in FragmentLibraryPage: amber track, red fragment blocks. */
const SEQ_BARS = [
  [{ x: 4, w: 26 }, { x: 38, w: 34 }, { x: 80, w: 22 }, { x: 112, w: 40 }, { x: 158, w: 18 }, { x: 182, w: 14 }],
  [{ x: 10, w: 44 }, { x: 66, w: 30 }, { x: 108, w: 52 }],
]

function SeqBar({ n }: { n: number }) {
  return (
    <svg width="200" height="16" className="hl-mock__seqbar">
      <rect x="0" y="2" width="200" height="12" fill="#fef3c7" />
      {SEQ_BARS[n - 1].map(f => (
        <rect key={f.x} x={f.x} y="2" width={f.w} height="12" fill="#f87171" opacity="0.85" />
      ))}
    </svg>
  )
}

/* Mirrors the .seq-meta span in FragmentLibraryPage: count · total time. */
function SeqMeta({ fragments, total, mark }: { fragments: number; total: string; mark?: string }) {
  const t = useT()
  return (
    <span className="seq-meta" data-help={mark}>
      {t.n("fragmentLibrary.fragments", fragments)}
      <span className="seq-meta__sep">·</span>
      {total}
    </span>
  )
}

function SequencesMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("fragmentLibrary.title")}</h2>
      <p className="sp-file-info">lesson-01.mp3</p>

      <div className="toolbar">
        <button>{t("common.back")}</button>
        <button data-help="1">{t("fragmentLibrary.newSequence")}</button>
        <button data-help="2">{t("fragmentLibrary.sub")} (1)</button>
        <button data-help="3">{t("fragmentLibrary.vocab")} (0)</button>
      </div>

      <div className="seq-card">
        <div className="seq-bar-wrap">
          <span className="seq-label" data-help="4">#1</span>
          <SeqMeta fragments={6} total="0:58" mark="5" />
          <span data-help="6"><SeqBar n={1} /></span>
          <div className="seq-controls" data-help="7">
            <button className="seq-controls__btn"><PlayIcon /></button>
            <button className="seq-controls__btn"><EditIcon /></button>
            <button className="seq-controls__btn"><CopyIcon /></button>
            <button className="seq-controls__btn" data-help="8"><ExportIcon /></button>
            <button className="seq-controls__btn hl-mock__danger"><DeleteIcon /></button>
            <button className="seq-controls__btn"><FavouriteIcon filled={false} /></button>
          </div>
        </div>
      </div>

      <div className="seq-card">
        <div className="seq-bar-wrap">
          <span className="seq-label">#2</span>
          <SeqMeta fragments={3} total="0:34" />
          <SeqBar n={2} />
          <div className="seq-controls">
            <button className="seq-controls__btn"><PlayIcon /></button>
            <button className="seq-controls__btn"><EditIcon /></button>
            <button className="seq-controls__btn"><CopyIcon /></button>
            <button className="seq-controls__btn"><ExportIcon /></button>
            <button className="seq-controls__btn hl-mock__danger"><DeleteIcon /></button>
            <button className="seq-controls__btn"><FavouriteIcon filled={true} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Fragment Editor ────────────────────────────────────────────────────── */

/* The real editor draws its waveform to a canvas from decoded audio; this is a
   stand-in with the same fragment-overlay treatment. */
const WAVE = [
  0.22, 0.55, 0.38, 0.72, 0.48, 0.30, 0.61, 0.84, 0.52, 0.26, 0.14, 0.34,
  0.68, 0.90, 0.58, 0.36, 0.20, 0.44, 0.76, 0.62, 0.40, 0.24, 0.50, 0.32,
  0.18, 0.46, 0.70, 0.88, 0.54, 0.28, 0.42, 0.66, 0.36, 0.22, 0.58, 0.30,
]
const WAVE_W = 560
const WAVE_H = 84
const WAVE_PITCH = WAVE_W / WAVE.length

function EditorMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("editor.title")}</h2>
      <p className="sp-file-info">lesson-01.mp3</p>

      <div className="toolbar">
        <button>{t("common.back")}</button>
        <button data-help="8">{t("bundle.export")}</button>
        <label className="export-bundle__checkbox">
          <input type="checkbox" defaultChecked readOnly />
          <span className="hl-mock__meta">{t("bundle.includeAudio")}</span>
        </label>
      </div>

      <div className="hl-mock__wave" data-help="1">
        <svg viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="none">
          {WAVE.map((a, i) => {
            const h = Math.max(2, a * (WAVE_H - 10))
            return (
              <rect
                key={i}
                className="hl-mock__wavebar"
                x={i * WAVE_PITCH + 1}
                y={(WAVE_H - h) / 2}
                width={WAVE_PITCH - 2}
                height={h}
              />
            )
          })}
        </svg>
        <div className="hl-mock__region">
          <span className="hl-mock__handle" />
          <span className="hl-mock__handle hl-mock__handle--right" data-help="2" />
        </div>
      </div>

      <div className="file-player">
        <button>{"▶ " + t("editor.playAll")}</button>
        <button disabled>{"⏹ " + t("common.stop")}</button>
      </div>

      <div className="action-bar">
        <button className="action-bar__btn" data-help="3">{t("editor.autoDetect")}</button>
        <button className="action-bar__btn" data-help="4">{t("editor.trim")}</button>
        <button className="action-bar__btn" data-help="5">{t("editor.normalize")}</button>
        <button className="action-bar__btn" data-help="6">{t("editor.maximize")}</button>
        <button className="action-bar__btn action-bar__btn--danger">{t("editor.deleteAll")}</button>
      </div>

      <div className="fragment-row fragment-row--editing">
        <span className="fragment-row__time">0:12 – 0:32</span>
        <div className="fragment-row__actions" data-help="7">
          <button className="btn-sub">▶</button>
          <button className="btn-sub">{t("fragmentLibrary.sub")}</button>
          <button className="btn-sub">{t("fragmentLibrary.vocab")}</button>
          <button className="btn-sub hl-mock__danger">✕</button>
        </div>
      </div>
      <div className="fragment-row">
        <span className="fragment-row__time">0:38 – 0:49</span>
        <div className="fragment-row__actions">
          <button className="btn-sub">▶</button>
          <button className="btn-sub">{t("fragmentLibrary.sub")}</button>
          <button className="btn-sub">{t("fragmentLibrary.vocab")}</button>
          <button className="btn-sub hl-mock__danger">✕</button>
        </div>
      </div>
    </div>
  )
}

/* ── Sequence Player ────────────────────────────────────────────────────── */

const PLAYER_ROWS = [
  { idx: 1, time: "0:01 – 0:08", dur: "7.0s" },
  { idx: 2, time: "0:10 – 0:16", dur: "6.0s" },
  { idx: 3, time: "0:19 – 0:27", dur: "8.0s", skipped: true },
]

const PauseGlyph = ({ size = 16 }: { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)
const StopGlyph = ({ size = 16 }: { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 6h12v12H6z" />
  </svg>
)
const SpeedGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 4C6.48 4 2 8.48 2 14h3a7 7 0 0 1 14 0h3c0-5.52-4.48-10-10-10z" />
    <path d="M14.5 15c0 1.38-1.12 2.5-2.5 2.5S9.5 16.38 9.5 15c0-1.16.79-2.13 1.86-2.41l5.92-5.18-3.92 6.65c.69.41 1.14 1.17 1.14 2.04z" />
  </svg>
)
const SkipGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><line x1="5.7" y1="5.7" x2="18.3" y2="18.3" />
  </svg>
)
const RewindCountGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    <path d="M10.5 10v5L15 12.5z" />
  </svg>
)
const InfiniteRewindGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.828 9.172a4 4 0 1 0 0 5.656a10 10 0 0 0 2.172 -2.828a10 10 0 0 1 2.172 -2.828a4 4 0 1 1 0 5.656a10 10 0 0 1 -2.172 -2.828a10 10 0 0 0 -2.172 -2.828" />
  </svg>
)
const FocusGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4H4v16h3" /><path d="M17 4h3v16h-3" />
    <rect x="9" y="10" width="6" height="4" fill="currentColor" stroke="none" />
  </svg>
)
const PrevGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
)
const NextGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
)
const EditPencilGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)
const CloseGlyph = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function PlayerMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("player.title")}</h2>
      <p className="sp-file-info">
        <strong>#1</strong>
        <span className="sp-file-info-separator">·</span>
        lesson-01.mp3
        <span className="sp-file-info-separator">·</span>
        {t.n("player.fragments", 3)}
      </p>

      <div className="sp-playall-row">
        <button className="sp-playall-btn">{t("common.back")}</button>
        <button className="sp-playall-btn" data-help="1">
          <PauseGlyph />
          <span>{t("player.pauseAll")}</span>
        </button>
        <button className="sp-playall-btn">
          <StopGlyph />
          <span>{t("common.stop")}</span>
        </button>
        <button className="sp-playall-btn sp-loop-btn sp-loop-btn--active" data-help="2">
          <InfiniteRewindGlyph />
        </button>
        <button className="sp-playall-btn sp-loop-btn sp-exclude-all-btn" data-help="3">
          <SkipGlyph />
        </button>
        <label className="sp-global-speed" data-help="4">
          <span className="sp-global-speed__icon"><SpeedGlyph /></span>
          <input type="range" min={0.5} max={1.5} step={0.05} defaultValue={1} className="sp-global-speed__input" readOnly />
          <span className="sp-global-speed__value">1.00×</span>
        </label>
        <span data-help="5"><VolumeControl volume={0.8} onVolumeChange={() => {}} /></span>
      </div>

      <div className="sp-frag-item sp-frag-item--playing sp-frag-item--selected hl-mock__sp-item">
        <div className="sp-frag-row" data-help="6">
          <span className="sp-frag-idx">1</span>
          <span className="sp-frag-time">0:01 – 0:08</span>
          <span className="sp-frag-duration">7.0s</span>
          <span className="sp-frag-repeat">×3</span>
          <span className="sp-frag-focus">⟦2.0–4.5⟧</span>
          <span className="sp-frag-sub-indicator">📝</span>
          <span className="sp-frag-playing-indicator">▶</span>
        </div>
      </div>

      <div className="hl-mock__sp-strip">
        <div className="sp-subtitle-display" data-help="7">
          <div className="hl-mock__sub-name">lesson-01.srt</div>
          <div className="hl-mock__sub-text">
            So what you want to do is listen for the linking — it all runs together.
          </div>
        </div>
        <div className="sp-control-panel">
          {/* Mirrors FocusStrip in SequencePlayerPage, frozen at 2.0–4.5s of a 7s fragment */}
          <div className="sp-focus-strip" data-help="9">
            <div className="sp-focus-strip__head">
              <span className="sp-focus-strip__title">{t("player.focus.title")}</span>
              <span className="sp-focus-strip__readout">0:03 – 0:05 · 2.5s</span>
              <button className="sp-ctrl-btn sp-focus-strip__clear"><CloseGlyph /></button>
            </div>
            <div className="sp-focus-range">
              <div className="sp-focus-range__track" />
              <div className="sp-focus-range__fill hl-mock__focus-fill" />
              <div className="sp-focus-range__cursor hl-mock__focus-cursor" />
              <input type="range" className="sp-focus-range__input" min={1} max={8} step={0.05} defaultValue={3} readOnly />
              <input type="range" className="sp-focus-range__input" min={1} max={8} step={0.05} defaultValue={5.5} readOnly />
            </div>
          </div>
          <div className="sp-control-row" data-help="8">
            <button className="sp-ctrl-btn"><PauseGlyph size="1em" /></button>
            <button className="sp-ctrl-btn"><StopGlyph size="1em" /></button>
            <button className="sp-ctrl-btn"><SkipGlyph /></button>
            <div className="sp-ctrl-separator" />
            <button className="sp-ctrl-btn sp-speed-btn sp-rewind-btn">
              <RewindCountGlyph />
              <span className="sp-speed-btn__value">×3</span>
            </button>
            <button className="sp-ctrl-btn"><InfiniteRewindGlyph /></button>
            <button className="sp-ctrl-btn sp-ctrl-btn--active"><FocusGlyph /></button>
            <label className="sp-speed-slider">
              <span className="sp-speed-slider__icon"><SpeedGlyph /></span>
              <input type="range" min={0.5} max={1.5} step={0.05} defaultValue={1} className="sp-speed-slider__input" readOnly />
              <span className="sp-speed-slider__value">1.00×</span>
            </label>
            <div className="sp-ctrl-separator" />
            <button className="sp-ctrl-btn"><PrevGlyph /></button>
            <button className="sp-ctrl-btn"><NextGlyph /></button>
            <button className="sp-ctrl-btn"><EditPencilGlyph /></button>
            <button className="sp-ctrl-btn sp-ctrl-btn--close"><CloseGlyph /></button>
          </div>
        </div>
      </div>

      {PLAYER_ROWS.slice(1).map(r => (
        <div key={r.idx} className={`sp-frag-item hl-mock__sp-item${r.skipped ? " sp-frag-item--disabled" : ""}`}>
          <div className="sp-frag-row">
            <span className="sp-frag-idx">{r.idx}</span>
            <span className="sp-frag-time">{r.time}</span>
            <span className="sp-frag-duration">{r.dur}</span>
            <span className="sp-frag-repeat">×3</span>
            <span className="sp-frag-sub-indicator">📝</span>
            {r.skipped && <span className="sp-frag-disabled-indicator">{t("player.skip")}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Favourites ─────────────────────────────────────────────────────────── */

function FavouritesMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("favourites.title")}</h2>

      <div className="seq-card" data-help="1">
        <div className="seq-bar-wrap">
          <span className="seq-label">#1</span>
          <span className="hl-mock__meta">{t.n("fragmentLibrary.fragments", 6)}</span>
          <span className="hl-mock__meta">lesson-01.mp3</span>
          <div className="seq-controls">
            <button className="seq-controls__btn" data-help="2"><PlayIcon /></button>
            <button className="seq-controls__btn" data-help="3"><EditIcon /></button>
            <button className="seq-controls__btn" data-help="4"><FavouriteIcon filled={true} /></button>
          </div>
        </div>
      </div>

      <div className="seq-card">
        <div className="seq-bar-wrap">
          <span className="seq-label">#2</span>
          <span className="hl-mock__meta">{t.n("fragmentLibrary.fragments", 3)}</span>
          <span className="hl-mock__meta">interview-bbc.mp3</span>
          <div className="seq-controls">
            <button className="seq-controls__btn"><PlayIcon /></button>
            <button className="seq-controls__btn"><EditIcon /></button>
            <button className="seq-controls__btn"><FavouriteIcon filled={true} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Settings ───────────────────────────────────────────────────────────── */

const ResetGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3.2-6.9L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const PlusGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const PaletteGlyph = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
    />
  </svg>
)

function SettingsRow({
  label,
  hint,
  mark,
  children,
  stacked,
}: {
  label: string
  hint: string
  mark?: string
  children: React.ReactNode
  stacked?: boolean
}) {
  return (
    <div className={`settings-row${stacked ? " settings-row--stacked" : ""}`}>
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        <span className="settings-row__hint">{hint}</span>
      </div>
      <div
        className={`settings-row__control${stacked ? " settings-slider-row" : ""}`}
        data-help={mark}
      >
        {children}
      </div>
    </div>
  )
}

function SettingsMock() {
  const t = useT()
  return (
    <div className="page hl-mock__page">
      <h2>{t("settings.title")}</h2>

      <h3 className="settings-group__title">{t("settings.section.general")}</h3>
      <div className="settings-card">
        <SettingsRow label={t("settings.language")} hint={t("settings.language.hint")} mark="1">
          <span className="settings-select hl-mock__select">{t("settings.language.en")}</span>
        </SettingsRow>
        <SettingsRow label={t("settings.startPage")} hint={t("settings.startPage.hint")} mark="2">
          <span className="settings-select hl-mock__select">{t("settings.startPage.library")}</span>
        </SettingsRow>
      </div>

      <h3 className="settings-group__title hl-mock__group-title">{t("settings.section.appearance")}</h3>
      <div className="settings-card">
        <SettingsRow label={t("settings.theme")} hint={t("settings.theme.hint")} mark="3">
          <div className="settings-seg">
            <span className="settings-seg__btn settings-seg__btn--active">{"☀ " + t("settings.theme.light")}</span>
            <span className="settings-seg__btn">{"🌙 " + t("settings.theme.dark")}</span>
          </div>
        </SettingsRow>
        <SettingsRow label={t("settings.theme.colorTheme")} hint={t("settings.theme.colorTheme.hint")} mark="4">
          <div className="settings-swatches">
            <span className="settings-swatch settings-swatch--active">
              <span className="settings-swatch__dot settings-swatch__dot--normal" />{t("settings.theme.normal")}
            </span>
            <span className="settings-swatch">
              <span className="settings-swatch__dot settings-swatch__dot--pastel" />{t("settings.theme.pastel")}
            </span>
            <span className="settings-swatch">
              <span className="settings-swatch__dot settings-swatch__dot--neon" />{t("settings.theme.neon")}
            </span>
          </div>
        </SettingsRow>
        {/* Mirrors the bg-picker in SettingsPage under the light theme. The
            swatch colours come from help.css by position, the real BG_PALETTES
            values, rather than from per-swatch inline styles. */}
        <div className="settings-row settings-row--stacked">
          <div className="settings-row__text">
            <span className="settings-row__label">{t("settings.bgColor")}</span>
            <span className="settings-row__hint">{t("settings.bgColor.hint")}</span>
          </div>
          <div className="bg-picker" data-help="5">
            <div className="bg-picker__sample bg-picker__sample--light hl-mock__bg-sample">
              <span className="bg-picker__sample-label">{t("settings.bgColor.light")}</span>
              <span className="settings-reset"><ResetGlyph /></span>
            </div>
            <div className="bg-picker__body">
              <div className="bg-picker__rows">
                {(["light", "dark"] as const).map(theme => (
                  <div key={theme} className={`bg-picker__row bg-picker__row--${theme} hl-mock__bg-row--${theme}`}>
                    {Array.from({ length: 9 }, (_, i) => (
                      <button key={i} className="bg-picker__swatch" disabled={theme === "dark"} />
                    ))}
                    <button className="bg-picker__swatch bg-picker__swatch--user" disabled={theme === "dark"} />
                    {[0, 1].map(i => (
                      <button key={`empty-${i}`} className="bg-picker__swatch bg-picker__swatch--user bg-picker__swatch--empty" disabled={theme === "dark"}>
                        <PlusGlyph />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <span className="bg-picker__custom"><PaletteGlyph /></span>
            </div>
          </div>
        </div>
        <SettingsRow label={t("settings.subFontSize")} hint={t("settings.subFontSize.hint")} mark="6" stacked>
          <input type="range" className="settings-slider" min={10} max={32} defaultValue={14} readOnly />
          <span className="settings-value">14px</span>
        </SettingsRow>
      </div>

      <h3 className="settings-group__title hl-mock__group-title">{t("settings.section.playback")}</h3>
      <div className="settings-card">
        <SettingsRow label={t("settings.fragmentGap")} hint={t("settings.fragmentGap.hint")} mark="7" stacked>
          <input type="range" className="settings-slider" min={0} max={10} step={0.5} defaultValue={2} readOnly />
          <span className="settings-value">2.0s</span>
        </SettingsRow>
        <SettingsRow label={t("settings.trimSilenceGap")} hint={t("settings.trimSilenceGap.hint")} mark="8" stacked>
          <input type="range" className="settings-slider" min={0} max={10} step={0.5} defaultValue={3} readOnly />
          <span className="settings-value">3.0s</span>
          <span className="settings-reset"><ResetGlyph /></span>
        </SettingsRow>
      </div>
    </div>
  )
}

/* ── About ──────────────────────────────────────────────────────────────── */

function AboutMock() {
  const t = useT()
  return (
    <div className="hl-mock__page hl-mock__about">
      <div className="hl-mock__header">
        <span className="header__logo">{t("app.title")}</span>
        <span className="header__nav-btn">{t("nav.audioLibrary")}</span>
        <span className="header__nav-btn">{t("nav.favourites")}</span>
        <span className="header__nav-btn">{t("nav.settings")}</span>
        <span className="header__nav-btn header__nav-btn--active">{t("nav.about")}</span>
      </div>

      {/* Anchored to the right edge rather than to a measured offset: About is
          the last nav item, and its label changes width with the language. */}
      <div className="hl-mock__about-anchor">
        <div className="hl-mock__about-menu">
          <span className="header__dropdown-item" data-help="1">{t("nav.about.contacts")}</span>
          <span className="header__dropdown-item" data-help="2">{t("nav.about.demo")}</span>
          <span className="header__dropdown-item header__dropdown-item--active" data-help="3">{t("nav.about.help")}</span>
          <p className="header__about-version" data-help="4">{t("app.title")} {t("about.version")} {APP_VERSION}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Registry ───────────────────────────────────────────────────────────── */

const MOCKS: Record<HelpTopic, () => React.ReactElement> = {
  library: LibraryMock,
  sequences: SequencesMock,
  editor: EditorMock,
  player: PlayerMock,
  favourites: FavouritesMock,
  settings: SettingsMock,
  about: AboutMock,
}

export function HelpMock({ topic }: { topic: HelpTopic }) {
  const Mock = MOCKS[topic]
  return <Mock />
}
