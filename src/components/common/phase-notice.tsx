import { Hammer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhaseNoticeProps {
  /** Which delivery phase will implement this area (e.g. "Phase 2"). */
  phase: string;
  title?: string;
  description: string;
}

/**
 * Honest "not built yet" banner. We deliberately DO NOT fabricate data to make a
 * screen look finished — this states plainly what is coming and when.
 */
export function PhaseNotice({ phase, title, description }: PhaseNoticeProps) {
  return (
    <Alert variant="info">
      <Hammer />
      <AlertTitle>{title ?? `Planned for ${phase}`}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
