// app/components/ColorPickerDialog.tsx
//
// Free colour picker opened from the palette button beside the background
// swatches, modelled on sDraw's: two ways of choosing the same HSV colour —
// a saturation/value square with a hue bar, or a hue ring around a
// saturation/value diamond — over a strip with the result, its hex and Apply.
// Both views edit one HSV state, so switching tabs never loses the colour, and
// the hue survives dragging all the way into grey.

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useT } from "../../utils/i18n"
import { HEX_COLOR, clamp, hexToHsv, hsvToHex } from "../../utils/color"

type Mode = "square" | "wheel"
type Hsv = { h: number; s: number; v: number }
type PointerHandler = (e: ReactPointerEvent<HTMLDivElement>) => void

/* Ring thickness in px; the diamond and knob offsets in App.css use the same. */
const RING_WIDTH = 28

/* Hue runs anticlockwise from red at 3 o'clock, as in sDraw. A conic gradient
   starts at 12 o'clock and runs clockwise, hence 90 − angle. */
const RING_GRADIENT = `conic-gradient(${Array.from({ length: 13 }, (_, i) => {
  const angle = i * 30
  return `hsl(${(450 - angle) % 360} 100% 50%) ${angle}deg`
}).join(", ")})`

/* Pointer capture keeps a drag going when the finger leaves the control. */
function dragHandlers(update: PointerHandler, accept?: (e: ReactPointerEvent<HTMLDivElement>) => boolean) {
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (accept && !accept(e)) return
      e.currentTarget.setPointerCapture(e.pointerId)
      update(e)
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e)
    },
  }
}

const SquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="13" height="18" rx="2" />
    <path d="M20 3v18" />
  </svg>
)

const WheelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7l5 5-5 5-5-5z" />
  </svg>
)

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

type Props = {
  initial: string
  /** What Apply will actually store, shown in the preview chip. */
  preview?: (hex: string) => string
  /** The user colour slots; with `onSaveUserColor`, shows a "Save to" row. */
  userColors?: (string | null)[]
  onSaveUserColor?: (index: number, hex: string) => void
  onApply: (hex: string) => void
  onClose: () => void
}

export function ColorPickerDialog({ initial, preview, userColors, onSaveUserColor, onApply, onClose }: Props) {
  const t = useT()
  const [mode, setMode] = useState<Mode>("square")
  const [hsv, setHsvState] = useState<Hsv>(() => hexToHsv(HEX_COLOR.test(initial) ? initial : "#ffffff"))
  const [hexText, setHexText] = useState(() => hsvToHex(hsv.h, hsv.s, hsv.v).toUpperCase())

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v)
  const hueHex = hsvToHex(hsv.h, 100, 100)

  const setHsv = (next: Hsv) => {
    setHsvState(next)
    setHexText(hsvToHex(next.h, next.s, next.v).toUpperCase())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  /* Square view: saturation left → right, value top (black) → bottom. */
  const onSquare: PointerHandler = e => {
    const r = e.currentTarget.getBoundingClientRect()
    setHsv({
      ...hsv,
      s: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
      v: clamp(((e.clientY - r.top) / r.height) * 100, 0, 100),
    })
  }
  const onHueBar: PointerHandler = e => {
    const r = e.currentTarget.getBoundingClientRect()
    setHsv({ ...hsv, h: clamp(((e.clientY - r.top) / r.height) * 360, 0, 359.9) })
  }

  /* Wheel view. The ring element is a full disc with its middle masked away,
     so a press inside the hole must not count as picking a hue. */
  const ringPoint = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2), radius: r.width / 2 }
  }
  const onRingAccept = (e: ReactPointerEvent<HTMLDivElement>) => {
    const { dx, dy, radius } = ringPoint(e)
    return Math.hypot(dx, dy) >= radius - RING_WIDTH - 4
  }
  const onRing: PointerHandler = e => {
    const { dx, dy } = ringPoint(e)
    const angle = (Math.atan2(-dy, dx) * 180) / Math.PI
    setHsv({ ...hsv, h: (angle + 360) % 360 })
  }
  /* The diamond is the square turned 45° clockwise (white on top, full hue on
     the right, black below), so the pointer is turned back before reading it. */
  const onDiamond: PointerHandler = e => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const side = el.offsetWidth
    const px = e.clientX - (r.left + r.width / 2)
    const py = e.clientY - (r.top + r.height / 2)
    const c = Math.SQRT1_2
    const x = px * c + py * c
    const y = -px * c + py * c
    setHsv({
      ...hsv,
      s: clamp((x / side + 0.5) * 100, 0, 100),
      v: clamp(100 - (y / side + 0.5) * 100, 0, 100),
    })
  }

  const hueRad = (hsv.h * Math.PI) / 180
  const knobRadius = `(var(--cp-size) / 2 - ${RING_WIDTH / 2}px)`

  const onHexChange = (text: string) => {
    setHexText(text)
    const candidate = text.trim().startsWith("#") ? text.trim() : `#${text.trim()}`
    if (HEX_COLOR.test(candidate)) setHsvState(hexToHsv(candidate))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box cp-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.bgColor.custom")}
        onClick={e => e.stopPropagation()}
      >
        <div className="cp-tabs" role="tablist">
          {(["square", "wheel"] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`cp-tab${mode === m ? " cp-tab--active" : ""}`}
              onClick={() => setMode(m)}
              title={t(`settings.bgColor.${m}`)}
              aria-label={t(`settings.bgColor.${m}`)}
            >
              {m === "square" ? <SquareIcon /> : <WheelIcon />}
            </button>
          ))}
        </div>

        <div className="cp-stage">
          {mode === "square" ? (
            <div className="cp-square">
              <div className="cp-sv" style={{ backgroundColor: hueHex }} {...dragHandlers(onSquare)}>
                <span className="cp-knob" style={{ left: `${hsv.s}%`, top: `${hsv.v}%` }} />
              </div>
              <div className="cp-hue" {...dragHandlers(onHueBar)}>
                <span className="cp-hue__knob" style={{ top: `${(hsv.h / 360) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="cp-wheel">
              <div className="cp-ring" style={{ background: RING_GRADIENT }} {...dragHandlers(onRing, onRingAccept)} />
              <span
                className="cp-knob"
                style={{
                  left: `calc(50% + ${Math.cos(hueRad).toFixed(4)} * ${knobRadius})`,
                  top: `calc(50% - ${Math.sin(hueRad).toFixed(4)} * ${knobRadius})`,
                }}
              />
              <div className="cp-diamond" style={{ backgroundColor: hueHex }} {...dragHandlers(onDiamond)}>
                <span className="cp-knob" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="cp-footer">
          <div className="cp-preview" style={{ backgroundColor: preview ? preview(hex) : hex }} />
          <input
            className="cp-hex"
            type="text"
            value={hexText}
            maxLength={7}
            spellCheck={false}
            aria-label={t("settings.bgColor.hex")}
            onChange={e => onHexChange(e.target.value)}
            onBlur={() => setHexText(hex.toUpperCase())}
          />
          <button type="button" className="btn-primary cp-apply" onClick={() => onApply(hex)}>
            <CheckIcon />
            {t("settings.bgColor.apply")}
          </button>
        </div>

        {userColors && onSaveUserColor && (
          <div className="cp-slots">
            <span className="cp-slots__label">{t("settings.bgColor.saveTo")}</span>
            {userColors.map((color, i) => (
              <button
                key={i}
                type="button"
                className={`cp-slot${color ? "" : " cp-slot--empty"}`}
                style={color ? { backgroundColor: color } : undefined}
                onClick={() => onSaveUserColor(i, hex)}
                title={`${t("settings.bgColor.saveTo")}: ${t("settings.bgColor.userSlot")} ${i + 1}`}
                aria-label={`${t("settings.bgColor.saveTo")}: ${t("settings.bgColor.userSlot")} ${i + 1}`}
              >
                {!color && <PlusIcon />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
