"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { tripRepository } from "@/server/repositories";
import {
  parseItineraryDayForm,
  parseItinerarySegmentForm,
} from "@/lib/validation/itinerary.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

function revalidateTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}`);
}

// --- Days ------------------------------------------------------------------
export async function addDayAction(
  tripId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseItineraryDayForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const { id } = await tripRepository.addDay(tripId, parsed.data);
    revalidateTrip(tripId);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateDayAction(
  tripId: string,
  dayId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseItineraryDayForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    await tripRepository.updateDay(dayId, parsed.data);
    revalidateTrip(tripId);
    return actionOk({ id: dayId });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function deleteDayAction(tripId: string, dayId: string): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    await tripRepository.deleteDay(dayId);
    revalidateTrip(tripId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function moveDayAction(
  tripId: string,
  dayId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    await tripRepository.moveDay(tripId, dayId, direction);
    revalidateTrip(tripId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

// --- Segments --------------------------------------------------------------
export async function addSegmentAction(
  tripId: string,
  dayId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseItinerarySegmentForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const { id } = await tripRepository.addSegment(dayId, parsed.data);
    revalidateTrip(tripId);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateSegmentAction(
  tripId: string,
  segmentId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseItinerarySegmentForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    await tripRepository.updateSegment(segmentId, parsed.data);
    revalidateTrip(tripId);
    return actionOk({ id: segmentId });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function deleteSegmentAction(
  tripId: string,
  segmentId: string,
): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    await tripRepository.deleteSegment(segmentId);
    revalidateTrip(tripId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function moveSegmentAction(
  tripId: string,
  dayId: string,
  segmentId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    await tripRepository.moveSegment(dayId, segmentId, direction);
    revalidateTrip(tripId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
