-- CRM notes table for brand contact management
CREATE TABLE IF NOT EXISTS crm_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL,
  contact_type text CHECK (contact_type IN ('lead', 'brand')) NOT NULL,
  author_id uuid REFERENCES users(id) NOT NULL,
  content text NOT NULL,
  note_type text CHECK (note_type IN ('note', 'call', 'followup', 'email', 'meeting')) DEFAULT 'note',
  followup_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_contact ON crm_notes(contact_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_crm_notes_followup ON crm_notes(followup_date) WHERE followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_notes_created ON crm_notes(created_at);

-- CRM stage for brands (pipeline tracking beyond lead status)
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_stage text CHECK (crm_stage IN ('onboarding', 'active', 'at_risk', 'churned')) DEFAULT 'onboarding';
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_tags text[] DEFAULT '{}';

-- CRM tags for leads too
ALTER TABLE brand_leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
