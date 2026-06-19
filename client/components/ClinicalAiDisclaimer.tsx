import { AlertCircle } from "lucide-react";

interface ClinicalAiDisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function ClinicalAiDisclaimer({
  className = "",
  compact = false,
}: ClinicalAiDisclaimerProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className={compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}>
        Aide à la décision clinique — ne se substitue pas au jugement médical du
        clinicien. Vérifiez toujours les recommandations avant toute action.
      </p>
    </div>
  );
}
