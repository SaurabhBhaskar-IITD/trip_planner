// Repository ports (contracts the application/domain depend on).
export type { AuthUserRecord, UserRepository } from "./ports/user.repository";
export type {
  TripRepository,
  AccommodationRepository,
  TransportationRepository,
  ActivityRepository,
  CustomerRepository,
} from "./ports/catalogue.repositories";
export type { QuoteRepository } from "./ports/quote.repository";

// Concrete Prisma implementations (infrastructure). Only the ones needed today
// are wired; the rest are implemented in Phase 2/3.
export { userRepository, PrismaUserRepository } from "./prisma/user.repository";
