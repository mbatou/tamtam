// Base URL for public share links (tracked redirects live on the web app)
export const SHARE_BASE_URL = "https://tamma.me";

// Echo revenue share — must match lib/constants.ts in the parent web repo.
export const ECHO_SHARE_PERCENT = 75;

// Shared FCFA formatter (e.g. 12 345 F)
export function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' F';
}
