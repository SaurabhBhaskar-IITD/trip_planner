/**
 * Application error hierarchy.
 *
 * All *expected* failures (validation, auth, not-found, conflicts) should be
 * expressed as one of these typed errors. The API/action layer maps them to
 * consistent, human-readable responses; the UI never sees a raw stack trace.
 */

export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE"
  | "CONFIG"
  | "INTERNAL";

export interface AppErrorOptions {
  /** Machine-readable field errors, e.g. from Zod. */
  fieldErrors?: Record<string, string[]>;
  /** Underlying cause (never serialised to the client). */
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: AppErrorCode,
    message: string,
    httpStatus: number,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.fieldErrors = options.fieldErrors;
  }

  /** Safe, client-facing shape — never includes `cause` or stack. */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = "The submitted data is invalid.", fieldErrors?: Record<string, string[]>) {
    super("VALIDATION", message, 422, { fieldErrors });
    this.name = "ValidationError";
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "You must be signed in to do that.") {
    super("UNAUTHENTICATED", message, 401);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "This action conflicts with the current state.") {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "A database error occurred.", cause?: unknown) {
    super("DATABASE", message, 503, { cause });
    this.name = "DatabaseError";
  }
}

export class ConfigError extends AppError {
  constructor(message = "The server is not correctly configured.") {
    super("CONFIG", message, 503);
    this.name = "ConfigError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalise any thrown value into an AppError without leaking internals.
 * Unknown errors become a generic INTERNAL error; the original is preserved as
 * `cause` for server-side logging only.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return new AppError("INTERNAL", "An unexpected error occurred.", 500, { cause: error });
}
