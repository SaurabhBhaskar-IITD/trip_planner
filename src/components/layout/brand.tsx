import { cn } from "@/lib/utils/cn";

/**
 * Trip Le wordmark. A compact SVG monogram + wordmark so it stays crisp at any
 * size and needs no external asset. Replace the mark with the official Trip Le
 * logo asset when brand guidelines are provided.
 */
export function Brand({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        {/* Stylised compass / location mark */}
        <path
          d="M16 7l3.2 6.8L26 16l-6.8 2.2L16 25l-2.2-6.8L7 16l6.8-2.2L16 7z"
          className="fill-primary-foreground"
        />
      </svg>
      {showWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Trip Le <span className="text-primary-foreground/90">Planner</span>
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
            Internal Console
          </span>
        </div>
      ) : null}
    </div>
  );
}
