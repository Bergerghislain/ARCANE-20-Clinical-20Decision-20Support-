import { useQuery } from "@tanstack/react-query";
import { fetchArgosMessages, type ArgosMessage } from "@/lib/argosApi";
import { queryKeys } from "@/lib/queryKeys";

export function useArgosMessagesQuery(discussionId: number | null) {
  return useQuery<ArgosMessage[]>({
    queryKey: queryKeys.argos.messages(discussionId ?? 0),
    queryFn: () => fetchArgosMessages(discussionId!),
    enabled: discussionId !== null && discussionId > 0,
  });
}
