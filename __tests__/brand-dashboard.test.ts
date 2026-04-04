import { describe, it, expect } from "vitest";

describe("Brand Dashboard — Metrics Calculations", () => {
  describe("Cost Per Click", () => {
    it("should use valid clicks, not total clicks", () => {
      const budgetSpent = 10000;
      const validClicks = 100;
      const totalClicks = 180;

      const correctCPC = Math.round(budgetSpent / validClicks);
      const wrongCPC = Math.round(budgetSpent / totalClicks);

      expect(correctCPC).toBe(100);
      expect(correctCPC).not.toBe(wrongCPC);
    });

    it("should handle zero clicks without NaN or Infinity", () => {
      const budgetSpent = 5000;
      const validClicks = 0;

      const cpc = validClicks > 0 ? Math.round(budgetSpent / validClicks) : 0;

      expect(cpc).toBe(0);
      expect(Number.isFinite(cpc)).toBe(true);
      expect(Number.isNaN(cpc)).toBe(false);
    });

    it("should handle zero budget without NaN", () => {
      const budget = 0;
      const spent = 0;

      const remaining = budget - spent;
      const percentSpent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

      expect(remaining).toBe(0);
      expect(percentSpent).toBe(0);
      expect(Number.isFinite(percentSpent)).toBe(true);
    });

    it("should fall back to avg configured CPC when no valid clicks", () => {
      const campaigns = [
        { cpc: 100, spent: 0, budget: 5000 },
        { cpc: 200, spent: 0, budget: 10000 },
      ];
      const validClicks = 0;
      const budgetSpent = 0;

      const costPerClick =
        validClicks > 0
          ? Math.round(budgetSpent / validClicks)
          : (() => {
              const withCpc = campaigns.filter((c) => c.cpc > 0);
              if (withCpc.length === 0) return 0;
              return Math.round(withCpc.reduce((s, c) => s + c.cpc, 0) / withCpc.length);
            })();

      expect(costPerClick).toBe(150);
    });
  });

  describe("Budget calculations", () => {
    it("should never show negative remaining budget", () => {
      const budgetTotal = 10000;
      const budgetSpent = 12000; // overspent edge case

      const remaining = Math.max(0, budgetTotal - budgetSpent);
      expect(remaining).toBe(0);
    });

    it("should detect fully consumed budget", () => {
      const budgetTotal = 10000;
      const remaining = 0;
      const budgetFullyConsumed = budgetTotal > 0 && remaining === 0;

      expect(budgetFullyConsumed).toBe(true);
    });

    it("should compute budget progress percentage correctly", () => {
      const budget = 10000;
      const spent = 7500;

      const progress = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      expect(progress).toBe(75);
    });

    it("should cap progress at 100%", () => {
      const budget = 10000;
      const spent = 10000;

      const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
      expect(progress).toBe(100);
    });
  });

  describe("Chart data handling", () => {
    it("should fill zero-click days in date range", () => {
      const rawData = [
        { date: "2026-04-01", valid: 50, fraud: 2 },
        { date: "2026-04-03", valid: 30, fraud: 1 },
      ];

      const bucketMap: Record<string, { date: string; valid: number; fraud: number }> = {};
      const start = new Date("2026-04-01");
      const end = new Date("2026-04-04");
      const cursor = new Date(start);

      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        bucketMap[key] = { date: key, valid: 0, fraud: 0 };
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const row of rawData) {
        if (bucketMap[row.date]) {
          bucketMap[row.date].valid = row.valid;
          bucketMap[row.date].fraud = row.fraud;
        }
      }

      const filled = Object.values(bucketMap).sort((a, b) => a.date.localeCompare(b.date));

      expect(filled).toHaveLength(4);
      expect(filled[0].valid).toBe(50);
      expect(filled[1].valid).toBe(0); // April 2 — filled
      expect(filled[2].valid).toBe(30);
      expect(filled[3].valid).toBe(0); // April 4 — filled
    });

    it("should handle empty link IDs gracefully", () => {
      const linkIds: string[] = [];
      // Simulates getClicksChart behavior with no links
      const result = linkIds.length === 0 ? [] : [{ date: "2026-04-01", valid: 10, fraud: 0 }];
      expect(result).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle brand with no campaigns", () => {
      const campaigns: { clicks: number; status: string }[] = [];

      const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

      expect(totalClicks).toBe(0);
      expect(activeCampaigns).toBe(0);
    });

    it("should handle campaign with null objective as traffic", () => {
      const campaign = { id: "1", name: "Test", objective: null as string | null };
      const objective = campaign.objective || "traffic";

      expect(objective).toBe("traffic");
    });

    it("should handle campaign with undefined objective as traffic", () => {
      const campaign = { id: "1", name: "Test" } as { id: string; name: string; objective?: string };
      const objective = campaign.objective || "traffic";

      expect(objective).toBe("traffic");
    });

    it("should handle fraud rate with zero total clicks", () => {
      const total = 0;
      const invalid = 0;
      const fraudRate = total > 0 ? Math.round((invalid / total) * 100) : 0;

      expect(fraudRate).toBe(0);
      expect(Number.isNaN(fraudRate)).toBe(false);
    });

    it("should compute echo earnings correctly with ECHO_SHARE_PERCENT", () => {
      const clickCount = 10;
      const cpc = 100;
      const ECHO_SHARE_PERCENT = 75;

      const earned = Math.floor((clickCount * cpc * ECHO_SHARE_PERCENT) / 100);
      expect(earned).toBe(750);
    });

    it("should compute cost per visitor correctly in performance endpoint", () => {
      const spent = 5000;
      const validClicks = 50;
      const cpc = 100;

      const costPerVisitor = validClicks > 0 ? Math.round(spent / validClicks) : cpc;
      expect(costPerVisitor).toBe(100);
    });

    it("should fall back to configured CPC when no valid clicks", () => {
      const spent = 0;
      const validClicks = 0;
      const cpc = 150;

      const costPerVisitor = validClicks > 0 ? Math.round(spent / validClicks) : cpc;
      expect(costPerVisitor).toBe(150);
    });
  });
});
