import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { LineBar } from "./ExerciseBits";
import { formatDuration } from "../../services/exerciseSession";

// Screen 6: the exercise is saved, and how today's movement stands against the goal.

export interface ExerciseResultProps {
  title: string;
  seconds: number;
  movementMinutes: number;
  movementGoal: number;
  onDone: () => void;
  onHistory: () => void;
}

export function ExerciseResult({ title, seconds, movementMinutes, movementGoal, onDone, onHistory }: ExerciseResultProps) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const left = Math.max(0, movementGoal - movementMinutes);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top }}>
      <View className="px-5" style={{ flex: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.mint, alignItems: "center", justifyContent: "center" }}>
            <Feather name="check" size={28} color={c.success} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", color: c.ink }}>
            Exercise saved
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate }}>
            {title}, {formatDuration(seconds)}.
          </Text>
        </View>

        <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 10 }}>
          <View className="flex-row items-baseline justify-between">
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Movement today</Text>
            <Text style={{ fontSize: 15, color: c.ink, fontVariant: ["tabular-nums"] }}>
              <Text style={{ fontWeight: "600" }}>{movementMinutes}</Text> of {movementGoal} min
            </Text>
          </View>
          <LineBar progress={movementMinutes / movementGoal} label={`${movementMinutes} of ${movementGoal} minutes`} height={6} />
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
            {left > 0 ? `${left} more ${left === 1 ? "minute reaches" : "minutes reach"} today's goal.` : "You've reached today's movement goal."}
          </Text>
        </View>
      </View>

      <View className="px-5" style={{ paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 4 }}>
        <DsButton label="Back to dashboard" onPress={onDone} />
        <DsButton label="See activity history" variant="link" onPress={onHistory} style={{ alignSelf: "center" }} />
      </View>
    </View>
  );
}
