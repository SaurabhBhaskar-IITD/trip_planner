import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Official Trip Le wordmark (public/logo.png — the brand asset, never redrawn).
 *
 * The asset is a transparent PNG whose glyphs are the brand orange, so it sits
 * correctly on the navy sidebar and on light surfaces alike. Intrinsic size is
 * 622×233; `height` drives the render and the width is derived from that exact
 * ratio so the logo is never stretched.
 */
const LOGO_RATIO = 622 / 233;

export function Brand({
  className,
  showWordmark = true,
  height = 26,
  tone = "onDark",
}: {
  className?: string;
  /** Show the "Planner / Internal console" lockup beside the logo. */
  showWordmark?: boolean;
  /** Rendered logo height in px; width follows the true aspect ratio. */
  height?: number;
  /** Which surface the mark sits on — controls the supporting text colour only. */
  tone?: "onDark" | "onLight";
}) {
  const width = Math.round(height * LOGO_RATIO);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="Trip Le"
        width={width}
        height={height}
        priority
        className="shrink-0 object-contain"
        style={{ width, height }}
      />
      {showWordmark ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "h-6 w-px shrink-0",
              tone === "onDark" ? "bg-sidebar-foreground/25" : "bg-border",
            )}
          />
          <div className="flex flex-col leading-none">
            <span
              className={cn(
                "text-sm font-semibold tracking-tight",
                tone === "onDark" ? "text-sidebar-foreground" : "text-foreground",
              )}
            >
              Planner
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] uppercase tracking-[0.16em]",
                tone === "onDark" ? "text-sidebar-foreground/50" : "text-muted-foreground",
              )}
            >
              Internal console
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
