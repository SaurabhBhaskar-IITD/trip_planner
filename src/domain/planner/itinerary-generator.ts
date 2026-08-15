import { humanizeEnum, type MealType, type TransportMode } from "@/domain/shared/enums";
import type { TripDetailDTO } from "@/types/master-data";
import { PLANNER_VERSION, type Occupancy, type PlannerItineraryDay, type PlannerItineraryDoc } from "./types";

/**
 * Build a customised itinerary from the trip's STORED day-by-day data (§21–§26).
 *
 * This is deterministic and fact-only — no AI, no invented places/timings. It
 * preserves the base day content and only weaves in the customer's selected
 * accommodation, transport and meals. Where a day has a transfer, the selected
 * transport is shown; the original text is preserved otherwise (§26). Inclusions
 * are derived from what is actually priced into the quote — the schema has no
 * master inclusion/exclusion fields, so nothing is invented (§27).
 */
export interface GenerateItineraryInput {
  trip: TripDetailDTO;
  customerName: string;
  travellerCount: number;
  occupancy?: Occupancy;
  accommodationName?: string;
  transportName?: string;
  transportMode?: TransportMode;
  activityNames: string[];
  mealNames: string[];
  addonNames: string[];
}

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function composeDescription(day: TripDetailDTO["itinerary"][number]): string {
  if (day.summary && day.summary.trim()) return day.summary.trim();
  const substantive = day.segments
    .filter((s) => s.type === "sightseeing" || s.type === "activity" || s.type === "free_time")
    .map((s) => s.title);
  if (substantive.length) return substantive.join(". ") + ".";
  const notes = day.segments.filter((s) => s.type === "note").map((s) => s.title);
  if (notes.length) return notes.join(" ");
  return "As per the base itinerary.";
}

export function generateItinerary(input: GenerateItineraryInput): PlannerItineraryDoc {
  const occLabel = input.occupancy ? `${humanizeEnum(input.occupancy)} sharing` : undefined;
  const accommodationSummary =
    input.accommodationName && occLabel
      ? `${input.accommodationName} · ${occLabel}`
      : input.accommodationName;

  const days: PlannerItineraryDay[] = [...input.trip.itinerary]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day): PlannerItineraryDay => {
      const route =
        day.fromName && day.toName && day.fromName !== day.toName
          ? `${day.fromName} → ${day.toName}`
          : undefined;

      const dayMeals = day.segments
        .filter((s) => s.type === "meal" && s.mealType)
        .map((s) => MEAL_LABEL[s.mealType as MealType]);
      const meals = dayMeals.length ? [...new Set(dayMeals)].join(" + ") : undefined;

      const hasTransfer = day.segments.some((s) => s.type === "transfer");
      // Reflect the customer's selected transport where the day involves a
      // transfer; otherwise fall back to the base day's own transport facts.
      let transport: string | undefined;
      if (hasTransfer) {
        if (input.transportName) transport = input.transportName;
        else {
          const seg = day.segments.find((s) => s.type === "transfer" && s.transportMode);
          transport = seg?.transportMode ? humanizeEnum(seg.transportMode) : undefined;
        }
      }

      const hasStay = day.segments.some((s) => s.type === "accommodation");
      const accommodation = hasStay ? accommodationSummary : undefined;

      return {
        dayNumber: day.dayNumber,
        title: day.title,
        route,
        description: composeDescription(day),
        accommodation,
        meals,
        transport,
      };
    });

  // Inclusions = what is actually configured/priced into the quote (§27).
  const inclusions: string[] = [];
  if (accommodationSummary) inclusions.push(`Accommodation: ${accommodationSummary}`);
  if (input.transportName) inclusions.push(`Transport: ${input.transportName}`);
  if (input.mealNames.length) inclusions.push(`Meals: ${input.mealNames.join(", ")}`);
  for (const a of input.activityNames) inclusions.push(a);
  for (const a of input.addonNames) inclusions.push(a);
  if (inclusions.length === 0) inclusions.push("As per the selected configuration.");

  const exclusions = ["Any item not listed under Inclusions."];

  const notes: string[] = [];
  const dayNotes = input.trip.itinerary
    .flatMap((d) => d.segments)
    .filter((s) => s.type === "note")
    .map((s) => s.title);
  notes.push(...new Set(dayNotes));
  notes.push(
    "Inclusions/exclusions reflect the selected configuration; master inclusion/exclusion lists are not yet configured in the catalogue.",
  );

  return {
    generatorVersion: PLANNER_VERSION,
    tripName: input.trip.name,
    durationDays: input.trip.durationDays,
    durationNights: input.trip.durationNights,
    travellerCount: input.travellerCount,
    preparedFor: input.customerName,
    accommodationSummary,
    transportSummary: input.transportName,
    days,
    inclusions,
    exclusions,
    notes,
  };
}
