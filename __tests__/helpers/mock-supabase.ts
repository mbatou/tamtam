import { vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
};

/**
 * Thenable query builder: every chained method returns the builder, and
 * awaiting it resolves to the queued result for that table (FIFO), so tests
 * can script successive queries against the same table.
 */
function makeBuilder(resolveResult: () => QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "or", "ilike",
    "order", "limit", "range", "single", "maybeSingle",
  ];
  for (const m of chain) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (onFulfilled: (value: QueryResult) => unknown) =>
    Promise.resolve(resolveResult()).then(onFulfilled);
  return builder;
}

export interface MockSupabase {
  client: SupabaseClient;
  rpc: Mock;
  /** Queue the result of the next query against a table (FIFO per table). */
  queueTableResult: (table: string, result: QueryResult) => void;
  /** All from() calls: [table, builder] pairs, in order. */
  fromCalls: Array<{ table: string; builder: Record<string, unknown> }>;
  /** Rows passed to .insert() on a given table. */
  insertsInto: (table: string) => unknown[];
}

export function createMockSupabase(opts?: {
  rpcResults?: Record<string, QueryResult | QueryResult[]>;
}): MockSupabase {
  const tableQueues = new Map<string, QueryResult[]>();
  const fromCalls: MockSupabase["fromCalls"] = [];
  const rpcQueues = new Map<string, QueryResult[]>();

  for (const [fn, res] of Object.entries(opts?.rpcResults || {})) {
    rpcQueues.set(fn, Array.isArray(res) ? [...res] : [res]);
  }

  const rpc = vi.fn((fnName: string) => {
    const queue = rpcQueues.get(fnName);
    const result = queue && queue.length > 0 ? queue.shift()! : { data: null, error: null };
    return Promise.resolve(result);
  });

  const from = vi.fn((table: string) => {
    const builder = makeBuilder(() => {
      const queue = tableQueues.get(table);
      return queue && queue.length > 0 ? queue.shift()! : { data: null, error: null, count: 0 };
    });
    fromCalls.push({ table, builder });
    return builder;
  });

  const client = { rpc, from } as unknown as SupabaseClient;

  return {
    client,
    rpc,
    queueTableResult: (table, result) => {
      if (!tableQueues.has(table)) tableQueues.set(table, []);
      tableQueues.get(table)!.push(result);
    },
    fromCalls,
    insertsInto: (table) =>
      fromCalls
        .filter((c) => c.table === table)
        .flatMap((c) => (c.builder.insert as Mock).mock.calls.map((args) => args[0]))
        .filter((v) => v !== undefined),
  };
}
