import { toAppError } from "@/lib/errors/app-error";

/**
 * Standard discriminated result returned by every server action, so client
 * components have one predictable shape to render (success, message, field
 * errors) — and internal error details never leak to the browser.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; code: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Convert any thrown value into a safe, typed failure result. */
export function actionFail(error: unknown): ActionResult<never> {
  const appError = toAppError(error);
  // Server-side visibility for unexpected errors; never sent to the client.
  if (appError.code === "INTERNAL") {
    console.error("[action] unexpected error:", appError.cause ?? appError);
  }
  return {
    ok: false,
    message: appError.message,
    code: appError.code,
    fieldErrors: appError.fieldErrors,
  };
}
