import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, type MockSupabase } from "./helpers/mock-supabase";

// unlockCampaignEarnings uses the supabaseAdmin singleton + sendEmail directly
let mock: MockSupabase;
vi.mock("@/lib/supabase/admin", () => ({
  get supabaseAdmin() {
    return mock.client;
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

import { unlockCampaignEarnings } from "@/lib/unlock-earnings";

const ROW = {
  id: "pe-1",
  echo_id: "echo-1",
  campaign_id: "camp-1",
  amount_fcfa: 500,
  status: "pending",
};

beforeEach(() => {
  mock = createMockSupabase({
    rpcResults: { transfer_pending_to_available: { data: null, error: null } },
  });
});

describe("unlockCampaignEarnings — atomic claim (F5 double-credit guard)", () => {
  it("transfers exactly once when the claim is won", async () => {
    mock.queueTableResult("pending_earnings", { data: [ROW], error: null }); // due list
    mock.queueTableResult("pending_earnings", { data: [{ id: "pe-1" }], error: null }); // claim WON
    mock.queueTableResult("users", { data: { name: "A", phone: null, email: null, available_balance: 500 }, error: null });

    const unlocked = await unlockCampaignEarnings("camp-1", "Campagne test");

    expect(unlocked).toBe(1);
    const transfers = mock.rpc.mock.calls.filter((c) => c[0] === "transfer_pending_to_available");
    expect(transfers).toHaveLength(1);
    expect(transfers[0][1]).toEqual({ p_user_id: "echo-1", p_amount: 500 });

    // The claim update must be guarded on status='pending'
    const claimBuilder = mock.fromCalls.filter((c) => c.table === "pending_earnings")[1].builder;
    const eqCalls = (claimBuilder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(["status", "pending"]);
    expect(eqCalls).toContainEqual(["id", "pe-1"]);
  });

  it("does NOT transfer when the claim is lost (concurrent unlocker already took the row)", async () => {
    mock.queueTableResult("pending_earnings", { data: [ROW], error: null }); // due list
    mock.queueTableResult("pending_earnings", { data: [], error: null }); // claim LOST

    const unlocked = await unlockCampaignEarnings("camp-1", "Campagne test");

    expect(unlocked).toBe(0);
    const transfers = mock.rpc.mock.calls.filter((c) => c[0] === "transfer_pending_to_available");
    expect(transfers).toHaveLength(0);
    // No ledger entry either
    expect(mock.insertsInto("wallet_transactions")).toHaveLength(0);
  });

  it("skips zero-amount rows without claiming", async () => {
    mock.queueTableResult("pending_earnings", { data: [{ ...ROW, amount_fcfa: 0 }], error: null });

    const unlocked = await unlockCampaignEarnings("camp-1", "Campagne test");

    expect(unlocked).toBe(0);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("writes a click_earning ledger row for each successful unlock", async () => {
    mock.queueTableResult("pending_earnings", { data: [ROW], error: null });
    mock.queueTableResult("pending_earnings", { data: [{ id: "pe-1" }], error: null });
    mock.queueTableResult("users", { data: { name: "A", phone: null, email: null, available_balance: 500 }, error: null });

    await unlockCampaignEarnings("camp-1", "Campagne test");

    const ledger = mock.insertsInto("wallet_transactions");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      user_id: "echo-1",
      amount: 500,
      type: "click_earning",
      source_id: "camp-1",
      source_type: "campaign_unlock",
    });
  });
});
