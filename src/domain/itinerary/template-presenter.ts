import type { ItineraryDayDoc, ItineraryDocument, ItineraryPresenter } from "./types";

/**
 * Deterministic, template-based presenter (the DEFAULT and only Phase 1 presenter).
 *
 * It phrases the structured facts in a consistent house style without any model
 * inference. Given the same document it always produces the same text. A future
 * AI presenter will implement the same `ItineraryPresenter` interface and may
 * only improve phrasing — the facts come pre-built and are not up for invention.
 */
export class TemplateItineraryPresenter implements ItineraryPresenter {
  renderDay(day: ItineraryDayDoc): string {
    const parts: string[] = [];
    const meals = day.segments.filter((s) => s.type === "meal").map((s) => s.label.toLowerCase());
    const transfer = day.segments.find((s) => s.type === "transfer");
    const activities = day.segments.filter((s) => s.type === "activity").map((s) => s.label);
    const notes = day.segments.filter((s) => s.type === "note").map((s) => s.label);

    if (meals.includes("breakfast")) parts.push("After breakfast");

    if (transfer) {
      const lead = parts.length ? ", depart" : "Depart";
      parts.push(`${lead} for ${transfer.label}`);
    }

    if (activities.length) {
      const lead = parts.length ? ". Enjoy " : "Enjoy ";
      parts.push(`${lead}${joinWithAnd(activities)}`);
    }

    const otherMeals = meals.filter((m) => m !== "breakfast");
    if (otherMeals.length) {
      parts.push(`. ${capitalize(joinWithAnd(otherMeals))} included`);
    }

    let text = parts.join("");
    if (text && !text.endsWith(".")) text += ".";
    if (notes.length) text += ` ${notes.join(" ")}`;

    return `Day ${day.dayNumber} — ${day.title}${text ? `: ${text.trim()}` : ""}`;
  }

  renderDocument(doc: ItineraryDocument): string {
    const header = `${doc.tripName} · ${doc.durationDays} Days / ${doc.durationNights} Nights`;
    const body = doc.days.map((d) => this.renderDay(d)).join("\n");
    return `${header}\n\n${body}`;
  }
}

export const templateItineraryPresenter = new TemplateItineraryPresenter();

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
