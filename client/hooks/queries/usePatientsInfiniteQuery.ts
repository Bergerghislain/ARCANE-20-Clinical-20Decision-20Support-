import { useInfiniteQuery } from "@tanstack/react-query";
import { PATIENTS_PAGE_SIZE } from "@/lib/patientNormalize";
import { queryKeys } from "@/lib/queryKeys";
import { fetchPatientsPage } from "@/hooks/queries/usePatientsQuery";

export function usePatientsInfiniteQuery(
  pageSize: number = PATIENTS_PAGE_SIZE,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.patients.infinite(pageSize),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPatientsPage(pageSize, pageParam),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + pageSize : undefined,
  });
}
