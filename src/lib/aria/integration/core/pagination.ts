/**
 * Phase 9.1 — Cursor pagination helper.
 */

export interface PageRequest {
  cursor?: string | null;
  page_size: number;
}

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface PaginatedSource<T> {
  fetchPage(req: PageRequest): Promise<Page<T>>;
}

export async function collectAll<T>(
  source: PaginatedSource<T>,
  pageSize = 100,
  maxPages = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const page = await source.fetchPage({ cursor, page_size: pageSize });
    out.push(...page.items);
    cursor = page.next_cursor;
    if (!cursor) break;
  }
  return out;
}
