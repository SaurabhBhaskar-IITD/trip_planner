"use server";

import { revalidatePath } from "next/cache";
import { can, requirePermission } from "@/server/auth/rbac";
import { calculate, loadConfig, save } from "@/server/planner/planner.service";
import { customerRepository } from "@/server/repositories";
import type { PlannerRequest } from "@/domain/planner";
import type { CustomerDTO, PlannerCalculationDTO, PlannerConfigDTO } from "@/types/planner";
import { ValidationError } from "@/lib/errors/app-error";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { normalizePrismaError } from "./prisma-error";

export async function loadPlannerConfigAction(
  tripId: string,
): Promise<ActionResult<PlannerConfigDTO>> {
  try {
    await requirePermission("quote:create");
    const config = await loadConfig(tripId);
    if (!config) return actionFail(new ValidationError("Trip not found."));
    return actionOk(config);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function calculatePlannerQuoteAction(
  request: PlannerRequest,
): Promise<ActionResult<PlannerCalculationDTO>> {
  try {
    const user = await requirePermission("quote:create");
    const calc = await calculate(request, { includeInternal: can(user, "pricing:viewInternal") });
    return actionOk(calc);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function savePlannerQuoteAction(
  request: PlannerRequest,
): Promise<ActionResult<{ quoteId: string; reference?: string; version?: number }>> {
  try {
    const user = await requirePermission("quote:create");
    const result = await save(request, { userId: user.id });
    if (!result.ok || !result.quoteId) {
      return actionFail(
        new ValidationError(
          result.problems[0] ?? "Cannot generate quote — configuration incomplete.",
        ),
      );
    }
    revalidatePath("/quotes");
    revalidatePath(`/planner/quote/${result.quoteId}`);
    return actionOk({
      quoteId: result.quoteId,
      reference: result.reference,
      version: result.version,
    });
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}

export async function searchCustomersAction(q: string): Promise<ActionResult<CustomerDTO[]>> {
  try {
    await requirePermission("customer:read");
    const results = await customerRepository.search(q, 8);
    return actionOk(results);
  } catch (error) {
    return actionFail(normalizePrismaError(error));
  }
}
