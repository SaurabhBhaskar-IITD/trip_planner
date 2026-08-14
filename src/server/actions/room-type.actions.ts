"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { accommodationRepository } from "@/server/repositories";
import { parseRoomTypeForm } from "@/lib/validation/accommodation.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

/** Room types live under an accommodation; edits revalidate that detail page. */
export async function createRoomTypeAction(
  accommodationId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("accommodation:write");
    const parsed = parseRoomTypeForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await accommodationRepository.addRoomType(accommodationId, parsed.data);
    revalidatePath(`/accommodations/${accommodationId}`);
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateRoomTypeAction(
  roomTypeId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("accommodation:write");
    const parsed = parseRoomTypeForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await accommodationRepository.updateRoomType(roomTypeId, parsed.data);
    const parent = await accommodationRepository.roomTypeParent(roomTypeId);
    if (parent) revalidatePath(`/accommodations/${parent}`);
    return actionOk({ id: roomTypeId });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setRoomTypeActiveAction(
  roomTypeId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("accommodation:write");
    await accommodationRepository.setRoomTypeActive(roomTypeId, active);
    const parent = await accommodationRepository.roomTypeParent(roomTypeId);
    if (parent) revalidatePath(`/accommodations/${parent}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function deleteRoomTypeAction(roomTypeId: string): Promise<ActionResult> {
  try {
    await requirePermission("accommodation:write");
    const parent = await accommodationRepository.roomTypeParent(roomTypeId);
    await accommodationRepository.deleteRoomType(roomTypeId);
    if (parent) revalidatePath(`/accommodations/${parent}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
