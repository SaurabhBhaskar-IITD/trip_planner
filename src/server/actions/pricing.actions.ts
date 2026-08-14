"use server";

import { revalidatePath } from "next/cache";
import { can, requirePermission } from "@/server/auth/rbac";
import { pricingRepository } from "@/server/repositories";
import { parsePricingForm, toPriceWriteInput } from "@/lib/validation/pricing.schema";
import { findPricingConflict } from "@/domain/pricing/validity";
import { PRICE_PARENT_KINDS, type PriceParentKind } from "@/domain/shared/enums";
import { ConflictError, ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

/** List route per kind, so both the detail and the list view are revalidated. */
const KIND_LIST_ROUTE: Record<PriceParentKind, string> = {
  accommodation: "/accommodations",
  transportation: "/transport",
  activity: "/activities",
  meal: "/meals",
  addon: "/addons",
};

function assertKind(kind: string): asserts kind is PriceParentKind {
  if (!PRICE_PARENT_KINDS.includes(kind as PriceParentKind)) {
    throw new ValidationError("Unknown pricing kind.");
  }
}

function revalidate(kind: PriceParentKind, detailPath: string) {
  revalidatePath(KIND_LIST_ROUTE[kind]);
  revalidatePath(detailPath);
}

export async function createPriceAction(
  kind: string,
  parentId: string,
  detailPath: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    assertKind(kind);
    const user = await requirePermission("pricing:write");
    const parsed = parsePricingForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }

    // Accommodation prices belong to a RoomType chosen in the form; every other
    // kind prices the parent passed in.
    const effectiveParentId =
      kind === "accommodation" ? (parsed.data.roomTypeId || "") : parentId;
    if (kind === "accommodation" && !effectiveParentId) {
      return actionFail(new ValidationError("Choose a room type.", { roomTypeId: ["Choose a room type"] }));
    }

    const write = toPriceWriteInput(parsed.data, {
      canWriteInternal: can(user, "pricing:viewInternal"),
    });

    // Refuse to silently shadow an existing active price (same unit + overlapping
    // season/validity). Business-rule enforcement the DB does not do for us.
    const existing = await pricingRepository.listWindows(kind, effectiveParentId);
    if (findPricingConflict({ ...write, id: undefined }, existing)) {
      throw new ConflictError(
        "An active price with the same unit and an overlapping season/date range already exists.",
      );
    }

    const created = await pricingRepository.create(kind, effectiveParentId, write);
    revalidate(kind, detailPath);
    return actionOk({ id: created.id });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function updatePriceAction(
  kind: string,
  priceId: string,
  detailPath: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    assertKind(kind);
    const user = await requirePermission("pricing:write");
    const parsed = parsePricingForm(formData);
    if (!parsed.success) {
      return actionFail(
        new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
      );
    }

    const parentId = await pricingRepository.getParentId(kind, priceId);
    if (!parentId) return actionFail(new ValidationError("Price not found."));

    const write = toPriceWriteInput(parsed.data, {
      canWriteInternal: can(user, "pricing:viewInternal"),
    });

    const existing = await pricingRepository.listWindows(kind, parentId);
    if (findPricingConflict({ ...write, id: priceId }, existing)) {
      throw new ConflictError(
        "An active price with the same unit and an overlapping season/date range already exists.",
      );
    }

    await pricingRepository.update(kind, priceId, write);
    revalidate(kind, detailPath);
    return actionOk({ id: priceId });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function setPriceActiveAction(
  kind: string,
  priceId: string,
  active: boolean,
  detailPath: string,
): Promise<ActionResult> {
  try {
    assertKind(kind);
    await requirePermission("pricing:write");

    // Re-activating must not resurrect a conflict with a currently-active price.
    if (active) {
      const parentId = await pricingRepository.getParentId(kind, priceId);
      if (parentId) {
        const windows = await pricingRepository.listWindows(kind, parentId);
        const self = windows.find((w) => w.id === priceId);
        if (self) {
          const conflict = findPricingConflict({ ...self, active: true }, windows);
          if (conflict) {
            throw new ConflictError(
              "Cannot activate: it would overlap another active price for the same unit/season.",
            );
          }
        }
      }
    }

    await pricingRepository.setActive(kind, priceId, active);
    revalidate(kind, detailPath);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function deletePriceAction(
  kind: string,
  priceId: string,
  detailPath: string,
): Promise<ActionResult> {
  try {
    assertKind(kind);
    await requirePermission("pricing:write");
    await pricingRepository.delete(kind, priceId);
    revalidate(kind, detailPath);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
