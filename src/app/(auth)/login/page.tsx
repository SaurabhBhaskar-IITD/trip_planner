import type { Metadata } from "next";
import { AlertTriangle, Info } from "lucide-react";
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
  const authNotConfigured = params.error === "auth_not_configured";
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <Brand />
        <div className="space-y-4">
          <h2 className="max-w-md text-2xl font-semibold leading-snug text-sidebar-foreground">
            The pricing, customization and quotation console for the Trip Le team.
          </h2>
          <p className="max-w-md text-sm text-sidebar-foreground/60">
            Deterministic pricing. Historically accurate quotes. Structured, database-driven
            itineraries. Built for operations at scale.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          Trip Le Tourism Pvt. Ltd. — Internal use only.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Trip Le team credentials to continue.
            </p>
          </div>

          {authNotConfigured ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>AUTH_SECRET</strong> is not configured. Authentication cannot work without it.
                Set <code>AUTH_SECRET</code> in your Vercel environment variables (generate one
                with <code>openssl rand -base64 32</code>), then redeploy.
              </span>
            </div>
          ) : null}

          <LoginForm />

          {!env.isDatabaseConfigured ? (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                No database is connected yet. Configure <code>DATABASE_URL</code> (Neon PostgreSQL)
                and seed a user to enable sign-in. See the README for setup.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
