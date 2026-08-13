"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Shows a friendly message; the real error (with
 * stack) stays server-side / in the console and is never rendered to the user.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. You can try again; if it persists,
          contact an administrator.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground/70">Reference: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset}>
        <RotateCw />
        Try again
      </Button>
    </div>
  );
}
