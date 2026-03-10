import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bot,
  FileText,
  MessageSquare,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";

// Ajustez cette interface aux champs renvoyés par votre API /api/patients/:id
interface Patient {
  id_patient: string;
  name: string;
  age: number;
  mrn: string;
  condition: string;
  diagnosis: string;
  diagnosisDate: string;
  status: string;
  lastVisit: string;
  clinicalData: {
    stage: string;
    ecog: string;
    ldh: string;
    albumin: string;
  };
  discussions: {
    id: string;
    date: string;
    topic: string;
    summary: string;
  }[];
}

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    const fetchPatient = async () => {
      const res = await apiFetch(`/api/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      }
      setIsLoading(false);
    };
    fetchPatient();
  }, [patientId]);

  // Affichage d’un état de chargement
  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">Loading patient…</div>
      </MainLayout>
    );
  }

  // Si aucun patient n’est trouvé
  if (!patient) {
    return (
      <MainLayout>
        <div className="p-6">Patient not found</div>
      </MainLayout>
    );
  }

  // Affichage normal une fois les données chargées
  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* En‑tête */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm text-secondary hover:text-secondary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  {patient.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {patient.age} years
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {patient.mrn}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(patient.lastVisit).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <Button variant="secondary" size="lg">
                <Bot className="mr-2 h-5 w-5" />
                New ARGOS Discussion
              </Button>
            </div>
          </div>
        </div>

        {/* Contenu avec onglets */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Clinical Data</span>
              </TabsTrigger>
              <TabsTrigger
                value="discussions"
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">ARGOS Discussions</span>
              </TabsTrigger>
            </TabsList>

            {/* Onglet Overview */}
            <TabsContent value="overview" className="space-y-6">
              {/* Cartes de diagnostics et de statut, utilisant patient.diagnosis, etc. */}
              {/* … adaptez ici avec les propriétés de patient */}
            </TabsContent>

            {/* Onglet Clinical Data */}
            <TabsContent value="clinical" className="space-y-6">
              {/* Affichage des données cliniques structurées (MRN, condition, etc.) */}
            </TabsContent>

            {/* Onglet Discussions */}
            <TabsContent value="discussions" className="space-y-4">
              {patient.discussions && patient.discussions.length > 0 ? (
                patient.discussions.map((discussion) => (
                  <button
                    key={discussion.id}
                    className="w-full rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-secondary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">
                        {discussion.topic}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(discussion.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {discussion.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-secondary">
                      <MessageSquare className="h-4 w-4" />
                      View discussion
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No ARGOS discussions yet</p>
                  <Button className="mt-4 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Bot className="mr-2 h-4 w-4" />
                    Start New Discussion
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
