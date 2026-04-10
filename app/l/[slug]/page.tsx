import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LandingPageFormField } from "@/lib/types";
import LeadForm from "./lead-form";

// ---------------------------------------------------------------------------
// LUP-113: Landing Page Template
// Public page. No auth required. Uses brand_color + brand_accent_color.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: page } = await supabaseAdmin
    .from("landing_pages")
    .select("headline, subheadline, brand_color")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (!page) return { title: "Tamtam" };

  return {
    title: page.headline,
    description: page.subheadline || undefined,
    themeColor: page.brand_color,
  };
}

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;

  const { data: page } = await supabaseAdmin
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (!page) {
    notFound();
  }

  const formFields: LandingPageFormField[] = page.form_fields || [];
  const brandColor = page.brand_color || "#D35400";
  const accentColor = page.brand_accent_color || "#1a1a2e";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${accentColor} 0%, ${accentColor}dd 40%, ${accentColor}bb 100%)`,
      }}
    >
      {/* Decorative top bar with brand color */}
      <div className="w-full h-1.5" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}99)` }} />

      {/* Decorative glow behind card */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
        {/* Background glow circles */}
        <div
          className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: brandColor }}
        />
        <div
          className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-8 blur-3xl pointer-events-none"
          style={{ backgroundColor: brandColor }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          {page.logo_url && (
            <div className="flex justify-center mb-6">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <img
                  src={page.logo_url}
                  alt=""
                  className="h-10 w-auto object-contain"
                  loading="eager"
                />
              </div>
            </div>
          )}

          {/* Main Card */}
          <div
            className="rounded-3xl p-6 sm:p-8 shadow-2xl border"
            style={{
              background: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
              borderColor: `${brandColor}30`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center leading-tight mb-3">
              {page.headline}
            </h1>

            {/* Subheadline */}
            {page.subheadline && (
              <p className="text-center text-sm sm:text-base mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
                {page.subheadline}
              </p>
            )}

            {/* Description */}
            {page.description && (
              <p className="text-center text-xs sm:text-sm mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {page.description}
              </p>
            )}

            {/* Divider with brand color */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: `${brandColor}30` }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
              <div className="flex-1 h-px" style={{ backgroundColor: `${brandColor}30` }} />
            </div>

            {/* Form */}
            <LeadForm
              landingPageId={page.id}
              formFields={formFields}
              ctaText={page.cta_text}
              brandColor={brandColor}
              accentColor={accentColor}
              ref={ref || null}
            />
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.25)" }}>
            Propulse par{" "}
            <a
              href="https://www.tamma.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors underline"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Tamtam
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
