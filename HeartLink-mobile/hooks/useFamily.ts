import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { AccountKind, FamilySummary, Followed, Invite, SharingStatus } from "../services/family";

// HL-087: family sharing. Errors carry the server's own message ("That code didn't work. …") for the screen.

export class FamilyError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new FamilyError(typeof detail === "string" ? detail : detail?.message ?? "Something went wrong. Try again.");
  }
  return res.json();
}

/** The patient's side: their open code and their followers. */
export function useSharing() {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["family", "sharing", userId],
    enabled: !!userId,
    queryFn: () => call<SharingStatus>("/api/family/sharing"),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call<Invite>("/api/family/invite", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family", "sharing"] }),
  });
}

export function useRemoveFollower() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => call<{ success: boolean }>(`/api/family/followers/${followerId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family", "sharing"] }),
  });
}

/** The follower's side. */
export function useFollowing() {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["family", "following", userId],
    enabled: !!userId,
    queryFn: () => call<Followed[]>("/api/family/following"),
  });
}

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      call<{ id: string; name: string }>("/api/family/follow", { method: "POST", body: JSON.stringify({ code }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family", "following"] }),
  });
}

export function useStopFollowing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => call<{ success: boolean }>(`/api/family/following/${patientId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family", "following"] }),
  });
}

export function useFamilySummary(patientId: string | undefined) {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["family", "summary", userId, patientId],
    enabled: !!userId && !!patientId,
    retry: (count, error) => !(error instanceof FamilyError) && count < 2,
    queryFn: () => call<FamilySummary>(`/api/family/following/${patientId}/summary`),
  });
}

/** "family" skips the health setup; "patient" starts it. Refreshes the profile so the app routes the right way. */
export function useSetAccountKind() {
  const { refreshUser } = useUser();
  return useMutation({
    mutationFn: (kind: AccountKind) =>
      call<{ account_kind: AccountKind }>("/api/family/account-kind", { method: "PUT", body: JSON.stringify({ kind }) }),
    onSuccess: () => refreshUser(),
  });
}
