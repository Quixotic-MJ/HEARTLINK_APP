import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { ExploreExercise, ExploreRecipe, toExploreExercise, toExploreRecipe } from "../services/explore";

// Data for Explore, its browse-by-need lists and Saved. Patients only get approved recipes and
// exercises from the server (HL-026 / HL-037).

async function getJson(path: string): Promise<unknown> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`Couldn't load ${path}`);
  return res.json();
}

const asList = (data: unknown): Record<string, unknown>[] => (Array.isArray(data) ? data : []);
const idsOf = (data: unknown): string[] => asList(data).map((item) => String(item.recipe_id ?? item.routine_id ?? item.id));

export function useExploreRecipes() {
  return useQuery({
    queryKey: ["explore", "recipes"],
    staleTime: 60 * 1000,
    queryFn: () => getJson("/api/recipes/"),
    select: (data): ExploreRecipe[] => asList(data).map(toExploreRecipe),
  });
}

export function useExploreExercises() {
  return useQuery({
    queryKey: ["explore", "exercises"],
    staleTime: 60 * 1000,
    queryFn: () => getJson("/api/exercises/"),
    select: (data): ExploreExercise[] => asList(data).map(toExploreExercise),
  });
}

/** The patient's latest score and the dashboard's suggestions (same query as the dashboard). */
export function useExploreScore() {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["dashboard", userId],
    enabled: !!userId,
    queryFn: () => getJson("/api/dashboard/me"),
    select: (data) => {
      const d = (data ?? {}) as {
        hss_score?: number;
        hss_tier?: string;
        recommendations?: { id: string | number; type: string }[];
        hidden_items?: { id: string | number; type: string }[];
      };
      return {
        score: d.hss_score ?? null,
        tier: d.hss_tier ?? null,
        recommendations: d.recommendations ?? [],
        // HL-057: items a clinician marked not suitable for this patient (empty while the setting is off).
        hidden: (d.hidden_items ?? []).map((h) => `${h.type}:${h.id}`),
      };
    },
  });
}

/** Saved recipe or exercise ids, with a toggle that updates the list straight away. */
function useSaved(kind: "recipes" | "exercises") {
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const key = [kind === "recipes" ? "saved_recipes" : "saved_exercises", userId];

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async () => idsOf(await getJson(`/api/${kind}/saved/${userId}`)),
  });

  const mutation = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      const res = await apiFetch(`/api/${kind}/${id}/save/${userId}`, { method: saved ? "DELETE" : "POST" });
      if (!res.ok) throw new Error("Couldn't update saved");
    },
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData(key, saved ? previous.filter((x) => x !== id) : [...previous, id]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },
  });

  const ids = query.data ?? [];
  return {
    ids,
    refetch: query.refetch,
    toggle: (id: string) => mutation.mutate({ id, saved: ids.includes(id) }),
  };
}

export const useSavedRecipes = () => useSaved("recipes");
export const useSavedExercises = () => useSaved("exercises");
