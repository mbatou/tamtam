import { z } from "zod";

export const createCampaignSchema = z.object({
  title: z.string().min(3, "Titre trop court").max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  destination_url: z.string().url("URL invalide"),
  cpc: z.coerce.number().int().min(10, "CPC minimum 10 FCFA").max(1000),
  budget: z.coerce.number().int().min(1000, "Budget minimum 1000 FCFA").max(10000000),
  creative_urls: z.array(z.string().url()).optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  target_cities: z.array(z.string()).optional(),
  save_as_draft: z.boolean().optional(),
  objective: z.enum(["awareness", "traffic", "lead_generation"]).optional(),
});

export const updateCampaignSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  destination_url: z.string().url().optional(),
  cpc: z.coerce.number().int().min(10).max(1000).optional(),
  budget: z.coerce.number().int().min(1000).max(10000000).optional(),
  creative_urls: z.array(z.string().url()).optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  target_cities: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  moderation_status: z.enum(["pending", "approved", "rejected"]).optional(),
  objective: z.enum(["awareness", "traffic", "lead_generation"]).optional(),
});

export const deleteCampaignSchema = z.object({
  id: z.string().uuid(),
});

export const acceptCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
});

export const payoutRequestSchema = z.object({
  amount: z.number().int().min(500, "Minimum 500 FCFA").refine((n) => n % 5 === 0, "Le montant doit être un multiple de 5"),
  provider: z.enum(["wave", "orange_money"]).optional(),
});

export const paymentRequestSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  amount: z.coerce.number().int().min(100),
  payment_method: z.string().optional(),
});

export const moderateUserSchema = z.object({
  user_id: z.string().uuid(),
  action: z.enum(["verify", "flag", "suspend", "ban", "reset_balance"]),
  reason: z.string().max(500).optional(),
});

export const moderateCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
  action: z.enum(["approve", "reject", "pause", "resume"]),
  reason: z.string().max(500).optional(),
});

export const settingUpdateSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(1000),
});

export const payoutActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const leadSchema = z.object({
  business_name: z.string().min(2, "Nom d'entreprise requis").max(200).trim(),
  contact_name: z.string().min(2, "Nom requis").max(200).trim(),
  email: z.string().email("Email invalide").max(200).trim().toLowerCase(),
  whatsapp: z.string().max(20).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "converted", "rejected"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// LUP-113: Lead Generation Campaign
// ---------------------------------------------------------------------------

/** Senegalese phone: +221 7X XXX XX XX (X = 0-8) */
export const SENEGALESE_PHONE_REGEX = /^(\+221)?(7[0-8])\d{7}$/;

const landingPageFormFieldSchema = z.object({
  label: z.string().min(1).max(100),
  type: z.enum(["text", "phone", "email", "select"]),
  required: z.boolean(),
  options: z.array(z.string().min(1).max(100)).max(20).optional(),
});

export const BRAND_INDUSTRIES = [
  "restaurant",
  "mode_beaute",
  "immobilier",
  "education",
  "sante",
  "technologie",
  "transport",
  "commerce",
  "services",
  "evenementiel",
  "autre",
] as const;

export const createLeadCampaignSchema = z.object({
  // Campaign fields
  title: z.string().min(3, "Titre trop court").max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  destination_url: z.string().url("URL invalide"),
  cpc: z.coerce.number().int().min(10, "CPC minimum 10 FCFA").max(50, "CPC maximum 50 FCFA"),
  cost_per_lead_fcfa: z.coerce.number().int().min(200, "CPL minimum 200 FCFA").max(5000, "CPL maximum 5 000 FCFA"),
  budget: z.coerce.number().int().min(15000, "Budget minimum 15 000 FCFA").max(10000000),
  creative_urls: z.array(z.string().url()).optional(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  target_cities: z.array(z.string()).optional(),
  save_as_draft: z.boolean().optional(),

  // AI generation inputs
  brand_name: z.string().min(2, "Nom de marque requis").max(100).trim(),
  brand_industry: z.enum(BRAND_INDUSTRIES),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadecimale invalide"),
  logo_url: z.string().url().optional().nullable(),
  target_audience: z.string().min(10, "Decrivez votre audience cible").max(500).trim(),
  campaign_description_for_ai: z.string().min(20, "Description trop courte").max(1000).trim(),

  // Form fields configuration
  form_fields: z.array(landingPageFormFieldSchema).min(1, "Au moins un champ requis").max(5, "Maximum 5 champs"),

  // Notification settings (at least one required)
  notification_phone: z.string().regex(SENEGALESE_PHONE_REGEX, "Numero senegalais invalide").optional().nullable(),
  notification_email: z.string().email("Email invalide").optional().nullable(),
}).refine(
  (data) => data.notification_phone || data.notification_email,
  { message: "Au moins un moyen de notification requis (telephone ou email)", path: ["notification_email"] }
);

export const submitLeadSchema = z.object({
  landing_page_id: z.string().uuid(),
  name: z.string().min(2, "Nom requis").max(200).trim(),
  phone: z.string().regex(SENEGALESE_PHONE_REGEX, "Numero senegalais invalide"),
  email: z.string().email().max(200).optional().nullable(),
  custom_fields: z.record(z.string(), z.string().max(500)).optional(),
  consent_given: z.literal(true, { message: "Le consentement est requis" }),
  ref: z.string().max(50).optional().nullable(), // tracked_link short_code for attribution
  page_load_ts: z.number().optional(), // timestamp for honeypot timing check
});
