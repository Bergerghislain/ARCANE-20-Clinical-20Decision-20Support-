import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { isAuthenticated, setAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });
      if (!res.ok) {
        throw new Error("Invalid credentials");
      }
      const data = await res.json();
      setAuth(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F7cd1f0a31d4341f88052d23a9c109ccd%2F8bdc503ce9cf4432ae8603c4be99f69b?format=webp&width=800"
                alt="ARCANE Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                ARCANE
              </h1>
              <p className="text-xs text-muted-foreground">
                Clinical Decision Support
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-8 shadow-xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to access patient data and ARGOS
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-gap gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="doctor@arcane.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6 space-y-2 text-center text-xs text-muted-foreground">
            <p>
              Demo credentials: email/username from DB + password "password"
            </p>
            <button
              type="button"
              className="underline block w-full"
              onClick={() => navigate("/register")}
            >
              Créer un compte clinicien
            </button>
            <button
              type="button"
              className="underline block w-full"
              onClick={() => navigate("/forgot-password")}
            >
              Mot de passe oublié ?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-4 text-center text-xs text-muted-foreground">
          <div>
            <p>
              ARCANE Phase 1 • IA agentique pour l'aide à la décision clinique
            </p>
            <p className="mt-2">Specialized in Rare Cancer Support</p>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t border-border w-full justify-center">
            <p>Powered by</p>
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F7cd1f0a31d4341f88052d23a9c109ccd%2F5695ec5fddb246fdb41b71f78ec4270c?format=webp&width=800"
              alt="IHU PRISM"
              className="h-5 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
