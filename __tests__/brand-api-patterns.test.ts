import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Source code pattern audit tests.
 * These scan actual source to verify critical patterns are followed
 * across all brand-facing APIs — catching regressions without a running server.
 */

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath, pattern));
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

describe("Source Code Pattern Audit", () => {
  const brandApiDirs = ["app/api/campaigns", "app/api/admin"];
  const allApiFiles: string[] = [];

  for (const dir of brandApiDirs) {
    allApiFiles.push(...findFiles(dir, /route\.ts$/));
  }

  describe("No direct user_id on campaigns table", () => {
    for (const file of allApiFiles) {
      it(`${file} should not query campaigns by user_id`, () => {
        const content = readFile(file);
        if (!content) return;

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('.from("campaigns")') || line.includes("from('campaigns')")) {
            const context = lines.slice(i, Math.min(i + 10, lines.length)).join("\n");
            if (context.includes(".eq(")) {
              expect(context).not.toMatch(/\.eq\(\s*['"]user_id['"]/);
            }
          }
        }
      });
    }
  });

  describe("getEffectiveBrandId usage", () => {
    for (const file of allApiFiles) {
      it(`${file} should use getEffectiveBrandId if it queries campaigns`, () => {
        const content = readFile(file);
        if (!content) return;

        if (
          (content.includes('.from("campaigns")') || content.includes("from('campaigns')")) &&
          !file.includes("superadmin") &&
          !file.includes("avg-cpc") // avg-cpc is platform-wide, intentionally not brand-scoped
        ) {
          expect(content).toContain("getEffectiveBrandId");
        }
      });
    }
  });

  describe("Click counting goes through tracked_links", () => {
    for (const file of allApiFiles) {
      it(`${file} should not count clicks directly by campaign_id`, () => {
        const content = readFile(file);
        if (!content) return;

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('.from("clicks")') || lines[i].includes("from('clicks')")) {
            const context = lines.slice(i, i + 5).join("\n");
            // Clicks table doesn't have campaign_id — must go through tracked_links
            expect(context).not.toMatch(/\.eq\(['"]campaign_id['"]/);
          }
        }
      });
    }
  });

  describe("Soft-deleted users excluded", () => {
    // These files directly query the users table with .in("id", echoIds)
    // and should filter out soft-deleted users
    const filesRequiringDeletedAtFilter = [
      "app/api/admin/stats/route.ts",
      "app/api/admin/echos/route.ts",
      "app/api/admin/campaigns/performance/route.ts",
      "app/api/campaigns/route.ts", // notifyCampaignCompleted
    ];

    for (const file of filesRequiringDeletedAtFilter) {
      it(`${file} should filter out deleted users`, () => {
        const content = readFile(file);
        if (!content) return;
        expect(content).toContain("deleted_at");
      });
    }
  });

  describe("Antifraud page uses API route (not direct client queries)", () => {
    it("antifraud page should fetch from API, not use createClient for data queries", () => {
      const content = readFile("app/admin/antifraud/page.tsx");
      if (!content) return;

      // Should use fetch() to API route
      expect(content).toContain('fetch("/api/admin/antifraud")');
      // Should NOT use supabase.from("clicks") directly
      expect(content).not.toContain('.from("clicks")');
    });
  });

  describe("Antifraud API filters by brand campaigns", () => {
    it("antifraud API should scope clicks to brand's campaigns", () => {
      const content = readFile("app/api/admin/antifraud/route.ts");
      if (!content) return;

      expect(content).toContain("getEffectiveBrandId");
      expect(content).toContain("batteur_id");
      expect(content).toContain("tracked_links");
    });
  });

  describe("Stats API includes objective field", () => {
    it("should include objective in campaign SELECT", () => {
      const content = readFile("app/api/admin/stats/route.ts");
      if (!content) return;

      // The select query should include objective
      expect(content).toContain("objective");
    });
  });

  describe("Campaign queries use batteur_id", () => {
    const campaignQueryFiles = [
      "app/api/admin/stats/route.ts",
      "app/api/admin/analytics/route.ts",
      "app/api/admin/echos/route.ts",
      "app/api/admin/payouts/route.ts",
      "app/api/admin/antifraud/route.ts",
      "app/api/campaigns/route.ts",
    ];

    for (const file of campaignQueryFiles) {
      it(`${file} should use batteur_id for campaign ownership`, () => {
        const content = readFile(file);
        if (!content) return;

        if (content.includes('.from("campaigns")')) {
          expect(content).toContain("batteur_id");
        }
      });
    }
  });

  describe("Parallel queries", () => {
    const criticalApiFiles = [
      "app/api/admin/stats/route.ts",
      "app/api/admin/campaigns/performance/route.ts",
      "app/api/admin/antifraud/route.ts",
    ];

    for (const file of criticalApiFiles) {
      it(`${file} should use Promise.all for independent queries`, () => {
        const content = readFile(file);
        if (!content) return;

        const awaitLines = content.split("\n").filter(
          (line) => line.includes("await") && (line.includes("supabase") || line.includes(".from("))
        );

        // If there are 3+ sequential supabase awaits, Promise.all should be present
        if (awaitLines.length >= 3) {
          expect(content).toContain("Promise.all");
        }
      });
    }
  });
});
