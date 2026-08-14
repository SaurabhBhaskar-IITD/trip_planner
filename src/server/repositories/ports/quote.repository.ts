import type { EntityId, Quote } from "@/domain/entities";

/**
 * Quote repository PORT. Concrete Prisma implementation (with version + snapshot
 * persistence) arrives in Phase 3 alongside the quote builder. Reading a quote
 * always returns its frozen versions — never live master prices.
 */
export interface QuoteRepository {
  findById(id: EntityId): Promise<Quote | null>;
  findByReference(reference: string): Promise<Quote | null>;
  listRecent(limit: number): Promise<Quote[]>;
}
