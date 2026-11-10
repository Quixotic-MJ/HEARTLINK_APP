/**
 * HeartLink colour system: single source of truth (generated).
 * Drop into HeartLink-mobile/constants/theme.ts. The `Colors` export keeps the
 * Expo-template keys (text, background, tint, icon, tabIcon*) so themed-text,
 * themed-view and useThemeColor keep working.
 *
 * Every hue has four shades:
 *   x       exact logo colour: large fills, illustrations, gradients only
 *   xMid    >= 3:1 on white/surface: rings, progress bars, chart lines, icons
 *   xText   >= 4.5:1 on surface AND on xTint: any text or small icon
 *   xTint   soft background for chips, banners, icon badges
 */
export const hues = {
  "blue": "#3B82F6",
  "sky": "#4FB6E6",
  "teal": "#38B3B5",
  "lime": "#B2D65A",
  "success": "#33CC82",
  "warning": "#FF9A2E",
  "danger": "#FF4B4B"
} as const;

export const light = {
  "background": "#F2F6FA",
  "surface": "#FFFFFF",
  "surfaceAlt": "#EEF3F8",
  "border": "#E2E8F0",
  "borderStrong": "#CBD5E1",
  "text": "#0F172A",
  "textSoft": "#475569",
  "textMuted": "#64748B",
  "disabledFill": "#D9E0E8",
  "disabledText": "#7E8B98",
  "scrim": "rgba(15,23,42,0.55)",
  "shadow": "rgba(15,23,42,0.08)",
  "ink": "#0F172A",
  "onInk": "#FFFFFF",
  "onInkSoft": "rgba(255,255,255,0.65)",
  "overlayOnInk": "rgba(255,255,255,0.12)",
  "focusRing": "#2E9AE8",
  "primary": "#1478B8",
  "primaryPressed": "#0F639A",
  "onPrimary": "#FFFFFF",
  "blue": "#3B82F6",
  "blueMid": "#3B82F6",
  "blueText": "#2563EB",
  "blueTint": "#EFF6FF",
  "sky": "#4FB6E6",
  "skyMid": "#4293B8",
  "skyText": "#377594",
  "skyTint": "#E6F5FC",
  "teal": "#38B3B5",
  "tealMid": "#309A9B",
  "tealText": "#247878",
  "tealTint": "#E3F5F5",
  "lime": "#B2D65A",
  "limeMid": "#79933F",
  "limeText": "#637534",
  "limeTint": "#F1F7DF",
  "success": "#33CC82",
  "successMid": "#269D66",
  "successText": "#1B7C50",
  "successTint": "#E6F7EE",
  "warning": "#FF9A2E",
  "warningMid": "#C87822",
  "warningText": "#9D6018",
  "warningTint": "#FFF1DC",
  "danger": "#FF4B4B",
  "dangerMid": "#FA4A4A",
  "dangerText": "#C03D3D",
  "dangerTint": "#FDECEC",
  "successSolid": "#1E8556",
  "onSuccess": "#FFFFFF",
  "dangerSolid": "#D44242",
  "onDanger": "#FFFFFF",
  "warningSolid": "#FF9A2E",
  "onWarning": "#152131"
} as const;

export const dark: Record<keyof typeof light, string> = {
  "background": "#0F1720",
  "surface": "#17212B",
  "surfaceAlt": "#1F2B37",
  "border": "#2A3745",
  "borderStrong": "#3A4857",
  "text": "#EEF3F8",
  "textSoft": "#A9B6C2",
  "textMuted": "#8692A0",
  "disabledFill": "#263341",
  "disabledText": "#5F6E7D",
  "scrim": "rgba(0,0,0,0.6)",
  "shadow": "rgba(0,0,0,0.35)",
  "ink": "#0A1118",
  "onInk": "#FFFFFF",
  "onInkSoft": "rgba(255,255,255,0.65)",
  "overlayOnInk": "rgba(255,255,255,0.12)",
  "focusRing": "#4FB6E6",
  "primary": "#1478B8",
  "primaryPressed": "#0F639A",
  "onPrimary": "#FFFFFF",
  "blue": "#3B82F6",
  "blueMid": "#3B82F6",
  "blueText": "#60A5FA",
  "blueTint": "#1E293B",
  "sky": "#4FB6E6",
  "skyMid": "#4FB6E6",
  "skyText": "#4FB6E6",
  "skyTint": "#203949",
  "teal": "#38B3B5",
  "tealMid": "#38B3B5",
  "tealText": "#38B3B5",
  "tealTint": "#1C3841",
  "lime": "#B2D65A",
  "limeMid": "#B2D65A",
  "limeText": "#B2D65A",
  "limeTint": "#303E33",
  "success": "#33CC82",
  "successMid": "#33CC82",
  "successText": "#33CC82",
  "successTint": "#1B3C39",
  "warning": "#FF9A2E",
  "warningMid": "#FF9A2E",
  "warningText": "#FF9A2E",
  "warningTint": "#3C342B",
  "danger": "#FF4B4B",
  "dangerMid": "#FF4B4B",
  "dangerText": "#FF5C5C",
  "dangerTint": "#3C2830",
  "successSolid": "#33CC82",
  "onSuccess": "#0F1720",
  "dangerSolid": "#FF5C5C",
  "onDanger": "#0F1720",
  "warningSolid": "#FF9A2E",
  "onWarning": "#152131"
};

export type ThemeColors = typeof light;

/** Convenience alias – use in style objects that are evaluated at load time. */
export const theme = light;

/**
 * HL-137: dark mode is on. People choose Light, Dark or System (the default) in Settings › Appearance.
 * Setting this back to false forces light everywhere again (useAppColorScheme, the root layout and Appearance).
 */
export const DARK_MODE_ENABLED = true;

// Expo-template compatible keys
export const Colors = {
  light: { ...light, tint: light.primary, icon: light.textSoft, tabIconDefault: light.textMuted, tabIconSelected: light.primary },
  dark:  { ...dark,  tint: dark.primary,  icon: dark.textSoft,  tabIconDefault: dark.textMuted,  tabIconSelected: dark.primary },
};

export const gradients = {
  brand: ['#2B84FF', '#38B3B5', '#33CC82', '#B2D65A'],     // splash, hero moments only
  scoreBar: ['#FF4B4B', '#FF9A2E', '#B2D65A', '#33CC82'],  // ScoreGradientBar (low to high)
  pacer: ['#4FB6E6', '#2B84FF'],                           // breathing pacer circle
} as const;

// ---- Health Stability Score bands ----
// What patients read for each level (HL-091: a wellness indicator, not a risk result). The stored names
// ("Elevated Risk", "Critical"...) stay: the server's rules, recipes, exercises and the staff portal use them.
const BAND_NAMES: Record<string, string> = {
  Stable: "On track",
  Moderate: "Room to improve",
  "Elevated Risk": "Needs attention",
  Critical: "Get checked",
};
export function bandName(tier: string): string {
  return BAND_NAMES[tier] ?? tier;
}

// The same cut-offs and names as the server (hss_service.determine_tier) and the dashboard: 80 / 60 / 50.
export type ScoreBand = 'critical' | 'elevated' | 'moderate' | 'good';
export function scoreBand(score: number, c: ThemeColors) {
  if (score < 50) return { key: 'critical' as const, label: BAND_NAMES.Critical, ring: c.dangerMid,  text: c.dangerText,  tint: c.dangerTint };
  if (score < 60) return { key: 'elevated' as const, label: BAND_NAMES["Elevated Risk"], ring: c.warningMid, text: c.warningText, tint: c.warningTint };
  if (score < 80) return { key: 'moderate' as const, label: BAND_NAMES.Moderate, ring: c.limeMid,    text: c.limeText,    tint: c.limeTint };
  return              { key: 'good' as const,     label: BAND_NAMES.Stable, ring: c.successMid, text: c.successText, tint: c.successTint };
}

// ---- Limit bars (sodium, sat fat): green under 70%, orange to 100%, red over ----
export function limitStatus(used: number, limit: number, c: ThemeColors) {
  const ratio = limit > 0 ? used / limit : 0;
  if (ratio < 0.7) return { key: 'ok' as const,   fill: c.successMid, text: c.successText };
  if (ratio <= 1)  return { key: 'near' as const, fill: c.warningMid, text: c.warningText };
  return                  { key: 'over' as const, fill: c.dangerMid,  text: c.dangerText };
}

// ---- Icon-chip categories (bg, icon) ----
export const categoryChip = (c: ThemeColors) => ({
  vitals:   { bg: c.blueTint,    fg: c.blueText },
  meals:    { bg: c.tealTint,    fg: c.tealText },
  movement: { bg: c.limeTint,    fg: c.limeText },
  sleep:    { bg: c.skyTint,     fg: c.skyText },
  symptoms: { bg: c.surfaceAlt,  fg: c.textSoft },
});

/**
 * Design-system colours (documentation/design-system/HEARTLINK.md). Same values as the
 * `ds-*` Tailwind classes; use these for inline, animated and SVG styles.
 */
export const ds = {
  light: {
    canvas: "#ffffff",
    surface: "#f6f5f4",
    surfaceAlt: "#f0eeec",
    hairline: "#e5e3df",
    hairlineSoft: "#ede9e4",
    hairlineStrong: "#c8c4be",
    ink: "#1a1a1a",
    charcoal: "#37352f",
    slate: "#5d5b54",
    steel: "#787671",
    muted: "#a39e98",
    primary: "#1478b8",
    primaryPressed: "#0f639a",
    onPrimary: "#ffffff",
    line: "#2e9ae8",
    tint: "#dcecfa",
    onTint: "#0a1530",
    link: "#0075de",
    peach: "#ffe8d4",
    rose: "#fde0ec",
    mint: "#d9f3e1",
    lavender: "#e6e0f5",
    sky: "#dcecfa",
    yellow: "#fef7d6",
    yellowBold: "#f9e79f",
    warmText: "#793400",
    success: "#1aae39",
    danger: "#e03131",
    navy: "#0a1530",
  },
  dark: {
    canvas: "#191919",
    surface: "#202020",
    surfaceAlt: "#2a2a2a",
    hairline: "#2f2f2f",
    hairlineSoft: "#262626",
    hairlineStrong: "#454545",
    ink: "#f2f1ee",
    charcoal: "#e3e2de",
    slate: "#b5b3ad",
    steel: "#9b9a97",
    muted: "#6b6a67",
    primary: "#1478b8",
    primaryPressed: "#0f639a",
    onPrimary: "#ffffff",
    line: "#4fb6e6",
    tint: "#1b3346",
    onTint: "#dcecfa",
    link: "#4da3ff",
    peach: "#3d2a1e",
    rose: "#3b2330",
    mint: "#1f3527",
    lavender: "#2c2640",
    sky: "#1b3346",
    yellow: "#3a3420",
    yellowBold: "#4a4020",
    warmText: "#ffb37a",
    success: "#3ccb5a",
    danger: "#ff6b6b",
    navy: "#0a1530",
  },
} as const;

export type DsColors = { [K in keyof typeof ds.light]: string };
