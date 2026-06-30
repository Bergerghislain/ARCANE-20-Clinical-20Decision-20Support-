import { Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArgosTabLinkProps {
  onOpenDiscussion: () => void;
}

export function ArgosHeaderButton({ onOpenDiscussion }: ArgosTabLinkProps) {
  return (
    <Button variant="secondary" size="lg" onClick={onOpenDiscussion}>
      <Bot className="mr-2 h-5 w-5" />
      New ARGOS Discussion
    </Button>
  );
}

export function ArgosTabLink({ onOpenDiscussion }: ArgosTabLinkProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
      <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">
        Ouvrez ARGOS pour demarrer une discussion avec le contexte patient.
      </p>
      <Button className="mt-4" onClick={onOpenDiscussion}>
        <Bot className="mr-2 h-4 w-4" />
        Start New Discussion
      </Button>
    </div>
  );
}

export function ArgosContextButton({ onOpenDiscussion }: ArgosTabLinkProps) {
  return (
    <Button variant="secondary" onClick={onOpenDiscussion}>
      <Bot className="mr-2 h-4 w-4" />
      Envoyer le contexte vers ARGOS
    </Button>
  );
}
