import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStoredUser } from "@/lib/auth";
import { fr } from "@/lib/i18n/fr";
import { Settings as SettingsIcon, User } from "lucide-react";

function formatRole(role: string | undefined): string {
  if (!role) return "—";
  const key = role.toLowerCase() as keyof typeof fr.settings.roles;
  return fr.settings.roles[key] ?? role;
}

export default function Settings() {
  const user = getStoredUser();

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {fr.settings.title}
            </h1>
            <p className="text-sm text-muted-foreground">{fr.settings.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {fr.settings.signedInAccount}
            </CardTitle>
            <CardDescription>{fr.settings.signedInDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{fr.settings.email}</span>
              <span className="font-medium text-foreground">
                {user?.email ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{fr.settings.role}</span>
              <span className="font-medium text-foreground">
                {formatRole(user?.role)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{fr.settings.username}</span>
              <span className="font-medium text-foreground">
                {user?.username ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{fr.settings.application}</CardTitle>
            <CardDescription>{fr.settings.applicationDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {fr.settings.applicationBody}
            </p>
          </CardContent>
        </Card>

        <Link to="/dashboard">
          <Button variant="outline">{fr.settings.backToDashboard}</Button>
        </Link>
      </div>
    </MainLayout>
  );
}
