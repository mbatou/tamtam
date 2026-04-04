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
  objective: z.enum(["awareness", "traffic"]).optional(),
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
  objective: z.enum(["awareness", "traffic"]).optional(),
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
