import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { IconBadge } from "../onboarding/QuestionLayout";
import { Skeleton } from "../ui/Skeleton";
import { useDs } from "../onboarding/useDs";
import type { StepDay, StepWeek } from "../../hooks/useSteps";

// HL-163: the dashboard's "Steps today" card, under the check-ins. The step total is for the patient's own tracking
// (a goal they set, 7,000 by default); brisk walking is what adds movement minutes to the Habit score.

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function stepsText(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "M", "T", ... for a YYYY-MM-DD day. */
export function weekdayLetter(day: string): string {
  return WEEKDAY_LETTERS[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? "";
}

export function briskLine(minutes: number): string {
  if (minutes <= 0) return "Walk briskly (about 100 steps a minute) to add movement minutes";
  return `${minutes} brisk min counted toward your Habit score`;
}

function WeekBars({ days, goal }: { days: StepDay[]; goal: number }) {
  const { c, isDark } = useDs();
  const top = Math.max(goal, ...days.map((d) => d.steps), 1);
  const today = days[days.length - 1]?.day;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }} importantForAccessibility="no-hide-descendants">
      {days.map((d) => {
        const reached = d.steps >= goal;
        const isToday = d.day === today;
        return (
          <View key={d.day} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ height: 36, width: "100%", justifyContent: "flex-end" }}>
              <View
                style={{
                  height: Math.max(3, Math.round((d.steps / top) * 36)),
                  borderRadius: 3,
                  backgroundColor: reached ? c.primary : isDark ? c.surfaceAlt : c.tint,
                  borderWidth: isToday && !reached ? 1.5 : 0,
                  borderColor: c.primary,
                }}
              />
            </View>
            <Text style={{ fontSize: 11, fontWeight: isToday ? "700" : "500", color: isToday ? c.ink : c.steel }}>
              {weekdayLetter(d.day)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Tracking is on: today's steps, the goal bar, brisk minutes and the week. */
export function StepsCard({ week, loading, onPress }: { week?: StepWeek; loading: boolean; onPress: () => void }) {
  const { c, isDark } = useDs();
  const today = week?.days[week.days.length - 1];
  const goal = week?.goal ?? 7000;
  const steps = today?.steps ?? 0;
  const reached = steps >= goal;

  // A light buzz the first time today's steps pass the goal
  useEffect(() => {
    if (!today || !reached) return;
    const key = `@steps_goal_cheered_${today.day}`;
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (seen) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return AsyncStorage.setItem(key, "1");
      })
      .catch(() => {});
  }, [today, reached]);

  if (loading && !week) return <Skeleton style={{ height: 172, borderRadius: 18 }} />;

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Steps today: ${stepsText(steps)} of ${stepsText(goal)}. ${reached ? "Goal reached. " : ""}${briskLine(today?.brisk_minutes ?? 0)}. Tap to see your week.`}
      style={{
        backgroundColor: isDark ? c.surface : c.canvas,
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: 18,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: c.slate }}>Steps today</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {reached ? <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>Goal reached</Text> : null}
          <Feather name="chevron-right" size={18} color={c.steel} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>{stepsText(steps)}</Text>
          <Text style={{ fontSize: 15, color: c.slate }}>{`of ${stepsText(goal)} steps`}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? c.surfaceAlt : c.hairlineSoft, overflow: "hidden" }}>
          <View style={{ height: 8, borderRadius: 4, width: `${Math.min(100, (steps / goal) * 100)}%`, backgroundColor: c.primary }} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name="zap" size={14} color={c.primary} />
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.charcoal }}>{briskLine(today?.brisk_minutes ?? 0)}</Text>
      </View>

      {week ? <WeekBars days={week.days} goal={goal} /> : null}
    </AnimatedButton>
  );
}

/** Tracking is off: the invite, with an × to hide it for good. */
export function StepsInvite({ onTurnOn, onHide }: { onTurnOn: () => void; onHide: () => void }) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        backgroundColor: isDark ? c.surface : c.canvas,
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: 18,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <IconBadge icon="walk" tint="mint" size={40} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>Count your steps automatically</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>
            HeartLink can read the steps your phone already counts in Health Connect. Brisk walks add to your movement
            minutes.
          </Text>
        </View>
        <AnimatedButton
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Hide this"
          style={{ width: 44, height: 44, marginTop: -12, marginRight: -12, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="x" size={18} color={c.steel} />
        </AnimatedButton>
      </View>
      <DsButton label="Turn on step tracking" variant="secondary" onPress={onTurnOn} block />
    </View>
  );
}
