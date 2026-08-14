"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { addonRepository } from "@/server/repositories";
import { parseAddonForm } from "@/lib/validation/addon.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function createAddonAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("addon:write");
    const parsed = parseAddonForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    const created = await addonRepository.create(parsed.data);
    revalidatePath("/addons");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateAddonAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("addon:write");
    const parsed = parseAddonForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }
    await addonRepository.update(id, parsed.data);
    revalidatePath("/addons");
    revalidatePath(`/addons/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setAddonActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requirePermission("addon:write");
    await addonRepository.setActive(id, active);
    revalidatePath("/addons");
    revalidatePath(`/addons/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
