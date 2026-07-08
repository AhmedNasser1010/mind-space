export interface ThemeHSL {
  card: string
  cardForeground: string
  border: string
  muted: string
  mutedForeground: string
}

export interface WidgetColorTheme {
  id: string
  name: string
  light: ThemeHSL
  dark: ThemeHSL
}

function hsl(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`
}

function theme(id: string, name: string, h: number, opts?: {
  lightS?: number; lightL?: number;
  darkS?: number; darkL?: number;
}): WidgetColorTheme {
  const ls = opts?.lightS ?? 55
  const ll = opts?.lightL ?? 96
  const ds = opts?.darkS ?? 40
  const dl = opts?.darkL ?? 12
  return {
    id,
    name,
    light: {
      card: hsl(h, ls, ll),
      cardForeground: hsl(h, ls - 5, ll - 78),
      border: hsl(h, ls - 20, ll - 11),
      muted: hsl(h, ls - 10, ll - 4),
      mutedForeground: hsl(h, ls - 25, ll - 56),
    },
    dark: {
      card: hsl(h, ds, dl),
      cardForeground: hsl(h, ds - 5, dl + 78),
      border: hsl(h, ds - 10, dl + 12),
      muted: hsl(h, ds - 10, dl + 4),
      mutedForeground: hsl(h, ds - 15, dl + 53),
    },
  }
}

export const WIDGET_THEMES: WidgetColorTheme[] = [
  theme('rose', 'Rose', 350),
  theme('pink', 'Pink', 330),
  theme('orange', 'Orange', 24),
  theme('amber', 'Amber', 38),
  theme('yellow', 'Yellow', 50, { lightL: 95, darkL: 14 }),
  theme('lime', 'Lime', 90),
  theme('green', 'Green', 142),
  theme('emerald', 'Emerald', 160),
  theme('cyan', 'Cyan', 190),
  theme('blue', 'Blue', 220),
  theme('violet', 'Violet', 270),
  theme('purple', 'Purple', 290),
]

export function getThemeVariables(id: string | undefined, isDark: boolean): Record<string, string> | null {
  if (!id || id === 'default') return null
  const t = WIDGET_THEMES.find((t) => t.id === id)
  if (!t) return null
  const vars = isDark ? t.dark : t.light
  return {
    '--card': vars.card,
    '--card-foreground': vars.cardForeground,
    '--border': vars.border,
    '--muted': vars.muted,
    '--muted-foreground': vars.mutedForeground,
  }
}

export function getSwatchStyle(id: string, isDark: boolean): Record<string, string> {
  if (id === 'default') {
    return isDark
      ? { backgroundColor: 'hsl(0 0% 12%)', borderColor: 'hsl(0 0% 25%)' }
      : { backgroundColor: 'hsl(0 0% 100%)', borderColor: 'hsl(0 0% 85%)' }
  }
  const t = WIDGET_THEMES.find((t) => t.id === id)
  if (!t) return {}
  const vars = isDark ? t.dark : t.light
  return {
    backgroundColor: `hsl(${vars.card})`,
    borderColor: `hsl(${vars.border})`,
  }
}
