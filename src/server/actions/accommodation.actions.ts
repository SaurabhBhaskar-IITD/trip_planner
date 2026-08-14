"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { accommodationRepository } from "@/server/repositories";
import { parseAccommodationForm } from "@/lib/validation/accommodation.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function createAccommodationAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("accommodation:write");
    const parsed = parseAccommodationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await accommodationRepository.create(parsed.data);
    revalidatePath("/accommodations");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateAccommodationAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("accommodation:write");
    const parsed = parseAccommodationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await accommodationRepository.update(id, parsed.data);
    revalidatePath("/accommodations");
    revalidatePath(`/accommodations/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setAccommodationActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("accommodation:write");
    await accommodationRepository.setActive(id, active);
    revalidatePath("/accommodations");
    revalidatePath(`/accommodations/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
