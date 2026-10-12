// app/components/LanguageSwitch.tsx
//
// A compact language toggle for the first screen of the Demo and Help, so a
// newcomer who can't read the default language can switch before reading on,
// without first finding Settings.

import { useT } from "../../utils/i18n"
import { AVAILABLE_LANGUAGES, getLanguage, setLanguage, type Language } from "../../utils/settings"

/* Each language is named in itself, not in the current interface language —
   someone looking for Russian must recognise "Русский", not "Russian". */
const NATIVE_NAMES: Record<Language, string> = {
  en: "English",
  ru: "Русский",
}

export function LanguageSwitch() {
  // useT re-renders this on lingodrill:languagechange, so getLanguage() below
  // always reflects the language just picked.
  const t = useT()
  const current = getLanguage()

  return (
    <div className="lang-switch" role="group" aria-label={t("settings.language")}>
      {AVAILABLE_LANGUAGES.map(code => (
        <button
          key={code}
          type="button"
          lang={code}
          className={`lang-switch__btn${code === current ? " lang-switch__btn--active" : ""}`}
          aria-pressed={code === current}
          title={NATIVE_NAMES[code]}
          aria-label={NATIVE_NAMES[code]}
          onClick={() => {
            if (code !== current) setLanguage(code)
          }}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
