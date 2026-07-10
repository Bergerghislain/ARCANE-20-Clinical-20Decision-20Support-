import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createArgosDiscussion,
  fetchArgosMessages,
  type ArgosDiscussion,
  type ArgosMessage,
} from "@/lib/argosApi";
import { invalidateArgosDiscussions } from "@/lib/queryInvalidation";
import { queryKeys } from "@/lib/queryKeys";

export interface CreateArgosDiscussionInput {
  patientId: number;
  patientName: string;
  title?: string;
}

export interface CreateArgosDiscussionResult {
  discussion: ArgosDiscussion;
  messages: ArgosMessage[];
  patientName: string;
}

export function useCreateArgosDiscussionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientId,
      patientName,
      title,
    }: CreateArgosDiscussionInput): Promise<CreateArgosDiscussionResult> => {
      const discussion = await createArgosDiscussion({
        patientId,
        title,
      });
      const messages = await fetchArgosMessages(discussion.id);
      return { discussion, messages, patientName };
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(
        queryKeys.argos.messages(result.discussion.id),
        result.messages,
      );
      await invalidateArgosDiscussions(result.discussion.patient_id);
    },
  });
}
