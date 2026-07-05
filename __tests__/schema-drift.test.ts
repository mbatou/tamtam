import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Schema drift guard.
 *
 * supabase/schema.sql is the committed reference snapshot of the production
 * schema. The hand-written row types in lib/types.ts must not reference
 * columns that don't exist there: every property of a mapped interface must
 * be a real column. (The reverse — types omitting columns they don't use —
 * is allowed.)
 *
 * When this fails you either (a) typo'd/renamed a field in lib/types.ts, or
 * (b) changed the database and need to refresh supabase/schema.sql from the
 * Supabase dashboard (see docs/database.md).
 */

const schemaSql = readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
const typesSrc = readFileSync(path.join(__dirname, "..", "lib", "types.ts"), "utf8");

function schemaColumns(table: string): Set<string> {
  const match = schemaSql.match(
    new RegExp(`CREATE TABLE public\\.${table} \\(([\\s\\S]*?)\\n\\);`, "m")
  );
  if (!match) throw new Error(`Table ${table} not found in supabase/schema.sql`);
  const cols = new Set<string>();
  for (const line of match[1].split("\n")) {
    const col = line.match(/^\s{2}([a-z_][a-z0-9_]*)\s/);
    if (col && col[1] !== "CONSTRAINT") cols.add(col[1]);
  }
  return cols;
}

function interfaceProps(name: string): string[] {
  const match = typesSrc.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`, "m"));
  if (!match) throw new Error(`Interface ${name} not found in lib/types.ts`);
  const props: string[] = [];
  for (const line of match[1].split("\n")) {
    const prop = line.match(/^\s{2}([a-z_][a-z0-9_]*)\??:/);
    if (prop) props.push(prop[1]);
  }
  return props;
}

// Columns added by a migration in supabase/migrations/ that has not yet been
// applied to production (schema.sql is a prod snapshot). Remove each entry
// after running the migration and refreshing schema.sql.
const PENDING_MIGRATION_COLUMNS: Record<string, string[]> = {};

// Base row interfaces mapped to their tables (join/computed types excluded)
const MAPPINGS: Array<[iface: string, table: string]> = [
  ["User", "users"],
  ["Campaign", "campaigns"],
  ["TrackedLink", "tracked_links"],
  ["Click", "clicks"],
  ["Payout", "payouts"],
  ["Payment", "payments"],
  ["Conversion", "conversions"],
  ["Lead", "leads"],
  ["PlatformSetting", "platform_settings"],
];

describe("lib/types.ts stays in sync with supabase/schema.sql", () => {
  for (const [iface, table] of MAPPINGS) {
    it(`every ${iface} property is a real ${table} column`, () => {
      const cols = schemaColumns(table);
      const pending = PENDING_MIGRATION_COLUMNS[table] || [];
      const unknown = interfaceProps(iface).filter((p) => !cols.has(p) && !pending.includes(p));
      expect(unknown, `properties missing from ${table} in schema.sql: ${unknown.join(", ")}`).toEqual([]);
    });
  }

  it("previously-drifted columns stay present in both schema and types", () => {
    expect(schemaColumns("conversions").has("payment_status")).toBe(true);
    expect(interfaceProps("Conversion")).toContain("payment_status");
    expect(schemaColumns("clicks").has("rejection_reason")).toBe(true);
    expect(interfaceProps("Click")).toContain("rejection_reason");
    expect(schemaColumns("tracked_links").has("tm_ref")).toBe(true);
    expect(interfaceProps("TrackedLink")).toContain("tm_ref");
  });
});
