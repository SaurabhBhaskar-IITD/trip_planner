"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { mealRepository } from "@/server/repositories";
import { parseMealForm } from "@/lib/validation/meal.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function createMealAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("meal:write");
    const parsed = parseMealForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await mealRepository.create(parsed.data);
    revalidatePath("/meals");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateMealAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("meal:write");
    const parsed = parseMealForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await mealRepository.update(id, parsed.data);
    revalidatePath("/meals");
    revalidatePath(`/meals/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setMealActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requirePermission("meal:write");
    await mealRepository.setActive(id, active);
    revalidatePath("/meals");
    revalidatePath(`/meals/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
