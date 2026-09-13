import { HEX_COLOR, clamp, hexToHsl, hslToHex } from "./color"

export type StartPage = "library" | "favourites" | "last-sequence"
export type Language = "en" | "ru"
export type Theme = "light" | "dark"
export type ColorTheme = "normal" | "pastel" | "neon"
/* The Settings page is split one section per route, listed under the Settings
   tab in the header. The order here is the order of the menu, and each key is
   both the URL segment and the `settings.section.<key>` label. */
export type SettingsSection = "general" | "appearance" | "playback"
export const SETTINGS_SECTIONS: SettingsSection[] = ["general", "appearance", "playback"]
export const DEFAULT_SETTINGS_SECTION: SettingsSection = "general"
export const isSettingsSection = (v: string | undefined): v is SettingsSection =>
  SETTINGS_SECTIONS.includes(v as SettingsSection)
/* The page ground of one theme: "default" leaves the theme's own colour alone,
   anything else is a `#rrggbb`. Light and dark each keep their own. */
export type BgColor = string

const KEY_START_PAGE = "lingodrill.startPage"
const KEY_SUB_FONT_SIZE = "lingodrill.subFontSize"
const KEY_LAST_SEQUENCE = "lingodrill.lastSequence"
const KEY_FRAGMENT_GAP = "lingodrill.fragmentGap"
const KEY_TRIM_SILENCE_GAP = "lingodrill.trimSilenceGap"
const KEY_LANGUAGE = "lingodrill.language"
const KEY_THEME = "lingodrill.theme"
const KEY_COLOR_THEME = "lingodrill.colorTheme"
const KEY_BG_COLOR: Record<Theme, string> = {
  light: "lingodrill.bgColorLight",
  dark: "lingodrill.bgColorDark",
}
const KEY_BG_USER_COLORS: Record<Theme, string> = {
  light: "lingodrill.bgUserColorsLight",
  dark: "lingodrill.bgUserColorsDark",
}
const KEY_ONBOARDING_SEEN = "lingodrill.onboardingSeen"

export const DEFAULT_START_PAGE: StartPage = "library"
export const DEFAULT_SUB_FONT_SIZE = 14
export const SUB_FONT_SIZE_MIN = 10
export const SUB_FONT_SIZE_MAX = 32
export const DEFAULT_FRAGMENT_GAP = 2
export const FRAGMENT_GAP_MIN = 0
export const FRAGMENT_GAP_MAX = 10
/* Silence kept on each side of a gap that "Trim silence" removes, in seconds.
   Same units and range as the fragment gap, so both rows behave identically. */
export const DEFAULT_TRIM_SILENCE_GAP = 2
export const TRIM_SILENCE_GAP_MIN = 0
export const TRIM_SILENCE_GAP_MAX = 10
export const DEFAULT_LANGUAGE: Language = "en"
/* Languages offered in Settings. Anything listed here must have a dictionary in
   utils/i18n.ts; a stored language that is not on this list falls back to the
   default rather than stranding the user in a half-translated interface. */
export const AVAILABLE_LANGUAGES: Language[] = ["en", "ru"]
export const DEFAULT_THEME: Theme = "light"
export const DEFAULT_COLOR_THEME: ColorTheme = "normal"
export const DEFAULT_BG_COLOR: BgColor = "default"

/* The swatch rows in Settings, after sDraw's: pastels for the light theme,
   near-blacks of the same hues for the dark one. The pastels are sDraw's with
   saturation cut by 30% three times and then 20% (to 27%) at the same
   lightness — full strength they drowned the cards standing on them. */
export const BG_PALETTES: Record<Theme, string[]> = {
  light: ["#e0c7c7", "#e1cbdb", "#d3d2e5", "#c9e0e1", "#cfe2cd", "#e4e4ce", "#e2d8cd", "#ffffff", "#b8b8b8"],
  dark: ["#300000", "#30002a", "#050535", "#00292b", "#012601", "#2e2e00", "#2b1603", "#333333", "#000000"],
}

/* How far a free pick may stray towards the other theme. Text colours are the
   theme's, so a light ground darker than this (or a dark one lighter) starts
   to swallow the type standing on it. Hue and saturation stay the user's. */
const BG_LIGHTNESS_LIMIT: Record<Theme, [number, number]> = {
  light: [70, 100],
  dark: [0, 25],
}

/**
 * Keeps the picked hue and saturation, pulls lightness into the band the theme
 * can carry text over. A colour already inside it is returned untouched (just
 * lower-cased), so palette colours survive the HSL round trip exactly.
 */
export function normalizeBgColor(hex: string, theme: Theme): string {
  if (!HEX_COLOR.test(hex)) return DEFAULT_BG_COLOR
  const { h, s, l } = hexToHsl(hex)
  const [min, max] = BG_LIGHTNESS_LIMIT[theme]
  if (l >= min && l <= max) return hex.toLowerCase()
  return hslToHex(h, s, clamp(l, min, max))
}

export function getStartPage(): StartPage {
  const v = localStorage.getItem(KEY_START_PAGE)
  if (v === "library" || v === "favourites" || v === "last-sequence") return v
  return DEFAULT_START_PAGE
}

export function setStartPage(v: StartPage): void {
  localStorage.setItem(KEY_START_PAGE, v)
}

export function getSubFontSize(): number {
  const raw = localStorage.getItem(KEY_SUB_FONT_SIZE)
  const n = raw ? parseInt(raw, 10) : NaN
  if (!isNaN(n) && n >= SUB_FONT_SIZE_MIN && n <= SUB_FONT_SIZE_MAX) return n
  return DEFAULT_SUB_FONT_SIZE
}

export function setSubFontSize(n: number): void {
  localStorage.setItem(KEY_SUB_FONT_SIZE, String(n))
  applySubFontSize(n)
}

export function applySubFontSize(n: number = getSubFontSize()): void {
  document.documentElement.style.setProperty("--sub-font-size", `${n}px`)
}

export type LastSequence = { audioId: string; seqId: string }

export function getLastSequence(): LastSequence | null {
  const raw = localStorage.getItem(KEY_LAST_SEQUENCE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.audioId === "string" && typeof parsed.seqId === "string") {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

export function setLastSequence(v: LastSequence): void {
  localStorage.setItem(KEY_LAST_SEQUENCE, JSON.stringify(v))
}

export function getFragmentGap(): number {
  const raw = localStorage.getItem(KEY_FRAGMENT_GAP)
  if (raw === null) return DEFAULT_FRAGMENT_GAP
  const n = parseFloat(raw)
  if (!isNaN(n) && n >= FRAGMENT_GAP_MIN && n <= FRAGMENT_GAP_MAX) return n
  return DEFAULT_FRAGMENT_GAP
}

export function setFragmentGap(n: number): void {
  const clamped = Math.max(FRAGMENT_GAP_MIN, Math.min(FRAGMENT_GAP_MAX, n))
  localStorage.setItem(KEY_FRAGMENT_GAP, String(clamped))
}

export function getTrimSilenceGap(): number {
  const raw = localStorage.getItem(KEY_TRIM_SILENCE_GAP)
  if (raw === null) return DEFAULT_TRIM_SILENCE_GAP
  const n = parseFloat(raw)
  if (!isNaN(n) && n >= TRIM_SILENCE_GAP_MIN && n <= TRIM_SILENCE_GAP_MAX) return n
  return DEFAULT_TRIM_SILENCE_GAP
}

export function setTrimSilenceGap(n: number): void {
  const clamped = Math.max(TRIM_SILENCE_GAP_MIN, Math.min(TRIM_SILENCE_GAP_MAX, n))
  localStorage.setItem(KEY_TRIM_SILENCE_GAP, String(clamped))
}

export function getLanguage(): Language {
  const v = localStorage.getItem(KEY_LANGUAGE)
  // Checked against what is actually offered, not against the type: anyone who
  // selected a language that has since been withdrawn falls back to the default
  // rather than being stranded in a half-translated interface.
  if (AVAILABLE_LANGUAGES.includes(v as Language)) return v as Language
  return DEFAULT_LANGUAGE
}

export function setLanguage(v: Language): void {
  localStorage.setItem(KEY_LANGUAGE, v)
  document.documentElement.lang = v
  window.dispatchEvent(new CustomEvent("lingodrill:languagechange", { detail: v }))
}

export function getTheme(): Theme {
  const v = localStorage.getItem(KEY_THEME)
  if (v === "light" || v === "dark") return v
  return DEFAULT_THEME
}

export function setTheme(v: Theme): void {
  localStorage.setItem(KEY_THEME, v)
  applyTheme(v)
}

export function applyTheme(v: Theme = getTheme()): void {
  document.documentElement.setAttribute("data-theme", v)
}

export function getColorTheme(): ColorTheme {
  const v = localStorage.getItem(KEY_COLOR_THEME)
  if (v === "normal" || v === "pastel" || v === "neon") return v
  return DEFAULT_COLOR_THEME
}

export function setColorTheme(v: ColorTheme): void {
  localStorage.setItem(KEY_COLOR_THEME, v)
  applyColorTheme(v)
}

export function applyColorTheme(v: ColorTheme = getColorTheme()): void {
  document.documentElement.setAttribute("data-color-theme", v)
}

/* Retired background settings: the pattern (its choice and its cached tile,
   which can be large — a data: URI of every drawing) and the single tint that
   was mixed into both themes before each theme got its own colour. Nothing
   reads them any more, so they would otherwise sit in localStorage forever. */
export function clearRetiredBgSettings(): void {
  localStorage.removeItem("lingodrill.bgPattern")
  localStorage.removeItem("lingodrill.bgPatternTile")
  localStorage.removeItem("lingodrill.bgTint")
}

export function getBgColor(theme: Theme): BgColor {
  const v = localStorage.getItem(KEY_BG_COLOR[theme])
  return v ? normalizeBgColor(v, theme) : DEFAULT_BG_COLOR
}

/* Normalised on the way in, so what is stored is the colour the page actually
   wears — nothing downstream has to re-derive it. */
export function setBgColor(theme: Theme, v: BgColor): void {
  const next = v === DEFAULT_BG_COLOR ? DEFAULT_BG_COLOR : normalizeBgColor(v, theme)
  localStorage.setItem(KEY_BG_COLOR[theme], next)
  applyBgColors()
}

/* Slots at the end of each swatch row that the user fills from the colour
   picker dialog. `null` is an empty slot. */
export const BG_USER_SLOTS = 3

export function getBgUserColors(theme: Theme): (string | null)[] {
  let stored: unknown = null
  try {
    stored = JSON.parse(localStorage.getItem(KEY_BG_USER_COLORS[theme]) ?? "null")
  } catch {
    // ignore — treated as all slots empty
  }
  const list = Array.isArray(stored) ? stored : []
  return Array.from({ length: BG_USER_SLOTS }, (_, i) => {
    const v = list[i]
    return typeof v === "string" && HEX_COLOR.test(v) ? normalizeBgColor(v, theme) : null
  })
}

/* Normalised like the ground itself, so a saved slot always holds a colour the
   theme can actually wear. */
export function setBgUserColor(theme: Theme, index: number, hex: string): void {
  if (index < 0 || index >= BG_USER_SLOTS || !HEX_COLOR.test(hex)) return
  const next = getBgUserColors(theme)
  next[index] = normalizeBgColor(hex, theme)
  localStorage.setItem(KEY_BG_USER_COLORS[theme], JSON.stringify(next))
}

/* Free colours, so they travel as `--bg-light` / `--bg-dark` custom properties
   on <html> rather than data attributes. index.css picks the one matching the
   active theme, which is why switching theme needs no call here. */
export function applyBgColors(): void {
  const root = document.documentElement
  for (const theme of ["light", "dark"] as Theme[]) {
    const v = getBgColor(theme)
    if (v === DEFAULT_BG_COLOR) root.style.removeProperty(`--bg-${theme}`)
    else root.style.setProperty(`--bg-${theme}`, v)
  }
}

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(KEY_ONBOARDING_SEEN) === "1"
}

export function setOnboardingSeen(): void {
  localStorage.setItem(KEY_ONBOARDING_SEEN, "1")
}

export function applyLanguage(v: Language = getLanguage()): void {
  document.documentElement.lang = v
}
