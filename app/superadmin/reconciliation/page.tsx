"use client";

import { useEffect, useState } from "react";

interface AdviceCard {
  severity: "red" | "yellow" | "green";
  title: string;
  detail: string;
}

interface BalanceMismatch {
  userId: string;
  name: string;
  role: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  transactionCount: number;
}

interface CampaignIssue {
  campaignId: string;
  name: string;
  budget: number;
  actualSpent: number;
  expectedSpent: number;
  difference: number;
  validClicks: number;
  cpc: number;
  status: string;
  moderationStatus: string;
  debitCount: number;
  refundCount: number;
  issue: string;
}

interface RefundEntry {
  id: string;
  user_id: string;
  amount: number;
  source_id: string;
  type: string;
  description: string;
  created_at: string;
  isDuplicate: boolean;
  hasMatchingDebit: boolean;
  issue: string | null;
}

interface ReconciliationData {
  balanceMismatches: BalanceMismatch[];
  campaignIssues: CampaignIssue[];
  refundAudit: RefundEntry[];
  platformPnL: {
    totalMoneyIn: number;
    totalMoneyOut: number;
    totalBrandBalances: number;
    totalEchoBalances: number;
  };
  advice: AdviceCard[];
}

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/reconciliation")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-72 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">⚖️ Reconciliation</h1>

      {/* Advice cards */}
      <div className="space-y-3 mb-8">
        {data.advice.map((a, i) => (
          <div key={i} className={`rounded-xl p-4 border ${
            a.severity === "red" ? "bg-red-500/10 border-red-500/30" :
            a.severity === "yellow" ? "bg-yellow-500/10 border-yellow-500/30" :
            "bg-green-500/10 border-green-500/30"
          }`}>
            <div className={`font-bold text-sm ${
              a.severity === "red" ? "text-red-400" :
              a.severity === "yellow" ? "text-yellow-400" :
              "text-green-400"
            }`}>
              {a.severity === "red" ? "🔴" : a.severity === "yellow" ? "🟡" : "🟢"} {a.title}
            </div>
            <div className="text-gray-400 text-sm mt-1">{a.detail}</div>
          </div>
        ))}
      </div>

      {/* Platform P&L */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Platform Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Inflows</div>
            <div className="text-green-400 font-bold text-xl">{data.platformPnL.totalMoneyIn.toLocaleString("en-US")} F</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Outflows</div>
            <div className="text-red-400 font-bold text-xl">{data.platformPnL.totalMoneyOut.toLocaleString("en-US")} F</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Brand Balances</div>
            <div className="text-white font-bold text-xl">{data.platformPnL.totalBrandBalances.toLocaleString("en-US")} F</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Echo Balances</div>
            <div className="text-white font-bold text-xl">{data.platformPnL.totalEchoBalances.toLocaleString("en-US")} F</div>
          </div>
        </div>
      </div>

      {/* Balance mismatches */}
      {data.balanceMismatches.length > 0 && (
        <div className="bg-card rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">
            🔴 Balance Mismatches ({data.balanceMismatches.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-right py-2">Displayed Balance</th>
                  <th className="text-right py-2">Calculated Balance</th>
                  <th className="text-right py-2">Difference</th>
                </tr>
              </thead>
              <tbody>
                {data.balanceMismatches.map(m => (
                  <tr key={m.userId} className="border-t border-gray-800">
                    <td className="py-3 text-white">{m.name}</td>
                    <td className="py-3 text-gray-400">{m.role}</td>
                    <td className="py-3 text-right text-white">{m.actualBalance.toLocaleString("en-US")} F</td>
                    <td className="py-3 text-right text-gray-400">{m.expectedBalance.toLocaleString("en-US")} F</td>
                    <td className={`py-3 text-right font-bold ${m.difference > 0 ? "text-red-400" : "text-orange-400"}`}>
                      {m.difference > 0 ? "+" : ""}{m.difference.toLocaleString("en-US")} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign issues */}
      {data.campaignIssues.length > 0 && (
        <div className="bg-card rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">
            ⚠️ Campaigns with Issues ({data.campaignIssues.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left py-2">Campaign</th>
                  <th className="text-right py-2">Budget</th>
                  <th className="text-right py-2">Spent</th>
                  <th className="text-right py-2">Expected</th>
                  <th className="text-center py-2">Debits</th>
                  <th className="text-center py-2">Refunds</th>
                  <th className="text-left py-2">Issue</th>
                </tr>
              </thead>
              <tbody>
                {data.campaignIssues.map(c => (
                  <tr key={c.campaignId} className="border-t border-gray-800">
                    <td className="py-3 text-white">{c.name}</td>
                    <td className="py-3 text-right">{c.budget?.toLocaleString("en-US")} F</td>
                    <td className="py-3 text-right">{c.actualSpent?.toLocaleString("en-US")} F</td>
                    <td className="py-3 text-right text-gray-400">{c.expectedSpent?.toLocaleString("en-US")} F</td>
                    <td className={`py-3 text-center ${c.debitCount > 1 ? "text-red-400 font-bold" : ""}`}>{c.debitCount}</td>
                    <td className={`py-3 text-center ${c.refundCount > 1 ? "text-red-400 font-bold" : ""}`}>{c.refundCount}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        c.issue === "DUPLICATE_REFUND" ? "bg-red-500/20 text-red-400" :
                        c.issue === "DUPLICATE_DEBIT" ? "bg-red-500/20 text-red-400" :
                        c.issue === "DRAFT_DEBITED" ? "bg-orange-500/20 text-orange-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {c.issue === "DUPLICATE_REFUND" ? "Duplicate Refund" :
                         c.issue === "DUPLICATE_DEBIT" ? "Duplicate Debit" :
                         c.issue === "DRAFT_DEBITED" ? "Draft Debited" :
                         "Spending Mismatch"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund audit */}
      <div className="bg-card rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mb-4">
          Refund Audit ({data.refundAudit.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-center py-2">Matching Debit</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.refundAudit.map(r => (
                <tr key={r.id} className={`border-t border-gray-800 ${r.issue ? "bg-red-500/5" : ""}`}>
                  <td className="py-3 text-gray-400">{new Date(r.created_at).toLocaleString("en-US")}</td>
                  <td className="py-3 text-white">{r.description}</td>
                  <td className="py-3 text-right text-green-400">+{Math.abs(r.amount).toLocaleString("en-US")} F</td>
                  <td className="py-3 text-center">{r.hasMatchingDebit ? "✓" : "✕"}</td>
                  <td className="py-3">
                    {r.issue === "DUPLICATE" && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Duplicate</span>}
                    {r.issue === "ORPHAN" && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Orphan</span>}
                    {!r.issue && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
