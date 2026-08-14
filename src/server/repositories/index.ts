// Repository ports (contracts the application layer depends on).
export type { AuthUserRecord, UserRepository } from "./ports/user.repository";
export type { DestinationRepository, TripRepository } from "./ports/catalogue.repositories";
export type { QuoteRepository } from "./ports/quote.repository";

// Concrete Prisma implementations (infrastructure). Only the ones needed by the
// currently-implemented modules are wired; the rest arrive in later increments.
export { userRepository, PrismaUserRepository } from "./prisma/user.repository";
export {
  destinationRepository,
  PrismaDestinationRepository,
} from "./prisma/destination.repository";
export { tripRepository, PrismaTripRepository } from "./prisma/trip.repository";

export { parseListQuery, paginationArgs, pageCount, type ListQuery } from "./query";
