// Mirrors tailwind.config.ts tt.* palette in the parent repo — a parity test
// in the web repo enforces the shared tokens.
export const Colors = {
  bg: '#0F0F1F',
  bgAlt: '#0A0A1A',
  surface: '#1A1A2E',
  card: 'rgba(255,255,255,0.03)',
  cardHover: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.06)',

  orange: '#D35400',
  gold: '#F39C12', // legacy tamtam.gold (not part of the tt.* palette)
  orangeLight: '#FEF0E7', // tt.orange-light
  orangeMid: '#F0997B',
  orangeDark: '#9A3D08',
  orangeMuted: 'rgba(211,84,0,0.15)',

  teal: '#1D9E75',
  tealMid: '#5DCAA5',
  tealLight: '#E1F5EE',
  tealMuted: 'rgba(29,158,117,0.10)',
  tealHover: '#178a65',

  ivory: '#F5F3EE',
  night2: '#111128',

  textPrimary: '#EDEDED',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.40)',
  textFaint: 'rgba(255,255,255,0.30)',
  textGhost: 'rgba(255,255,255,0.20)',

  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(255,255,255,0.10)',

  error: '#F09595',
  errorBg: 'rgba(239,68,68,0.10)',
  warning: '#F0997B',
  success: '#1D9E75',
  successBg: 'rgba(29,158,117,0.10)',

  whatsapp: '#25D366',
  whatsappBg: 'rgba(37,211,102,0.10)',

  // PWA-look tokens (globals.css / echo pages) — not part of the tt.* parity set
  night3: '#141420', // --tt-night-3, PWA auth input background
  inputBorder: 'rgba(255,255,255,0.07)', // --tt-border, PWA auth input border
  heroTealBg: 'rgba(29,158,117,0.12)', // solid stand-in for .echo-earnings-bg gradient
  heroTealBorder: 'rgba(29,158,117,0.20)', // border-[#1D9E75]/20
  tealSoft: 'rgba(29,158,117,0.20)', // bg-[#1D9E75]/20 (avatars)
  tealBorder30: 'rgba(29,158,117,0.30)', // border-[#1D9E75]/30
  navBg: 'rgba(10,10,26,0.97)', // .echo-bottom-nav background
  navBorder: 'rgba(29,158,117,0.12)', // .echo-bottom-nav border-top
  shareGreen: '#1A8D4A', // PWA WhatsApp share CTA (bg-[#1a8d4a])
  badgeTealBg: 'rgba(29,158,117,0.15)', // StatusBadge active
  badgeOrangeBg: 'rgba(211,84,0,0.15)', // StatusBadge new/pending
  badgeOrangeBorder: 'rgba(211,84,0,0.20)',
  progressTrack: 'rgba(255,255,255,0.05)', // bg-white/5 progress rails
  divider: 'rgba(255,255,255,0.05)', // border-white/5 hairlines
  btnGhostBg: 'rgba(255,255,255,0.05)', // bg-white/5 secondary buttons
  btnGhostBorder: 'rgba(255,255,255,0.10)', // border-white/10
}
