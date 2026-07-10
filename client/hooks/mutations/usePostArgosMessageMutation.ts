import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  postArgosMessage,
  type ArgosMessage,
  type ArgosMessageSections,
} from "@/lib/argosApi";
import { queryKeys } from "@/lib/queryKeys";

export interface PostArgosMessageInput {
  discussionId: number;
  patientId?: number;
  message_type: ArgosMessage["message_type"];
  content: string;
  sections?: ArgosMessageSections;
}

export function usePostArgosMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PostArgosMessageInput) =>
      postArgosMessage(input.discussionId, {
        message_type: input.message_type,
        content: input.content,
        sections: input.sections,
      }),
    onSuccess: (message, variables) => {
      queryClient.setQueryData<ArgosMessage[]>(
        queryKeys.argos.messages(variables.discussionId),
        (current) => [...(current ?? []), message],
      );
    },
  });
}