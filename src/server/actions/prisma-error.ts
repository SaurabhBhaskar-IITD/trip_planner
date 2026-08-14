import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors/app-error";

/**
 * Normalise Prisma's known request errors into our typed AppError hierarchy so
 * the action layer returns consistent, safe messages (never a raw ORM error).
 * Non-Prisma errors are returned unchanged for `actionFail` to handle.
 */
export function normalizePrismaError(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "value";
      return new ConflictError(`That ${target} is already in use.`);
    }
    if (error.code === "P2025") return new NotFoundError();
    if (error.code === "P2003") return new ConflictError("A referenced record does not exist.");
  }
  return error;
}
