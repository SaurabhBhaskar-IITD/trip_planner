"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/rbac";
import {
  itineraryDocumentRepository,
  tripCustomizationRepository,
  tripRepository,
  type ItineraryDocumentDTO,
} from "@/server/repositories";
import { evaluateCustomization } from "@/domain/public-catalog/customization";
import { customizationPatchSchema, type CustomizationPatchInput } from "@/lib/validation/customization.schema";
import { ValidationError } from "@/lib/errors/app-error";
import { notifyPublicSite, type NotifyResult } from "@/server/public/notify-public-site";
import {
  discardUpload,
  inspectUploadedPdf,
  sanitizePdfFileName,
  tripDocumentPrefix,
} from "@/server/storage/itinerary-blob";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

/**
 * Trip PUBLISHING actions: the customizations sold on trip-le.com and the
 * itinerary PDF delivered after payment. Every mutation is permission-checked
 * server-side, records who made it, and tells the public site to revalidate
 * that one trip.
 */

async function loadTrip(tripId: string) {
  const trip = await tripRepository.findDetail(tripId);
  if (!trip) throw new ValidationError("Trip not found.");
  return trip;
}

async function tripSlug(tripId: string): Promise<string> {
  return (await loadTrip(tripId)).slug;
}

function refresh(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
}

/**
 * Hand this trip's public customizations over to the planner (or back).
 *
 * OFF: trip-le.com keeps whatever it does today for this tour (its own
 * hard-coded add-ons) — the public API reports the trip as unknown.
 * ON: the website offers exactly the customizations configured here.
 * Turn it on only once a trip's customizations are ready.
 */
export async function setPublicOptionsEnabledAction(
  tripId: string,
  enabled: boolean,
): Promise<ActionResult<{ notify: NotifyResult }>> {
  try {
    const user = await requirePermission("trip:write");
    const slug = await tripSlug(tripId);
    await tripRepository.setPublicOptionsEnabled(tripId, enabled, user.id);
    refresh(tripId);
    // Either direction changes what customers see, so invalidate immediately.
    return actionOk({ notify: await notifyPublicSite(slug) });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

/**
 * Travellers per room in the trip's BASE package (4 = quad, 2 = twin). Room-based
 * customization prices are multiplied by whole rooms counted with it; `null`
 * makes room-based options unsellable online.
 */
export async function setBaseRoomOccupancyAction(
  tripId: string,
  occupancy: number | null,
): Promise<ActionResult<{ notify: NotifyResult }>> {
  try {
    const user = await requirePermission("trip:write");
    await requirePermission("pricing:write");
    if (occupancy !== null && (!Number.isInteger(occupancy) || occupancy < 1 || occupancy > 12)) {
      return actionFail(new ValidationError("Room occupancy must be a whole number from 1 to 12."));
    }
    const slug = await tripSlug(tripId);
    await tripRepository.setBaseRoomOccupancy(tripId, occupancy, user.id);
    refresh(tripId);
    return actionOk({ notify: await notifyPublicSite(slug) });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

/** Add a catalogue add-on to the trip as an (inactive) customization. */
export async function attachCustomizationAction(
  tripId: string,
  addonId: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("trip:write");
    await tripSlug(tripId);
    await tripCustomizationRepository.attach(tripId, addonId, user.id);
    refresh(tripId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

/**
 * Activate / deactivate a customization. Activation is REFUSED when the option
 * cannot be sold online (no price, ambiguous price, allocation-based unit) — an
 * "active" option that never appears publicly would only confuse the team.
 * Deactivation is always allowed and affects NEW bookings only.
 */
export async function setCustomizationActiveAction(
  tripId: string,
  addonId: string,
  active: boolean,
): Promise<ActionResult<{ notify: NotifyResult }>> {
  try {
    const user = await requirePermission("trip:write");
    const trip = await loadTrip(tripId);
    const slug = trip.slug;

    if (active) {
      const row = (await tripCustomizationRepository.listForTrip(tripId)).find((r) => r.addonId === addonId);
      if (!row) return actionFail(new ValidationError("This customization is not attached to the trip."));
      const verdict = evaluateCustomization({
        active: true,
        masterActive: row.masterActive,
        priceOverrideMinor: row.priceOverrideMinor,
        priceOverrideUnit: row.priceOverrideUnit,
        masterPrices: row.masterPrices,
        priceOnRequest: row.priceOnRequest,
        nights: trip.durationNights,
        baseRoomOccupancy: trip.baseRoomOccupancy,
        roomOccupancy: row.roomOccupancy,
      });
      if (!verdict.sellable) {
        return actionFail(new ValidationError(`Cannot activate "${row.name}": ${verdict.reason}`));
      }
    }

    await tripCustomizationRepository.setActive(tripId, addonId, active, user.id);
    refresh(tripId);
    return actionOk({ notify: await notifyPublicSite(slug) });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

/** Edit order, grouping, description or the trip-specific price. */
export async function updateCustomizationAction(
  tripId: string,
  addonId: string,
  input: CustomizationPatchInput,
): Promise<ActionResult<{ notify: NotifyResult }>> {
  try {
    const user = await requirePermission("trip:write");
    const parsed = customizationPatchSchema.safeParse(input);
    if (!parsed.success) {
      return actionFail(
        new ValidationError(parsed.error.issues[0]?.message ?? "Invalid customization.", parsed.error.flatten().fieldErrors),
      );
    }
    const { supplierCostRupees, ...rest } = parsed.data;
    // Changing what customers pay is a PRICING change, not just trip editing.
    if (rest.priceOverride !== undefined || rest.priceOnRequest !== undefined) {
      await requirePermission("pricing:write");
    }
    // Supplier economics are visible/editable only to those who may see them.
    if (supplierCostRupees !== undefined) {
      await requirePermission("pricing:write");
      await requirePermission("pricing:viewInternal");
    }

    const slug = await tripSlug(tripId);
    await tripCustomizationRepository.update(
      tripId,
      addonId,
      {
        ...rest,
        ...(supplierCostRupees !== undefined ? { supplierCostOverrideMinor: supplierCostRupees } : {}),
      },
      user.id,
    );
    refresh(tripId);
    return actionOk({ notify: await notifyPublicSite(slug) });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

/**
 * Register a PDF the browser uploaded directly to private storage as the trip's
 * next itinerary version. Nothing about the upload is trusted: the stored bytes
 * are re-read and checked here, and a rejected file is deleted from storage.
 * Previous versions are never modified — paid bookings keep theirs.
 */
export async function registerItineraryDocumentAction(
  tripId: string,
  pathname: string,
  originalFileName: string,
): Promise<ActionResult<Pick<ItineraryDocumentDTO, "version" | "fileName">>> {
  try {
    const user = await requirePermission("trip:write");
    await tripSlug(tripId);

    const prefix = tripDocumentPrefix(tripId);
    if (typeof pathname !== "string" || !pathname.startsWith(prefix) || pathname.includes("..")) {
      return actionFail(new ValidationError("Invalid upload reference."));
    }

    const inspected = await inspectUploadedPdf(pathname);
    if (!inspected.ok) {
      await discardUpload(pathname);
      return actionFail(new ValidationError(inspected.error));
    }

    const doc = await itineraryDocumentRepository.createNextVersion(
      tripId,
      {
        fileName: sanitizePdfFileName(String(originalFileName ?? "")),
        blobPathname: pathname,
        sizeBytes: inspected.sizeBytes,
        sha256: inspected.sha256,
        contentType: inspected.contentType,
      },
      user.id,
    );
    refresh(tripId);
    return actionOk({ version: doc.version, fileName: doc.fileName });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
