import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../onboarding/useDs";
import { Skeleton } from "../ui/Skeleton";
import DsButton from "../onboarding/DsButton";
import { ProgressSummary, summarySource } from "../../services/progressSummary";

/**
 * The AI summary at the top of Trends (2026-11-12): a short plain recap of the chosen period, to help the patient
 * understand their progress and habits. It describes; it doesn't coach or advise. Today's note on the Dashboard covers
 * today (and emergencies).
 */
export function ProgressSummaryCard({
  days,
  summary,
  loading,
  failed,
  onRetry,
}: {
  days: number;
  summary: ProgressSummary | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  const { c } = useDs();
  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
        AI summary
      </Text>
      <View style={{ padding: 16, gap: 12, borderWidth: 1, borderColor: c.hairline, borderRadius: 14, backgroundColor: c.canvas }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" }}>
            <Feather name="star" size={16} color={c.onTint} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{`Your last ${days} days`}</Text>
        </View>

        {loading ? (
          <View style={{ gap: 8 }}>
            <Skeleton style={{ height: 16, borderRadius: 6 }} />
            <Skeleton style={{ height: 16, borderRadius: 6, width: "85%" }} />
            <Skeleton style={{ height: 16, borderRadius: 6, width: "60%" }} />
          </View>
        ) : failed && !summary ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>Your summary couldn&apos;t load.</Text>
            <DsButton label="Try again" variant="secondary" block={false} onPress={onRetry} />
          </View>
        ) : summary && summary.lines.length ? (
          <>
            <Text style={{ fontSize: 16, lineHeight: 24, color: c.charcoal }}>{summary.text}</Text>
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.steel }}>{summarySource(summary)}</Text>
          </>
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
            {`Log your blood pressure, meals, movement or sleep, and a summary of your last ${days} days shows here.`}
          </Text>
        )}
      </View>
    </View>
  );
}
