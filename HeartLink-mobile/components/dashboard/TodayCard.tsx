import React, { useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { bandTag } from "./ScoreCard";
import { light, dark } from "../../constants/theme";
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
          {pages.map((p) => (
            <View key={p.key} style={{ width: width || undefined, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
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
  reason,
  onExplain,
  onLogBloodPressure,
  children,
}: {
  label: string;
  hasScore: boolean;
  /** e.g. "Up 3 since yesterday" */
  change?: string | null;
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "700", color: tag.fg }}>{tag.text}</Text>
            </View>
            {change ? (
              <Text style={{ fontSize: 15, fontWeight: "600", color: up ? t.successText : c.charcoal }}>
                {up ? "↑ " : "↓ "}
                {change}
              </Text>
            ) : null}
            {reason ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>{reason}</Text> : null}
          </View>
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
      <Text style={{ fontSize: 12, color: c.steel }}>A wellness guide, not a diagnosis.</Text>
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
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = max > 0 ? Math.min(1, Math.max(0, value / max)) * circ : 0;
  return (
    <View style={{ width: 84, height: 84 }}>
      <Svg width={84} height={84} viewBox="0 0 84 84" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={42} cy={42} r={r} fill="none" stroke={track} strokeWidth={8} />
        {filled > 0 ? (
          <Circle
            cx={42} cy={42} r={r} fill="none" stroke={stroke} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`} transform="rotate(-90 42 42)"
          />
        ) : null}
      </Svg>
      <View
        accessible
        accessibilityLabel={label}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
      >
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 16, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{top}</Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, color: c.steel }}>{bottom}</Text>
      </View>
    </View>
  );
}

const fmt = (n: number) => Math.round(n).toLocaleString();

function sleepText(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Page 2: sodium, movement and sleep as three rings, with what's left. */
export function HabitsPage({ sodiumMg, sodiumLimitMg, movementMins, movementGoal, sleepHours }: {
  sodiumMg: number; sodiumLimitMg: number; movementMins: number; movementGoal: number; sleepHours: number | null;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const sodiumLeft = sodiumLimitMg - sodiumMg;
  const movementLeft = Math.max(0, movementGoal - movementMins);
  const items = [
    {
      name: "Sodium",
      ring: (
        <Ring value={sodiumMg} max={sodiumLimitMg} track={c.peach} stroke={SODIUM} top={fmt(sodiumMg)} bottom={`/${fmt(sodiumLimitMg)} mg`}
          label={`Sodium ${fmt(sodiumMg)} of ${fmt(sodiumLimitMg)} milligrams`} />
      ),
      note: sodiumLeft >= 0 ? `${fmt(sodiumLeft)} mg left` : `${fmt(-sodiumLeft)} mg over`,
      noteColor: sodiumLeft >= 0 ? c.slate : t.dangerText,
    },
    {
      name: "Movement",
      ring: (
        <Ring value={movementMins} max={movementGoal} track={c.mint} stroke={c.success} top={`${movementMins}`} bottom={`/${movementGoal} min`}
          label={`Movement ${movementMins} of ${movementGoal} minutes`} />
      ),
      note: movementLeft > 0 ? `${movementLeft} min to go` : "Goal reached",
      noteColor: c.slate,
    },
    {
      name: "Sleep",
      ring: (
        <Ring value={sleepHours ?? 0} max={8} track={c.lavender} stroke={isDark ? "#a78bfa" : SLEEP}
          top={sleepHours ? sleepText(sleepHours) : "--"} bottom="/8 h"
          label={sleepHours ? `Sleep ${sleepText(sleepHours)} of 8 hours` : "Sleep not logged"} />
      ),
      note: sleepHours ? "Last night" : "Not logged",
      noteColor: c.slate,
    },
  ];
  return (
    <View style={{ gap: 14 }}>
      <PageTitle title="Today's habits" right={<Text style={{ fontSize: 13, color: c.steel }}>Resets at midnight</Text>} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {items.map((it) => (
          <View key={it.name} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>{it.name}</Text>
            {it.ring}
            <Text style={{ fontSize: 12, color: it.noteColor }}>{it.note}</Text>
          </View>
        ))}
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
export function LatestReadingPage({ systolic, diastolic, bpm, when, onLog }: {
  systolic: number | null; diastolic: number | null; bpm: number | null; when: string | null; onLog: () => void;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  if (!systolic || !diastolic) {
    return (
      <View style={{ gap: 12 }}>
        <PageTitle title="Latest reading" />
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>No blood pressure logged yet.</Text>
        <DsButton label="Log blood pressure" variant="secondary" block={false} onPress={onLog} />
      </View>
    );
  }
  const level = readingLevel(systolic, diastolic);
  return (
    <View style={{ gap: 12 }}>
      <PageTitle title="Latest reading" right={when ? <Text style={{ fontSize: 13, color: c.steel }}>{when}</Text> : null} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text style={{ fontSize: 42, fontWeight: "700", letterSpacing: -1, lineHeight: 46, color: c.ink, fontVariant: ["tabular-nums"] }}>
          {systolic}/{diastolic}
        </Text>
        <Text style={{ fontSize: 15, color: c.slate, paddingBottom: 6 }}>mmHg</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: level.emergency ? c.rose : c.tint }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: level.emergency ? t.dangerText : c.onTint }}>{level.text}</Text>
        </View>
        {bpm ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.surfaceAlt }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.charcoal }}>Pulse {bpm} bpm</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>
        Healthy is under 120/80. Measuring at the same time each day gives the clearest picture.
      </Text>
    </View>
  );
}
