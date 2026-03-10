import { apiFetch } from "@/lib/api";

export interface ArgosDiscussion {
  id: number;
  patient_id: number;
  clinician_id: number;
  title: string | null;
  context: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ArgosMessageSections {
  clinicalSynthesis?: string | null;
  hypotheses?: string[];
  arguments?: string[];
  nextSteps?: string[];
  traceability?: string | null;
}

export interface ArgosMessage {
  id: number;
  discussion_id: number;
  message_type: "user_query" | "argos_response" | "clinician_note";
  content: string;
  sections?: ArgosMessageSections | null;
  created_at: string;
  created_by?: number | null;
}

export async function fetchArgosDiscussions(
  patientId?: number,
): Promise<ArgosDiscussion[]> {
  const search = patientId ? `?patient_id=${patientId}` : "";
  const res = await apiFetch(`/api/argos/discussions${search}`);
  if (!res.ok) throw new Error("Failed to load ARGOS discussions");
  return res.json();
}

export async function createArgosDiscussion(input: {
  patientId: number;
  title?: string;
  context?: string;
}): Promise<ArgosDiscussion> {
  const res = await apiFetch("/api/argos/discussions", {
    method: "POST",
    body: JSON.stringify({
      patient_id: input.patientId,
      title: input.title,
      context: input.context,
    }),
  });
  if (!res.ok) throw new Error("Failed to create ARGOS discussion");
  return res.json();
}

export async function fetchArgosMessages(
  discussionId: number,
): Promise<ArgosMessage[]> {
  const res = await apiFetch(
    `/api/argos/discussions/${discussionId}/messages`,
  );
  if (!res.ok) throw new Error("Failed to load ARGOS messages");
  return res.json();
}

export async function postArgosMessage(
  discussionId: number,
  payload: {
    message_type: ArgosMessage["message_type"];
    content: string;
    sections?: ArgosMessageSections;
  },
): Promise<ArgosMessage> {
  const res = await apiFetch(
    `/api/argos/discussions/${discussionId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error("Failed to create ARGOS message");
  return res.json();
}

