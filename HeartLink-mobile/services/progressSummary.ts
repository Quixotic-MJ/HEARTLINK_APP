import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

/**
 * The AI summary on Trends (2026-11-12), from /api/analytics/{userId}/summary?days=7|14|30 (backend
 * app/services/progress_summary.py). The server works out the facts from the patient's own logs; the AI only rewords
 * them, and its text is checked (no new numbers, no medical words, no advice). `lines` is the plain version.
 */
export type ProgressSummary = {
  days: number;
  /** The plain facts, one sentence each; empty when nothing was logged in the period */
  lines: string[];
  /** What to show: the AI's paragraph when it passed the checks, otherwise the plain lines joined */
  text: string;
  ai_written: boolean;
};

export const SUMMARY_DAYS = [7, 14, 30] as const;

export function hasSummary(days: number): boolean {
  return (SUMMARY_DAYS as readonly number[]).includes(days);
}

export async function fetchProgressSummary(userId: string, days: number): Promise<ProgressSummary> {
  const res = await apiFetch(`/api/analytics/${userId}/summary?days=${days}`);
  if (!res.ok) throw new Error("Could not load your summary");
  return res.json();
}

/** The footnote under the summary: who wrote it, and that it isn't medical advice. */
export function summarySource(s: Pick<ProgressSummary, "ai_written">): string {
  return s.ai_written
    ? "Written by AI from what you logged. It isn't medical advice."
    : "From what you logged. It isn't medical advice.";
}

export function useProgressSummary(userId: string | null | undefined, days: number) {
  return useQuery({
    queryKey: ["progressSummary", userId, days],
    enabled: !!userId && hasSummary(days),
    queryFn: () => fetchProgressSummary(userId as string, days),
    staleTime: 5 * 60 * 1000,
  });
}
