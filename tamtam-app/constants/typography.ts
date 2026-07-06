// Single source of truth for text styles. RN <Text> does NOT inherit
// fontFamily, so every Text style must set one explicitly — always via
// `Fonts.*` or a `Typography.*` spread, never a raw string, so a typo or a
// missing family can't silently fall back to the system font.
//
// Mirrors the PWA type system exactly (app/globals.css loads Syne 700/800 +
// DM Sans 400/500/600/700):
//   font-syne font-bold   → Syne_700Bold      (headings)
//   font-syne font-black  → Syne_800ExtraBold (hero titles, brand moments)
//   font-medium           → DMSans_500Medium
//   font-semibold         → DMSans_600SemiBold
//   font-bold             → DMSans_700Bold
//   font-black (no syne)  → DMSans_700Bold    (browser clamps 900 → 700)
//
// IMPORTANT (Android): never combine one of these fontFamily faces with a
// `fontWeight` style property — pick the face that already carries the weight.
// The families listed here must stay in sync with useFonts() in app/_layout.tsx.
import type { TextStyle } from 'react-native'
import { Colors } from './colors'

export const Fonts = {
  /** Syne 700 — headings (PWA `font-syne font-bold`) */
  heading: 'Syne_700Bold',
  /** Syne 800 — hero titles / brand moments (PWA `font-syne font-black`) */
  hero: 'Syne_800ExtraBold',
  /** DM Sans 400 — body copy */
  body: 'DMSans_400Regular',
  /** DM Sans 500 — PWA `font-medium` */
  bodyMedium: 'DMSans_500Medium',
  /** DM Sans 600 — PWA `font-semibold` */
  bodySemiBold: 'DMSans_600SemiBold',
  /** DM Sans 700 — PWA `font-bold` (and clamped `font-black` off-Syne) */
  bodyBold: 'DMSans_700Bold',
} as const

export const Typography = {
  /** Screen titles (PWA h1 `text-xl font-bold font-syne`) */
  heading: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Section titles inside a screen (PWA h2 `text-sm font-bold font-syne`) */
  headingSmall: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Hero display title (PWA `text-[26px] font-black font-syne`) */
  hero: {
    fontFamily: Fonts.hero,
    fontSize: 26,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Hero balance figure (PWA `text-3xl font-black tracking-tight`, DM Sans) */
  balance: {
    fontFamily: Fonts.bodyBold,
    fontSize: 30,
    color: Colors.orange,
    letterSpacing: -0.75,
  } as TextStyle,
  /** Stat-tile numbers (PWA `text-lg font-black`, DM Sans) */
  stat: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Default body copy */
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  } as TextStyle,
  /** Secondary body copy */
  bodySmall: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  } as TextStyle,
  /** Medium-emphasis body (PWA `text-sm font-medium`) */
  bodyMedium: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Semi-emphasised body (PWA `text-sm font-semibold` — empty-state titles) */
  bodySemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Emphasised body (PWA `text-sm font-bold` — card titles, row values) */
  bodyBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Semi-emphasised secondary body (PWA `text-xs font-semibold`) */
  bodySmallSemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Emphasised secondary body (PWA `text-xs font-bold`) */
  bodySmallBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Fine print */
  caption: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textFaint,
  } as TextStyle,
  /** Fine print, semi-emphasised (PWA `text-[10px] font-semibold` captions) */
  captionSemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
  } as TextStyle,
  /** Fine print, emphasised (PWA `text-[10px] font-bold` badges/pills) */
  captionBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.textMuted,
  } as TextStyle,
  /** Uppercase kicker / eyebrow labels (PWA `text-[10px] font-semibold uppercase tracking-wider`) */
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  /** Primary button captions (PWA CTA `text-sm font-bold`) */
  button: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  } as TextStyle,
}
