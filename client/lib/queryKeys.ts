/** Clés de cache React Query — une seule source pour invalidation cohérente. */
export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    list: (limit: number, offset: number) =>
      ["patients", "list", { limit, offset }] as const,
    infinite: (pageSize: number) => ["patients", "infinite", pageSize] as const,
    detail: (patientId: string) => ["patients", "detail", patientId] as const,
    profile: (patientId: string) => ["patients", "profile", patientId] as const,
    clinical: (patientId: string) => ["patients", "clinical", patientId] as const,
  },
  argos: {
    discussions: (patientId?: number) =>
      ["argos", "discussions", patientId ?? "all"] as const,
    messages: (discussionId: number) =>
      ["argos", "messages", discussionId] as const,
  },
  ai: {
    status: () => ["ai", "status"] as const,
  },
};
