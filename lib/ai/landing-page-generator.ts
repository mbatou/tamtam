import "server-only";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// LUP-113: AI Landing Page Content Generator
// Single call per campaign. No regeneration. 15s timeout. SHA-256 cache.
// ---------------------------------------------------------------------------

const MONTHLY_GLOBAL_CAP_USD = 50;
const MONTHLY_BRAND_CAP_USD = 2;
const SONNET_MODEL = "claude-sonnet-4-6";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// Approximate cost per 1K tokens (USD)
const SONNET_INPUT_COST_PER_1K = 0.003;
const SONNET_OUTPUT_COST_PER_1K = 0.015;
const HAIKU_INPUT_COST_PER_1K = 0.0008;
const HAIKU_OUTPUT_COST_PER_1K = 0.004;

const SYSTEM_PROMPT = `Tu es un expert en copywriting digital specialise dans le marche senegalais.
Tu generes du contenu pour des landing pages de generation de leads.

REGLES STRICTES:
- Ecris en francais (sans accents sur les majuscules)
- Ton: professionnel mais accessible, adapte au marche senegalais
- Mobile-first: phrases courtes, impactantes
- Pas de promesses exagerees ou mensongeres
- Pas de contenu politique, religieux, ou controverse
- Le CTA doit inciter a remplir le formulaire

Tu recois les informations de la marque et tu generes EXACTEMENT ce JSON:
{
  "headline": "Titre accrocheur (max 80 caracteres)",
  "subheadline": "Sous-titre explicatif (max 150 caracteres)",
  "description": "Paragraphe de description de l'offre (max 500 caracteres)",
  "cta_text": "Texte du bouton d'action (max 30 caracteres)"
}

Retourne UNIQUEMENT le JSON, sans backticks, sans explication.`;

export interface LandingPageGenerationInput {
  brand_name: string;
  brand_industry: string;
  campaign_description: string;
  target_audience: string;
  brand_color: string;
  form_field_labels: string[];
}

export interface LandingPageGenerationResult {
  headline: string;
  subheadline: string;
  description: string;
  cta_text: string;
}

interface CacheRow {
  id: string;
  result: LandingPageGenerationResult;
}

// ---------------------------------------------------------------------------
// Hash inputs for cache key
// ---------------------------------------------------------------------------

function hashInputs(inputs: LandingPageGenerationInput): string {
  const payload = JSON.stringify({
    brand_name: inputs.brand_name,
    brand_industry: inputs.brand_industry,
    campaign_description: inputs.campaign_description,
    target_audience: inputs.target_audience,
    brand_color: inputs.brand_color,
    form_field_labels: inputs.form_field_labels,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// ---------------------------------------------------------------------------
// Cost cap checks
// ---------------------------------------------------------------------------

async function getGlobalMonthCost(): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("cost_usd")
    .gte("created_at", monthStart.toISOString());

  return (data || []).reduce((sum: number, r: { cost_usd: number }) => sum + (r.cost_usd || 0), 0);
}

async function getBrandMonthCost(brandId: string): Promise<number> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data } = await supabaseAdmin
    .from("ai_usage")
    .select("total_cost_usd")
    .eq("brand_id", brandId)
    .eq("month", month)
    .single();

  return data?.total_cost_usd || 0;
}

// ---------------------------------------------------------------------------
// Post-generation safety checks
// ---------------------------------------------------------------------------

const PROHIBITED_WORDS = [
  "garanti", "100%", "gratuit", "arnaque", "miracle", "secret",
  "illimite", "sans risque", "urgent", "derniere chance",
];

function validateGeneratedContent(result: LandingPageGenerationResult): LandingPageGenerationResult {
  // Truncate to max lengths
  const safe = {
    headline: result.headline.slice(0, 80),
    subheadline: (result.subheadline || "").slice(0, 150),
    description: (result.description || "").slice(0, 500),
    cta_text: (result.cta_text || "Envoyer").slice(0, 30),
  };

  // Check prohibited words (case-insensitive)
  const allText = `${safe.headline} ${safe.subheadline} ${safe.description} ${safe.cta_text}`.toLowerCase();
  for (const word of PROHIBITED_WORDS) {
    if (allText.includes(word)) {
      // Replace the word but don't fail — just sanitize
      safe.headline = safe.headline.replace(new RegExp(word, "gi"), "");
      safe.subheadline = safe.subheadline.replace(new RegExp(word, "gi"), "");
      safe.description = safe.description.replace(new RegExp(word, "gi"), "");
    }
  }

  return safe;
}

// ---------------------------------------------------------------------------
// Fallback content (used when AI fails or caps exceeded)
// ---------------------------------------------------------------------------

function getFallbackContent(inputs: LandingPageGenerationInput): LandingPageGenerationResult {
  return {
    headline: `${inputs.brand_name} — Offre speciale`,
    subheadline: `Decouvrez notre offre adaptee a vos besoins`,
    description: inputs.campaign_description.slice(0, 500),
    cta_text: "Je suis interesse",
  };
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

export async function generateLandingPageContent(
  inputs: LandingPageGenerationInput,
  brandId: string
): Promise<{ result: LandingPageGenerationResult; cacheId: string | null; fromCache: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured — using fallback content");
    return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
  }

  // 1. Check SHA-256 cache
  const inputHash = hashInputs(inputs);
  const { data: cached } = await supabaseAdmin
    .from("ai_generation_cache")
    .select("id, result")
    .eq("input_hash", inputHash)
    .single();

  if (cached) {
    return { result: (cached as CacheRow).result, cacheId: cached.id, fromCache: true };
  }

  // 2. Check brand monthly cap
  const brandCost = await getBrandMonthCost(brandId);
  if (brandCost >= MONTHLY_BRAND_CAP_USD) {
    console.warn(`Brand ${brandId} exceeded $${MONTHLY_BRAND_CAP_USD}/month AI cap — fallback`);
    return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
  }

  // 3. Check global monthly cap → use Haiku if exceeded
  const globalCost = await getGlobalMonthCost();
  const useHaiku = globalCost >= MONTHLY_GLOBAL_CAP_USD;
  const model = useHaiku ? HAIKU_MODEL : SONNET_MODEL;

  if (useHaiku) {
    console.warn(`Global AI cap ($${MONTHLY_GLOBAL_CAP_USD}) reached — falling back to Haiku`);
  }

  // 4. Build prompt
  const userMessage = `Marque: ${inputs.brand_name}
Secteur: ${inputs.brand_industry}
Description campagne: ${inputs.campaign_description}
Audience cible: ${inputs.target_audience}
Couleur marque: ${inputs.brand_color}
Champs du formulaire: ${inputs.form_field_labels.join(", ")}

Genere le contenu de la landing page en JSON.`;

  // 5. Call Anthropic API with 15s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errText);
      return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
    }

    const data = await response.json();
    const textContent = data.content?.[0]?.text;
    if (!textContent) {
      console.error("Anthropic returned empty content");
      return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
    }

    // 6. Parse JSON response
    let parsed: LandingPageGenerationResult;
    try {
      parsed = JSON.parse(textContent.trim());
    } catch {
      console.error("Failed to parse AI JSON response:", textContent.slice(0, 200));
      return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
    }

    // 7. Validate required fields
    if (!parsed.headline || !parsed.cta_text) {
      console.error("AI response missing required fields");
      return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
    }

    // 8. Post-generation safety
    const safeResult = validateGeneratedContent(parsed);

    // 9. Calculate cost and store in cache
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const costPerInputK = useHaiku ? HAIKU_INPUT_COST_PER_1K : SONNET_INPUT_COST_PER_1K;
    const costPerOutputK = useHaiku ? HAIKU_OUTPUT_COST_PER_1K : SONNET_OUTPUT_COST_PER_1K;
    const costUsd = (inputTokens / 1000) * costPerInputK + (outputTokens / 1000) * costPerOutputK;

    const { data: cacheRow } = await supabaseAdmin
      .from("ai_generation_cache")
      .insert({
        input_hash: inputHash,
        result: safeResult,
        model_used: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      })
      .select("id")
      .single();

    // 10. Update brand usage tracking
    const month = new Date().toISOString().slice(0, 7);
    await supabaseAdmin
      .from("ai_usage")
      .upsert(
        {
          brand_id: brandId,
          month,
          total_cost_usd: brandCost + costUsd,
          call_count: 1,
        },
        { onConflict: "brand_id,month" }
      );

    // Increment call_count for existing rows
    if (brandCost > 0) {
      await supabaseAdmin.rpc("increment_ai_usage_count", { p_brand_id: brandId, p_month: month });
    }

    return { result: safeResult, cacheId: cacheRow?.id || null, fromCache: false };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      console.error("AI generation timed out (15s)");
    } else {
      console.error("AI generation error:", err);
    }
    return { result: getFallbackContent(inputs), cacheId: null, fromCache: false };
  }
}
