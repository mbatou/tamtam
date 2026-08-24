import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Regression guard for the withdrawal-blocked incident.
 *
 * Échos reported "Le montant dépasse ton solde" on an amount the withdrawal
 * sheet had itself offered as the maximum. The sheet displayed
 * `available_balance` (3 441 FCFA) while `validateAmount` compared against the
 * legacy `users.balance` column, which is stale for Échos: their money arrives
 * through pending_balance → available_balance and nothing writes it back.
 *
 * The server was always correct, so nobody could over-withdraw and no money was
 * ever at risk — the client simply refused to send the request.
 *
 * These are source assertions rather than behavioural tests because the bug was
 * a single wrong identifier in a React component; the thing worth locking down
 * is that the withdrawal path never reads the legacy column again.
 */

describe("withdrawal validates against the balance it displays", () => {
  const page = read("app/(echo)/earnings/page.tsx");

  it("never validates a withdrawal against the legacy `balance` column", () => {
    expect(page).not.toContain("num > (user?.balance || 0)");
    expect(page).toContain("if (num > availableBalance)");
  });

  it("derives availableBalance before validateAmount uses it", () => {
    // It used to be declared after an early return further down the component,
    // so the validator could only reach it by closure timing.
    expect(page.indexOf("const availableBalance =")).toBeLessThan(
      page.indexOf("function validateAmount"),
    );
  });

  it("derives it exactly once, so the sheet cannot disagree with itself", () => {
    expect(page.split("const availableBalance =").length - 1).toBe(1);
  });

  it("offers a maximum the validator will accept", () => {
    // The quick-amount buttons and the input max both use `balance`, which is
    // assigned from availableBalance. Same number in, same number validated.
    expect(page).toContain("const balance = availableBalance;");
    expect(page).toContain("max={roundToFive(balance)}");
  });

  it("prefers available_balance in the fallback chain", () => {
    // `balance` stays last as a floor for legacy rows that predate the split.
    expect(page).toContain(
      "balanceData?.available ?? user?.available_balance ?? user?.balance ?? 0",
    );
  });
});

describe("the profile card shows the same balance as the earnings page", () => {
  const card = read("app/(echo)/profil/_components/AccountDetailsCard.tsx");

  it("reads available_balance, not the legacy column", () => {
    // Showing 200 FCFA in the profile and 3 441 on the earnings page for the
    // same person reads as the platform losing money.
    expect(card).toContain("user?.available_balance ?? user?.balance ?? 0");
    expect(card).not.toContain("formatFCFA(user?.balance || 0)");
  });
});

describe("the server-side payout guard was and stays correct", () => {
  const route = read("app/api/echo/payouts/route.ts");

  it("checks available_balance before releasing money", () => {
    expect(route).toContain("user?.available_balance ?? user?.balance ?? 0");
    expect(route).toContain("effectiveBalance < parsed.data.amount");
  });

  it("still debits through the atomic RPC, not a read-then-write", () => {
    expect(route).toContain("debit_wallet_for_payout");
  });
});
