import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  Alert,
  AccessibilityInfo,
} from "react-native";
import Reanimated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { getCompanionGreeting, CompanionGreetingResult } from "../../../services/companionService";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { ScoreGradientBar } from "../../../components/dashboard/ScoreGradientBar";
import { RecommendationCard } from "../../../components/dashboard/RecommendationCard";
import { CustomAlertModal } from "../../../components/dashboard/CustomAlertModal";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Score theme ──────────────────────────────────────────────────────────────
type ScoreTheme = {
  label: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
};

function getScoreTheme(score: number, isDark: boolean): ScoreTheme {
  if (!score || score === 0) {
    return {
      label: "Score unavailable",
      barColor: isDark ? "#64748B" : "#A3B1AC",
      badgeBg: isDark ? "rgba(100, 116, 139, 0.15)" : "#E2E8E5",
      badgeText: isDark ? "#94A3B8" : "#5C6B66",
      dotColor: isDark ? "#94A3B8" : "#5C6B66",
    };
  }
  if (score >= 80)
    return {
      label: "Stable",
      barColor: "#1B6E63",
      badgeBg: isDark ? "rgba(27, 110, 99, 0.2)" : "#E2F1ED",
      badgeText: isDark ? "#2DD4BF" : "#1B6E63",
      dotColor: isDark ? "#2DD4BF" : "#1B6E63",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: "#D97706",
      badgeBg: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
      badgeText: isDark ? "#FBBF24" : "#D97706",
      dotColor: isDark ? "#FBBF24" : "#D97706",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      barColor: "#E8532E",
      badgeBg: isDark ? "rgba(232, 83, 46, 0.2)" : "#FDEEE9",
      badgeText: isDark ? "#FB923C" : "#E8532E",
      dotColor: isDark ? "#FB923C" : "#E8532E",
    };
  return {
    label: "Critical",
    barColor: "#8A1F1A",
    badgeBg: isDark ? "rgba(138, 31, 26, 0.2)" : "#FBEAE9",
    badgeText: isDark ? "#F87171" : "#8A1F1A",
    dotColor: isDark ? "#F87171" : "#8A1F1A",
  };
}

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeStr = "Good morning";
  if (hour >= 12 && hour < 17) timeStr = "Good afternoon";
  else if (hour >= 17) timeStr = "Good evening";
  return name ? `${timeStr}, ${name}` : timeStr;
}

// ─── Freshness Helper ─────────────────────────────────────────────────────────
function formatFreshness(lastSync: string | null | undefined, isOffline: boolean): string {
  if (!lastSync) {
    return isOffline ? "Offline • Update time unavailable" : "Update time unavailable";
  }
  const date = new Date(lastSync);
  if (isNaN(date.getTime())) {
    return isOffline ? "Offline • Update time unavailable" : "Update time unavailable";
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  let timeStr = "";
  if (diffInMinutes < 1) {
    timeStr = "Just now";
  } else if (diffInMinutes < 60) {
    timeStr = `${diffInMinutes}m ago`;
  } else if (now.toDateString() === date.toDateString()) {
    const timeFormatted = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    timeStr = `Today, ${timeFormatted}`;
  } else {
    const dateFormatted = date.toLocaleDateString([], { month: "short", day: "numeric" });
    const timeFormatted = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    timeStr = `${dateFormatted}, ${timeFormatted}`;
  }

  return isOffline ? `Offline • Last updated ${timeStr}` : `Updated ${timeStr}`;
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, user, setUserId, logout } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [companion, setCompanion] = useState<CompanionGreetingResult | null>(null);

  const isFetchingRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [isCachedData, setIsCachedData] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
  }, []);

  const safeNavigate = useCallback((route: string, params?: any) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (params) {
      router.push({ pathname: route as any, params });
    } else {
      router.push(route as any);
    }
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  }, [router]);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!userId || isFetchingRef.current) return;
      isFetchingRef.current = true;

      // Only show full-screen skeleton on initial load when no data exists in memory
      if (!silent && !data) setIsLoading(true);
      setError(false);
      setRefreshError(false);
      const cacheKey = `@dashboard_cache_${userId}`;

      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const response = await fetch(`${base_url}/api/dashboard/me`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`
          }
        });
        if (response.ok) {
          const json = await response.json();
          setData(json);
          setIsCachedData(false);
          setRefreshError(false);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
        } else if (response.status === 401 || response.status === 403) {
          // Token expired or invalid session - delegate to centralized auth logout
          await logout();
          return;
        } else {
          throw new Error(`Dashboard API responded with ${response.status}`);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (data) {
          // Keep existing in-memory data visible and show non-blocking banner
          setRefreshError(true);
        } else {
          try {
            const cachedStr = await AsyncStorage.getItem(cacheKey);
            if (cachedStr) {
              setData(JSON.parse(cachedStr));
              setIsCachedData(true);
              console.log("[Dashboard] Loaded data from local cache.");
            } else {
              setError(true);
            }
          } catch {
            setError(true);
          }
        }
      } finally {
        setIsLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [userId, token, data]
  );

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const hssScore = typeof data?.hss_score === "number" ? data.hss_score : 0;
  const hasHssScore = hssScore > 0;
  const theme = getScoreTheme(hssScore, isDark);
  const isCritical = hasHssScore && hssScore < 50;

  const mealsLogged = (data?.today_activity?.meals_count || 0) > 0;
  const exerciseLogged = (data?.today_activity?.exercises_count || 0) > 0;
  const sleepLogged = !!data?.today_activity?.sleep_logged;
  const vitalsLogged = !!data?.today_activity?.vitals_logged || !!data?.latest_vitals?.logged_at;
  const completedCount = [mealsLogged, exerciseLogged, sleepLogged, vitalsLogged].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const movementMins = data?.today_activity?.total_exercise_minutes || 0;
  const movementGoal = (data as any)?.thresholds?.active_minutes_goal || 30;

  useEffect(() => {
    if (data) {
      const firstName = data?.user?.first_name || user?.first_name || "";
      const rawBp = data?.latest_vitals?.bp || "";
      let sbp: number | undefined;
      let dbp: number | undefined;
      if (rawBp && rawBp !== "--/--") {
        const parts = rawBp.split("/").map((p: string) => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          sbp = parts[0];
          dbp = parts[1];
        }
      }

      const activityContext = {
        vitals_logged: !!data?.today_activity?.vitals_logged,
        total_sodium_mg: data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg,
        total_exercise_minutes: movementMins,
        total_sleep_hours: data?.today_activity?.total_sleep_hours,
        latest_sbp: sbp,
        latest_dbp: dbp,
      };

      const hssContext = {
        score: hssScore,
        tier: theme.label,
      };

      getCompanionGreeting(firstName, activityContext, hssContext).then(setCompanion);
    }
  }, [data, user?.first_name, movementMins, hssScore, theme.label]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.03],
    outputRange: [0.2, 0.6],
  });

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isCritical && !isLoading && !reduceMotion) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }

    return () => {
      if (animLoop) {
        animLoop.stop();
      }
    };
  }, [isCritical, pulseAnim, isLoading, reduceMotion]);

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("@dismissed_alert_ids").then((res) => {
      if (res) {
        try {
          setDismissedAlertIds(JSON.parse(res));
        } catch {}
      }
    });
  }, []);

  const handleDismissAlert = async (alertId: string) => {
    setAlertModalVisible(false);
    if (!alertId) return;
    if (!dismissedAlertIds.includes(alertId)) {
      const updated = [...dismissedAlertIds, alertId];
      setDismissedAlertIds(updated);
      await AsyncStorage.setItem("@dismissed_alert_ids", JSON.stringify(updated));
    }
  };

  // Auto-show alert modal ONLY if it hasn't been dismissed by the user yet
  useEffect(() => {
    const alertId = data?.latest_alert?.id;
    if (alertId && !isLoading && !dismissedAlertIds.includes(alertId)) {
      setAlertModalVisible(true);
    }
  }, [data?.latest_alert?.id, isLoading, dismissedAlertIds]);

  if (isLoading && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-[#EDF1EF] dark:bg-[#101923]">
        <Header />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        >
          {/* Greeting Skeleton */}
          <View className="mb-4">
            <Skeleton className="w-56 h-8 mb-1.5 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-36 h-4 rounded-lg bg-[#DCE3DF] dark:bg-slate-800" />
          </View>

          {/* Unified Side-by-Side Hero Card Skeleton */}
          <View className="bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-5 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#DCE3DF]/60 dark:border-slate-800">
              <Skeleton className="w-36 h-4 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-16 h-5 rounded-full bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
            <View className="flex-row items-center gap-4">
              {/* Left Circle Ring */}
              <View className="items-center justify-center">
                <Skeleton className="w-28 h-28 rounded-full bg-[#DCE3DF] dark:bg-slate-800" />
                <Skeleton className="w-20 h-2.5 rounded-md mt-2 bg-[#DCE3DF] dark:bg-slate-800" />
              </View>
              {/* Right Stacked Vitals Chips */}
              <View className="flex-1 gap-2.5">
                <Skeleton className="w-full h-14 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
                <Skeleton className="w-full h-14 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
              </View>
            </View>
          </View>

          {/* 4-Button Horizontal Action Strip Skeleton */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2.5 px-1">
              <Skeleton className="w-24 h-4 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-20 h-3 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
            <View className="flex-row justify-between items-center bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 py-3.5 px-2.5 shadow-xs">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="items-center flex-1">
                  <Skeleton className="w-12 h-12 rounded-2xl bg-[#DCE3DF] dark:bg-slate-800" />
                  <Skeleton className="w-10 h-2.5 rounded-md mt-1.5 bg-[#DCE3DF] dark:bg-slate-800" />
                </View>
              ))}
            </View>
          </View>

          {/* Minimalist Summary Card Skeleton */}
          <View className="bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-5 mb-4 shadow-xs">
            <Skeleton className="w-32 h-4 rounded-md mb-3 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-full h-14 rounded-xl mb-3 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-full h-5 rounded-md mb-2.5 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-full h-5 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
          </View>

          {/* Recommendations Skeleton */}
          <View className="mt-2">
            <Skeleton className="w-36 h-4 rounded-md mb-3 bg-[#DCE3DF] dark:bg-slate-800" />
            <View className="flex-row gap-3">
              <Skeleton className="w-52 h-32 rounded-2xl bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-52 h-32 rounded-2xl bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (error && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-[#EDF1EF] dark:bg-[#101923]">
        <Header />
        <View className="flex-1 justify-center items-center px-5">
          <View className="bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-8 items-center w-full max-w-sm shadow-xs">
            <View className="w-14 h-14 rounded-2xl bg-[#8A1F1A]/10 border border-[#8A1F1A]/20 items-center justify-center mb-4">
              <Feather name="wifi-off" size={24} color="#8A1F1A" />
            </View>
            <Text className="text-[18px] font-bold text-[#152131] dark:text-white mb-1 text-center">
              Unable to load dashboard
            </Text>
            <Text className="text-[13px] text-[#5C6B66] dark:text-slate-400 text-center mb-6 leading-relaxed">
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={() => fetchData(false)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try again to load dashboard"
              className="bg-[#E8532E] px-6 py-3 rounded-xl flex-row items-center gap-2 shadow-xs"
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={14} color="#ffffff" />
              <Text className="text-white font-bold text-[14px]">Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const isAlertActive = !!data?.latest_alert && hssScore < 60;

  return (
    <ScreenWrapper
      edges={["top"]}
      withScrollView={false}
      safeAreaClassName="flex-1 bg-[#EDF1EF] dark:bg-[#101923]"
    >
      {/* Custom Alert Modal */}
      {isAlertActive && (
        <CustomAlertModal
          visible={alertModalVisible}
          onClose={() => handleDismissAlert(data.latest_alert.id)}
          title="Health Alert"
          message={
            data.latest_alert.message ||
            "Your recent metrics suggest you should consider consulting a healthcare facility."
          }
          icon="alert-triangle"
          iconBg="#FBEAE9"
          iconColor="#8A1F1A"
          actions={[
            {
              label: "Find a healthcare facility",
              onPress: () => {
                handleDismissAlert(data.latest_alert.id);
                safeNavigate("/locator");
              },
              primary: true,
            },
            {
              label: "Dismiss",
              onPress: () => handleDismissAlert(data.latest_alert.id),
            },
          ]}
        />
      )}

      {/* ── Top bar ── */}
      <Header unreadCount={data?.unread_notifications_count} />

      <ScrollView
        contentContainerClassName="pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E8532E"
          />
        }
      >
        {/* ── Background Refresh Error Banner ── */}
        {refreshError && (
          <View className="mx-5 mt-3 bg-[#FDEEE9] dark:bg-rose-950/40 border border-[#E8532E]/30 px-4 py-2.5 rounded-2xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Feather name="alert-circle" size={14} color="#8A1F1A" />
              <Text className="text-[12px] text-[#8A1F1A] dark:text-rose-300 font-medium">
                Couldn't refresh your latest data.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => fetchData(true)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing dashboard"
              className="bg-[#E8532E]/10 dark:bg-rose-900/60 px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[11px] font-bold text-[#E8532E] dark:text-rose-200">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Offline Banner ── */}
        {isCachedData && (
          <View className="mx-5 mt-3 bg-[#FEF3C7] dark:bg-amber-950/40 border border-[#D97706]/30 px-4 py-2 rounded-xl flex-row items-center justify-center gap-2">
            <Feather name="wifi-off" size={13} color="#D97706" />
            <Text className="text-[12px] font-medium text-[#B45309] dark:text-amber-300">
              Offline • Showing last saved data
            </Text>
          </View>
        )}

        {/* ── Critical Health Alert Banner (Tap to re-open modal) ── */}
        {isAlertActive && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setAlertModalVisible(true)}
            className="mx-5 mt-3 bg-[#FBEAE9] dark:bg-rose-950/40 border border-[#8A1F1A]/30 rounded-2xl p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-[#8A1F1A]/10 dark:bg-rose-900/50 items-center justify-center flex-shrink-0">
              <Feather name="alert-triangle" size={20} color="#8A1F1A" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-[#8A1F1A] dark:text-rose-300 uppercase tracking-wider mb-0.5">
                Active Health Alert
              </Text>
              <Text className="text-[13px] text-[#152131] dark:text-white font-medium leading-snug" numberOfLines={2}>
                {data.latest_alert.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8A1F1A" />
          </TouchableOpacity>
        )}

        {/* ── Greeting ── */}
        <Reanimated.View entering={FadeIn.duration(240)} className="px-5 pt-3 pb-1">
          <Text className="text-2xl sm:text-3xl font-extrabold text-[#152131] dark:text-white tracking-tight leading-tight" numberOfLines={1} adjustsFontSizeToFit>
            {getGreeting(data?.user?.first_name || user?.first_name)}
          </Text>
          <Text className="text-[13px] text-[#5C6B66] dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })} • Today's Command Center
          </Text>
        </Reanimated.View>

        {/* ── Companion Coach Banner ── */}
        <Reanimated.View entering={FadeInDown.duration(240)} className="mx-5 mt-2.5">
          <View className="bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`w-2 h-2 rounded-full ${
                    companion?.tone === "caution"
                      ? "bg-amber-500"
                      : companion?.tone === "warning"
                      ? "bg-red-500"
                      : "bg-[#1B6E63]"
                  }`}
                />
                <Text className="text-[10px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
                  HeartLink Coach {companion?.source === "ai" ? "• AI Powered" : "• Daily Focus"}
                </Text>
              </View>
              <Text className="text-[10px] text-[#5C6B66] dark:text-slate-400 font-medium">
                Daily Guidance
              </Text>
            </View>
            <Text className="text-[13.5px] text-[#152131] dark:text-white font-medium leading-relaxed">
              {companion?.greeting || "Good to see you! Stay consistent with your vitals and heart-healthy habits today."}
            </Text>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. UNIFIED HERO CARD (SCORE + VITALS SIDE-BY-SIDE) */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(100).duration(260)} className="mx-5 mt-3 bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-[#DCE3DF]/70 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <View className="w-6 h-6 rounded-lg bg-[#1B6E63]/10 border border-[#1B6E63]/20 items-center justify-center">
                <Feather name="shield" size={12} color="#1B6E63" />
              </View>
              <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                Heart Health Status
              </Text>
            </View>
            <View
              className="flex-row items-center px-2.5 py-1 rounded-full gap-1.5"
              style={{ backgroundColor: theme.badgeBg }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
              <Text
                className="text-[11px] font-bold"
                style={{ color: theme.badgeText }}
              >
                {theme.label}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4">
            {/* Left: Compact Score Ring */}
            <View className="items-center justify-center">
              <Animated.View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pulseAnim }],
                }}
              >
                {isCritical && (
                  <Animated.View
                    style={{
                      position: "absolute",
                      width: 125,
                      height: 125,
                      borderRadius: 62.5,
                      backgroundColor: "rgba(138, 31, 26, 0.15)",
                      opacity: glowOpacity,
                    }}
                  />
                )}
                <ScoreRing score={hssScore} size={118} strokeWidth={9} />
              </Animated.View>
              <Text
                className="text-[10px] text-[#5C6B66] dark:text-slate-400 mt-1.5 font-medium tracking-tight text-center"
                numberOfLines={1}
              >
                {formatFreshness(data?.last_sync, isCachedData)}
              </Text>
            </View>

            {/* Right: Stacked Vitals Metrics */}
            <View className="flex-1 gap-2.5">
              {/* Heart Rate Chip */}
              <TouchableOpacity
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  data?.latest_vitals?.bpm
                    ? `Heart Rate: ${data.latest_vitals.bpm} BPM. Tap to view or log vitals.`
                    : "Heart Rate: Not recorded today. Tap to log vitals."
                }
                onPress={() => {
                  Haptics.selectionAsync();
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="bg-[#EDF1EF]/60 dark:bg-slate-900/60 rounded-xl p-2.5 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-7 h-7 rounded-lg bg-[#E8532E]/10 items-center justify-center">
                    <Feather name="heart" size={13} color="#E8532E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-[#5C6B66] dark:text-slate-400" numberOfLines={1}>Heart Rate</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[16px] font-extrabold text-[#152131] dark:text-white" numberOfLines={1}>
                        {data?.latest_vitals?.bpm || "--"}
                      </Text>
                      <Text className="text-[9px] font-bold text-[#5C6B66] dark:text-slate-400">BPM</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={13} color={isDark ? "#64748b" : "#8D9B96"} />
              </TouchableOpacity>

              {/* Blood Pressure Chip */}
              <TouchableOpacity
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  data?.latest_vitals?.bp
                    ? `Blood Pressure: ${data.latest_vitals.bp} mmHg. Tap to view or log vitals.`
                    : "Blood Pressure: Not recorded today. Tap to log vitals."
                }
                onPress={() => {
                  Haptics.selectionAsync();
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="bg-[#EDF1EF]/60 dark:bg-slate-900/60 rounded-xl p-2.5 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-7 h-7 rounded-lg bg-[#1B6E63]/10 items-center justify-center">
                    <Feather name="trending-up" size={13} color="#1B6E63" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-[#5C6B66] dark:text-slate-400" numberOfLines={1}>Blood Pressure</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[16px] font-extrabold text-[#152131] dark:text-white" numberOfLines={1}>
                        {data?.latest_vitals?.bp === "--/--" ? "--/--" : data?.latest_vitals?.bp || "--/--"}
                      </Text>
                      <Text className="text-[9px] font-bold text-[#5C6B66] dark:text-slate-400">mmHg</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={13} color={isDark ? "#64748b" : "#8D9B96"} />
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 2. 4-BUTTON HORIZONTAL QUICK ACTION STRIP */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(180).duration(260)} className="mx-5 mt-4">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <Text className="text-[14px] font-bold text-[#152131] dark:text-white">
              Daily Check-in
            </Text>
            <View className="px-2.5 py-0.5 rounded-full bg-[#152131]/5 dark:bg-white/10">
              <Text className="text-[11px] font-semibold text-[#5C6B66] dark:text-slate-300">
                {completedCount} of 4 logged
              </Text>
            </View>
          </View>
          
          <View className="flex-row justify-between items-center bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 py-3.5 px-2.5 shadow-xs">
            {/* Meals Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={mealsLogged ? "Meals logged today. Tap to open diary." : "Log meals"}
              onPress={() => {
                Haptics.selectionAsync();
                safeNavigate("/(home)/(meals)/daily-diary");
              }}
              className="items-center flex-1"
            >
              <View className="relative">
                <View className="w-12 h-12 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/20 items-center justify-center">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#D97706" />
                </View>
                {mealsLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1B6E63] border-2 border-white dark:border-[#1A2634] items-center justify-center">
                    <Feather name="check" size={9} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-bold text-[#152131] dark:text-white mt-1.5" numberOfLines={1}>
                Meals
              </Text>
            </TouchableOpacity>

            {/* Exercise Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={exerciseLogged ? "Exercise logged today. Tap to open diary." : "Log exercise"}
              onPress={() => {
                Haptics.selectionAsync();
                safeNavigate("/(home)/(health)/exercise-diary");
              }}
              className="items-center flex-1"
            >
              <View className="relative">
                <View className="w-12 h-12 rounded-2xl bg-[#1B6E63]/10 border border-[#1B6E63]/20 items-center justify-center">
                  <Feather name="activity" size={20} color="#1B6E63" />
                </View>
                {exerciseLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1B6E63] border-2 border-white dark:border-[#1A2634] items-center justify-center">
                    <Feather name="check" size={9} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-bold text-[#152131] dark:text-white mt-1.5" numberOfLines={1}>
                Exercise
              </Text>
            </TouchableOpacity>

            {/* Sleep Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={sleepLogged ? "Sleep logged today. Tap to open sleep log." : "Log sleep"}
              onPress={() => {
                Haptics.selectionAsync();
                safeNavigate("/(home)/(health)/log-sleep");
              }}
              className="items-center flex-1"
            >
              <View className="relative">
                <View className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 items-center justify-center">
                  <Feather name="moon" size={20} color="#4F46E5" />
                </View>
                {sleepLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1B6E63] border-2 border-white dark:border-[#1A2634] items-center justify-center">
                    <Feather name="check" size={9} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-bold text-[#152131] dark:text-white mt-1.5" numberOfLines={1}>
                Sleep
              </Text>
            </TouchableOpacity>

            {/* Symptoms Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={vitalsLogged ? "Symptoms logged today. Tap to open health log." : "Log symptoms and vitals"}
              onPress={() => {
                Haptics.selectionAsync();
                safeNavigate("/(home)/(health)/log-symptoms");
              }}
              className="items-center flex-1"
            >
              <View className="relative">
                <View className="w-12 h-12 rounded-2xl bg-[#E8532E]/10 border border-[#E8532E]/20 items-center justify-center">
                  <Feather name="heart" size={20} color="#E8532E" />
                </View>
                {vitalsLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1B6E63] border-2 border-white dark:border-[#1A2634] items-center justify-center">
                    <Feather name="check" size={9} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-bold text-[#152131] dark:text-white mt-1.5" numberOfLines={1}>
                Symptoms
              </Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 3. TODAY'S 3 HEART MISSIONS & TARGETS */}
        {/* ============================================================== */}
        {(data?.insight || data?.nutrition_budget || data?.today_activity) && (
          <Reanimated.View entering={FadeInDown.delay(240).duration(260)} className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-4 sm:p-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Feather name="check-circle" size={14} color="#1B6E63" />
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">
                  Today's 3 Heart Missions
                </Text>
              </View>
              <Text className="text-[11px] font-semibold text-[#5C6B66] dark:text-slate-400">
                AHA Daily Targets
              </Text>
            </View>

            {/* AI Insight banner */}
            {data?.insight && (
              <View className="bg-[#EDF1EF] dark:bg-slate-900/60 rounded-xl p-3 border border-[#DCE3DF] dark:border-slate-800 flex-row items-start gap-2.5 mb-3.5">
                <Feather
                  name={(data.insight.icon || "zap") as any}
                  size={15}
                  color={
                    data.insight.icon === "trending-down"
                      ? "#8A1F1A"
                      : data.insight.icon === "trending-up"
                      ? "#1B6E63"
                      : "#E8532E"
                  }
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 text-[12px] text-[#5C6B66] dark:text-slate-300 leading-relaxed font-medium">
                  <Text className="font-bold text-[#152131] dark:text-white">{data.insight?.title || ""}{" "}</Text>
                  {data.insight.body}
                </Text>
              </View>
            )}

            {/* 3 Core Heart Missions */}
            <View className="gap-3">
              {/* Mission 1: Blood Pressure Check */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="p-3 rounded-xl bg-[#EDF1EF]/70 dark:bg-slate-900/70 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                  <View
                    className={`w-7 h-7 rounded-lg items-center justify-center ${
                      data?.today_activity?.vitals_logged
                        ? "bg-emerald-100 dark:bg-emerald-950"
                        : "bg-amber-100 dark:bg-amber-950"
                    }`}
                  >
                    <Feather
                      name={data?.today_activity?.vitals_logged ? "check" : "alert-circle"}
                      size={14}
                      color={data?.today_activity?.vitals_logged ? "#1B6E63" : "#D97706"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] font-bold text-[#152131] dark:text-white">
                      1. Blood Pressure Check
                    </Text>
                    <Text className="text-[10.5px] text-[#5C6B66] dark:text-slate-400 font-medium" numberOfLines={1}>
                      {data?.today_activity?.vitals_logged
                        ? `Logged today (${data?.latest_vitals?.bp || "Recorded"} mmHg)`
                        : "Morning check due — Tap to record"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text
                    className={`text-[10px] font-bold ${
                      data?.today_activity?.vitals_logged ? "text-[#1B6E63]" : "text-[#D97706]"
                    }`}
                  >
                    {data?.today_activity?.vitals_logged ? "Done" : "Log Now"}
                  </Text>
                  <Feather name="chevron-right" size={13} color="#8D9B96" />
                </View>
              </TouchableOpacity>

              {/* Mission 2: Sodium Budget */}
              <View className="p-3 rounded-xl bg-[#EDF1EF]/70 dark:bg-slate-900/70 border border-[#DCE3DF] dark:border-slate-800">
                <View className="flex-row items-center justify-between mb-1.5 gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[12px] font-bold text-[#152131] dark:text-white">
                      2. Daily Salt / Sodium Budget
                    </Text>
                  </View>
                  <Text className="text-[11px] font-semibold text-[#5C6B66] dark:text-slate-400">
                    {data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0} /{" "}
                    {data?.nutrition_budget?.sodium?.limit_mg || 2000} mg
                  </Text>
                </View>
                <View className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        (((data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0) /
                          (data?.nutrition_budget?.sodium?.limit_mg || 2000)) *
                          100),
                        100
                      )}%`,
                      backgroundColor:
                        (data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0) >
                        (data?.nutrition_budget?.sodium?.limit_mg || 2000)
                          ? "#8A1F1A"
                          : "#1B6E63",
                    }}
                  />
                </View>
              </View>

              {/* Mission 3: Daily Movement */}
              <View className="p-3 rounded-xl bg-[#EDF1EF]/70 dark:bg-slate-900/70 border border-[#DCE3DF] dark:border-slate-800">
                <View className="flex-row items-center justify-between mb-1.5 gap-2">
                  <Text className="text-[12px] font-bold text-[#152131] dark:text-white">
                    3. Cardio Heart Movement
                  </Text>
                  <Text className="text-[11px] font-semibold text-[#5C6B66] dark:text-slate-400">
                    {movementMins} / {movementGoal} mins
                  </Text>
                </View>
                <View className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((movementMins / movementGoal) * 100, 100)}%`,
                      backgroundColor: movementMins >= movementGoal ? "#1B6E63" : "#E8532E",
                    }}
                  />
                </View>
              </View>
            </View>
          </Reanimated.View>
        )}

        {/* ── Evening Wrap-up Card (Shows after 7 PM) ── */}
        {new Date().getHours() >= 19 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => safeNavigate("/(home)/(tabs)/wrap-up")}
            className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-2xl p-4 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 items-center justify-center mr-3">
                <Feather name="moon" size={18} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">
                  Daily Heart Wrap-Up Ready
                </Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                  Reflect on your vitals, salt balance, and sleep habits for tonight.
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color="#5C6B66" />
          </TouchableOpacity>
        )}

        {isCritical ? (
          <View className="mt-6 mb-4">
            <View className="px-5 mb-2.5">
              <Text className="text-[13px] font-bold text-[#8A1F1A] uppercase tracking-wider">
                Prioritize Safety
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Need professional guidance. Find a cardiologist near you to discuss your risk level."
              onPress={() => safeNavigate("/locator")}
              className="mx-5 bg-[#FBEAE9] dark:bg-rose-950/40 rounded-2xl p-4 border border-[#8A1F1A]/30 flex-row items-center justify-between shadow-xs"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold text-[#8A1F1A] dark:text-rose-300 mb-0.5">
                  Need professional guidance?
                </Text>
                <Text className="text-[12px] text-[#5C6B66] dark:text-slate-300 leading-relaxed font-medium">
                  Find a cardiologist or emergency care near you to review your risk.
                </Text>
              </View>
              <View className="w-10 h-10 bg-[#8A1F1A]/15 border border-[#8A1F1A]/30 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#8A1F1A" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recommendations ── */}
            <View className="mt-6">
              <View className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[16px] font-bold text-[#152131] dark:text-white">
                  Recommended for You
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                directionalLockEnabled={true}
                contentContainerClassName="px-5 gap-3"
              >
                {data?.recommendations?.map((r: any, idx: number) => (
                  <RecommendationCard
                    key={idx}
                    tag={r.tag}
                    title={r.title}
                    subtitle={r.subtitle}
                    icon={r.icon}
                    bg={r.bg}
                    tagBg={r.tagBg}
                    tagText={r.tagText}
                    subColor={r.subColor}
                    onPress={() => {
                      if (r.type === "recipe") {
                        safeNavigate("/(home)/(meals)/recipe-details", { id: r.id });
                      } else if (r.type === "exercise") {
                        safeNavigate("/(home)/(health)/exercise-details", { id: r.id });
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Locator CTA ── */}
            <TouchableOpacity
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Find a healthcare facility. Locate clinics or healthcare providers near you."
              onPress={() => safeNavigate("/locator")}
              className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-2xl p-4 sm:p-5 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between shadow-xs"
            >
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-11 h-11 bg-[#E8532E]/10 border border-[#E8532E]/20 rounded-xl items-center justify-center mr-3.5">
                  <Feather name="map-pin" size={18} color="#E8532E" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-[#152131] dark:text-white mb-0.5">
                    Find a Healthcare Facility
                  </Text>
                  <Text className="text-[12px] text-[#5C6B66] dark:text-slate-400 font-medium leading-relaxed">
                    Locate certified cardiac specialists and emergency care.
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color="#5C6B66" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
