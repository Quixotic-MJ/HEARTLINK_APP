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
  Platform,
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
function formatDayLabel(
  rawDate?: string | null,
  fallbackIdx?: number,
  interval: number = 7,
  totalPoints: number = 7
): string {
  if (!rawDate) return `D${(fallbackIdx ?? 0) + 1}`;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return `D${(fallbackIdx ?? 0) + 1}`;
  if (interval >= 14 || totalPoints > 7) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
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
  badgeBorder: string;
  badgeText: string;
  barColor: string;
};

function getStatusTheme(score: number | null, isDark: boolean): StatusTheme {
  if (score === null || score === undefined) {
    return {
      tier: "Pending Baseline",
      dotColor: isDark ? "#64748B" : "#94A3B8",
      badgeBg: isDark ? "rgba(100, 116, 139, 0.15)" : "#EDF1EF",
      badgeBorder: isDark ? "rgba(100, 116, 139, 0.3)" : "#DCE3DF",
      badgeText: isDark ? "#94A3B8" : "#5C6B66",
      barColor: isDark ? "#475569" : "#CBD5E1",
    };
  }
  if (score >= 80) {
    return {
      tier: "Optimal Stability",
      dotColor: "#1B6E63",
      badgeBg: isDark ? "rgba(27, 110, 99, 0.2)" : "#E2F1ED",
      badgeBorder: isDark ? "rgba(27, 110, 99, 0.35)" : "#C6E4DC",
      badgeText: isDark ? "#4FA79A" : "#1B6E63",
      barColor: "#1B6E63",
    };
  }
  if (score >= 60) {
    return {
      tier: "Moderate Control",
      dotColor: "#D97706",
      badgeBg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
      badgeBorder: isDark ? "rgba(217, 119, 6, 0.35)" : "#FDE68A",
      badgeText: isDark ? "#FBBF24" : "#D97706",
      barColor: "#D97706",
    };
  }
  if (score >= 50) {
    return {
      tier: "Elevated Risk",
      dotColor: "#E8532E",
      badgeBg: isDark ? "rgba(232, 83, 46, 0.2)" : "#FDEEE9",
      badgeBorder: isDark ? "rgba(232, 83, 46, 0.35)" : "#F9D5CB",
      badgeText: isDark ? "#F0693E" : "#E8532E",
      barColor: "#E8532E",
    };
  }
  return {
    tier: "Critical Disruption",
    dotColor: "#8A1F1A",
    badgeBg: isDark ? "rgba(138, 31, 26, 0.2)" : "#FBEAE9",
    badgeBorder: isDark ? "rgba(138, 31, 26, 0.35)" : "#F5C7C5",
    badgeText: isDark ? "#D15C4E" : "#8A1F1A",
    barColor: "#8A1F1A",
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

  const isMountedRef = useRef(true);
  const hasLoadedCacheRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        clearTimeout(timeoutId);

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
      const onBackPress = () => {
        router.replace("/(home)/(tabs)/dashboard");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [fetchAnalytics, router])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
  };

  const handleIntervalChange = (days: 7 | 14 | 30) => {
    if (intervalDays === days) return;
    Haptics.selectionAsync();
    hasLoadedCacheRef.current = false;
    setIntervalDays(days);
    setSelectedPointIdx(null);
  };

  // Telemetry Calculations
  const history = Array.isArray(analytics?.history) ? analytics.history : [];

  // Filter history points within the active interval cutoff timestamp (TKT-CLN-06)
  const cutoffTime = Date.now() - intervalDays * 24 * 60 * 60 * 1000;
  const recentPoints = history.filter((p: any) => {
    if (!p || !p.computed_at) return false;
    const t = new Date(p.computed_at).getTime();
    return !isNaN(t) && t >= cutoffTime;
  });

  const latestHSS =
    recentPoints.length > 0
      ? typeof recentPoints[recentPoints.length - 1]?.score === "number"
        ? Math.round(recentPoints[recentPoints.length - 1].score)
        : null
      : history.length > 0 && typeof history[history.length - 1]?.score === "number"
      ? Math.round(history[history.length - 1].score)
      : null;

  const hasSufficientData = recentPoints.length >= 2;

  const oldestScore =
    hasSufficientData && typeof recentPoints[0]?.score === "number"
      ? Math.round(recentPoints[0].score)
      : (latestHSS ?? 0);
  const newestScore = latestHSS ?? 0;
  const scoreDelta = hasSufficientData ? newestScore - oldestScore : null;

  // Sync selected index to newest point by default when data arrives
  useEffect(() => {
    if (recentPoints.length > 0 && selectedPointIdx === null) {
      setSelectedPointIdx(recentPoints.length - 1);
    }
  }, [recentPoints.length, selectedPointIdx]);

  // Selected bar details for interactive inspection tooltip
  const activeInspectPoint =
    selectedPointIdx !== null && recentPoints[selectedPointIdx]
      ? recentPoints[selectedPointIdx]
      : recentPoints.length > 0
      ? recentPoints[recentPoints.length - 1]
      : null;

  const activeInspectScore =
    activeInspectPoint && typeof activeInspectPoint.score === "number"
      ? Math.round(activeInspectPoint.score)
      : latestHSS;

  const activeTheme = getStatusTheme(latestHSS, isDark);
  const inspectTheme = getStatusTheme(activeInspectScore, isDark);

  // Mean Score across selected window with null/undefined filtered (TKT-CLN-03)
  const validScorePoints = recentPoints.filter((p: any) => typeof p.score === "number" && !isNaN(p.score));
  const meanScore =
    validScorePoints.length > 0
      ? Math.round(
          validScorePoints.reduce((acc: number, p: any) => acc + p.score, 0) /
            validScorePoints.length
        )
      : null;

  const isCritical = latestHSS !== null && latestHSS < 60;

  const formatCacheTime = (ts: number | null): string => {
    if (!ts) return "offline copy";
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8532E" />}
      >
        {/* ── Screen Header & Category ── */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="w-1.5 h-1.5 rounded-full bg-[#1B6E63]" />
                <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-widest">
                  Health Intelligence
                </Text>
              </View>
              <Text className="text-[26px] font-extrabold text-[#152131] dark:text-white tracking-tight">
                Heart Trends & Progress
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(home)/(tabs)/wrap-up" as any);
                }}
                activeOpacity={0.8}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-[#1B6E63] shadow-sm shadow-teal-500/20"
              >
                <Feather name="file-text" size={13} color="#FFFFFF" />
                <Text className="text-[12px] font-bold text-white">Doctor Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/(home)/(health)/log-symptoms",
                    params: { quick_entry: "true" },
                  } as any);
                }}
                activeOpacity={0.8}
                className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E8532E] shadow-sm shadow-coral-500/20"
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text className="text-[12px] font-bold text-white">Log BP</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-[12px] text-[#5C6B66] dark:text-slate-400 mt-1 leading-4">
            Longitudinal telemetry, stability vectors & doctor-ready charts.
          </Text>
        </View>

        {/* Offline Cache Status Badge with 4-hour stale warning (TKT-CLN-05) */}
        {isOfflineData && (
          <View className={`flex-row items-center gap-2 px-3 py-2 rounded-xl mb-4 border ${
            cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
              ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/60"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60"
          }`}>
            <Feather
              name={cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000 ? "alert-triangle" : "cloud-off"}
              size={14}
              color={cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000 ? "#DC2626" : "#D97706"}
            />
            <View className="flex-1">
              <Text className={`text-[11px] font-bold ${
                cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                  ? "text-red-800 dark:text-red-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}>
                {cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000
                  ? `Stale Telemetry (>4h Old) • Snapshot from ${formatCacheTime(cachedTimestamp)}`
                  : `Offline Mode • Showing cached telemetry (${formatCacheTime(cachedTimestamp)})`}
              </Text>
              {cachedTimestamp && Date.now() - cachedTimestamp > 4 * 3600 * 1000 && (
                <Text className="text-[10px] text-red-700 dark:text-red-400 mt-0.5 leading-3">
                  Connect to Wi-Fi/cellular to reflect recent vital logs or emergency telemetry.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Time Interval Segmented Control ── */}
        <View className="flex-row p-1 bg-[#EDF1EF] dark:bg-[#121D2B] rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80 mb-5">
          {([7, 14, 30] as const).map((days) => {
            const isActive = intervalDays === days;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => handleIntervalChange(days)}
                activeOpacity={0.7}
                className="flex-1 py-2 items-center rounded-xl"
                style={
                  isActive
                    ? {
                        backgroundColor: isDark ? "#1C2A3A" : "#FFFFFF",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 1,
                      }
                    : undefined
                }
              >
                <Text
                  className="text-[12px] font-bold tracking-tight"
                  style={{
                    color: isActive
                      ? isDark
                        ? "#FFFFFF"
                        : "#152131"
                      : isDark
                      ? "#94A3B8"
                      : "#5C6B66",
                  }}
                >
                  {days} Days
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading && !analytics ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="small" color="#E8532E" />
            <Text className="text-[13px] text-slate-400 mt-3 font-medium">Analyzing telemetry history...</Text>
          </View>
        ) : (
          <>
            {/* ── 1. Primary Hero Stability Progression Card ── */}
            <View className="bg-white dark:bg-[#121D2B] rounded-[28px] p-5 border border-[#DCE3DF] dark:border-slate-800/80 mb-4 shadow-sm shadow-slate-200/50">
              
              {/* Card Header: Score, Status Pill & Target */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 mr-3">
                  <Text className="text-[13px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
                    Cardiovascular Stability
                  </Text>
                  
                  {/* 3-Second Glanceable Big Metric */}
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-[44px] font-black text-[#152131] dark:text-white tracking-tighter leading-none">
                      {latestHSS !== null ? latestHSS : "—"}
                    </Text>
                    <Text className="text-[15px] font-semibold text-[#5C6B66] dark:text-slate-400 ml-1.5">
                      / 100 HSS
                    </Text>
                  </View>
                </View>

                {/* Semantic Status Badge */}
                <View
                  style={{ backgroundColor: activeTheme.badgeBg, borderColor: activeTheme.badgeBorder }}
                  className="flex-row items-center px-3 py-1.5 rounded-full border"
                >
                  <View style={{ backgroundColor: activeTheme.dotColor }} className="w-2 h-2 rounded-full mr-1.5" />
                  <Text style={{ color: activeTheme.badgeText }} className="text-[12px] font-bold">
                    {activeTheme.tier}
                  </Text>
                </View>
              </View>

              {/* Dynamic Interactive Tooltip (Active Bar Inspection) */}
              {recentPoints.length > 0 && activeInspectPoint && (
                <View className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-[#F8FAF9] dark:bg-[#0B131E] border border-[#DCE3DF] dark:border-slate-800 mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="calendar" size={12} color="#5C6B66" />
                    <Text className="text-[11px] font-bold text-[#152131] dark:text-white">
                      {formatInspectionDate(activeInspectPoint.computed_at)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">Score:</Text>
                    <Text style={{ color: inspectTheme.badgeText }} className="text-[12px] font-extrabold">
                      {activeInspectScore} pts
                    </Text>
                  </View>
                </View>
              )}

              {/* Visual Telemetry Bars Canvas */}
              <View className="h-32 mb-3 justify-end border-b border-[#DCE3DF] dark:border-slate-800 relative">
                {recentPoints.length === 0 ? (
                  <View className="items-center justify-center h-full pb-2 px-3">
                    <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-2">
                      <Feather name="activity" size={18} color="#94a3b8" />
                    </View>
                    <Text className="text-[12px] text-slate-400 text-center font-medium mb-2.5">
                      No vitals recorded yet for this {intervalDays}-day window.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(home)/(health)/log-symptoms",
                          params: { quick_entry: "true" },
                        } as any)
                      }
                      activeOpacity={0.8}
                      className="px-4 py-2 rounded-full bg-[#E8532E] shadow-sm shadow-coral-500/20"
                    >
                      <Text className="text-[11px] font-bold text-white tracking-wide">Record First Vitals</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Clinical Target 70 Reference Guideline */}
                    <View
                      style={{ bottom: "70%" }}
                      className="absolute left-0 right-0 border-b border-dashed border-[#1B6E63]/30 dark:border-emerald-500/20 z-0"
                    />

                    {/* Bar Columns Container */}
                    <View className="flex-row items-end justify-between px-1 h-28 z-10">
                      {recentPoints.map((point: any, idx: number) => {
                        const rawScore = typeof point.score === "number" ? point.score : 0;
                        const score = Math.round(rawScore);
                        const heightPercent = Math.min(100, Math.max(16, score));
                        const pointTheme = getStatusTheme(score, isDark);
                        const isSelected = selectedPointIdx === idx;

                        return (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.85}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedPointIdx(idx);
                            }}
                            className="items-center flex-1 py-1"
                          >
                            {/* Selected Point Indicator Pip */}
                            <View
                              className="w-1 h-1 rounded-full mb-1"
                              style={{
                                backgroundColor: isSelected
                                  ? isDark
                                    ? "#FFFFFF"
                                    : "#152131"
                                  : "transparent",
                              }}
                            />

                            {/* Telemetry Bar */}
                            <View
                              style={{
                                height: `${heightPercent}%`,
                                width:
                                  intervalDays === 30 || recentPoints.length > 14
                                    ? 6
                                    : intervalDays === 14 || recentPoints.length > 7
                                    ? 10
                                    : 16,
                                backgroundColor: pointTheme.barColor,
                                opacity: selectedPointIdx !== null && !isSelected ? 0.45 : 1,
                                borderRadius: 6,
                              }}
                            />

                            {/* X-Axis Date/Weekday Label */}
                            <Text
                              className="text-[9px] mt-1.5 font-bold"
                              style={{
                                color: isSelected
                                  ? isDark
                                    ? "#FFFFFF"
                                    : "#152131"
                                  : isDark
                                  ? "#64748B"
                                  : "#5C6B66",
                              }}
                            >
                              {formatDayLabel(point.computed_at, idx, intervalDays, recentPoints.length)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              {/* Card Footer: Trajectory Delta & Clinical Target */}
              <View className="flex-row items-center justify-between pt-1">
                {scoreDelta !== null ? (
                  <View className="flex-row items-center gap-1.5">
                    <Feather
                      name={scoreDelta >= 0 ? "trending-up" : "trending-down"}
                      size={15}
                      color={scoreDelta >= 0 ? "#1B6E63" : "#E8532E"}
                    />
                    <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                      {scoreDelta > 0
                        ? `+${scoreDelta} pts improvement`
                        : scoreDelta < 0
                        ? `${scoreDelta} pts from baseline`
                        : "Holding steady (±0 pts)"}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">
                    Log ≥ 2 readings to calculate trajectory
                  </Text>
                )}

                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-[#EDF1EF] dark:bg-slate-800">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#1B6E63]" />
                  <Text className="text-[10px] font-bold text-[#5C6B66] dark:text-slate-400">
                    Target: ≥ 70
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 2. Secondary Telemetry Glance Metrics (2-Column Grid) ── */}
            <View className="flex-row gap-3 mb-4">
              {/* Window Average Stability Tile */}
              <View className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80">
                <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider mb-1">
                  {intervalDays}D Mean HSS
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="text-[24px] font-black text-[#152131] dark:text-white">
                    {meanScore !== null ? meanScore : "—"}
                  </Text>
                  <Text className="text-[12px] font-bold text-[#5C6B66] dark:text-slate-400 ml-1">pts</Text>
                </View>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-1">
                  {meanScore && meanScore >= 70 ? "Above target threshold" : "Below recommended target"}
                </Text>
              </View>

              {/* Consistency Check-in Rate Tile */}
              <View className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80">
                <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Consistency
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="text-[24px] font-black text-[#152131] dark:text-white">
                    {recentPoints.length}
                  </Text>
                  <Text className="text-[12px] font-bold text-[#5C6B66] dark:text-slate-400 ml-1">
                    / {intervalDays} logs
                  </Text>
                </View>
                <Text className="text-[11px] text-[#1B6E63] dark:text-emerald-400 font-medium mt-1">
                  {recentPoints.length >= intervalDays * 0.7 ? "High compliance" : "Building check-in habit"}
                </Text>
              </View>
            </View>

            {/* ── 3. Smart Clinical Progress Insight Card ── */}
            <View
              className="p-4 rounded-2xl border mb-4"
              style={{
                backgroundColor: isCritical
                  ? isDark
                    ? "rgba(138, 31, 26, 0.15)"
                    : "#FDF2F0"
                  : isDark
                  ? "#121D2B"
                  : "#FFFFFF",
                borderColor: isCritical
                  ? "#E8532E"
                  : isDark
                  ? "rgba(30, 41, 59, 0.8)"
                  : "#DCE3DF",
              }}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  className="w-7 h-7 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: isCritical
                      ? isDark
                        ? "rgba(232, 83, 46, 0.2)"
                        : "#FDEEE9"
                      : isDark
                      ? "rgba(27, 110, 99, 0.2)"
                      : "#E2F1ED",
                  }}
                >
                  <MaterialCommunityIcons
                    name={isCritical ? "alert-circle-outline" : "auto-fix"}
                    size={16}
                    color={isCritical ? "#E8532E" : "#1B6E63"}
                  />
                </View>
                <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                  {isCritical ? "Cardiovascular Risk Flag" : "Clinical Progress Summary"}
                </Text>
              </View>
              <Text className="text-[12px] text-[#5C6B66] dark:text-slate-300 leading-relaxed font-normal">
                {latestHSS !== null ? (
                  latestHSS >= 80 ? (
                    "Your cardiovascular stability is optimal. Consistent daily tracking and balanced habits are supporting vascular resilience."
                  ) : latestHSS >= 60 ? (
                    "Your telemetry reflects controlled cardiovascular metrics. Continue consistent morning blood pressure logging and low-sodium meal choices."
                  ) : (
                    "Your stability score has dipped below recommended safety boundaries. Review recent blood pressure logs and consult your attending doctor if symptoms persist."
                  )
                ) : (
                  "Log daily vitals and meals to activate personalized cardiovascular insights and predictive trend telemetry."
                )}
              </Text>
            </View>

            {/* ── 4. Quick Habit Gateways (Tactile Touchables) ── */}
            <Text className="text-[12px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Associated Journals & Habits
            </Text>
            <View className="flex-row gap-3 mb-4">
              <TactileCard
                onPress={() => router.push("/(home)/(meals)/daily-diary" as any)}
                className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80"
              >
                <View className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-2.5">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={17} color="#1B6E63" />
                </View>
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">Meal Diary</Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">Sodium & meals</Text>
              </TactileCard>

              <TactileCard
                onPress={() => router.push("/(home)/(health)/exercise-diary" as any)}
                className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80"
              >
                <View className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center mb-2.5">
                  <Feather name="activity" size={17} color="#2563eb" />
                </View>
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">Cardio Log</Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">Active walking</Text>
              </TactileCard>
            </View>

            {/* ── 5. Long-Term Heatmap Gateway Link ── */}
            <TactileCard
              onPress={() => router.push("/(home)/(profile)/analytics" as any)}
              className="bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800/80 mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 items-center justify-center">
                  <Feather name="calendar" size={17} color="#9333ea" />
                </View>
                <View>
                  <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                    6-Month Consistency Heatmap
                  </Text>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">
                    Inspect long-term check-in streaks
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color="#94a3b8" />
            </TactileCard>

            {/* ── 6. Doctor Consultation or Critical Escalation Banner ── */}
            <View
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: isCritical
                  ? isDark
                    ? "rgba(138, 31, 26, 0.2)"
                    : "#FDF2F0"
                  : isDark
                  ? "#1A2634"
                  : "#EDF1EF",
                borderColor: isCritical
                  ? "#E8532E"
                  : isDark
                  ? "rgba(30, 41, 59, 0.8)"
                  : "#DCE3DF",
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                    {isCritical ? "Cardiovascular Warning" : "Preparing for a Checkup?"}
                  </Text>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5 leading-4">
                    {isCritical
                      ? "Recent telemetry indicates cardiovascular risk drift. Contact your care team or visit a nearby clinic."
                      : "Present your 7-day stability chart to your attending doctor to verify treatment progress."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/(home)/(profile)/care-team" as any);
                  }}
                  className="px-3.5 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isCritical
                      ? "#E8532E"
                      : isDark
                      ? "#FFFFFF"
                      : "#152131",
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{
                      color: isCritical
                        ? "#FFFFFF"
                        : isDark
                        ? "#152131"
                        : "#FFFFFF",
                    }}
                  >
                    {isCritical ? "Call Doctor" : "My Doctor"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── 7. Statutory Non-Diagnostic Regulatory Disclaimer ── */}
            <View className="mt-6 mb-4 px-2 items-center">
              <Text className="text-[11px] text-[#5C6B66] dark:text-slate-500 text-center leading-4 font-normal">
                HeartLink is a personal wellness tracking and longitudinal telemetry tool. It is not a certified diagnostic device and is not intended to diagnose, treat, cure, or prevent any cardiovascular condition or replace professional clinical judgment. Always consult your cardiologist or primary care physician regarding health data or medication regimens. In an acute medical emergency, call 911 or visit the nearest emergency facility immediately.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
