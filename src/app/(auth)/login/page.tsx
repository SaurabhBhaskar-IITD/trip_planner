import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { LoginForm } from "./login-form";
import { env } from "@/config/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // A misconfigured server must not leak env-var names, commands or file paths to
  // the sign-in screen (§22/§32) — operators get the detail from the server logs
  // and /api/health. Users get a plain, actionable sentence.
  const notConfigured = params.error === "auth_not_configured" || !env.isDatabaseConfigured;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        {/* Sparing use of the logo's yellow/orange/red as a brand accent bar. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red"
        />
        <Brand height={30} />
        <div className="space-y-4">
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-sidebar-foreground">
            Travel Planner
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-sidebar-foreground/60">
            The pricing, customization and quotation console for the Trip Le team. Deterministic
            pricing, historically accurate quotes and structured, database-driven itineraries.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          Trip Le Tourism Pvt. Ltd. — Internal team tool.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Brand tone="onLight" height={30} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Trip Le team credentials to continue.
            </p>
          </div>

          {notConfigured ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Sign-in is unavailable because this environment is not fully configured yet. Please
                contact your administrator.
              </span>
            </div>
          ) : null}

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
