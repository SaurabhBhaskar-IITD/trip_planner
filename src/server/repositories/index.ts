// Repository ports (contracts the application layer depends on).
export type { AuthUserRecord, UserRepository } from "./ports/user.repository";
export type {
  DestinationRepository,
  TripRepository,
  AccommodationRepository,
  TransportationRepository,
  ActivityRepository,
  MealRepository,
  AddonRepository,
  PricingRepository,
  PriceReadOptions,
} from "./ports/catalogue.repositories";
export type { QuoteRepository } from "./ports/quote.repository";

// Concrete Prisma implementations (infrastructure).
export { userRepository, PrismaUserRepository } from "./prisma/user.repository";
export {
  destinationRepository,
  PrismaDestinationRepository,
} from "./prisma/destination.repository";
export { tripRepository, PrismaTripRepository } from "./prisma/trip.repository";
export {
  accommodationRepository,
  PrismaAccommodationRepository,
} from "./prisma/accommodation.repository";
export {
  transportationRepository,
  PrismaTransportationRepository,
} from "./prisma/transportation.repository";
export { activityRepository, PrismaActivityRepository } from "./prisma/activity.repository";
export { mealRepository, PrismaMealRepository } from "./prisma/meal.repository";
export { addonRepository, PrismaAddonRepository } from "./prisma/addon.repository";
export { pricingRepository, PrismaPricingRepository } from "./prisma/pricing.repository";

export { parseListQuery, paginationArgs, pageCount, type ListQuery } from "./query";
