import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api";

/**
 * HL-035: load a backend address with React Query. `select` turns the response into what the screen shows
 * (it runs again only when the data changes). Any save through apiFetch refreshes every loaded address.
 * `keepPrevious` keeps the last result on screen while a new address (next page, new search) loads.
 *
 *   const { data, isPending, isError, refetch } = useApiQuery("/api/recipes", { select: toRecipes });
 */
export function useApiQuery(path, { select, enabled = true, refetchInterval, keepPrevious = false } = {}) {
  return useQuery({
    queryKey: ["api", path],
    queryFn: () => apiFetch(path),
    select,
    enabled: enabled && !!path,
    refetchInterval,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
