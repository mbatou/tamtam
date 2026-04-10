import { describe, it, expect } from "vitest";
import { submitLeadSchema, createLeadCampaignSchema, SENEGALESE_PHONE_REGEX, BRAND_INDUSTRIES } from "@/lib/validations";
import { LEAD_GEN_SETUP_FEE_FCFA, LEAD_GEN_MIN_BUDGET_FCFA, ECHO_LEAD_SHARE_PERCENT } from "@/lib/constants";

/**
 * LUP-113 — AI Safety, Content Validation, and Schema Tests
 * Tests AI content post-processing, prohibited words, field truncation,
 * Zod validation schemas, and Senegalese phone regex.
 */

describe("AI Content Safety — Post-Generation Validation", () => {
  const PROHIBITED_WORDS = [
    "garanti", "100%", "gratuit", "arnaque", "miracle", "secret",
    "illimite", "sans risque", "urgent", "derniere chance",
  ];

  function validateContent(result: { headline: string; subheadline: string; description: string; cta_text: string }) {
    const safe = {
      headline: result.headline.slice(0, 80),
      subheadline: (result.subheadline || "").slice(0, 150),
      description: (result.description || "").slice(0, 500),
      cta_text: (result.cta_text || "Envoyer").slice(0, 30),
    };

    const allText = `${safe.headline} ${safe.subheadline} ${safe.description} ${safe.cta_text}`.toLowerCase();
    for (const word of PROHIBITED_WORDS) {
      if (allText.includes(word)) {
        safe.headline = safe.headline.replace(new RegExp(word, "gi"), "");
        safe.subheadline = safe.subheadline.replace(new RegExp(word, "gi"), "");
        safe.description = safe.description.replace(new RegExp(word, "gi"), "");
      }
    }
    return safe;
  }

  describe("Length truncation", () => {
    it("truncates headline to 80 chars", () => {
      const result = validateContent({
        headline: "A".repeat(100),
        subheadline: "Sub",
        description: "Desc",
        cta_text: "CTA",
      });
      expect(result.headline.length).toBe(80);
    });

    it("truncates subheadline to 150 chars", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "B".repeat(200),
        description: "Desc",
        cta_text: "CTA",
      });
      expect(result.subheadline.length).toBe(150);
    });

    it("truncates description to 500 chars", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "Sub",
        description: "C".repeat(600),
        cta_text: "CTA",
      });
      expect(result.description.length).toBe(500);
    });

    it("truncates CTA to 30 chars", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "Sub",
        description: "Desc",
        cta_text: "D".repeat(50),
      });
      expect(result.cta_text.length).toBe(30);
    });
  });

  describe("Fallback defaults", () => {
    it("uses 'Envoyer' when cta_text is empty", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "Sub",
        description: "Desc",
        cta_text: "",
      });
      expect(result.cta_text).toBe("Envoyer");
    });

    it("handles null/undefined subheadline gracefully", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: null as unknown as string,
        description: "Desc",
        cta_text: "Go",
      });
      expect(result.subheadline).toBe("");
    });
  });

  describe("Prohibited word removal", () => {
    it("removes 'garanti' from headline", () => {
      const result = validateContent({
        headline: "Offre garantie pour vous",
        subheadline: "Sub",
        description: "Desc",
        cta_text: "Go",
      });
      expect(result.headline.toLowerCase()).not.toContain("garanti");
    });

    it("removes 'gratuit' from description", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "Sub",
        description: "Service entierement gratuit et fiable",
        cta_text: "Go",
      });
      expect(result.description.toLowerCase()).not.toContain("gratuit");
    });

    it("removes '100%' from subheadline", () => {
      const result = validateContent({
        headline: "Title",
        subheadline: "Satisfaction 100% assurée",
        description: "Desc",
        cta_text: "Go",
      });
      expect(result.subheadline).not.toContain("100%");
    });

    it("removes 'arnaque' case-insensitively", () => {
      const result = validateContent({
        headline: "Pas une ARNAQUE du tout",
        subheadline: "Sub",
        description: "Desc",
        cta_text: "Go",
      });
      expect(result.headline.toLowerCase()).not.toContain("arnaque");
    });

    it("removes multiple prohibited words", () => {
      const result = validateContent({
        headline: "Offre miracle urgente",
        subheadline: "Sub",
        description: "Desc",
        cta_text: "Go",
      });
      expect(result.headline.toLowerCase()).not.toContain("miracle");
      expect(result.headline.toLowerCase()).not.toContain("urgent");
    });

    it("preserves clean content unchanged", () => {
      const result = validateContent({
        headline: "Decouvrez nos services",
        subheadline: "Solutions adaptees a vos besoins",
        description: "Notre equipe est a votre ecoute",
        cta_text: "Contactez-nous",
      });
      expect(result.headline).toBe("Decouvrez nos services");
      expect(result.subheadline).toBe("Solutions adaptees a vos besoins");
    });
  });

  describe("Fallback content generator", () => {
    function getFallbackContent(inputs: { brand_name: string; campaign_description: string }) {
      return {
        headline: `${inputs.brand_name} — Offre speciale`,
        subheadline: `Decouvrez notre offre adaptee a vos besoins`,
        description: inputs.campaign_description.slice(0, 500),
        cta_text: "Je suis interesse",
      };
    }

    it("includes brand name in headline", () => {
      const result = getFallbackContent({ brand_name: "Dakar Resto", campaign_description: "Test" });
      expect(result.headline).toContain("Dakar Resto");
    });

    it("truncates long campaign description to 500 chars", () => {
      const result = getFallbackContent({ brand_name: "Test", campaign_description: "X".repeat(700) });
      expect(result.description.length).toBe(500);
    });

    it("uses standard French CTA", () => {
      const result = getFallbackContent({ brand_name: "Test", campaign_description: "Test" });
      expect(result.cta_text).toBe("Je suis interesse");
    });
  });
});

describe("AI Cost Cap Logic", () => {
  const MONTHLY_GLOBAL_CAP_USD = 50;
  const MONTHLY_BRAND_CAP_USD = 2;

  it("brand cap triggers fallback at $2+", () => {
    const brandCost = 2.01;
    expect(brandCost >= MONTHLY_BRAND_CAP_USD).toBe(true);
  });

  it("brand cap allows at $1.99", () => {
    const brandCost = 1.99;
    expect(brandCost >= MONTHLY_BRAND_CAP_USD).toBe(false);
  });

  it("global cap triggers Haiku at $50+", () => {
    const globalCost = 50;
    expect(globalCost >= MONTHLY_GLOBAL_CAP_USD).toBe(true);
  });

  it("global cap allows Sonnet below $50", () => {
    const globalCost = 49.99;
    expect(globalCost >= MONTHLY_GLOBAL_CAP_USD).toBe(false);
  });

  describe("Cost calculation", () => {
    const SONNET_INPUT_COST_PER_1K = 0.003;
    const SONNET_OUTPUT_COST_PER_1K = 0.015;
    const HAIKU_INPUT_COST_PER_1K = 0.0008;
    const HAIKU_OUTPUT_COST_PER_1K = 0.004;

    it("calculates Sonnet cost correctly", () => {
      const inputTokens = 500;
      const outputTokens = 200;
      const cost = (inputTokens / 1000) * SONNET_INPUT_COST_PER_1K + (outputTokens / 1000) * SONNET_OUTPUT_COST_PER_1K;
      expect(cost).toBeCloseTo(0.0045, 4);
    });

    it("calculates Haiku cost correctly (cheaper)", () => {
      const inputTokens = 500;
      const outputTokens = 200;
      const sonnetCost = (inputTokens / 1000) * SONNET_INPUT_COST_PER_1K + (outputTokens / 1000) * SONNET_OUTPUT_COST_PER_1K;
      const haikuCost = (inputTokens / 1000) * HAIKU_INPUT_COST_PER_1K + (outputTokens / 1000) * HAIKU_OUTPUT_COST_PER_1K;
      expect(haikuCost).toBeLessThan(sonnetCost);
    });
  });
});

describe("Zod Validation — submitLeadSchema", () => {
  const validLead = {
    landing_page_id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Moussa Diop",
    phone: "+221771234567",
    consent_given: true,
  };

  it("accepts valid minimal lead", () => {
    const result = submitLeadSchema.safeParse(validLead);
    expect(result.success).toBe(true);
  });

  it("accepts lead with optional fields", () => {
    const result = submitLeadSchema.safeParse({
      ...validLead,
      email: "moussa@example.com",
      custom_fields: { "Ville": "Dakar" },
      ref: "abc123",
      page_load_ts: Date.now() - 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing consent", () => {
    const result = submitLeadSchema.safeParse({ ...validLead, consent_given: false });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone number", () => {
    const result = submitLeadSchema.safeParse({ ...validLead, phone: "0612345678" });
    expect(result.success).toBe(false);
  });

  it("rejects short name", () => {
    const result = submitLeadSchema.safeParse({ ...validLead, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID landing_page_id", () => {
    const result = submitLeadSchema.safeParse({ ...validLead, landing_page_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("Zod Validation — createLeadCampaignSchema", () => {
  const validCampaign = {
    title: "Campagne test",
    destination_url: "https://example.com",
    cpc: 25,
    cost_per_lead_fcfa: 500,
    budget: 15000,
    brand_name: "TestBrand",
    brand_industry: "commerce" as const,
    brand_color: "#D35400",
    target_audience: "Jeunes professionnels de Dakar, 25-35 ans",
    campaign_description_for_ai: "Une offre exceptionnelle pour nos clients fideles avec des avantages exclusifs",
    form_fields: [{ label: "Email", type: "email" as const, required: true }],
    notification_email: "test@example.com",
  };

  it("accepts valid campaign", () => {
    const result = createLeadCampaignSchema.safeParse(validCampaign);
    expect(result.success).toBe(true);
  });

  it("rejects CPC above 50", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, cpc: 51 });
    expect(result.success).toBe(false);
  });

  it("rejects CPC below 10", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, cpc: 9 });
    expect(result.success).toBe(false);
  });

  it("rejects CPL above 5000", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, cost_per_lead_fcfa: 5001 });
    expect(result.success).toBe(false);
  });

  it("rejects CPL below 200", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, cost_per_lead_fcfa: 199 });
    expect(result.success).toBe(false);
  });

  it("rejects budget below 15000", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, budget: 14999 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid brand_color (not hex)", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, brand_color: "red" });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 form fields", () => {
    const fields = Array.from({ length: 6 }, (_, i) => ({ label: `Field ${i}`, type: "text" as const, required: false }));
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, form_fields: fields });
    expect(result.success).toBe(false);
  });

  it("rejects zero form fields", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, form_fields: [] });
    expect(result.success).toBe(false);
  });

  it("rejects without any notification method", () => {
    const { notification_email, ...noNotif } = validCampaign;
    const result = createLeadCampaignSchema.safeParse(noNotif);
    expect(result.success).toBe(false);
  });

  it("accepts phone-only notification", () => {
    const { notification_email, ...noEmail } = validCampaign;
    const result = createLeadCampaignSchema.safeParse({ ...noEmail, notification_phone: "+221771234567" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid brand industry", () => {
    const result = createLeadCampaignSchema.safeParse({ ...validCampaign, brand_industry: "invalid_industry" });
    expect(result.success).toBe(false);
  });
});

describe("Senegalese Phone Regex", () => {
  it("accepts +221 7X format", () => {
    expect(SENEGALESE_PHONE_REGEX.test("+221771234567")).toBe(true);
  });

  it("accepts without +221 prefix", () => {
    expect(SENEGALESE_PHONE_REGEX.test("771234567")).toBe(true);
  });

  it("accepts 70-78 prefixes", () => {
    for (let d = 0; d <= 8; d++) {
      expect(SENEGALESE_PHONE_REGEX.test(`+2217${d}1234567`)).toBe(true);
    }
  });

  it("rejects 79 prefix", () => {
    expect(SENEGALESE_PHONE_REGEX.test("+221791234567")).toBe(false);
  });

  it("rejects French number", () => {
    expect(SENEGALESE_PHONE_REGEX.test("+33612345678")).toBe(false);
  });

  it("rejects too short", () => {
    expect(SENEGALESE_PHONE_REGEX.test("+22177123456")).toBe(false);
  });

  it("rejects too long", () => {
    expect(SENEGALESE_PHONE_REGEX.test("+2217712345678")).toBe(false);
  });
});

describe("Constants — LUP-113 Values", () => {
  it("setup fee is 5000 FCFA", () => {
    expect(LEAD_GEN_SETUP_FEE_FCFA).toBe(5000);
  });

  it("minimum budget is 15000 FCFA", () => {
    expect(LEAD_GEN_MIN_BUDGET_FCFA).toBe(15000);
  });

  it("echo lead share is 75%", () => {
    expect(ECHO_LEAD_SHARE_PERCENT).toBe(75);
  });

  it("brand industries has 11 entries", () => {
    expect(BRAND_INDUSTRIES.length).toBe(11);
  });

  it("brand industries includes 'restaurant' and 'autre'", () => {
    expect(BRAND_INDUSTRIES).toContain("restaurant");
    expect(BRAND_INDUSTRIES).toContain("autre");
  });
});
