import type { Trip } from "@/domain/entities/catalogue";
import type { ItineraryDayDoc, ItineraryDocument, ItinerarySegment } from "./types";

export const ITINERARY_GENERATOR_VERSION = "1.0.0-foundation";

/** Human labels for enum values used in itinerary text. */
const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const TRANSPORT_LABEL: Record<string, string> = {
  flight: "Flight",
  train: "Train",
  private_sedan: "Private sedan",
  suv: "SUV",
  tempo_traveller: "Tempo Traveller",
  bus: "Bus",
  shared_taxi: "Shared taxi",
  local_transport: "Local transport",
  airport_transfer: "Airport transfer",
  railway_transfer: "Railway transfer",
};

/**
 * Build a structured itinerary document from a Trip's stored day-by-day data.
 *
 * This is PURE and fact-only. It reads `trip.itinerary` (structured DB data) and
 * maps it into ordered segments. It never invents places, timings or activities.
 * `activityLabelResolver` lets the caller inject human names for activity ids
 * without the domain layer touching the database.
 */
export function buildItinerary(
  trip: Trip,
  options: { activityLabelResolver?: (activityId: string) => string | undefined } = {},
): ItineraryDocument {
  const resolveActivity = options.activityLabelResolver ?? (() => undefined);

  const days: ItineraryDayDoc[] = [...trip.itinerary]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const segments: ItinerarySegment[] = [];

      if (day.from && day.to && day.from.name !== day.to.name) {
        segments.push({
          type: "transfer",
          label: `${day.from.name} to ${day.to.name}`,
          transportMode: day.transportModes[0],
          detail: day.transportModes.map((m) => TRANSPORT_LABEL[m] ?? m).join(", ") || undefined,
        });
      }

      for (const meal of day.includedMeals) {
        segments.push({ type: "meal", label: MEAL_LABEL[meal] ?? meal, mealType: meal });
      }

      for (const activityId of day.activityIds) {
        segments.push({
          type: "activity",
          label: resolveActivity(activityId) ?? "Planned activity",
        });
      }

      if (day.notes) {
        segments.push({ type: "note", label: day.notes });
      }

      return {
        dayNumber: day.dayNumber,
        title: day.title,
        fromLabel: day.from?.name,
        toLabel: day.to?.name,
        segments,
      };
    });

  return {
    tripName: trip.name,
    durationDays: trip.durationDays,
    durationNights: trip.durationNights,
    days,
    generatorVersion: ITINERARY_GENERATOR_VERSION,
  };
}
