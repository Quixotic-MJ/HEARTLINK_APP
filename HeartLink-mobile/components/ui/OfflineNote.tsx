import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "./AnimatedButton";
import { useDs } from "../onboarding/useDs";

/** "8:40 AM" for today, "Oct 27, 8:40 AM" for an earlier day; null when it was never saved. */
export function savedAtLabel(savedAt: number, now = new Date()): string | null {
  if (!savedAt) return null;
  const at = new Date(savedAt);
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return at.toDateString() === now.toDateString() ? time : `${at.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

/**
 * Shown above saved data while the phone is offline: React Query pauses a refresh until the connection is back, so
 * without this the screen kept the old numbers with no sign they were old.
 */
export function OfflineNote({ savedAt, onRetry }: { savedAt: number; onRetry?: () => void }) {
  const { c } = useDs();
  const when = savedAtLabel(savedAt);
  const message = `Couldn't refresh your latest data. You're offline${when ? `, so this is from ${when}` : ""}.`;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 12, paddingRight: 4, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline }}
    >
      <Feather name="wifi-off" size={16} color={c.charcoal} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.ink }}>{message}</Text>
      {onRetry ? (
        <AnimatedButton onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again" style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>Try again</Text>
        </AnimatedButton>
      ) : null}
    </View>
  );
}
