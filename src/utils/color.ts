// utils/color.ts
//
// Colour-space conversions shared by the background settings and the colour
// picker dialog. Hue in degrees [0, 360), everything else in percent [0, 100].

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const byte = (v: number) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0")
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

function hueOf(r: number, g: number, b: number, max: number, d: number): number {
  if (d === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: hueOf(r, g, b, max, d), s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  const [r, g, b] = rgbSector(h, c, x)
  return rgbToHex(r + m, g + m, b + m)
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  return { h: hueOf(r, g, b, max, d), s: max === 0 ? 0 : (d / max) * 100, v: max * 100 }
}

export function hsvToHex(h: number, s: number, v: number): string {
  const vn = v / 100
  const c = vn * (s / 100)
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vn - c
  const [r, g, b] = rgbSector(h, c, x)
  return rgbToHex(r + m, g + m, b + m)
}

function rgbSector(h: number, c: number, x: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  if (hue < 60) return [c, x, 0]
  if (hue < 120) return [x, c, 0]
  if (hue < 180) return [0, c, x]
  if (hue < 240) return [0, x, c]
  if (hue < 300) return [x, 0, c]
  return [c, 0, x]
}
