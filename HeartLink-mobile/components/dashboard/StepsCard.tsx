import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { IconBadge } from "../onboarding/QuestionLayout";
import { Skeleton } from "../ui/Skeleton";
import { useDs } from "../onboarding/useDs";
import type { StepDay, StepWeek } from "../../hooks/useSteps";
import { light, dark } from "../../constants/theme";
import { PageTitle } from "./TodayCard";
import { lastDays } from "../../services/stepTracker";

const SAMPLE_STEPS = [5200, 8100, 3900, 7400, 6600, 9300, 4870];
const SAMPLE_BRISK = [6, 22, 0, 15, 9, 31, 12];

/** Made-up numbers for Expo Go, which can't read steps (see showsSampleSteps). Ends today, so the bars look current. */
export function sampleStepWeek(now: Date = new Date()): StepWeek {
  return {
    goal: 7000,
    last_synced_at: null,
    days: lastDays(now).map((day, i) => ({ day, steps: SAMPLE_STEPS[i], brisk_minutes: SAMPLE_BRISK[i], synced: true })),
  };
}

// HL-163: "Steps today", a page of the dashboard's swipe card (owner's choice 2026-11-23, was a card under the check-ins). The step total is for the patient's own tracking
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
            <View style={{ height: 28, width: "100%", justifyContent: "flex-end" }}>
              <View
                style={{
                  height: Math.max(3, Math.round((d.steps / top) * 28)),
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

/** How full the ring is, 0 to 1. */
export function goalShare(steps: number, goal: number): number {
  return goal > 0 ? Math.max(0, Math.min(1, steps / goal)) : 0;
}

function StepRing({ steps, goal, size }: { steps: number; goal: number; size: number }) {
  const { c, isDark } = useDs();
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const center = size / 2;
  const circ = 2 * Math.PI * r;
  const share = goalShare(steps, goal);
  const full = share >= 1;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={center} cy={center} r={r} fill="none" stroke={isDark ? c.surfaceAlt : c.tint} strokeWidth={strokeWidth} />
        {full ? (
          <Circle cx={center} cy={center} r={r} fill="none" stroke={c.primary} strokeWidth={strokeWidth} />
        ) : share > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={c.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(1, share * circ)} ${circ}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
        <MaterialCommunityIcons name="walk" size={20} color={c.primary} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.2}
          style={{ fontSize: 34, fontWeight: "700", letterSpacing: -0.8, color: c.ink, fontVariant: ["tabular-nums"] }}
        >
          {stepsText(steps)}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, color: c.slate }}>{`of ${stepsText(goal)} steps`}</Text>
      </View>
    </View>
  );
}

/**
 * Tracking is on: a page of the dashboard's swipe card (after the habits score). Today's steps as a ring toward the
 * goal, what's left, the brisk minutes that count toward the Habit score, and the week's bars.
 */
export function StepsPage({ week, loading, onOpen, sample = false }: {
  week?: StepWeek;
  loading: boolean;
  onOpen: () => void;
  /** Expo Go: the numbers are made up, and the page says so */
  sample?: boolean;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const today = week?.days[week.days.length - 1];
  const goal = week?.goal ?? 7000;
  const steps = today?.steps ?? 0;
  const reached = steps >= goal;
  const brisk = today?.brisk_minutes ?? 0;

  // A light buzz the first time today's steps pass the goal
  useEffect(() => {
    if (sample || !today || !reached) return;
    const key = `@steps_goal_cheered_${today.day}`;
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (seen) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return AsyncStorage.setItem(key, "1");
      })
      .catch(() => {});
  }, [sample, today, reached]);

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <PageTitle
        title="Steps today"
        right={
          <AnimatedButton
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel="See your steps this week"
            style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, marginVertical: -8, marginRight: -6, paddingLeft: 8 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.primary }}>This week</Text>
            <Feather name="chevron-right" size={18} color={c.primary} />
          </AnimatedButton>
        }
      />
      {loading && !week ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Skeleton style={{ width: 150, height: 150, borderRadius: 75 }} />
          <Skeleton style={{ width: 180, height: 14, borderRadius: 7 }} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
          <View
            accessible
            accessibilityLabel={`${sample ? "Sample numbers. " : ""}${stepsText(steps)} of ${stepsText(goal)} steps today. ${reached ? "Goal reached." : `${stepsText(goal - steps)} to go.`}`}
            style={{ alignItems: "center", gap: 8 }}
          >
            <StepRing steps={steps} goal={goal} size={150} />
            {reached ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: t.successTint }}>
                <Feather name="check-circle" size={14} color={t.successText} />
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "700", color: t.successText }}>Goal reached</Text>
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: "600", color: c.charcoal }}>
                {`${stepsText(goal - steps)} steps to go`}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 }}>
            <Feather name="zap" size={14} color={c.primary} />
            <Text style={{ flexShrink: 1, fontSize: 13, lineHeight: 18, color: c.charcoal, textAlign: "center" }}>{briskLine(brisk)}</Text>
          </View>
          {week ? <WeekBars days={week.days} goal={goal} /> : null}
        </View>
      )}
      {sample ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: t.warningTint }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: t.warningText }}>Sample</Text>
          </View>
          <Text style={{ flexShrink: 1, fontSize: 12, color: c.steel }}>Real steps need the installed Android app</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: c.steel, textAlign: "center" }}>From Health Connect · The step total isn&apos;t scored</Text>
      )}
    </View>
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
