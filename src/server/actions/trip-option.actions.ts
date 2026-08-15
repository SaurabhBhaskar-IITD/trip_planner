"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { tripOptionRepository, type TripOptionKind } from "@/server/repositories";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

const KINDS: TripOptionKind[] = ["accommodation", "transportation", "activity", "meal", "addon"];

/** Enable/disable a master record as an available option for a trip. */
export async function setTripOptionAction(
  tripId: string,
  kind: string,
  masterId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    if (!KINDS.includes(kind as TripOptionKind)) {
      return actionFail(new ValidationError("Unknown option kind."));
    }
    await tripOptionRepository.setEnabled(tripId, kind as TripOptionKind, masterId, enabled);
    revalidatePath(`/trips/${tripId}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
