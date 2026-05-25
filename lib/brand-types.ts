export const ACTIVE_BRAND_COOKIE = "tamtam_active_brand";

export interface BrandAccess {
  id: string;
  name: string;
  logo_url?: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  permissions: Record<string, boolean> | null;
  isOwn: boolean;
  membershipId?: string;
}
