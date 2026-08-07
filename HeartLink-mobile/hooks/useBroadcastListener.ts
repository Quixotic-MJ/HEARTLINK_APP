import { useEffect, useRef } from "react";
import { useToast } from "../contexts/ToastContext";
import { Platform } from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000");

const POLLING_INTERVAL_MS = 15000; // 15 seconds

/**
 * Lightweight broadcast listener that shows an in-app toast when
 * a new system broadcast is detected. The actual notification entries
 * are created server-side and shown in the Notifications screen.
 * This hook only provides the "instant pop-up" effect.
 */
export function useBroadcastListener() {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const lastSeenIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Keep toast ref stable
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let isMounted = true;

    const fetchBroadcasts = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch(
          `${API_URL}/api/notifications/broadcasts`
        );
        if (!response.ok) return;

        const broadcasts = await response.json();

        if (broadcasts && broadcasts.length > 0) {
          const latest = broadcasts[0];

          if (!hasInitializedRef.current) {
            // First run: just record the current latest, don't show a toast
            lastSeenIdRef.current = latest.id;
            hasInitializedRef.current = true;
            return;
          }

          if (latest.id !== lastSeenIdRef.current) {
            lastSeenIdRef.current = latest.id;

            // Determine toast style
            let toastType: "info" | "error" | "success" = "info";
            const typeLower = (latest.type || "").toLowerCase();
            if (
              typeLower.includes("maintenance") ||
              typeLower.includes("alert")
            ) {
              toastType = "error";
            } else if (
              typeLower.includes("feature") ||
              typeLower.includes("update")
            ) {
              toastType = "success";
            }

            showToastRef.current({
              title: latest.type || "System Broadcast",
              message: latest.message,
              type: toastType,
              duration: 5000,
            });
          }
        } else if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
        }
      } catch (error) {
        // Silently ignore network errors
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
        }
      }
    };

    // Initial fetch (records current state, no toast on first run)
    fetchBroadcasts();

    // Poll every 15s
    intervalId = setInterval(fetchBroadcasts, POLLING_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);
}
