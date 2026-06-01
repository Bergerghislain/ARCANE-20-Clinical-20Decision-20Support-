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
import {
  BookOpen,
  HelpCircle,
  LifeBuoy,
  Mail,
  ShieldAlert,
} from "lucide-react";

const helpTopics = [
  {
    title: "Patient dashboard",
    description:
      "Search, filter, and open patient records from the dashboard. Use Add Patient to register a new case.",
  },
  {
    title: "Patient file & reports",
    description:
      "Each patient file has tabs for clinical info, structured reports, and ARGOS discussions.",
  },
  {
    title: "ARGOS Space",
    description:
      "Collaborative AI-assisted discussions tied to a patient context when opened from a file.",
  },
  {
    title: "Administration",
    description:
      "Administrators can approve users and reassign patients via Administration and Patient Handler.",
  },
];

export default function Help() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help</h1>
            <p className="text-sm text-muted-foreground">
              Quick guidance for ARCANE clinical workflows.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Getting started
            </CardTitle>
            <CardDescription>
              Overview of the main areas of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {helpTopics.map((topic) => (
              <div key={topic.title}>
                <h2 className="font-medium text-foreground">{topic.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {topic.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LifeBuoy className="h-5 w-5" />
              Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              For access issues or password reset, contact your ARCANE lab
              administrator. Self-service password recovery is not yet
              available.
            </p>
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Do not enter real patient identifiers in demo environments unless
              your deployment is approved for production data.
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
