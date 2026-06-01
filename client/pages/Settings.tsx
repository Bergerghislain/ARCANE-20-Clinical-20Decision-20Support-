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
import { Settings as SettingsIcon, User } from "lucide-react";

export default function Settings() {
  const user = getStoredUser();

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Account and application preferences for ARCANE.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Signed-in account
            </CardTitle>
            <CardDescription>
              Information from your current session (read-only).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">
                {user?.email ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize text-foreground">
                {user?.role ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium text-foreground">
                {user?.username ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Application</CardTitle>
            <CardDescription>
              Advanced profile and notification settings will be added in a
              later release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ARCANE Phase 1 — rare cancer clinical decision support. Contact
              your lab administrator to change roles or reset access.
            </p>
          </CardContent>
        </Card>

        <Link to="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    </MainLayout>
  );
}
