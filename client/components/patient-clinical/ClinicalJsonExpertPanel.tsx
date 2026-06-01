import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClinicalJsonExpertPanelProps {
  label: string;
  codeHint: string;
  value: string;
  onChange: (value: string) => void;
}

export function ClinicalJsonExpertPanel({
  label,
  codeHint,
  value,
  onChange,
}: ClinicalJsonExpertPanelProps) {
  return (
    <section className="space-y-2 rounded-2xl border border-dashed border-border/80 bg-background p-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">
          Mode expert — JSON synchronisé avec le profil (<code>{codeHint}</code>).
          La vue structurée ci-dessus lit la base via l&apos;API clinique.
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[160px] font-mono text-xs"
      />
    </section>
  );
}
