"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { destinationRepository } from "@/server/repositories";
import { parseDestinationForm } from "@/lib/validation/destination.schema";
import { slugify } from "@/lib/utils/slug";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

async function resolveSlug(name: string, provided: string | undefined, exceptId?: string) {
  const slug = provided && provided.length > 0 ? slugify(provided) : slugify(name);
  if (!slug)
    throw new ValidationError("Could not derive a slug.", { slug: ["Provide a valid slug"] });
  const taken = await destinationRepository.slugExists(slug, exceptId);
  if (taken)
    throw new ValidationError("Slug already in use.", { slug: ["This slug is already taken"] });
  return slug;
}

export async function createDestinationAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("destination:write");
    const parsed = parseDestinationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const slug = await resolveSlug(parsed.data.name, parsed.data.slug);
    const created = await destinationRepository.create({ ...parsed.data, slug });
    revalidatePath("/destinations");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateDestinationAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("destination:write");
    const parsed = parseDestinationForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const slug = await resolveSlug(parsed.data.name, parsed.data.slug, id);
    await destinationRepository.update(id, { ...parsed.data, slug });
    revalidatePath("/destinations");
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setDestinationActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission("destination:write");
    await destinationRepository.setActive(id, active);
    revalidatePath("/destinations");
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
