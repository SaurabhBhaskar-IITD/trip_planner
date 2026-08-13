import type { MealType, TransportMode } from "@/domain/shared/enums";

/**
 * Itinerary engine contracts.
 *
 * The itinerary is assembled ENTIRELY from structured database facts. Rendering
 * to prose is a separate, swappable step (see presenter.ts). A future AI
 * presenter may only rephrase these facts — it receives the finished structured
 * document and can never add, remove or invent a fact.
 */

export type SegmentType = "transfer" | "meal" | "activity" | "stay" | "note";

export interface ItinerarySegment {
  type: SegmentType;
  /** Structured description parts; the presenter turns these into prose. */
  label: string;
  detail?: string;
  transportMode?: TransportMode;
  mealType?: MealType;
}

export interface ItineraryDayDoc {
  dayNumber: number;
  title: string;
  fromLabel?: string;
  toLabel?: string;
  segments: ItinerarySegment[];
}

export interface ItineraryDocument {
  tripName: string;
  durationDays: number;
  durationNights: number;
  days: ItineraryDayDoc[];
  /** Generator version for reproducibility. */
  generatorVersion: string;
}

/**
 * Renders a structured ItineraryDocument to text. The default implementation is
 * deterministic and template-based. AI-backed presenters implement this SAME
 * interface later — with no ability to change the underlying facts.
 */
export interface ItineraryPresenter {
  renderDay(day: ItineraryDayDoc): string;
  renderDocument(doc: ItineraryDocument): string;
}
