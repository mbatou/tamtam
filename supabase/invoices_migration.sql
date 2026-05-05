-- Invoices table for brand billing
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES users(id),
  invoice_number TEXT UNIQUE NOT NULL, -- format: TAM-YYYY-NNNN
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_recharges_fcfa INT DEFAULT 0,
  total_spend_fcfa INT DEFAULT 0,
  total_refunds_fcfa INT DEFAULT 0,
  net_amount_fcfa INT DEFAULT 0,
  campaign_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('draft', 'final')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice line items (one per campaign in the billing period)
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  campaign_name TEXT NOT NULL,
  objective TEXT,
  period TEXT,
  clicks INT DEFAULT 0,
  leads INT DEFAULT 0,
  cpc_fcfa INT,
  cpl_fcfa INT,
  total_spend_fcfa INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_brand_id ON invoices(brand_id);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- RLS policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Brands can only see their own invoices
CREATE POLICY "Brands can view own invoices"
  ON invoices
  FOR SELECT
  USING (brand_id = auth.uid());

-- Line items accessible via invoice ownership
CREATE POLICY "Brands can view own invoice line items"
  ON invoice_line_items
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE brand_id = auth.uid()
    )
  );
