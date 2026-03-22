export function getBrandDisplayName(user: { name?: string; company_name?: string; role?: string }): string {
  if ((user.role === "batteur" || user.role === "brand") && user.company_name) {
    return user.company_name;
  }
  return user.name || "";
}

export function getBrandSubtitle(user: { name?: string; company_name?: string; role?: string }): string | null {
  if ((user.role === "batteur" || user.role === "brand") && user.company_name && user.company_name !== user.name) {
    return user.name || null;
  }
  return null;
}
