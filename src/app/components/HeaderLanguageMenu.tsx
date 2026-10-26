// app/components/HeaderLanguageMenu.tsx
//
// The flag at the end of the header: the current interface language, opening
// a list of the others. It is on the bar itself, not in the burger drawer, so
// someone who cannot read the current language can find it without reading.

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { createPortal } from "react-dom"
import { useT } from "../../utils/i18n"
import { AVAILABLE_LANGUAGES, getLanguage, LANGUAGE_NATIVE_NAMES, setLanguage } from "../../utils/settings"
import { LanguageFlag } from "./LanguageFlag"

interface Props {
  open: boolean
  onToggle: () => void
  onClose: () => void
}

/* Open state belongs to the Header, so opening this closes the drawer and the
   Settings / About dropdowns and opening any of those closes this. */
export function HeaderLanguageMenu({ open, onToggle, onClose }: Props) {
  // useT re-renders this on lingodrill:languagechange, so getLanguage() below
  // always reflects the language just picked.
  const t = useT()
  const current = getLanguage()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  /* Portalled and pinned to the flag for the same reason as the header's other
     dropdowns: .header's backdrop-filter makes it the containing block of
     anything fixed inside it. Measured from the right, since the flag sits at
     the right end of the bar and the panel must not run off the screen. */
  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    onToggle()
  }

  // A measured panel left behind by a resize or scroll would point at nothing.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        btnRef.current?.focus()
      }
    }
    window.addEventListener("resize", onClose)
    window.addEventListener("scroll", onClose, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("resize", onClose)
      window.removeEventListener("scroll", onClose, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`header__lang${open ? " header__lang--open" : ""}`}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("settings.language")}: ${LANGUAGE_NATIVE_NAMES[current]}`}
        title={LANGUAGE_NATIVE_NAMES[current]}
      >
        <LanguageFlag lang={current} />
        <span className="header__lang-caret" aria-hidden="true">▾</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="header__dropdown-backdrop" onClick={onClose} aria-hidden="true" />
            <div
              className="lang-menu"
              role="menu"
              aria-label={t("settings.language")}
              style={
                pos
                  ? ({ "--dropdown-top": `${pos.top}px`, "--dropdown-right": `${pos.right}px` } as CSSProperties)
                  : undefined
              }
            >
              {AVAILABLE_LANGUAGES.map(code => (
                <button
                  key={code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={code === current}
                  lang={code}
                  className={`lang-menu__item${code === current ? " lang-menu__item--active" : ""}`}
                  onClick={() => {
                    if (code !== current) setLanguage(code)
                    onClose()
                  }}
                >
                  <LanguageFlag lang={code} />
                  {LANGUAGE_NATIVE_NAMES[code]}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
