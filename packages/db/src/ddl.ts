// Generated DDL: the single source of truth for table definitions is the Drizzle
// schema. CREATE statements and the truncate order are derived from it — never
// hand-written.
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import * as schema from './schema';

let ddlsPromise: Promise<string[]> | null = null;

// CREATE TABLE / CREATE INDEX / ALTER TABLE ... ADD CONSTRAINT statements for
// every table in the schema, in dependency-safe execution order. Memoized.
export function getTableDDLs(): Promise<string[]> {
  if (!ddlsPromise) {
    ddlsPromise = generateMigration(
      generateDrizzleJson({} as Record<string, unknown>),
      generateDrizzleJson(schema)
    );
  }
  return ddlsPromise;
}

let truncateOrderCache: string[] | null = null;

// Topological order for TRUNCATE: children (referencing tables) before the
// tables they reference; lexicographic tie-break for determinism.
export function getTruncateOrder(): string[] {
  if (truncateOrderCache) return truncateOrderCache;

  const json = generateDrizzleJson(schema) as unknown as {
    tables: Record<string, { name: string; foreignKeys: Record<string, { tableTo: string }> }>;
  };

  const allTables = Object.values(json.tables).map((t) => t.name);
  const tableSet = new Set(allTables);

  // child -> set of distinct tables it references (self-references excluded)
  const referencedBy = new Map<string, Set<string>>();
  // parent -> children waiting on it
  const childrenOf = new Map<string, Set<string>>();
  for (const t of Object.values(json.tables)) {
    const refs = new Set<string>();
    for (const fk of Object.values(t.foreignKeys ?? {})) {
      if (tableSet.has(fk.tableTo) && fk.tableTo !== t.name) refs.add(fk.tableTo);
    }
    referencedBy.set(t.name, refs);
    for (const ref of refs) {
      if (!childrenOf.has(ref)) childrenOf.set(ref, new Set());
      childrenOf.get(ref)!.add(t.name);
    }
  }

  // Kahn's algorithm: a table is ready when every table referencing it has been emitted.
  const ready = allTables.filter((t) => referencedBy.get(t)!.size === 0).sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (ready.length > 0) {
    const t = ready.shift()!;
    order.push(t);
    for (const child of childrenOf.get(t) ?? []) {
      const refs = referencedBy.get(child)!;
      refs.delete(t);
      if (refs.size === 0) {
        ready.push(child);
        ready.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  if (order.length !== allTables.length) {
    throw new Error(
      `Circular FK dependency detected among: ${allTables.filter((t) => !order.includes(t)).join(', ')}`
    );
  }

  truncateOrderCache = order;
  return order;
}
