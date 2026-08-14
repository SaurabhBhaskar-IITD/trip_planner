"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { activityRepository } from "@/server/repositories";
import { parseActivityForm } from "@/lib/validation/activity.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function createActivityAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("activity:write");
    const parsed = parseActivityForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await activityRepository.create(parsed.data);
    revalidatePath("/activities");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateActivityAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("activity:write");
    const parsed = parseActivityForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await activityRepository.update(id, parsed.data);
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setActivityActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requirePermission("activity:write");
    await activityRepository.setActive(id, active);
    revalidatePath("/activities");
    revalidatePath(`/activities/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
