import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LandingPageFormField } from "@/lib/types";
import LeadForm from "./lead-form";

// ---------------------------------------------------------------------------
// LUP-113: "Dakar Night" Landing Page Template
// ONE fixed dark template. Public page. No auth required.
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
  const accentColor = page.brand_accent_color || "#1a1a2e";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}e6 50%, ${accentColor}cc 100%)`,
      }}
    >
      {/* Header with brand color accent */}
      <div
        className="w-full h-1"
        style={{ backgroundColor: page.brand_color }}
      />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          {page.logo_url && (
            <div className="flex justify-center mb-6">
              <img
                src={page.logo_url}
                alt=""
                className="h-12 w-auto object-contain"
                loading="eager"
              />
            </div>
          )}

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white text-center leading-tight mb-3">
              {page.headline}
            </h1>

            {/* Subheadline */}
            {page.subheadline && (
              <p className="text-gray-300 text-center text-sm sm:text-base mb-4">
                {page.subheadline}
              </p>
            )}

            {/* Description */}
            {page.description && (
              <p className="text-gray-400 text-center text-xs sm:text-sm mb-6 leading-relaxed">
                {page.description}
              </p>
            )}

            {/* Divider */}
            <div
              className="h-0.5 w-12 mx-auto mb-6 rounded"
              style={{ backgroundColor: page.brand_color }}
            />

            {/* Form */}
            <LeadForm
              landingPageId={page.id}
              formFields={formFields}
              ctaText={page.cta_text}
              brandColor={page.brand_color}
              ref={ref || null}
            />
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-xs mt-6">
            Propulse par{" "}
            <a
              href="https://www.tamma.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Tamtam
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
