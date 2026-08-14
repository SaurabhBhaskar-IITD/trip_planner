"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { transportationRepository } from "@/server/repositories";
import { parseTransportationForm } from "@/lib/validation/transportation.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function createTransportationAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("transport:write");
    const parsed = parseTransportationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await transportationRepository.create(parsed.data);
    revalidatePath("/transport");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateTransportationAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("transport:write");
    const parsed = parseTransportationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await transportationRepository.update(id, parsed.data);
    revalidatePath("/transport");
    revalidatePath(`/transport/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setTransportationActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("transport:write");
    await transportationRepository.setActive(id, active);
    revalidatePath("/transport");
    revalidatePath(`/transport/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
