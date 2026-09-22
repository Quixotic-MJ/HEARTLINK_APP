import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Pressable,
  BackHandler,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// ─── Design tokens ─────────────────────────────────────────────────────────
const TOKENS = {
  ink: "#152131",
  sub: "#5C6B66",
  subDark: "#94A3B8",
  line: "#DCE3DF",
  lineDark: "rgba(148,163,184,0.16)",
  teal: "#1FAE8E",
  tealSoft: "#DCEFE9",
  tealSoftDark: "rgba(31,174,142,0.16)",
  orange: "#E08A2E",
  orangeSoft: "#FBF0DD",
  orangeSoftDark: "rgba(224,138,46,0.16)",
  pink: "#D94F6E",
  pinkSoft: "#FBE7EC",
  pinkSoftDark: "rgba(217,79,110,0.16)",
  indigo: "#6F6FD1",
  indigoSoft: "#EFE9FB",
  indigoSoftDark: "rgba(111,111,209,0.16)",
  critical: "#B23A3A",
  criticalSoft: "#F8E3E1",
  criticalSoftDark: "rgba(178,58,58,0.18)",
  neutralSoft: "#EDF1EF",
  neutralSoftDark: "rgba(148,163,184,0.14)",
};

// ─── Reusable Tactile Spring Card ──────────────────────────────────────────
function TactileCard({
  onPress,
  children,
  className = "",
  style,
  activeScale = 0.975,
  haptic = true,
  disabled = false,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: any;
  activeScale?: number;
  haptic?: boolean;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 45,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Date Formatting Utilities ─────────────────────────────────────────────
// Smart labeling: weekdays for 7D, dates for 14D/30D with thinning.
function formatDayLabel(
  dateKey: string,
  index: number,
  arrayLength: number,
  intervalDays: number
): string {
  const d = new Date(dateKey + "T12:00:00"); // noon to avoid TZ shift
  if (isNaN(d.getTime())) return "";

  if (intervalDays <= 7) {
    // 7D: show weekday abbreviation for every bar
    return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
  }
  if (intervalDays <= 14) {
    // 14D: show date every other day + always first and last
    if (index === 0 || index === arrayLength - 1 || index % 2 === 0) {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    return "";
  }
  // 30D: show date every 5th day + always first and last
  if (index === 0 || index === arrayLength - 1 || index % 5 === 0) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return "";
}

function formatInspectionDate(rawDate?: string | null): string {
  if (!rawDate) return "Recent Check-in";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "Recent Check-in";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Status Theme Helper ───────────────────────────────────────────────────
type StatusTheme = {
  tier: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
};

function getStatusTheme(score: number | null, isDark: boolean): StatusTheme {
  if (score === null || score === undefined) {
    return {
      tier: "Getting Started",
      dotColor: isDark ? TOKENS.subDark : "#94A3B8",
      badgeBg: isDark ? TOKENS.neutralSoftDark : TOKENS.neutralSoft,
      badgeText: isDark ? TOKENS.subDark : TOKENS.sub,
      barColor: isDark ? "#475569" : TOKENS.line,
    };
  }
  if (score >= 80) {
    return {
      tier: "Looking Great",
      dotColor: TOKENS.teal,
      badgeBg: isDark ? TOKENS.tealSoftDark : TOKENS.tealSoft,
      badgeText: TOKENS.teal,
      barColor: TOKENS.teal,
    };
  }
  if (score >= 60) {
    return {
      tier: "On Track",
      dotColor: TOKENS.orange,
      badgeBg: isDark ? TOKENS.orangeSoftDark : TOKENS.orangeSoft,
      badgeText: TOKENS.orange,
      barColor: TOKENS.orange,
    };
  }
  if (score >= 50) {
    return {
      tier: "Needs Attention",
      dotColor: TOKENS.pink,
      badgeBg: isDark ? TOKENS.pinkSoftDark : TOKENS.pinkSoft,
      badgeText: TOKENS.pink,
      barColor: TOKENS.pink,
    };
  }
  return {
    tier: "Take Action",
    dotColor: TOKENS.critical,
    badgeBg: isDark ? TOKENS.criticalSoftDark : TOKENS.criticalSoft,
    badgeText: TOKENS.critical,
    barColor: TOKENS.critical,
  };
}

// FIX #10: Returns the right insight card colors based on score severity
function getInsightColors(score: number | null, isDark: boolean) {
  if (score !== null && score < 50) {
    return {
      bg: isDark ? TOKENS.criticalSoftDark : TOKENS.criticalSoft,
      iconBg: isDark ? "rgba(178,58,58,0.25)" : "rgba(178,58,58,0.15)",
      iconColor: TOKENS.critical,
    };
  }
  if (score !== null && score < 60) {
    return {
      bg: isDark ? TOKENS.pinkSoftDark : TOKENS.pinkSoft,
      iconBg: isDark ? "rgba(217,79,110,0.25)" : "rgba(217,79,110,0.15)",
      iconColor: TOKENS.pink,
    };
  }
  if (score !== null && score < 80) {
    return {
      bg: isDark ? TOKENS.orangeSoftDark : TOKENS.orangeSoft,
      iconBg: isDark ? "rgba(224,138,46,0.25)" : "rgba(224,138,46,0.15)",
      iconColor: TOKENS.orange,
    };
  }
  return {
    bg: isDark ? TOKENS.tealSoftDark : TOKENS.tealSoft,
    iconBg: isDark ? "rgba(31,174,142,0.25)" : "rgba(31,174,142,0.2)",
    iconColor: TOKENS.teal,
  };
}

export default function TrendsTabScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, logout } = useUser();

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalDays, setIntervalDays] = useState<7 | 14 | 30>(7);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);
  const [cachedTimestamp, setCachedTimestamp] = useState<number | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false); // FIX #11

  const isMountedRef = useRef(true);
  const hasLoadedCacheRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Fetch AI insight from the dashboard endpoint ────────────────────────
  const fetchAiInsight = useCallback(async () => {
    if (!userId) return;
    if (isMountedRef.current) setAiInsightLoading(true); // FIX #11
    try {
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${base_url}/api/dashboard/me`, {
          headers: { Authorization: `Bearer ${effectiveToken}` },
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.insight?.body && isMountedRef.current) {
            setAiInsight(data.insight.body);
          }
        }
      } finally {
        clearTimeout(timeoutId); // FIX #4: always clear timeout
      }
    } catch {
      // Silently fail — the fallback text will show
    } finally {
      if (isMountedRef.current) setAiInsightLoading(false); // FIX #11
    }
  }, [userId, token]);

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      if (!userId) return;
      const cacheKey = `@trends_cache_${userId}_${intervalDays}d`;

      // Optimistically load cached data on first load for this interval
      if (!silent && !hasLoadedCacheRef.current) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && isMountedRef.current) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object" && "cachedAt" in parsed && "data" in parsed) {
              setAnalytics(parsed.data);
              setCachedTimestamp(parsed.cachedAt);
            } else {
              setAnalytics(parsed);
              setCachedTimestamp(null);
            }
            setIsOfflineData(true);
            setIsLoading(false);
            hasLoadedCacheRef.current = true;
          }
        } catch (e) {
          console.warn("Failed to load trends cache", e);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const response = await fetch(`${base_url}/api/analytics/${userId}?days=${intervalDays}`, {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          await logout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (isMountedRef.current) {
            setAnalytics(data);
            setIsOfflineData(false);
            setCachedTimestamp(Date.now());
            hasLoadedCacheRef.current = true;
          }
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({ cachedAt: Date.now(), data })
          );
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          console.warn("Trends fetch aborted due to timeout");
        } else {
          console.error("Failed to fetch trends", error);
        }
        if (isMountedRef.current) {
          setIsOfflineData(true);
        }
      } finally {
        clearTimeout(timeoutId); // FIX #4: always clear the timer
        if (isMountedRef.current) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    },
    [userId, token, logout, intervalDays]
  );

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
      fetchAiInsight();
      const onBackPress = () => {
        router.replace("/(home)/(tabs)/dashboard");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [fetchAnalytics, fetchAiInsight, router])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
    fetchAiInsight();
  };

  const handleIntervalChange = (days: 7 | 14 | 30) => {
    if (intervalDays === days) return;
    Haptics.selectionAsync();
    hasLoadedCacheRef.current = false;
    setIntervalDays(days);
    setSelectedPointIdx(null);
  };

  // ─── Data Processing: Daily Aggregation ──────────────────────────────────
  // Aggregate raw HSS history into one data point per calendar day,
  // using the latest score for each day. Then fill in missing days as
  // empty slots so the chart shows gaps visually.
  const history = Array.isArray(analytics?.history) ? analytics.history : [];

  const getDayKey = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10); // "2026-09-19"
  };

  // Step 1: Group by day, keep the latest score per day
  const dayMap = new Map<string, { score: number; computed_at: string }>();
  for (const p of history) {
    if (!p?.computed_at || typeof p.score !== "number") continue;
    const key = getDayKey(p.computed_at);
    if (!key) continue;
    const existing = dayMap.get(key);
    if (!existing || new Date(p.computed_at) > new Date(existing.computed_at)) {
      dayMap.set(key, { score: p.score, computed_at: p.computed_at });
    }
  }

  // Step 2: Build a full day-by-day array for the selected interval,
  // including days with no data (score: null).
  type DaySlot = { dateKey: string; score: number | null; hasData: boolean };
  const buildDaySlots = (): DaySlot[] => {
    const slots: DaySlot[] = [];
    const now = new Date();
    for (let i = intervalDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      slots.push({
        dateKey: key,
        score: entry ? Math.round(entry.score) : null,
        hasData: !!entry,
      });
    }
    return slots;
  };
  const daySlots = buildDaySlots();

  // Derived values from the aggregated daily data
  const slotsWithData = daySlots.filter((s) => s.hasData && s.score !== null);
  const latestHSS =
    slotsWithData.length > 0 ? slotsWithData[slotsWithData.length - 1].score : null;

  // Trend delta: compare earliest day with data to the latest day with data
  let scoreDelta: number | null = null;
  if (slotsWithData.length >= 2 && latestHSS !== null) {
    const earliestScore = slotsWithData[0].score!;
    scoreDelta = latestHSS - earliestScore;
  }

  // Guard selectedPointIdx for the daySlots array
  useEffect(() => {
    if (daySlots.length === 0) {
      if (selectedPointIdx !== null) setSelectedPointIdx(null);
      return;
    }
    // Auto-select the last day that has data
    if (selectedPointIdx === null) {
      const lastDataIdx = daySlots.findLastIndex((s) => s.hasData);
      setSelectedPointIdx(lastDataIdx >= 0 ? lastDataIdx : daySlots.length - 1);
    } else if (selectedPointIdx >= daySlots.length) {
      setSelectedPointIdx(daySlots.length - 1);
    }
  }, [daySlots.length, intervalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSlot =
    selectedPointIdx !== null && daySlots[selectedPointIdx]
      ? daySlots[selectedPointIdx]
      : null;
  const activeInspectScore =
    selectedSlot?.score !== null && selectedSlot?.score !== undefined
      ? selectedSlot.score
      : latestHSS;

  const activeTheme = getStatusTheme(latestHSS, isDark);
  const inspectTheme = getStatusTheme(activeInspectScore, isDark);

  const meanScore =
    slotsWithData.length > 0
      ? Math.round(
          slotsWithData.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            slotsWithData.length
        )
      : null;

  const peakScore =
    slotsWithData.length > 0
      ? Math.max(...slotsWithData.map((s) => s.score ?? 0))
      : null;

  // FIX #9: Only trigger the critical red banner for scores < 50 ("Take Action"
  // tier), not the entire < 60 range which includes "Needs Attention".
  const isCritical = latestHSS !== null && latestHSS < 50;

  // FIX #10: Insight card colors based on score severity
  const insightColors = getInsightColors(latestHSS, isDark);

  const formatCacheTime = (ts: number | null): string => {
    if (!ts) return "offline copy";
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0B121C]">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-40"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.teal} />
        }
      >
        {/* ── 1. Screen Header ── */}
        <View className="mb-5">
          <View className="flex-row items-center gap-1.5 mb-1">
            <View style={{ backgroundColor: TOKENS.teal }} className="w-1.5 h-1.5 rounded-full" />
            <Text className="text-[11px] font-semibold text-[#5C6B66] dark:text-slate-400 uppercase tracking-widest">
              Your Progress
            </Text>
          </View>
          <Text className="text-[24px] font-semibold text-[#152131] dark:text-white tracking-tight mb-3">
            Heart Score
          </Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(home)/(tabs)/wrap-up" as any);
              }}
              activeOpacity={0.8}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-full"
              style={{ backgroundColor: TOKENS.teal }}
            >
              <Feather name="file-text" size={13} color="#FFFFFF" />
              <Text className="text-[12px] font-semibold text-white">Doctor Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/(home)/(vitals)/add-vital",
                  params: { type: "bp" },
                } as any);
              }}
              activeOpacity={0.8}
              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full"
              style={{ backgroundColor: TOKENS.pink }}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text className="text-[12px] font-semibold text-white">Log BP</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Cache Status Badge */}
        {isOfflineData && (
          <View
            className="flex-row items-center gap-2 px-3 py-2 rounded-2xl mb-4"
            style={{
              backgroundColor:
                cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                  ? isDark
                    ? TOKENS.criticalSoftDark
                    : TOKENS.criticalSoft
                  : isDark
                    ? TOKENS.orangeSoftDark
                    : TOKENS.orangeSoft,
            }}
          >
            <Feather
              name={
                cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                  ? "alert-triangle"
                  : "cloud-off"
              }
              size={14}
              color={
                cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                  ? TOKENS.critical
                  : TOKENS.orange
              }
            />
            <Text
              className="text-[11px] font-semibold flex-1"
              style={{
                color:
                  cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                    ? TOKENS.critical
                    : TOKENS.orange,
              }}
            >
              {cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                ? `Data may be outdated • Last synced ${formatCacheTime(cachedTimestamp)}`
                : `Offline • Showing cached data (${formatCacheTime(cachedTimestamp)})`}
            </Text>
          </View>
        )}

        {isLoading && !analytics ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="small" color={TOKENS.teal} />
            <Text className="text-[13px] text-slate-400 mt-3 font-medium">
              Loading your progress...
            </Text>
          </View>
        ) : (
          <>
            {/* ── 2. Unified Hero Card ── */}
            <View className="bg-surface-card rounded-2xl p-5 mb-4">
              {/* Score + Status Badge */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-3">
                  <Text className="text-[12px] font-semibold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
                    Your Heart Score
                  </Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-[38px] font-bold text-[#152131] dark:text-white tracking-tight leading-none">
                      {latestHSS !== null ? latestHSS : "—"}
                    </Text>
                    <Text className="text-[14px] font-medium text-[#5C6B66] dark:text-slate-400 ml-1.5">
                      / 100
                    </Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View
                  style={{ backgroundColor: activeTheme.badgeBg }}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                >
                  <View
                    style={{ backgroundColor: activeTheme.dotColor }}
                    className="w-2 h-2 rounded-full mr-1.5"
                  />
                  <Text
                    style={{ color: activeTheme.badgeText }}
                    className="text-[12px] font-semibold"
                  >
                    {activeTheme.tier}
                  </Text>
                </View>
              </View>

              {/* Period Selector (inside the card) */}
              <View
                className="flex-row p-1 rounded-xl mb-4"
                style={{
                  backgroundColor: isDark ? "rgba(148,163,184,0.1)" : TOKENS.neutralSoft,
                }}
              >
                {([7, 14, 30] as const).map((days) => {
                  const isActive = intervalDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      onPress={() => handleIntervalChange(days)}
                      activeOpacity={0.7}
                      className="flex-1 py-2 items-center rounded-lg"
                      style={
                        isActive
                          ? {
                              backgroundColor: isDark ? "#1C2A3A" : "#FFFFFF",
                            }
                          : undefined
                      }
                    >
                      <Text
                        className="text-[12px] font-semibold tracking-tight"
                        style={{
                          color: isActive
                            ? isDark
                              ? "#FFFFFF"
                              : TOKENS.ink
                            : isDark
                              ? TOKENS.subDark
                              : TOKENS.sub,
                        }}
                      >
                        {days}D
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Daily Aggregated Bar Chart ── */}
              <View className="h-44 mb-3 justify-end border-b border-[#DCE3DF] dark:border-slate-800 relative">
                {slotsWithData.length === 0 ? (
                  <View className="items-center justify-center h-full pb-2 px-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mb-2"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(148,163,184,0.12)"
                          : TOKENS.neutralSoft,
                      }}
                    >
                      <Feather name="activity" size={18} color={TOKENS.sub} />
                    </View>
                    <Text className="text-[12px] text-slate-400 text-center font-medium mb-2.5">
                      No readings yet for this {intervalDays}-day window.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(home)/(vitals)/add-vital",
                          params: { type: "bp" },
                        } as any)
                      }
                      activeOpacity={0.8}
                      className="px-4 py-2 rounded-full"
                      style={{ backgroundColor: TOKENS.teal }}
                    >
                      <Text className="text-[11px] font-semibold text-white tracking-wide">
                        Record First Reading
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Target 70 Reference Line */}
                    <View
                      style={{
                        bottom: "70%",
                        borderColor: isDark
                          ? "rgba(31,174,142,0.25)"
                          : "rgba(31,174,142,0.3)",
                      }}
                      className="absolute left-0 right-0 border-b border-dashed z-0"
                    />

                    {/* Bar Columns */}
                    <View className="flex-row items-end justify-between px-1 h-40 z-10">
                      {daySlots.map((slot, idx) => {
                        const isSelected = selectedPointIdx === idx;
                        const hasData = slot.hasData && slot.score !== null;
                        const score = slot.score ?? 0;
                        const heightPercent = hasData
                          ? Math.min(100, Math.max(4, score))
                          : 0;
                        const slotTheme = hasData
                          ? getStatusTheme(score, isDark)
                          : getStatusTheme(null, isDark);

                        // Bar width based on interval density
                        const barWidth =
                          intervalDays === 30
                            ? 6
                            : intervalDays === 14
                              ? 10
                              : 20;

                        return (
                          <TouchableOpacity
                            key={slot.dateKey}
                            activeOpacity={0.85}
                            onPress={() => {
                              if (hasData) {
                                Haptics.impactAsync(
                                  Haptics.ImpactFeedbackStyle.Light
                                );
                                setSelectedPointIdx(idx);
                              }
                            }}
                            className="items-center flex-1"
                            style={{ paddingTop: 2, paddingBottom: 2 }}
                          >
                            {/* Score label above selected bar */}
                            <Text
                              className="text-[10px] font-bold mb-1"
                              style={{
                                color:
                                  isSelected && hasData
                                    ? slotTheme.barColor
                                    : "transparent",
                              }}
                            >
                              {hasData ? score : ""}
                            </Text>

                            {hasData ? (
                              /* Filled bar for days with data */
                              <View
                                style={{
                                  height: `${heightPercent}%`,
                                  width: barWidth,
                                  backgroundColor: slotTheme.barColor,
                                  opacity:
                                    selectedPointIdx !== null && !isSelected
                                      ? 0.4
                                      : 1,
                                  borderRadius: barWidth / 2,
                                }}
                              />
                            ) : (
                              /* Faded dashed outline for missed days */
                              <View
                                style={{
                                  height: 6,
                                  width: barWidth,
                                  borderRadius: barWidth / 2,
                                  borderWidth: 1.5,
                                  borderStyle: "dashed",
                                  borderColor: isDark
                                    ? "rgba(148,163,184,0.25)"
                                    : "rgba(92,107,102,0.2)",
                                }}
                              />
                            )}

                            {/* X-Axis Label */}
                            <Text
                              className="text-[8px] mt-1.5 font-semibold"
                              style={{
                                color:
                                  isSelected && hasData
                                    ? isDark
                                      ? "#FFFFFF"
                                      : TOKENS.ink
                                    : isDark
                                      ? "#64748B"
                                      : TOKENS.sub,
                              }}
                            >
                              {formatDayLabel(
                                slot.dateKey,
                                idx,
                                daySlots.length,
                                intervalDays
                              )}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              {/* Trend Delta */}
              <View className="flex-row items-center justify-between pt-2 mb-3">
                {scoreDelta !== null ? (
                  <View className="flex-row items-center gap-1.5">
                    <Feather
                      name={scoreDelta >= 0 ? "trending-up" : "trending-down"}
                      size={15}
                      color={scoreDelta >= 0 ? TOKENS.teal : TOKENS.pink}
                    />
                    <Text className="text-[13px] font-semibold text-[#152131] dark:text-white">
                      {scoreDelta > 0
                        ? `+${scoreDelta} pts improvement`
                        : scoreDelta < 0
                          ? `${scoreDelta} pts from baseline`
                          : "Holding steady (±0 pts)"}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">
                    {slotsWithData.length < 2
                      ? "Log 2+ days to see your trend"
                      : "Holding steady"}
                  </Text>
                )}

                <View
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(148,163,184,0.12)"
                      : TOKENS.neutralSoft,
                  }}
                >
                  <View
                    style={{ backgroundColor: TOKENS.teal }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                  <Text className="text-[10px] font-semibold text-[#5C6B66] dark:text-slate-400">
                    Goal: 70+
                  </Text>
                </View>
              </View>

              {/* ── Inline Stats Row ── */}
              <View
                className="flex-row items-center justify-around py-3 rounded-xl"
                style={{
                  backgroundColor: isDark ? "rgba(148,163,184,0.08)" : TOKENS.neutralSoft,
                }}
              >
                <View className="items-center">
                  <Text className="text-[18px] font-bold text-[#152131] dark:text-white">
                    {meanScore !== null ? meanScore : "—"}
                  </Text>
                  <Text className="text-[10px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                    Average
                  </Text>
                </View>
                <View
                  className="w-px h-6"
                  style={{
                    backgroundColor: isDark ? "rgba(148,163,184,0.2)" : TOKENS.line,
                  }}
                />
                <View className="items-center">
                  <Text className="text-[18px] font-bold text-[#152131] dark:text-white">
                    {slotsWithData.length}
                  </Text>
                  <Text className="text-[10px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                    {slotsWithData.length === 1 ? "Day" : "Days"}
                  </Text>
                </View>
                <View
                  className="w-px h-6"
                  style={{
                    backgroundColor: isDark ? "rgba(148,163,184,0.2)" : TOKENS.line,
                  }}
                />
                {/* FIX #13: Show peak score instead of the interval number */}
                <View className="items-center">
                  <Text className="text-[18px] font-bold text-[#152131] dark:text-white">
                    {peakScore !== null ? peakScore : "—"}
                  </Text>
                  <Text className="text-[10px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                    Best
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 3. AI Insight Card ── */}
            {/* FIX #10: Card color matches score severity */}
            {/* FIX #11: Shows subtle loading indicator during refresh */}
            {/* FIX #12: Shows offline hint when insight couldn't be fetched */}
            <View
              className="p-4 rounded-2xl mb-4"
              style={{ backgroundColor: insightColors.bg }}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mt-0.5"
                  style={{ backgroundColor: insightColors.iconBg }}
                >
                  {aiInsightLoading ? (
                    <ActivityIndicator size="small" color={insightColors.iconColor} />
                  ) : (
                    <MaterialCommunityIcons
                      name="auto-fix"
                      size={16}
                      color={insightColors.iconColor}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] leading-5 text-[#152131] dark:text-white font-normal">
                    {aiInsight ||
                      (latestHSS !== null
                        ? latestHSS >= 80
                          ? "Your heart score is looking strong! Keep up the consistent tracking and healthy habits."
                          : latestHSS >= 60
                            ? "You're on track. Consistent morning check-ins and mindful meals are making a difference."
                            : "Your score needs a bit of attention. Consider reviewing recent readings with your doctor."
                        : "Start logging your vitals to get personalized insights about your heart health.")}
                  </Text>
                  {/* FIX #12: Hint when showing fallback instead of real AI insight */}
                  {!aiInsight && !aiInsightLoading && isOfflineData && (
                    <Text className="text-[10px] text-[#5C6B66] dark:text-slate-500 mt-1.5">
                      Connect to see your personalized AI insight
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── 4. Heatmap Gateway ── */}
            <TactileCard
              onPress={() => router.push("/(home)/(profile)/analytics" as any)}
              className="bg-surface-card p-4 rounded-2xl mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark ? TOKENS.indigoSoftDark : TOKENS.indigoSoft,
                  }}
                >
                  <Feather name="calendar" size={17} color={TOKENS.indigo} />
                </View>
                <View>
                  <Text className="text-[13px] font-semibold text-[#152131] dark:text-white">
                    6-Month Consistency
                  </Text>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">
                    View your check-in streaks
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={TOKENS.sub} />
            </TactileCard>

            {/* ── 5. Doctor Banner ── */}
            <View
              className="p-4 rounded-2xl mb-4"
              style={{
                backgroundColor: isCritical
                  ? isDark
                    ? TOKENS.criticalSoftDark
                    : TOKENS.criticalSoft
                  : isDark
                    ? "rgba(148,163,184,0.1)"
                    : TOKENS.neutralSoft,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-[13px] font-semibold text-[#152131] dark:text-white">
                    {isCritical ? "Talk to Your Doctor" : "Preparing for a Checkup?"}
                  </Text>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5 leading-4">
                    {isCritical
                      ? "Your recent readings suggest you should check in with your care team."
                      : "Share your progress chart with your doctor at your next visit."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/(home)/(profile)/care-team" as any);
                  }}
                  className="px-3.5 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isCritical ? TOKENS.critical : TOKENS.teal,
                  }}
                  activeOpacity={0.8}
                >
                  <Text className="text-[11px] font-semibold text-white">
                    {isCritical ? "Call Doctor" : "My Doctor"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── 6. One-Line Disclaimer ── */}
            <View className="mt-2 mb-4 items-center">
              <Text className="text-[11px] text-[#5C6B66] dark:text-slate-500 text-center font-normal">
                Not medical advice • Always consult your doctor
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}