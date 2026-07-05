import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Design-token parity between the web app (tailwind.config.ts tt.* palette)
 * and the mobile app (tamtam-app/constants/colors.ts). These are hand-copied
 * today; this test stops them drifting (the audit caught orangeLight shipped
 * as #F39C12 instead of #FEF0E7).
 */

const tailwindSrc = readFileSync(path.join(__dirname, "..", "tailwind.config.ts"), "utf8");
const mobileSrc = readFileSync(
  path.join(__dirname, "..", "tamtam-app", "constants", "colors.ts"),
  "utf8"
);

function webToken(name: string): string {
  const m = tailwindSrc.match(new RegExp(`["']?${name}["']?:\\s*["'](#[0-9A-Fa-f]{3,8})["']`));
  if (!m) throw new Error(`web token ${name} not found in tailwind.config.ts`);
  return m[1].toUpperCase();
}

function mobileToken(name: string): string {
  const m = mobileSrc.match(new RegExp(`${name}:\\s*["'](#[0-9A-Fa-f]{3,8})["']`));
  if (!m) throw new Error(`mobile token ${name} not found in tamtam-app/constants/colors.ts`);
  return m[1].toUpperCase();
}

// web tt.* token → mobile Colors key
const SHARED_TOKENS: Array<[web: string, mobile: string]> = [
  ["orange", "orange"],
  ["orange-light", "orangeLight"],
  ["orange-mid", "orangeMid"],
  ["orange-dark", "orangeDark"],
  ["night", "bgAlt"],
  ["night-2", "night2"],
  ["teal", "teal"],
  ["teal-mid", "tealMid"],
  ["teal-light", "tealLight"],
  ["ivory", "ivory"],
];

describe("web/mobile design-token parity", () => {
  for (const [web, mobile] of SHARED_TOKENS) {
    it(`tt.${web} === Colors.${mobile}`, () => {
      expect(mobileToken(mobile), `tt.${web} drifted between web and mobile`).toBe(webToken(web));
    });
  }
});
