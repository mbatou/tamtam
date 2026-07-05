// Single source of truth for text styles. RN <Text> does NOT inherit
// fontFamily, so every Text style must set one explicitly — always via
// `Fonts.*` or a `Typography.*` spread, never a raw string, so a typo or a
// missing family can't silently fall back to the system font.
//
// Mirrors the PWA type system: Syne (800 ExtraBold) for h1 / hero figures,
// DM Sans (400 / 600) for everything else. The families listed here must
// stay in sync with the useFonts() call in app/_layout.tsx.
import type { TextStyle } from 'react-native'
import { Colors } from './colors'

export const Fonts = {
  /** Syne 800 — headings, balance / stat figures (PWA font-syne h1) */
  heading: 'Syne_800ExtraBold',
  /** DM Sans 400 — body copy */
  body: 'DMSans_400Regular',
  /** DM Sans 600 — emphasised body, buttons, labels */
  bodySemiBold: 'DMSans_600SemiBold',
} as const

export const Typography = {
  /** Screen titles (PWA h1, ~text-[20px] font-syne) */
  heading: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Section titles inside a screen */
  headingSmall: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Hero balance figure (PWA .echo-earnings-bg number) */
  balance: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    color: Colors.orange,
    letterSpacing: -0.75,
  } as TextStyle,
  /** Stat-tile numbers (clicks, FCFA, counts) */
  stat: {
    fontFamily: Fonts.heading,
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
  /** Emphasised body (card titles, row values) */
  bodyBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Emphasised secondary body */
  bodySmallBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  } as TextStyle,
  /** Fine print */
  caption: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textFaint,
  } as TextStyle,
  /** Fine print, emphasised (badges, stat-tile captions) */
  captionBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
  } as TextStyle,
  /** Uppercase kicker / eyebrow labels */
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  /** Primary button captions */
  button: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  } as TextStyle,
}
