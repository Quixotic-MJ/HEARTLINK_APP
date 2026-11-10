import React, { useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { bandTag } from "./ScoreCard";
import { light, dark } from "../../constants/theme";
import { basedOnText, HeartFactors, pressureText } from "../../services/heartScore";
import { isHypertensiveCrisis, isSevereHypotension } from "../../services/vitalsCheck";

export type TodayPage = { key: string; label: string; content: React.ReactNode };

/**
 * The dashboard's top card: pages you swipe through (or pick with the dots), like a fitness app's rings card.
 * It always opens on the first page, the Heart score.
 */
export function TodayCard({ pages }: { pages: TodayPage[] }) {
  const { c } = useDs();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  const show = (i: number) => {
    setPage(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  return (
    <View style={{ gap: 4 }}>
      <View
        onLayout={onLayout}
        style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 14, backgroundColor: c.canvas, overflow: "hidden" }}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSettle}
        >
          {/* Pages are laid out only once the card's width is known. Laid out before that, at their natural width,
              long lines (the habits tip) were measured as one line, and Android kept that, so text ran past the card. */}
          {width > 0 &&
            pages.map((p) => (
              <View key={p.key} style={{ width, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                {p.content}
              </View>
            ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {pages.map((p, i) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => show(i)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${p.label}`}
            accessibilityState={{ selected: i === page }}
            style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === page ? c.primary : c.hairlineStrong }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function PageTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: c.ink }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Page 1: the heart ring (passed in as children), its band, the change since yesterday and the "not a diagnosis" line. */
export function ScorePage({
  label,
  hasScore,
  change,
  factors,
  reason,
  onExplain,
  onLogBloodPressure,
  children,
}: {
  label: string;
  hasScore: boolean;
  /** e.g. "Up 3 since yesterday" */
  change?: string | null;
  /** The score's details from the server: blood pressure and how many areas it's based on */
  factors?: HeartFactors | null;
  /** e.g. "+2 from meals" */
  reason?: string | null;
  onExplain: () => void;
  onLogBloodPressure: () => void;
  children: React.ReactNode;
}) {
  const { c, isDark } = useDs();
  const tag = bandTag(label, hasScore, c);
  const up = change?.startsWith("Up");
  const t = isDark ? dark : light;
  return (
    <View style={{ gap: 10 }}>
      <PageTitle
        title="Heart score"
        right={
          <AnimatedButton
            onPress={onExplain}
            accessibilityRole="button"
            accessibilityLabel="How your score is worked out"
            style={{ width: 44, height: 44, marginVertical: -8, marginRight: -10, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="info" size={20} color={c.slate} />
          </AnimatedButton>
        }
      />
      {hasScore ? (
        <View style={{ alignItems: "center", gap: 10 }}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <View style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: tag.bg }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "700", color: tag.fg }}>{tag.text}</Text>
            </View>
            {change ? (
              <Text style={{ fontSize: 15, fontWeight: "600", color: up ? t.successText : c.charcoal }}>
                {up ? "↑ " : "↓ "}
                {change}
              </Text>
            ) : null}
          </View>
          {pressureText(factors) ? (
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.charcoal, textAlign: "center" }}>{pressureText(factors)}</Text>
          ) : null}
          {basedOnText(factors) ? (
            <Text style={{ fontSize: 13, color: c.slate, textAlign: "center" }}>{basedOnText(factors)}</Text>
          ) : null}
          {reason ? <Text style={{ fontSize: 13, color: c.slate, textAlign: "center" }}>{reason}</Text> : null}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
          {children}
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>
            Log your blood pressure to get your first score.
          </Text>
          <DsButton label="Log blood pressure" block={false} onPress={onLogBloodPressure} />
        </View>
      )}
      <Text style={{ fontSize: 12, color: c.steel, textAlign: "center" }}>A wellness guide, not a diagnosis.</Text>
    </View>
  );
}

// Ring accents for the three habits; the pastel tracks are the design system's topic tints (food peach,
// movement mint, sleep lavender). The design system has no strong orange or violet, so these two live here.
const SODIUM = "#f97316";
const SLEEP = "#8b5cf6";

function Ring({ value, max, track, stroke, top, bottom, label }: {
  value: number; max: number; track: string; stroke: string; top: string; bottom: string; label: string;
}) {
  const { c } = useDs();
  const size = 84;
  const strokeWidth = 6.5;
  const center = size / 2;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.max(0, value / max) : 0;
  const isFull = ratio >= 1;
  // Keep a crisp gap before 100% so round endcaps never collide prematurely (e.g. 7h 30m / 8h)
  const filled =
    ratio > 0 && !isFull
      ? Math.max(strokeWidth * 0.5, Math.min(ratio * circ, circ - strokeWidth * 2.1))
      : 0;
  const topFontSize = top.length >= 6 ? 13.5 : top.length >= 5 ? 14.5 : 16.5;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Circle cx={center} cy={center} r={r} fill="none" stroke={track} strokeWidth={strokeWidth} />
        {isFull ? (
          <Circle cx={center} cy={center} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        ) : filled > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <View
        accessible
        accessibilityLabel={label}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 11,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.15}
          style={{
            fontSize: topFontSize,
            lineHeight: 19,
            fontWeight: "700",
            letterSpacing: top.length >= 5 ? -0.4 : -0.2,
            color: c.ink,
            fontVariant: ["tabular-nums"],
            textAlign: "center",
          }}
        >
          {top}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.15}
          style={{
            fontSize: 10.5,
            lineHeight: 13,
            fontWeight: "500",
            color: c.steel,
            marginTop: 1,
            textAlign: "center",
          }}
        >
          {bottom}
        </Text>
      </View>
    </View>
  );
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export function sleepText(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type HabitsSummary = {
  tone: "good" | "warn" | "neutral";
  text: string;
};

export function habitsSummary({
  sodiumMg,
  sodiumLimitMg,
  movementMins,
  movementGoal,
  sleepHours,
}: {
  sodiumMg: number;
  sodiumLimitMg: number;
  movementMins: number;
  movementGoal: number;
  sleepHours: number | null;
}): HabitsSummary {
  if (sodiumLimitMg > 0 && sodiumMg > sodiumLimitMg) {
    return {
      tone: "warn",
      text: "Over today's sodium limit — water and lighter meals next help balance it.",
    };
  }
  if (sodiumMg <= 0 && movementMins <= 0 && !sleepHours) {
    return {
      tone: "neutral",
      text: "Log meals, movement and sleep below. Your Heart score looks at your last 7 days.",
    };
  }
  const movementMet = movementGoal > 0 && movementMins >= movementGoal;
  const rested = typeof sleepHours === "number" && sleepHours >= 7;
  if (movementMet && rested) {
    return {
      tone: "good",
      text: "Great momentum — movement and rest are on track, and sodium is within limit.",
    };
  }
  if (movementMet) {
    return {
      tone: "good",
      text: !sleepHours
        ? "Movement goal reached — log last night's sleep below to complete your rings."
        : "Movement goal reached and sodium is within today's limit.",
    };
  }
  const moveLeft = Math.max(0, movementGoal - movementMins);
  return {
    tone: "neutral",
    text:
      moveLeft > 0
        ? `${moveLeft} min of movement left to hit today's goal.`
        : "Keep logging your meals and sleep to steady today's score.",
  };
}

/** Page 2: sodium, movement and sleep as three rings, with what's left. */
export function HabitsPage({ sodiumMg, sodiumLimitMg, movementMins, movementGoal, sleepHours }: {
  sodiumMg: number; sodiumLimitMg: number; movementMins: number; movementGoal: number; sleepHours: number | null;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const sodiumLeft = sodiumLimitMg - sodiumMg;
  const sodiumOver = sodiumLeft < 0;
  const movementLeft = Math.max(0, movementGoal - movementMins);
  const movementMet = movementGoal > 0 && movementMins >= movementGoal;
  const sleepMet = typeof sleepHours === "number" && sleepHours >= 8;

  const items = [
    {
      name: "Sodium",
      ring: (
        <Ring
          value={sodiumMg}
          max={sodiumLimitMg}
          track={c.peach}
          stroke={sodiumOver ? c.danger : SODIUM}
          top={fmt(sodiumMg)}
          bottom={`/${fmt(sodiumLimitMg)} mg`}
          label={`Sodium ${fmt(sodiumMg)} of ${fmt(sodiumLimitMg)} milligrams`}
        />
      ),
      note: sodiumLeft >= 0 ? `${fmt(sodiumLeft)} mg left` : `${fmt(-sodiumLeft)} mg over`,
      noteColor: sodiumOver ? t.dangerText : c.slate,
      done: false,
    },
    {
      name: "Movement",
      ring: (
        <Ring
          value={movementMins}
          max={movementGoal}
          track={c.mint}
          stroke={c.success}
          top={`${movementMins}`}
          bottom={`/${movementGoal} min`}
          label={`Movement ${movementMins} of ${movementGoal} minutes`}
        />
      ),
      note: movementLeft > 0 ? `${movementLeft} min to go` : "Goal reached",
      noteColor: movementMet ? t.successText : c.slate,
      done: movementMet,
    },
    {
      name: "Sleep",
      ring: (
        <Ring
          value={sleepHours ?? 0}
          max={8}
          track={c.lavender}
          stroke={isDark ? "#a78bfa" : SLEEP}
          top={sleepHours ? sleepText(sleepHours) : "--"}
          bottom="/8 h"
          label={sleepHours ? `Sleep ${sleepText(sleepHours)} of 8 hours` : "Sleep not logged"}
        />
      ),
      note: sleepMet ? "Goal reached" : sleepHours ? "Last night" : "Not logged",
      noteColor: sleepMet ? t.successText : sleepHours ? c.slate : c.muted,
      done: sleepMet,
    },
  ];

  const summary = habitsSummary({
    sodiumMg,
    sodiumLimitMg,
    movementMins,
    movementGoal,
    sleepHours,
  });

  const bannerBg =
    summary.tone === "good"
      ? isDark
        ? t.successTint
        : "#F0FDF4"
      : summary.tone === "warn"
      ? isDark
        ? t.warningTint
        : "#FFFBEB"
      : c.surface;

  const bannerBorder =
    summary.tone === "good"
      ? isDark
        ? "rgba(51, 204, 130, 0.25)"
        : "#DCFCE7"
      : summary.tone === "warn"
      ? isDark
        ? "rgba(255, 154, 46, 0.25)"
        : "#FEF3C7"
      : isDark
      ? c.hairline
      : "#EEF2F6";

  const bannerIcon =
    summary.tone === "good"
      ? ("check-circle" as const)
      : summary.tone === "warn"
      ? ("alert-circle" as const)
      : ("zap" as const);

  const bannerIconColor =
    summary.tone === "good"
      ? t.successText
      : summary.tone === "warn"
      ? t.warningText
      : c.primary;

  return (
    <View style={{ flex: 1, justifyContent: "space-between", gap: 12 }}>
      <View style={{ gap: 2 }}>
        <PageTitle
          title="Today's habits"
          right={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: 9,
                borderRadius: 999,
                backgroundColor: c.surfaceAlt,
              }}
            >
              <Feather name="clock" size={11} color={c.steel} />
              <Text style={{ fontSize: 11.5, fontWeight: "600", color: c.steel }}>
                Resets at midnight
              </Text>
            </View>
          }
        />
        <Text style={{ fontSize: 13, color: c.slate }}>
          Daily targets that steady your score
        </Text>
      </View>

      {/* Three structured habit pods */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map((it) => (
          <View
            key={it.name}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 4,
              borderRadius: 14,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
            }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: c.charcoal,
                letterSpacing: -0.1,
              }}
            >
              {it.name}
            </Text>

            {it.ring}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                minHeight: 16,
                paddingHorizontal: 2,
              }}
            >
              {it.done ? (
                <Feather name="check-circle" size={11} color={t.successText} />
              ) : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.15}
                style={{
                  fontSize: 11.5,
                  fontWeight: it.done || sodiumOver && it.name === "Sodium" ? "600" : "500",
                  color: it.noteColor,
                  textAlign: "center",
                }}
              >
                {it.note}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Dynamic daily takeaway bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: bannerBg,
          borderWidth: 1,
          borderColor: bannerBorder,
        }}
      >
        <Feather name={bannerIcon} size={15} color={bannerIconColor} />
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
            fontSize: 12.5,
            lineHeight: 17,
            color: c.charcoal,
          }}
        >
          {summary.text}
        </Text>
      </View>
    </View>
  );
}

/** A plain-words level for a reading; the emergency ones use the app's safety thresholds (services/vitalsCheck.ts). */
export function readingLevel(sys: number, dia: number): { text: string; emergency: boolean } {
  const r = { sys, dia };
  if (isHypertensiveCrisis(r) || isSevereHypotension(r)) return { text: "Emergency level", emergency: true };
  if (sys < 120 && dia < 80) return { text: "Healthy range", emergency: false };
  if (sys < 130 && dia < 80) return { text: "A little high", emergency: false };
  return { text: "Above the healthy range", emergency: false };
}

/** Page 3: the latest blood pressure and pulse. */
export function LatestReadingPage({ systolic, diastolic, bpm, pulseContext, when, onLog }: {
  systolic: number | null; diastolic: number | null; bpm: number | null; pulseContext?: string | null; when: string | null; onLog: () => void;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  if (!systolic || !diastolic) {
    return (
      <View style={{ flex: 1, gap: 12 }}>
        <PageTitle title="Latest reading" />
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>No blood pressure logged yet.</Text>
        <DsButton label="Log blood pressure" variant="secondary" block={false} onPress={onLog} />
      </View>
    );
  }
  const level = readingLevel(systolic, diastolic);
  const healthy = level.text === "Healthy range";
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <PageTitle title="Latest reading" right={when ? <Text style={{ fontSize: 13, color: c.steel }}>{when}</Text> : null} />
      <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text style={{ fontSize: 42, fontWeight: "700", letterSpacing: -1, lineHeight: 46, color: c.ink, fontVariant: ["tabular-nums"] }}>
          {systolic}/{diastolic}
        </Text>
        <Text style={{ fontSize: 15, color: c.slate, paddingBottom: 6 }}>mmHg</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: level.emergency ? c.rose : healthy ? c.tint : c.yellow }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: level.emergency ? t.dangerText : healthy ? c.onTint : c.warmText }}>{level.text}</Text>
        </View>
        {bpm ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.surfaceAlt }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.charcoal }}>Pulse {bpm} bpm{pulseContext === "resting" ? " at rest" : pulseContext === "after_exercise" ? " after activity" : ""}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>
        Healthy is under 120/80. Measuring at the same time each day gives the clearest picture.
      </Text>
      </View>
    </View>
  );
}
