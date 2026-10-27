import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { apiFetch } from "../lib/api";
import { logAppError } from "./errorLog";

/**
 * HL-025: push notifications from the backend (announcements, checkup reminders). After sign-in the phone's Expo
 * push token is saved on the server; sign-out removes it. Expo Go can't receive remote push, so all of this is
 * skipped there (the notifications screen still lists everything). Nothing here may block sign-in or sign-out.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Loaded only outside Expo Go, the same way utils/notifications.ts does
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof import("expo-notifications") | null = isExpoGo ? null : require("expo-notifications");

let savedToken: string | null = null;

/** HL-077: why push is off on this phone, so Settings can say so instead of failing silently. */
export type PushOffReason = "expo_go" | "emulator" | "not_set_up" | "permission" | "token" | "server";
export type PushStatus = { on: true } | { on: false; reason: PushOffReason };

let pushStatus: PushStatus | null = null;
const statusListeners = new Set<() => void>();

function setPushStatus(next: PushStatus): void {
  pushStatus = next;
  statusListeners.forEach((listener) => listener());
}

export function getPushStatus(): PushStatus | null {
  return pushStatus;
}

function subscribeToPushStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/** The latest result of registerForPush (null until it has run since the app started). */
export function usePushStatus(): PushStatus | null {
  return useSyncExternalStore(subscribeToPushStatus, getPushStatus, getPushStatus);
}

/** What Settings shows, and whether tapping the row can fix it (open phone settings or try again). */
export function pushStatusText(status: PushStatus | null): { subtitle: string; action: "open_settings" | "retry" | null } {
  if (!status) return { subtitle: "Checking…", action: null };
  if (status.on) return { subtitle: "On: announcements and reminders arrive", action: null };
  switch (status.reason) {
    case "expo_go":
      return { subtitle: "Off in Expo Go: install the HeartLink test app", action: null };
    case "emulator":
      return { subtitle: "Off on an emulator: use a real phone", action: null };
    case "not_set_up":
      return { subtitle: "Off: this version of the app isn't set up for push", action: null };
    case "permission":
      return { subtitle: "Off: allow notifications in your phone's settings", action: "open_settings" };
    case "token":
      return { subtitle: "Off: couldn't reach the notification service. Tap to try again", action: "retry" };
    case "server":
      return { subtitle: "Off: couldn't connect this phone to HeartLink. Tap to try again", action: "retry" };
  }
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Saves this phone's push token for the signed-in user. Returns the token, or null when push isn't available. */
export async function registerForPush(): Promise<string | null> {
  if (!Notifications) {
    setPushStatus({ on: false, reason: "expo_go" });
    return null;
  }
  if (!Device.isDevice) {
    setPushStatus({ on: false, reason: "emulator" });
    return null;
  }
  const id = projectId();
  if (!id) {
    if (__DEV__) console.log("[Push] No EAS projectId yet (run `npx eas-cli init`); push is off.");
    setPushStatus({ on: false, reason: "not_set_up" });
    return null;
  }
  try {
    if (Platform.OS === "android") {
      // The channel the backend's pushes use (same as the local reminders)
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") {
      setPushStatus({ on: false, reason: "permission" });
      return null;
    }

    let token: string;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    } catch (e) {
      logAppError(e, "push_token");
      setPushStatus({ on: false, reason: "token" });
      return null;
    }

    const res = await apiFetch("/api/notifications/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS === "ios" ? "ios" : "android" }),
    });
    if (!res.ok) {
      logAppError(new Error(`Saving the push token failed (${res.status})`), "push_register");
      setPushStatus({ on: false, reason: "server" });
      return null;
    }
    savedToken = token;
    setPushStatus({ on: true });
    return token;
  } catch (e) {
    // push is a nice-to-have; never break sign-in over it
    logAppError(e, "push_register");
    setPushStatus({ on: false, reason: "server" });
    return null;
  }
}

/** On sign-out: this phone stops getting pushes for that account. Call while the session is still valid. */
export async function unregisterPush(): Promise<void> {
  const token = savedToken;
  savedToken = null;
  if (!token) return;
  try {
    await apiFetch("/api/notifications/push-token", { method: "DELETE", body: JSON.stringify({ token }) });
  } catch {
    // The server also switches off phones Expo reports as gone
  }
}

/** Tapping a push opens the notifications screen. Used once, in the root layout. */
export function usePushNavigation() {
  const router = useRouter();
  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === "notifications") router.push("/(home)/(profile)/notifications");
    });
    return () => sub.remove();
  }, [router]);
}
