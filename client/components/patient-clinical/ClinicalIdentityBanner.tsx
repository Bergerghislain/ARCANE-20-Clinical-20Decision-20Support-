import type { PatientClinicalBundle } from "@/lib/patientClinicalApi";
import { formatMonthYear, formatValue } from "./clinicalFormatters";

interface ClinicalIdentityBannerProps {
  bundle: PatientClinicalBundle | null;
}

export function ClinicalIdentityBanner({ bundle }: ClinicalIdentityBannerProps) {
  if (!bundle) return null;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm md:grid-cols-4">
      <div>
        <p className="text-xs text-muted-foreground">IPP</p>
        <p className="font-medium">{formatValue(bundle.ipp)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Sexe</p>
        <p className="font-medium">{formatValue(bundle.sex)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Naissance</p>
        <p className="font-medium">
          {formatMonthYear(bundle.birthDateYear, bundle.birthDateMonth)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Dernière visite</p>
        <p className="font-medium">
          {formatMonthYear(bundle.lastVisitDateYear, bundle.lastVisitDateMonth)}
        </p>
      </div>
    </div>
  );
}
