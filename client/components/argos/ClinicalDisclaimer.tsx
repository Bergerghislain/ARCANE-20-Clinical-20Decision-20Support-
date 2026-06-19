import { AlertTriangle } from "lucide-react";

/**
 * Garde-fou clinique: rappelle que l'IA est une aide a la decision et ne remplace
 * pas le jugement medical. Affiche egalement la version de prompt pour la tracabilite.
 */
export function ClinicalDisclaimer({
  promptVersion,
  className = "",
}: {
  promptVersion?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      aria-label="Avertissement clinique"
      className={`flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>
        ARGOS fournit une <strong>aide à la décision clinique</strong> et ne se
        substitue pas au jugement médical du clinicien. Vérifiez chaque
        recommandation avant toute décision.
        {promptVersion ? (
          <span className="ml-1 opacity-70">(prompt v{promptVersion})</span>
        ) : null}
      </p>
    </div>
  );
}
