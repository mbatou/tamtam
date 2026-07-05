import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/**
 * Guards en/fr catalog parity:
 * 1. Every dot-path leaf key present in one language must exist in the other.
 * 2. For every shared key, the set of {placeholders} must match between en and fr.
 */

type Catalog = Record<string, unknown>;

function collectLeaves(obj: Catalog, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      collectLeaves(value as Catalog, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function placeholders(value: unknown): string[] {
  return (String(value).match(/\{[^{}]+\}/g) ?? []).sort();
}

const enLeaves = collectLeaves(en as Catalog);
const frLeaves = collectLeaves(fr as Catalog);

describe("i18n en/fr parity", () => {
  it("has every fr key present in en", () => {
    const missingInEn = Object.keys(frLeaves).filter((key) => !(key in enLeaves));
    expect(missingInEn, `Keys missing in messages/en.json:\n${missingInEn.join("\n")}`).toEqual([]);
  });

  it("has every en key present in fr", () => {
    const missingInFr = Object.keys(enLeaves).filter((key) => !(key in frLeaves));
    expect(missingInFr, `Keys missing in messages/fr.json:\n${missingInFr.join("\n")}`).toEqual([]);
  });

  it("has matching {placeholder} sets for every shared key", () => {
    const mismatches: string[] = [];
    for (const [key, enValue] of Object.entries(enLeaves)) {
      if (!(key in frLeaves)) continue; // covered by the key-parity tests above
      const enVars = placeholders(enValue);
      const frVars = placeholders(frLeaves[key]);
      if (enVars.join(",") !== frVars.join(",")) {
        mismatches.push(`${key}: en [${enVars.join(", ")}] vs fr [${frVars.join(", ")}]`);
      }
    }
    expect(mismatches, `Placeholder mismatches between en and fr:\n${mismatches.join("\n")}`).toEqual([]);
  });

  it("only contains string leaves", () => {
    const nonString = [
      ...Object.entries(enLeaves).filter(([, v]) => typeof v !== "string").map(([k]) => `en: ${k}`),
      ...Object.entries(frLeaves).filter(([, v]) => typeof v !== "string").map(([k]) => `fr: ${k}`),
    ];
    expect(nonString).toEqual([]);
  });
});
