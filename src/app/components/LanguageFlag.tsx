// app/components/LanguageFlag.tsx
//
// A flag standing for an interface language. Drawn as SVG rather than as a
// flag emoji: Windows has no flag glyphs and shows the bare letters "GB".

import { useId } from "react"
import type { Language } from "../../utils/settings"

/* Every flag is cropped to the same 3:2 box, so the button holding one does
   not change width when the language changes. The Union Jack is 2:1 and loses
   a sliver at each end, which is how flag icon sets usually show it. */
export function LanguageFlag({ lang }: { lang: Language }) {
  // The Union Jack clips its red diagonals, and the same flag is on screen
  // twice while the menu is open — each copy needs its own clip id. useId's
  // punctuation is stripped so the id is safe inside url(#…).
  const clipId = `flag-${useId().replace(/[^\w-]/g, "")}`

  return (
    <svg className="lang-flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
      {lang === "ru" ? (
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
          <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
        </>
      ) : (
        <svg viewBox="0 0 60 30" width="30" height="20" preserveAspectRatio="xMidYMid slice">
          <clipPath id={clipId}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clipId})`} stroke="#c8102e" strokeWidth="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      )}
    </svg>
  )
}
