import type {
  Accommodation,
  Activity,
  Customer,
  EntityId,
  Transportation,
  Trip,
} from "@/domain/entities";

/**
 * Catalogue & customer repository PORTS (contracts only).
 *
 * These interfaces define how the application layer will read/write master data.
 * The domain layer depends on these abstractions; concrete Prisma implementations
 * live in ../prisma and are wired up in Phase 2 (master-data CRUD). Defining the
 * ports now keeps the dependency direction correct from day one.
 */

export interface TripRepository {
  findById(id: EntityId): Promise<Trip | null>;
  findBySlug(slug: string): Promise<Trip | null>;
  listActive(): Promise<Trip[]>;
}

export interface AccommodationRepository {
  findById(id: EntityId): Promise<Accommodation | null>;
  listByDestination(destinationId: EntityId): Promise<Accommodation[]>;
}

export interface TransportationRepository {
  findById(id: EntityId): Promise<Transportation | null>;
  listActive(): Promise<Transportation[]>;
}

export interface ActivityRepository {
  findById(id: EntityId): Promise<Activity | null>;
  listByDestination(destinationId: EntityId): Promise<Activity[]>;
}

export interface CustomerRepository {
  findById(id: EntityId): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
}
