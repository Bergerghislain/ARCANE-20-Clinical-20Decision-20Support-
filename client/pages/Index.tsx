import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Users, Brain, Lock, ChevronRight } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-cyan-50">
      {/* Navigation */}
      <header className="border-b border-border/30 bg-white/70 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 shadow-md">
              <span className="text-sm font-bold text-white">
                A
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">ARCANE</h1>
              <p className="text-xs text-muted-foreground">Clinical AI</p>
            </div>
          </Link>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button variant="default" onClick={() => navigate("/login")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
            <Bot className="h-4 w-4 text-secondary mr-2" />
            <span className="text-sm font-medium text-secondary">
              AI-Powered Clinical Support
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-primary mb-6 leading-tight">
            Clinical Decision Support for Rare Cancers
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            ARCANE is an intelligent clinical decision support platform that
            helps oncologists navigate complex rare cancer cases with AI-powered
            reasoning and evidence-based guidance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate("/login")}
            >
              Enter ARCANE
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary/10"
            >
              Learn More
            </Button>
          </div>

          <div className="relative h-96 rounded-2xl border border-border/50 bg-card/30 backdrop-blur p-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 to-transparent" />
            <div className="relative h-full flex flex-col items-center justify-center">
              <Bot className="h-24 w-24 text-secondary/20 mb-4" />
              <p className="text-center text-muted-foreground max-w-xs">
                ARGOS - ARCANE Reasoning & Guidance Orchestrator
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card/50 border-y border-border px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-primary mb-12 text-center">
            Powerful Features for Clinicians
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-lg border border-border bg-background p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                Patient Management
              </h3>
              <p className="text-muted-foreground text-sm">
                Centralized patient data, structured clinical information, and
                comprehensive case histories.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-border bg-background p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-secondary/10 mb-4">
                <Brain className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-muted-foreground text-sm">
                ARGOS provides structured clinical reasoning with evidence-based
                hypotheses and recommendations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-border bg-background p-8">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-success/10 mb-4">
                <Lock className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                Secure & Compliant
              </h3>
              <p className="text-muted-foreground text-sm">
                HIPAA-compliant infrastructure with role-based access and
                comprehensive audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARGOS Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10 p-12 text-center">
            <h2 className="text-3xl font-bold text-primary mb-4">Meet ARGOS</h2>
            <p className="text-lg text-foreground mb-6 max-w-2xl mx-auto">
              ARCANE Reasoning & Guidance Orchestrator - Your intelligent
              companion for clinical decision-making.
            </p>
            <div className="space-y-3 text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
              <p>✓ Contextual clinical synthesis</p>
              <p>✓ Multiple treatment hypotheses</p>
              <p>✓ Evidence-based arguments</p>
              <p>✓ Actionable next steps</p>
              <p>✓ Complete traceability</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Ready to enhance clinical decision-making?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join clinicians leveraging AI for better patient outcomes in rare
            cancer care.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => navigate("/login")}
          >
            Start Using ARCANE
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-semibold text-foreground mb-4">ARCANE</p>
              <p className="text-sm text-muted-foreground">
                Clinical decision support for rare cancer cases
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-secondary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-secondary">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Company</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-secondary">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-secondary">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-secondary">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-secondary">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>
              © 2025 ARCANE. IA agentique pour l'aide à la décision clinique
              dans les cancers rares.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
