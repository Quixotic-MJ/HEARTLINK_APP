import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";

/** The band's tag: one tint per band, as HEARTLINK.md sets out. */
export function bandTag(label: string, hasScore: boolean, c: DsColors): { text: string; bg: string; fg: string } {
  if (!hasScore) return { text: "No score yet", bg: c.surfaceAlt, fg: c.charcoal };
  switch (label) {
    case "Stable":
      return { text: "Stable", bg: c.tint, fg: c.onTint };
    case "Moderate":
      return { text: "Moderate", bg: c.yellow, fg: c.warmText };
    case "Elevated Risk":
      return { text: "Elevated risk", bg: c.peach, fg: c.warmText };
    case "Critical":
      return { text: "Critical", bg: c.rose, fg: c.charcoal };
    default:
      return { text: label, bg: c.surfaceAlt, fg: c.charcoal };
  }
}

/**
 * The dashboard's score card: a header with the band tag, the heart ring (passed in as children,
 * unchanged) and the latest readings. "It isn't a diagnosis" lives in the "i" explanation. With no score yet
 * it asks for a first blood pressure reading instead of showing readings.
 */
export function ScoreCard({
  label,
  hasScore,
  systolic,
  diastolic,
  bpm,
  streakDays,
  trend,
  onExplain,
  onLogBloodPressure,
  children,
}: {
  label: string;
  hasScore: boolean;
  systolic: number | null;
  diastolic: number | null;
  bpm: number | null;
  streakDays: number;
  /** e.g. "Up 4 points this week"; left out when today's note covers it. */
  trend?: string | null;
  onExplain: () => void;
  onLogBloodPressure: () => void;
  children: React.ReactNode;
}) {
  const { c } = useDs();
  const tag = bandTag(label, hasScore, c);
  const readings = [
    { value: systolic && diastolic ? `${systolic}/${diastolic}` : "--", label: "Blood pressure" },
    { value: bpm ? `${bpm}` : "--", label: "Pulse, bpm" },
    { value: `${streakDays} day${streakDays === 1 ? "" : "s"}`, label: "Streak" },
  ];

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 18,
        alignItems: "center",
        gap: 14,
        backgroundColor: c.canvas,
      }}
    >
      <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
            Heart score
          </Text>
          <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "500", color: tag.fg }}>{tag.text}</Text>
          </View>
        </View>
        <AnimatedButton
          onPress={onExplain}
          accessibilityRole="button"
          accessibilityLabel="How your score is worked out"
          style={{ width: 44, height: 44, marginVertical: -8, marginRight: -10, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="info" size={20} color={c.slate} />
        </AnimatedButton>
      </View>

      {children}

      {trend ? <Text style={{ fontSize: 14, color: c.slate, marginTop: -6 }}>{trend}</Text> : null}

      {hasScore ? (
        <View
          style={{ alignSelf: "stretch", flexDirection: "row", borderTopWidth: 1, borderTopColor: c.hairlineSoft, paddingTop: 14 }}
        >
          {readings.map((r, i) => (
            <View
              key={r.label}
              accessible
              accessibilityLabel={`${r.label}: ${r.value === "--" ? "not logged" : r.value}`}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 2,
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: c.hairlineSoft,
              }}
            >
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{r.value}</Text>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, color: c.slate }}>{r.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>
            Log your blood pressure to get your first score.
          </Text>
          <DsButton label="Log blood pressure" block={false} onPress={onLogBloodPressure} />
        </View>
      )}

    </View>
  );
}
