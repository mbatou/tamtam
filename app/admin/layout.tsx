import AdminSidebar from "@/components/AdminSidebar";
import AwaAssistant from "@/components/assistant";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAccessibleBrands } from "@/lib/brand-context";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { BrandProvider } from "@/lib/brand-context-client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { session } } = await supabase.auth.getSession();

  let initialBrands: Awaited<ReturnType<typeof getAccessibleBrands>> = [];
  let currentBrand = null;

  if (session) {
    initialBrands = await getAccessibleBrands(serviceClient, session.user.id);
    const effectiveId = await getEffectiveBrandId(serviceClient, session.user.id);
    currentBrand = initialBrands.find((b) => b.id === effectiveId) || initialBrands[0] || null;
  }

  const fallbackBrand = currentBrand || {
    id: session?.user.id || "",
    name: "",
    logo_url: null,
    role: "owner" as const,
    permissions: null,
    isOwn: true,
  };

  return (
    <BrandProvider initialBrand={fallbackBrand} initialBrands={initialBrands}>
      <div className="min-h-screen bg-background flex flex-col lg:flex-row">
        <AdminSidebar />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <AwaAssistant />
      </div>
    </BrandProvider>
  );
}
