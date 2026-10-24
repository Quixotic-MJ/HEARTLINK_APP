import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL, refreshSession } from "../api";

const STREAM_PATH = "/api/admin/notifications/stream";
const FIRST_DELAY_MS = 5000;
const MAX_DELAY_MS = 60000;

// The bell's and the notifications page's addresses (with or without ?include_archived)
const isNotificationsQuery = (query) =>
  query.queryKey[0] === "api" && String(query.queryKey[1] ?? "").startsWith("/api/admin/notifications");

/**
 * HL-041: keeps one Server-Sent Events stream open while a staff page is open. Each event means "notifications
 * changed", and the bell and notifications page reload their own lists (the event carries no content).
 * A dropped connection is reconnected by the browser; a refused one (usually an expired sign-in) renews the
 * session and reconnects, waiting longer each time, and stops if the session can't be renewed.
 */
export function useLiveNotifications(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let source = null;
    let timer = null;
    let delay = FIRST_DELAY_MS;
    let opened = false;
    let stopped = false;

    const refresh = () => queryClient.invalidateQueries({ predicate: isNotificationsQuery });

    const connect = () => {
      source = new EventSource(`${BASE_URL}${STREAM_PATH}`, { withCredentials: true });
      source.addEventListener("open", () => {
        delay = FIRST_DELAY_MS;
        // Catch up on anything that changed while the stream was down
        if (opened) refresh();
        opened = true;
      });
      source.addEventListener("notifications", refresh);
      source.onerror = () => {
        if (stopped || source.readyState !== EventSource.CLOSED) return; // still reconnecting by itself
        source.close();
        timer = setTimeout(async () => {
          const renewed = await refreshSession();
          if (renewed && !stopped) connect();
        }, delay);
        delay = Math.min(delay * 2, MAX_DELAY_MS);
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      source?.close();
    };
  }, [enabled, queryClient]);
}
