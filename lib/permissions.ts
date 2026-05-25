export type BrandRole = "owner" | "admin" | "member" | "viewer";

export const PERMISSIONS = {
  CREATE_CAMPAIGN: ["owner", "admin", "member"],
  EDIT_CAMPAIGN: ["owner", "admin", "member"],
  DELETE_CAMPAIGN: ["owner", "admin"],
  VIEW_CAMPAIGNS: ["owner", "admin", "member", "viewer"],

  VIEW_ANALYTICS: ["owner", "admin", "member", "viewer"],
  EXPORT_ANALYTICS: ["owner", "admin"],

  VIEW_WALLET: ["owner", "admin"],
  RECHARGE_WALLET: ["owner"],
  VIEW_INVOICES: ["owner", "admin"],

  VIEW_PIXEL: ["owner", "admin", "member", "viewer"],
  MANAGE_PIXEL: ["owner", "admin"],

  VIEW_SETTINGS: ["owner", "admin"],
  EDIT_SETTINGS: ["owner"],

  MANAGE_TEAM: ["owner"],
  VIEW_TEAM: ["owner", "admin"],
} as const;

export function can(
  role: BrandRole,
  permission: keyof typeof PERMISSIONS
): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
