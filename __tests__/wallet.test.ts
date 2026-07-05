import { describe, it, expect } from "vitest";
import {
  debitBrandBudget,
  debitBrandBudgetLogged,
  creditBrandWallet,
  creditEchoBalance,
} from "@/lib/wallet";
import { createMockSupabase } from "./helpers/mock-supabase";

const BRAND = "00000000-0000-0000-0000-000000000001";
const ECHO = "00000000-0000-0000-0000-000000000002";

describe("debitBrandBudget (atomic RPC path)", () => {
  it("debits via the debit_brand_budget RPC and succeeds when it returns true", async () => {
    const mock = createMockSupabase({
      rpcResults: { debit_brand_budget: { data: true, error: null } },
    });

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount: 5000 });

    expect(result).toEqual({ ok: true });
    expect(mock.rpc).toHaveBeenCalledWith("debit_brand_budget", {
      p_user_id: BRAND,
      p_amount: 5000,
    });
  });

  it("returns insufficient_balance when the RPC returns false, without touching users", async () => {
    const mock = createMockSupabase({
      rpcResults: { debit_brand_budget: { data: false, error: null } },
    });

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("insufficient_balance");
    expect(mock.fromCalls.filter((c) => c.table === "users")).toHaveLength(0);
  });

  it("propagates unexpected RPC errors without falling back", async () => {
    const mock = createMockSupabase({
      rpcResults: {
        debit_brand_budget: { data: null, error: { code: "XX000", message: "boom" } },
      },
    });

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).toBe("boom");
    }
    expect(mock.fromCalls).toHaveLength(0);
  });

  it.each([0, -100, 12.5])("rejects invalid amount %p without any DB call", async (amount) => {
    const mock = createMockSupabase();

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount });

    expect(result.ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.fromCalls).toHaveLength(0);
  });
});

describe("debitBrandBudget (legacy fallback when RPC is missing)", () => {
  const missingFn = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };

  it("falls back to check-then-update and succeeds with sufficient balance", async () => {
    const mock = createMockSupabase({ rpcResults: { debit_brand_budget: missingFn } });
    mock.queueTableResult("users", { data: { balance: 10000 }, error: null }); // select
    mock.queueTableResult("users", { data: null, error: null }); // update

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount: 5000 });

    expect(result).toEqual({ ok: true });
    const usersCalls = mock.fromCalls.filter((c) => c.table === "users");
    expect(usersCalls).toHaveLength(2);
    expect(usersCalls[1].builder.update).toHaveBeenCalledWith({ balance: 5000 });
  });

  it("fails with insufficient_balance and never updates when the balance is too low", async () => {
    const mock = createMockSupabase({ rpcResults: { debit_brand_budget: missingFn } });
    mock.queueTableResult("users", { data: { balance: 4999 }, error: null });

    const result = await debitBrandBudget(mock.client, { brandId: BRAND, amount: 5000 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("insufficient_balance");
    expect(mock.fromCalls.filter((c) => c.table === "users")).toHaveLength(1); // select only
  });
});

describe("debitBrandBudgetLogged", () => {
  it("writes a negative ledger entry after a successful debit", async () => {
    const mock = createMockSupabase({
      rpcResults: { debit_brand_budget: { data: true, error: null } },
    });

    const result = await debitBrandBudgetLogged(mock.client, {
      brandId: BRAND,
      amount: 7500,
      description: "Publication campagne",
      sourceId: "campaign-1",
    });

    expect(result.ok).toBe(true);
    const inserts = mock.insertsInto("wallet_transactions");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      user_id: BRAND,
      amount: -7500,
      type: "campaign_budget_debit",
      source_id: "campaign-1",
      source_type: "campaign",
      status: "completed",
    });
  });

  it("writes NO ledger entry when the debit fails", async () => {
    const mock = createMockSupabase({
      rpcResults: { debit_brand_budget: { data: false, error: null } },
    });

    const result = await debitBrandBudgetLogged(mock.client, {
      brandId: BRAND,
      amount: 7500,
      description: "Publication campagne",
    });

    expect(result.ok).toBe(false);
    expect(mock.insertsInto("wallet_transactions")).toHaveLength(0);
  });
});

describe("creditBrandWallet", () => {
  it("credits via increment_balance and writes a positive refund ledger entry", async () => {
    const mock = createMockSupabase({
      rpcResults: { increment_balance: { data: null, error: null } },
    });

    const result = await creditBrandWallet(mock.client, {
      brandId: BRAND,
      amount: 3000,
      description: "Remboursement campagne terminée",
      sourceId: "campaign-2",
    });

    expect(result.ok).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("increment_balance", {
      p_user_id: BRAND,
      p_amount: 3000,
    });
    const inserts = mock.insertsInto("wallet_transactions");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      user_id: BRAND,
      amount: 3000,
      type: "campaign_budget_refund",
      source_id: "campaign-2",
    });
  });

  it("skips the ledger entry when log:false (unlogged rollback)", async () => {
    const mock = createMockSupabase({
      rpcResults: { increment_balance: { data: null, error: null } },
    });

    const result = await creditBrandWallet(mock.client, {
      brandId: BRAND,
      amount: 3000,
      description: "Rollback",
      log: false,
    });

    expect(result.ok).toBe(true);
    expect(mock.insertsInto("wallet_transactions")).toHaveLength(0);
  });

  it("does not write a ledger entry when the credit RPC fails", async () => {
    const mock = createMockSupabase({
      rpcResults: { increment_balance: { data: null, error: { message: "down" } } },
    });

    const result = await creditBrandWallet(mock.client, {
      brandId: BRAND,
      amount: 3000,
      description: "Remboursement",
    });

    expect(result.ok).toBe(false);
    expect(mock.insertsInto("wallet_transactions")).toHaveLength(0);
  });
});

describe("creditEchoBalance", () => {
  it("credits via increment_echo_balance and logs with the given type", async () => {
    const mock = createMockSupabase({
      rpcResults: { increment_echo_balance: { data: null, error: null } },
    });

    const result = await creditEchoBalance(mock.client, {
      echoId: ECHO,
      amount: 500,
      description: "Bonus de parrainage",
      type: "referral_bonus",
    });

    expect(result.ok).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("increment_echo_balance", {
      p_echo_id: ECHO,
      p_amount: 500,
    });
    const inserts = mock.insertsInto("wallet_transactions");
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ user_id: ECHO, amount: 500, type: "referral_bonus" });
  });
});
