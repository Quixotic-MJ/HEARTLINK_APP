import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../onboarding/useDs";

export type WeeklyInsightLine = { kind: "pressure" | "sodium" | "movement"; text: string };

const ICONS = { pressure: "activity", sodium: "droplet", movement: "trending-up" } as const;

/** The week's patterns, worked out from the patient's own logs. Today's note on the dashboard covers today. */
export function WeeklyInsight({ lines }: { lines: WeeklyInsightLine[] }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
        Your last 7 days
      </Text>
      <View style={{ padding: 16, gap: 14, borderWidth: 1, borderColor: c.hairline, borderRadius: 14 }}>
        {lines.length ? (
          lines.map((line) => (
            <View key={line.kind} style={{ flexDirection: "row", gap: 10 }}>
              <Feather name={ICONS[line.kind]} size={18} color={c.slate} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: c.charcoal }}>{line.text}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
            Patterns appear here after 3 readings, 3 days of meals or a day that reaches your movement goal.
          </Text>
        )}
      </View>
    </View>
  );
}
