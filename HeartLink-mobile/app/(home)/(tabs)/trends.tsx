import React, { useCallback, useMemo, useState } from "react";
import { BackHandler, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { apiFetch } from "../../../lib/api";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import { ds, DsColors } from "../../../constants/theme";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { OfflineNote } from "../../../components/ui/OfflineNote";
import { useNetInfo } from "@react-native-community/netinfo";
import { bandTag } from "../../../components/dashboard/ScoreCard";
import { TrendChart } from "../../../components/trends/TrendChart";
import { LongTermTrends } from "../../../components/trends/LongTermTrends";
import { isPremiumProfile } from "../../../services/premium";
import { isLongTerm, periodName } from "../../../services/longTermTrends";
import {
  ExerciseRow,
  HIGHLIGHT_DAYS,
  MealRow,
  ScoreRow,
  SleepRow,
  VitalsRow,
  dayName,
  longestStreak,
  peak,
  periodDays,
  pressureByDay,
  pulseByDay,
  scoreByDay,
  scoreChange,
  scoreRangeByDay,
  scoresOfDay,
  sodiumByDay,
  summarize,
} from "../../../services/trends";

// Trends: one period (7, 14 or 30 days) and one measure at a time, drawn only from what was logged.
// A day with nothing logged is left empty on the chart; nothing is filled in.
// HL-086: 90 days and 1 year are Premium (components/trends/LongTermTrends.tsx); on a free account they open the
// pricing screen.

type Metric = "score" | "bp" | "pulse" | "sodium";
const METRICS: { id: Metric; label: string }[] = [
  { id: "score", label: "Heart score" },
  { id: "bp", label: "Blood pressure" },
  { id: "pulse", label: "Pulse" },
  { id: "sodium", label: "Sodium" },
];
const PERIODS = [7, 14, 30, 90, 365] as const;
type Period = (typeof PERIODS)[number];

type Analytics = {
  history?: ScoreRow[];
  vitals?: VitalsRow[];
  meal_logs?: MealRow[];
  exercise_logs?: ExerciseRow[];
  sleep_logs?: SleepRow[];
  thresholds?: { sodium_limit_mg?: number | null; active_minutes_goal?: number | null } | null;
};

let isCurrentlySharing = false;

// Same cut-offs as the dashboard's score bands.
const tierOf = (score: number) => (score >= 80 ? "Stable" : score >= 60 ? "Moderate" : score >= 50 ? "Elevated Risk" : "Critical");

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const lastOf = <T,>(xs: (T | null)[]): { value: T; index: number } | null => {
  for (let i = xs.length - 1; i >= 0; i--) {
    const v = xs[i];
    if (v !== null) return { value: v, index: i };
  }
  return null;
};

export default function TrendsTabScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token, user } = useUser();
  const queryClient = useQueryClient();
  const isPremium = isPremiumProfile(user);

  const [metric, setMetric] = useState<Metric>("score");
  const [period, setPeriod] = useState<Period>(7);
  const [refreshing, setRefreshing] = useState(false);
  const long = isLongTerm(period);

  const query = useQuery({
    queryKey: ["trends", userId, period],
    enabled: !!userId && !long,
    queryFn: async (): Promise<Analytics> => {
      const res = await apiFetch(`/api/analytics/${userId}?days=${period}`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
      if (!res.ok) throw new Error("Could not load trends");
      return res.json();
    },
  });

  const netInfo = useNetInfo();
  // Offline, React Query pauses the request instead of failing it, so isError never came and nothing said so
  const offline = netInfo.isConnected === false || netInfo.isInternetReachable === false || query.isPaused;

  const reload = () => (long ? queryClient.refetchQueries({ queryKey: ["longTermTrends", userId, period] }) : query.refetch());

  useFocusEffect(
    useCallback(() => {
      reload();
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(home)/(tabs)/dashboard");
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, period])
  );

  const data = query.data;
  const sodiumLimit = Number(data?.thresholds?.sodium_limit_mg) || 2000;
  const movementGoal = Number(data?.thresholds?.active_minutes_goal) || 30;

  const t = useMemo(() => {
    const days = periodDays(period);
    const vitals = data?.vitals ?? [];
    const history = data?.history ?? [];
    const scores = scoreByDay(days, history);
    const ranges = scoreRangeByDay(days, history);
    const pressure = pressureByDay(days, vitals);
    const pulse = pulseByDay(days, vitals);
    const sodium = sodiumByDay(days, data?.meal_logs ?? []);
    const summary = summarize(
      days,
      { meals: data?.meal_logs ?? [], exercises: data?.exercise_logs ?? [], sleep: data?.sleep_logs ?? [], vitals },
      { sodiumMg: sodiumLimit, movementMin: movementGoal }
    );
    return { days, history, scores, ranges, pressure, pulse, sodium, summary };
  }, [data, period, sodiumLimit, movementGoal]);

  const onRefresh = async () => {
    if (offline) return;
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const shareReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const latestScore = lastOf(t.scores)?.value;
    const latestBp = lastOf(t.pressure)?.value;
    const latestPulse = lastOf(t.pulse)?.value;
    const s = t.summary;
    const row = (label: string, value: string) => `<div class="stat">${label}: <span class="val">${value}</span></div>`;
    const html = `
      <html><head><style>
        body { font-family: Helvetica, sans-serif; padding: 40px; color: ${ds.light.ink}; }
        h1 { color: ${ds.light.primary}; }
        h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid ${ds.light.hairline}; padding-bottom: 5px; }
        .stat { font-size: 14px; margin: 10px 0; } .val { font-weight: bold; } .note { font-size: 12px; color: ${ds.light.steel}; }
      </style></head><body>
        <h1>HeartLink trends report</h1>
        <p>Last ${period} days, made on ${new Date().toLocaleDateString()}</p>
        <h2>Latest</h2>
        ${row("Heart score", latestScore ? `${latestScore} / 100` : "Not logged")}
        ${row("Blood pressure", latestBp ? `${latestBp.sys}/${latestBp.dia} mmHg` : "Not logged")}
        ${row("Pulse", latestPulse ? `${latestPulse} bpm` : "Not logged")}
        <h2>Last ${period} days</h2>
        ${row("Blood pressure", s.pressure.average ? `average ${s.pressure.average.sys}/${s.pressure.average.dia} mmHg over ${s.pressure.readings} readings` : "No readings")}
        ${row("Sodium", s.sodium.daysLogged ? `${s.sodium.perDay.toLocaleString()} mg a day; over the ${sodiumLimit.toLocaleString()} mg limit on ${s.sodium.daysOver} of ${s.sodium.daysLogged} days` : "No meals logged")}
        ${row("Movement", `${s.movement.perDay} min a day; goal of ${movementGoal} reached on ${s.movement.daysAtGoal} days`)}
        ${row("Sleep", s.sleep.nightsLogged ? `${s.sleep.perNight} h a night over ${s.sleep.nightsLogged} nights` : "No sleep logged")}
        <p class="note">From what the patient logged in HeartLink. It is not a diagnosis.</p>
      </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync()) || isCurrentlySharing) return;
      isCurrentlySharing = true;
      try {
        await Sharing.shareAsync(uri);
      } finally {
        setTimeout(() => {
          isCurrentlySharing = false;
        }, 1000);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const best = peak(t.days, t.scores);
  const saltiest = peak(t.days, t.sodium);
  const scoredDays = t.scores.filter((v) => v !== null).length;
  const streak = longestStreak(t.scores);
  const s = t.summary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
        contentContainerStyle={{ paddingBottom: 120, gap: 22 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", color: c.ink }}>
            Trends
          </Text>
          <AnimatedButton
            onPress={long ? () => router.push("/(home)/(profile)/health-report") : shareReport}
            accessibilityRole="button"
            accessibilityLabel={long ? "Open your health report for your doctor" : "Share a report for your doctor"}
            style={{ height: 44, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: c.hairline, borderRadius: 8 }}
          >
            <Feather name="share" size={16} color={c.ink} />
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Report</Text>
          </AnimatedButton>
        </View>

        {/* Period */}
        <View accessibilityRole="tablist" style={{ marginHorizontal: 20, flexDirection: "row", padding: 4, borderRadius: 10, backgroundColor: c.surface }}>
          {PERIODS.map((p) => {
            const on = p === period;
            const locked = isLongTerm(p) && !isPremium;
            return (
              <AnimatedButton
                key={p}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (locked) router.push("/(home)/(settings)/premium");
                  else setPeriod(p);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={locked ? `${periodName(p)}, Premium` : periodName(p)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: on ? 1 : 0,
                  borderColor: c.hairline,
                  backgroundColor: on ? c.canvas : "transparent",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 2 }}>
                  {locked ? <Feather name="lock" size={11} color={c.slate} /> : null}
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.3}
                    style={{ flexShrink: 1, fontSize: 13, fontWeight: on ? "600" : "400", color: on ? c.ink : c.slate }}
                  >
                    {periodName(p)}
                  </Text>
                </View>
              </AnimatedButton>
            );
          })}
        </View>

        {/* Measure */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {METRICS.map((m) => {
            const on = m.id === metric;
            return (
              <AnimatedButton
                key={m.id}
                onPress={() => setMetric(m.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m.label}
                style={{ height: 40, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, justifyContent: "center", backgroundColor: on ? c.ink : c.canvas, borderColor: on ? c.ink : c.hairline }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{m.label}</Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 22 }}>
          {long ? (
            <LongTermTrends days={period} metric={metric} />
          ) : query.isLoading ? (
            <Skeleton style={{ height: 300, borderRadius: 12 }} />
          ) : (query.isError || offline) && !data ? (
            <View style={{ padding: 20, borderRadius: 12, backgroundColor: c.surface, gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{"Trends couldn't load"}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                {offline ? "You're offline. Connect to the internet, then try again." : "Check your connection and try again."}
              </Text>
              <DsButton label="Try again" variant="secondary" block={false} onPress={() => query.refetch()} />
            </View>
          ) : (
            <>
            {offline ? <OfflineNote savedAt={query.dataUpdatedAt} onRetry={() => query.refetch()} /> : null}
            <MetricCard
              key={`${metric}-${period}`}
              c={c}
              metric={metric}
              period={period}
              t={t}
              sodiumLimit={sodiumLimit}
              onLog={(route) => router.push(route as never)}
              onLonger={() => setPeriod(30)}
            />
            </>
          )}

          {data && !long ? (
            <>
              <View style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
                  Day by day
                </Text>
                <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
                  <SummaryRow
                    c={c}
                    tint={c.peach}
                    icon="droplet"
                    label="Sodium"
                    note={s.sodium.daysLogged === 0 ? "No meals logged" : `Under your limit on ${s.sodium.daysLogged - s.sodium.daysOver} of ${plural(s.sodium.daysLogged, "day")}`}
                    value={s.sodium.daysLogged ? `${s.sodium.perDay.toLocaleString()} mg` : "--"}
                    unit={`a day, limit ${sodiumLimit.toLocaleString()}`}
                    progress={{ good: s.sodium.daysLogged - s.sodium.daysOver, of: s.sodium.daysLogged }}
                  />
                  <SummaryRow
                    c={c}
                    tint={c.mint}
                    icon="activity"
                    label="Movement"
                    note={`Goal reached on ${s.movement.daysAtGoal} of ${plural(t.days.length, "day")}`}
                    value={`${s.movement.perDay} min`}
                    unit={`a day, goal ${movementGoal}`}
                    progress={{ good: s.movement.daysAtGoal, of: t.days.length }}
                  />
                  <SummaryRow
                    c={c}
                    tint={c.lavender}
                    icon="moon"
                    label="Sleep"
                    note={s.sleep.nightsLogged === 0 ? "No sleep logged" : `7 to 9 hours on ${s.sleep.nightsInRange} of ${plural(s.sleep.nightsLogged, "night")}`}
                    value={s.sleep.nightsLogged ? `${s.sleep.perNight} h` : "--"}
                    unit="a night, aim 7 to 9"
                    progress={{ good: s.sleep.nightsInRange, of: s.sleep.nightsLogged }}
                  />
                  <SummaryRow
                    c={c}
                    tint={c.sky}
                    icon="heart"
                    label="Blood pressure"
                    note={s.pressure.daysLogged === 0 ? "No readings" : `Under 130/80 on ${s.pressure.daysUnder} of ${plural(s.pressure.daysLogged, "day")}`}
                    value={s.pressure.average ? `${s.pressure.average.sys}/${s.pressure.average.dia}` : "--"}
                    unit="average mmHg"
                    progress={{ good: s.pressure.daysUnder, of: s.pressure.daysLogged }}
                    last
                  />
                </View>
              </View>

              <View style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
                  Highlights
                </Text>
                {scoredDays >= HIGHLIGHT_DAYS ? (
                  <>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {best ? <NoticeTile bg={c.mint} fg={c.charcoal} c={c} label="Best day" value={String(best.value)} when={`${dayName(best.day)}, end of day`} /> : null}
                      {saltiest ? (
                        <NoticeTile bg={c.peach} fg={c.warmText} c={c} label="Saltiest day" value={`${saltiest.value.toLocaleString()} mg`} when={dayName(saltiest.day)} />
                      ) : null}
                    </View>
                    <View
                      accessible
                      accessibilityLabel={`Longest streak: ${plural(streak, "day")} in a row with a heart score`}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: c.lavender }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>{plural(streak, "day")}</Text>
                      <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.charcoal }}>Your longest run of days in a row with a heart score</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.hairlineStrong }}>
                    <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
                      {`Your best day, saltiest day and longest streak show here after ${HIGHLIGHT_DAYS} days with a heart score.`}
                    </Text>
                    <View accessible accessibilityLabel={`${scoredDays} of ${HIGHLIGHT_DAYS} days`} style={{ flexDirection: "row", gap: 4 }}>
                      {Array.from({ length: HIGHLIGHT_DAYS }, (_, i) => (
                        <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < scoredDays ? c.line : c.hairlineSoft }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, color: c.slate }}>{`${scoredDays} of ${HIGHLIGHT_DAYS} days`}</Text>
                  </View>
                )}
              </View>
            </>
          ) : null}

          {long ? null : (
            <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>
              {"Trends help you spot habits. They aren't a diagnosis; share the report with your doctor."}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type TrendData = {
  days: ReturnType<typeof periodDays>;
  history: ScoreRow[];
  scores: (number | null)[];
  ranges: ReturnType<typeof scoreRangeByDay>;
  pressure: ReturnType<typeof pressureByDay>;
  pulse: (number | null)[];
  sodium: (number | null)[];
  summary: ReturnType<typeof summarize>;
};

/** The selected measure: its latest value, one line on how it went, and the chart (or an empty state). */
function MetricCard({
  c,
  metric,
  period,
  t,
  sodiumLimit,
  onLog,
  onLonger,
}: {
  c: DsColors;
  metric: Metric;
  period: Period;
  t: TrendData;
  sodiumLimit: number;
  onLog: (route: string) => void;
  onLonger: () => void;
}) {
  // The day picked on the heart score chart (null: the latest day with a score)
  const [picked, setPicked] = useState<number | null>(null);
  const card = { borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 14 } as const;
  const logBp = "/(home)/(health)/log-symptoms";

  const empty = (title: string, body: string, action: string, route: string) => (
    <View style={{ ...card, alignItems: "center", paddingVertical: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: c.ink, textAlign: "center" }}>{title}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>{body}</Text>
      <DsButton label={action} block={false} onPress={() => onLog(route)} />
      {period < 30 ? <DsButton label="Show the last 30 days instead" variant="link" block={false} onPress={onLonger} /> : null}
    </View>
  );

  const head = (value: string, unit: string, line: string | null, tag?: { text: string; bg: string; fg: string }) => (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontSize: 40, lineHeight: 46, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
        <Text style={{ fontSize: 14, color: c.slate, flexShrink: 1 }}>{unit}</Text>
        {tag ? (
          <View style={{ marginLeft: "auto", alignSelf: "center", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "500", color: tag.fg }}>{tag.text}</Text>
          </View>
        ) : null}
      </View>
      {line ? <Text style={{ fontSize: 15, color: c.charcoal }}>{line}</Text> : null}
    </View>
  );

  const coverage = (logged: number, what: string) => (
    <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
      {logged === 1
        ? `Only 1 day has ${what} so far. Log on another day to start seeing a trend.`
        : `${logged} of ${t.days.length} days have ${what}. Days with nothing logged are left blank.`}
    </Text>
  );

  if (metric === "score") {
    const latest = lastOf(t.scores);
    if (!latest) return empty(`No heart score in the last ${period} days`, "Log your blood pressure and your score will show here.", "Log blood pressure", logBp);
    const values = t.scores.filter((v): v is number => v !== null);
    const tag = bandTag(tierOf(latest.value), true, c);

    if (values.length === 1) {
      // One day so far: that day's scores in order, so the number makes sense before there is a trend
      const day = t.days[latest.index];
      const isToday = dayName(day) === "today";
      const list = scoresOfDay(t.history, day);
      const last = list[list.length - 1];
      const prev = list[list.length - 2];
      const line =
        last && prev && last.score !== prev.score
          ? `${last.score < prev.score ? "Down" : "Up"} from ${prev.score}${last.after ? ` after ${last.after}` : ""}`
          : null;
      return (
        <View style={card}>
          {head(String(latest.value), isToday ? "now" : dayName(day), line, tag)}
          {list.length ? (
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate, paddingBottom: 6 }}>{isToday ? "Today so far" : cap(dayName(day))}</Text>
              {list.map((row, i) => {
                const time = row.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                const urgent = row.why.endsWith("emergency level");
                return (
                  <View
                    key={`${row.at.getTime()}-${i}`}
                    accessible
                    accessibilityLabel={`${time}: ${row.why}. Score ${row.score}`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: c.hairlineSoft }}
                  >
                    <Text style={{ width: 70, fontSize: 13, color: c.slate, fontVariant: ["tabular-nums"] }}>{time}</Text>
                    <Text style={{ flex: 1, fontSize: 14, color: c.ink }}>{row.why}</Text>
                    {urgent ? <Feather name="alert-triangle" size={14} color={c.danger} /> : null}
                    <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{row.score}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 8, backgroundColor: c.surface }}>
            <Feather name="trending-up" size={18} color={c.charcoal} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.charcoal }}>
              {`Each day goes on your trend as the score it ends on, with its lowest and highest. Log again ${isToday ? "tomorrow" : "on another day"} and your line starts.`}
            </Text>
          </View>
        </View>
      );
    }

    const pick = picked ?? latest.index;
    const pickedScore = t.scores[pick];
    const range = t.ranges[pick];
    const lows = t.ranges.filter((g): g is { low: number; high: number } => g !== null).map((g) => g.low);
    const yMin = Math.max(0, Math.min(60, Math.floor((Math.min(...values, ...lows) - 5) / 10) * 10));
    const bands = [
      { from: 80, to: 100, fill: c.sky, label: "Stable", labelColor: c.onTint },
      { from: 60, to: 80, fill: c.yellow, label: "Moderate", labelColor: c.warmText },
      { from: 50, to: 60, fill: c.peach, label: "Elevated risk", labelColor: c.warmText },
      { from: 0, to: 50, fill: c.rose, label: "Critical", labelColor: c.charcoal },
    ]
      .filter((b) => b.to > yMin)
      .map((b) => ({ ...b, from: Math.max(b.from, yMin) }));
    return (
      <View style={card}>
        {head(String(latest.value), dayName(t.days[latest.index]), scoreChange(t.days, t.scores), tag)}
        <View accessibilityLiveRegion="polite" style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: c.surface }}>
          {pickedScore === null ? (
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.ink }}>{`${cap(dayName(t.days[pick]))}: no readings, so no score.`}</Text>
          ) : (
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.ink }}>
              <Text style={{ fontWeight: "600" }}>{`${cap(dayName(t.days[pick]))} ended at ${pickedScore}.`}</Text>
              {range && range.low !== range.high ? ` Lowest ${range.low}, highest ${range.high}.` : ""}
            </Text>
          )}
        </View>
        <TrendChart
          kind="line"
          days={t.days}
          values={t.scores}
          ranges={t.ranges}
          selected={pick}
          onSelect={(i) => {
            Haptics.selectionAsync();
            setPicked(i);
          }}
          yMin={yMin}
          yMax={100}
          ticks={[yMin, 100].filter((v, i, a) => a.indexOf(v) === i)}
          bands={bands}
          accessibilityLabel={`Heart score over the last ${period} days. Latest ${latest.value}.`}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: -6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary }} />
            <Text style={{ fontSize: 12, color: c.slate }}>Where the day ended</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 14, borderRadius: 3, backgroundColor: c.line, opacity: 0.28 }} />
            <Text style={{ fontSize: 12, color: c.slate }}>{"The day's lowest to highest"}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
          {`${values.length} of ${t.days.length} days have a score; blank days had no readings. Tap a day to see it.`}
        </Text>
      </View>
    );
  }

  if (metric === "bp") {
    const latest = lastOf(t.pressure);
    if (!latest) return empty(`No blood pressure readings in the last ${period} days`, "Log a reading and your trend will show here.", "Log blood pressure", logBp);
    const avg = t.summary.pressure.average;
    return (
      <View style={card}>
        {head(
          `${latest.value.sys}/${latest.value.dia}`,
          `mmHg, ${dayName(t.days[latest.index])}`,
          avg ? `${t.summary.pressure.readings} ${t.summary.pressure.readings === 1 ? "reading" : "readings"}, average ${avg.sys}/${avg.dia}` : null
        )}
        <TrendChart
          kind="range"
          days={t.days}
          values={t.pressure}
          yMin={40}
          yMax={200}
          ticks={[60, 100, 140]}
          refLine={{ value: 180, label: "180: emergency level", color: c.danger }}
          accessibilityLabel={`Blood pressure over the last ${period} days. Latest ${latest.value.sys} over ${latest.value.dia}.`}
        />
        <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
          {t.summary.pressure.readings === 1
            ? "Only 1 reading so far. Log on another day to start seeing a trend."
            : "Each bar runs from the lower number (diastolic) to the upper number (systolic) of the day's last reading."}
        </Text>
      </View>
    );
  }

  if (metric === "pulse") {
    const latest = lastOf(t.pulse);
    if (!latest) return empty(`No pulse readings in the last ${period} days`, "Add your pulse when you log your blood pressure, and your trend will show here.", "Log blood pressure", logBp);
    const values = t.pulse.filter((p): p is number => p !== null);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return (
      <View style={card}>
        {head(String(latest.value), `bpm, ${dayName(t.days[latest.index])}`, `Average ${avg} bpm`)}
        <TrendChart
          kind="line"
          days={t.days}
          values={t.pulse}
          yMin={40}
          yMax={Math.max(120, Math.ceil((Math.max(...values) + 10) / 20) * 20)}
          ticks={[60, 100]}
          accessibilityLabel={`Pulse over the last ${period} days. Latest ${latest.value} beats per minute.`}
        />
        {coverage(values.length, "a pulse reading")}
      </View>
    );
  }

  const latest = lastOf(t.sodium);
  if (!latest) return empty(`No meals logged in the last ${period} days`, "Log what you eat and your daily sodium will show here.", "Log a meal", "/(home)/(meals)/search-meal");
  const values = t.sodium.filter((s): s is number => s !== null);
  const yMax = Math.ceil((Math.max(sodiumLimit * 1.25, ...values) * 1.05) / 500) * 500;
  const over = t.summary.sodium.daysOver;
  return (
    <View style={card}>
      {head(
        latest.value.toLocaleString(),
        `mg, ${dayName(t.days[latest.index])}`,
        over > 0
          ? `Over your ${sodiumLimit.toLocaleString()} mg limit on ${over} of ${values.length} days`
          : `Under your ${sodiumLimit.toLocaleString()} mg limit every day logged`
      )}
      <TrendChart
        kind="bars"
        days={t.days}
        values={t.sodium}
        limit={sodiumLimit}
        yMin={0}
        yMax={yMax}
        ticks={[0, yMax]}
        refLine={{ value: sodiumLimit, label: `Your limit ${sodiumLimit.toLocaleString()}`, color: c.ink }}
        accessibilityLabel={`Sodium each day over the last ${period} days, against your ${sodiumLimit} milligram limit. Over it on ${over} days.`}
      />
      <View style={{ flexDirection: "row", gap: 16, marginTop: -6 }}>
        <Legend c={c} color={c.line} label="Under your limit" />
        <Legend c={c} color={c.warmText} label="Over it" />
      </View>
    </View>
  );
}

function SummaryRow({
  c,
  tint,
  icon,
  label,
  note,
  value,
  unit,
  warn = false,
  last = false,
  progress,
}: {
  c: DsColors;
  tint: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  note: string;
  value: string;
  unit: string;
  warn?: boolean;
  last?: boolean;
  /** Days on target out of days counted; drawn as a bar once there are two or more. */
  progress?: { good: number; of: number };
}) {
  const share = progress && progress.of >= 2 ? Math.max(0, Math.min(1, progress.good / progress.of)) : null;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} ${unit}. ${note}`}
      style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={17} color={c.charcoal} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{label}</Text>
          <Text style={{ fontSize: 13, color: warn ? c.warmText : c.slate }}>{note}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
          <Text style={{ fontSize: 12, color: c.slate }}>{unit}</Text>
        </View>
      </View>
      {share !== null ? (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.hairlineSoft, overflow: "hidden" }}>
          <View style={{ height: 6, borderRadius: 3, width: `${Math.round(share * 100)}%`, backgroundColor: c.line }} />
        </View>
      ) : null}
    </View>
  );
}

function NoticeTile({ c, bg, fg, label, value, when }: { c: DsColors; bg: string; fg: string; label: string; value: string; when: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}, ${when}`} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: bg, gap: 4 }}>
      <Text style={{ fontSize: 13, color: fg }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>{value}</Text>
      <Text style={{ fontSize: 13, color: fg }}>{when.charAt(0).toUpperCase() + when.slice(1)}</Text>
    </View>
  );
}

function Legend({ c, color, label }: { c: DsColors; color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: c.slate }}>{label}</Text>
    </View>
  );
}
