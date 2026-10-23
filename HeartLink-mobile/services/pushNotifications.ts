import { useEffect } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { apiFetch } from "../lib/api";

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

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Saves this phone's push token for the signed-in user. Returns the token, or null when push isn't available. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Notifications || !Device.isDevice) return null;
    const id = projectId();
    if (!id) {
      if (__DEV__) console.log("[Push] No EAS projectId yet (run `npx eas-cli init`); push is off.");
      return null;
    }
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
    if (status !== "granted") return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const res = await apiFetch("/api/notifications/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS === "ios" ? "ios" : "android" }),
    });
    if (!res.ok) return null;
    savedToken = token;
    return token;
  } catch {
    return null; // push is a nice-to-have; never break sign-in over it
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
