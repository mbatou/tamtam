export const SK = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
export const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
export const INP = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };

export interface WalletData { balance: number; totalSpent: number; totalBudget: number; activeCampaigns: number }
export interface Campaign { id: string; title: string; budget: number; spent: number; status: string; created_at: string }
export interface Payment { id: string; amount: number; ref_command: string; status: string; payment_method: string | null; created_at: string; completed_at: string | null }
export interface WalletTransaction { id: string; user_id: string; amount: number; type: string; type_label: string; description: string | null; status: string; source_id: string | null; source_type: string | null; created_at: string }
export interface Invoice { id: string; invoice_number: string; period_start: string; period_end: string; total_recharges_fcfa: number; total_spend_fcfa: number; total_refunds_fcfa: number; net_amount_fcfa: number; campaign_count: number; click_count: number; status: string; created_at: string; line_items: InvoiceLineItem[] }
export interface InvoiceLineItem { id: string; campaign_name: string; objective: string | null; clicks: number; leads: number; cpc_fcfa: number | null; cpl_fcfa: number | null; total_spend_fcfa: number }

export interface SpendingPoint { date: string; amount: number }

export type Tab = "recent" | "spending" | "invoices";
