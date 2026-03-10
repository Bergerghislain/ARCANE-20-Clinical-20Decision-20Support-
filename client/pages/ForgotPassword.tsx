import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Mot de passe oublié
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Cette fonctionnalité sera ajoutée dans une prochaine itération. Pour
          l’instant, contactez l’administrateur ARCANE pour réinitialiser votre
          accès.
        </p>
        <Button variant="default" onClick={() => navigate("/login")}>
          Retour à la connexion
        </Button>
      </div>
    </div>
  );
}

