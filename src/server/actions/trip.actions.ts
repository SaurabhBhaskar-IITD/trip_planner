"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import { tripRepository } from "@/server/repositories";
import { parseTripForm, tripStatusSchema } from "@/lib/validation/trip.schema";
import { slugify } from "@/lib/utils/slug";
import { ValidationError } from "@/lib/errors/app-error";
import type { TripStatus } from "@/domain/shared/enums";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

/** Derive + uniqueness-check a trip slug. */
async function resolveSlug(name: string, provided: string | undefined, exceptId?: string) {
  const base = provided && provided.length > 0 ? slugify(provided) : slugify(name);
  if (!base)
    throw new ValidationError("Could not derive a slug.", { slug: ["Provide a valid slug"] });
  const taken = await tripRepository.slugExists(base, exceptId);
  if (taken)
    throw new ValidationError("Slug already in use.", { slug: ["This slug is already taken"] });
  return base;
}

/** For duplicate: find the first free `-copy`, `-copy-2`, … slug. */
async function uniqueCopySlug(baseSlug: string): Promise<string> {
  let candidate = `${baseSlug}-copy`;
  let n = 2;
  while (await tripRepository.slugExists(candidate)) {
    candidate = `${baseSlug}-copy-${n++}`;
  }
  return candidate;
}

export async function createTripAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseTripForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const slug = await resolveSlug(parsed.data.name, parsed.data.slug);
    const { id } = await tripRepository.create({ ...parsed.data, slug });
    revalidatePath("/trips");
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updateTripAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const parsed = parseTripForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(
          "Please fix the highlighted fields.",
          parsed.error.flatten().fieldErrors,
        ),
      );
    }
    const slug = await resolveSlug(parsed.data.name, parsed.data.slug, id);
    await tripRepository.update(id, { ...parsed.data, slug });
    revalidatePath("/trips");
    revalidatePath(`/trips/${id}`);
    return actionOk({ id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setTripStatusAction(id: string, status: TripStatus): Promise<ActionResult> {
  try {
    await requirePermission("trip:write");
    const parsed = tripStatusSchema.safeParse(status);
    if (!parsed.success) return actionFail(new ValidationError("Invalid status."));
    await tripRepository.setStatus(id, parsed.data);
    revalidatePath("/trips");
    revalidatePath(`/trips/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function duplicateTripAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("trip:write");
    const detail = await tripRepository.findDetail(id);
    if (!detail) return actionFail(new ValidationError("Trip not found."));
    const newSlug = await uniqueCopySlug(detail.slug);
    const created = await tripRepository.duplicate(id, newSlug);
    revalidatePath("/trips");
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
