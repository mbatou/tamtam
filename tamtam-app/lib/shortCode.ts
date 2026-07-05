// Short-code generation for tracked links — mirrors the web repo's
// app/api/echo/links/route.ts. The column is NOT NULL with no DB default,
// so the client must supply a value on insert (the unique constraint
// rejects the rare collision, which surfaces as an insert error).
export function generateShortCode(): string {
  return Math.random().toString(36).substring(2, 8)
}
