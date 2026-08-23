import { describe, it, expect, vi } from "vitest";
import { refundCampaignRemaining } from "@/lib/campaign-refund";
import { createMockSupabase } from "./helpers/mock-supabase";

const CAMPAIGN = "00000000-0000-0000-0000-0000000000c1";
const ADMIN = "00000000-0000-0000-0000-0000000000a1";

describe("refundCampaignRemaining (F7 — exactly-once completion refunds)", () => {
  it("delegates to the atomic RPC and returns the refunded amount", async () => {
    const mock = createMockSupabase({
      rpcResults: { refund_campaign_remaining: { data: 4500, error: null } },
    });

    const refunded = await refundCampaignRemaining(mock.client, CAMPAIGN, {
      reason: "fin de campagne",
    });

    expect(refunded).toBe(4500);
    expect(mock.rpc).toHaveBeenCalledWith("refund_campaign_remaining", {
      p_campaign_id: CAMPAIGN,
      p_reason: "fin de campagne",
      p_created_by: null,
    });
  });

  it("returns 0 when the campaign was already refunded (RPC guard)", async () => {
    const mock = createMockSupabase({
      rpcResults: { refund_campaign_remaining: { data: 0, error: null } },
    });

    expect(await refundCampaignRemaining(mock.client, CAMPAIGN)).toBe(0);
  });

  it("never double-credits across repeated calls — the RPC decides, not the caller", async () => {
    // Second and third calls hit the ledger guard inside the RPC and return 0.
    const mock = createMockSupabase({
      rpcResults: {
        refund_campaign_remaining: [
          { data: 4500, error: null },
          { data: 0, error: null },
          { data: 0, error: null },
        ],
      },
    });

    const results = [
      await refundCampaignRemaining(mock.client, CAMPAIGN),
      await refundCampaignRemaining(mock.client, CAMPAIGN),
      await refundCampaignRemaining(mock.client, CAMPAIGN),
    ];

    expect(results).toEqual([4500, 0, 0]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(4500);
    // The caller performs no balance mutation of its own
    expect(mock.insertsInto("wallet_transactions")).toHaveLength(0);
    expect(mock.rpc.mock.calls.every((c) => c[0] === "refund_campaign_remaining")).toBe(true);
  });

  it("passes the acting admin through for the audit trail", async () => {
    const mock = createMockSupabase({
      rpcResults: { refund_campaign_remaining: { data: 100, error: null } },
    });

    await refundCampaignRemaining(mock.client, CAMPAIGN, {
      reason: "campagne arrêtée",
      createdBy: ADMIN,
    });

    expect(mock.rpc).toHaveBeenCalledWith("refund_campaign_remaining", {
      p_campaign_id: CAMPAIGN,
      p_reason: "campagne arrêtée",
      p_created_by: ADMIN,
    });
  });

  it("swallows RPC errors and reports 0 — refunds run on non-blocking paths", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = createMockSupabase({
      rpcResults: {
        refund_campaign_remaining: { data: null, error: { message: "deadlock detected" } },
      },
    });

    expect(await refundCampaignRemaining(mock.client, CAMPAIGN)).toBe(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
