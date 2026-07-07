import { useQuery } from "@tanstack/react-query";
import {
  fetchArgosDiscussions,
  type ArgosDiscussion,
} from "@/lib/argosApi";
import { queryKeys } from "@/lib/queryKeys";

export function useArgosDiscussionsQuery(patientId?: number) {
  return useQuery<ArgosDiscussion[]>({
    queryKey: queryKeys.argos.discussions(patientId),
    queryFn: () => fetchArgosDiscussions(patientId),
  });
}
