import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  BackHandler,
  Alert,
  AccessibilityInfo,
  Platform,
} from "react-native";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { getCompanionGreeting, CompanionGreetingResult } from "../../../services/companionService";

import Svg, { Path } from "react-native-svg";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { RecommendationCard } from "../../../components/dashboard/RecommendationCard";
import { CustomAlertModal } from "../../../components/dashboard/CustomAlertModal";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Reusable Tactile Spring Pressable Component ─────────────────────────────
// Delivers the physical, responsive weight of Apple Health and Strava card interactions
function TactileCard({
  onPress,
  children,
  className = "",
  style,
  activeScale = 0.978,
  accessible = true,
  accessibilityRole = "button",
  accessibilityLabel,
  disabled = false,
  hapticFeedback = true,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: any;
  activeScale?: number;
  accessible?: boolean;
  accessibilityRole?: any;
  accessibilityLabel?: string;
  disabled?: boolean;
  hapticFeedback?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]} className={className}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Mini Sparkline Component ─────────────────────────────────────────────────
function MiniSparkline({ color = "#1B6E63" }: { color?: string }) {
  return (
    <Svg width={38} height={14} viewBox="0 0 38 14" fill="none">
      <Path
        d="M1 9C5 9 8 12 12 10C16 8 20 4 25 5C29 6 33 2 37 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Score theme ──────────────────────────────────────────────────────────────
type ScoreTheme = {
  label: string;
  barColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
};

function getScoreTheme(score: number, isDark: boolean): ScoreTheme {
  if (!score || score === 0) {
    return {
      label: "Score unavailable",
      barColor: isDark ? "#64748B" : "#A3B1AC",
      badgeBg: isDark ? "rgba(100, 116, 139, 0.15)" : "#E2E8E5",
      badgeBorder: isDark ? "rgba(100, 116, 139, 0.3)" : "#CCD6D1",
      badgeText: isDark ? "#94A3B8" : "#5C6B66",
      dotColor: isDark ? "#94A3B8" : "#5C6B66",
    };
  }
  if (score >= 80)
    return {
      label: "Stable",
      barColor: "#1B6E63",
      badgeBg: isDark ? "rgba(27, 110, 99, 0.2)" : "#E2F1ED",
      badgeBorder: isDark ? "rgba(27, 110, 99, 0.35)" : "#C6E4DC",
      badgeText: isDark ? "#4FA79A" : "#1B6E63",
      dotColor: isDark ? "#4FA79A" : "#1B6E63",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: "#A9741B",
      badgeBg: isDark ? "rgba(169, 116, 27, 0.2)" : "#FEF3C7",
      badgeBorder: isDark ? "rgba(169, 116, 27, 0.35)" : "#FCE4A2",
      badgeText: isDark ? "#C99A3E" : "#A9741B",
      dotColor: isDark ? "#C99A3E" : "#A9741B",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      barColor: "#E8532E",
      badgeBg: isDark ? "rgba(232, 83, 46, 0.2)" : "#FDEEE9",
      badgeBorder: isDark ? "rgba(232, 83, 46, 0.35)" : "#F9D5CB",
      badgeText: isDark ? "#F0693E" : "#E8532E",
      dotColor: isDark ? "#F0693E" : "#E8532E",
    };
  return {
    label: "Critical",
    barColor: "#8A1F1A",
    badgeBg: isDark ? "rgba(138, 31, 26, 0.2)" : "#FBEAE9",
    badgeBorder: isDark ? "rgba(138, 31, 26, 0.35)" : "#F5C7C5",
    badgeText: isDark ? "#D15C4E" : "#8A1F1A",
    dotColor: isDark ? "#D15C4E" : "#8A1F1A",
  };
}

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeStr = "Good morning";
  if (hour >= 12 && hour < 17) timeStr = "Good afternoon";
  else if (hour >= 17) timeStr = "Good evening";
  return name ? `${timeStr}, ${name}` : timeStr;
}

// ─── Score Drivers Helper ───────────────────────────────────────────────────
function getScoreDrivers(data: any, hssScore: number): string {
  if (!hssScore || hssScore === 0) return "Awaiting inputs";
  const rawBp = typeof data?.latest_vitals?.bp === "string" ? data.latest_vitals.bp : "";
  const sodiumConsumed = data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0;
  const sodiumLimit = data?.nutrition_budget?.sodium?.limit_mg || 2000;

  if (hssScore >= 80) {
    if (rawBp && rawBp !== "--/--") return "Optimal BP";
    return "Optimal Vitals";
  }
  if (hssScore >= 60) {
    if (sodiumConsumed > sodiumLimit) return "High Sodium";
    if (rawBp && rawBp !== "--/--") return "Controlled BP";
    return "Moderate Rhythm";
  }
  if (hssScore >= 50) {
    if (rawBp && rawBp !== "--/--") return "Elevated BP";
    return "Elevated Risk";
  }
  return "Rest Advised";
}

function cleanCoachMessage(text?: string): string {
  if (!text) return "Stay consistent with your vitals and heart-healthy habits today.";
  const cleaned = text.replace(/^(Good (morning|afternoon|evening)[^!.]*[!.])\s*/i, "").trim();
  return cleaned || "Stay consistent with your vitals and heart-healthy habits today.";
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
  const { userId, token, user, logout } = useUser();

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

  const dataRef = useRef(data);
  dataRef.current = data;

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
      if (!silent && !dataRef.current) setIsLoading(true);
      setError(false);
      setRefreshError(false);
      const cacheKey = `@dashboard_cache_${userId}`;

      // 10-second timeout controller prevents infinite UI hang if socket/network stalls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const response = await fetch(`${base_url}/api/dashboard/me`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

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
        clearTimeout(timeoutId);
        console.error("Dashboard fetch error:", err);
        if (dataRef.current) {
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
    [userId, token, logout]
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
  const streakDays = typeof data?.streak?.current_streak === "number" ? data.streak.current_streak : 0;

  useEffect(() => {
    if (data) {
      const firstName = data?.user?.first_name || user?.first_name || "";
      const rawBp = typeof data?.latest_vitals?.bp === "string" ? data.latest_vitals.bp : "";
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

      getCompanionGreeting(firstName, activityContext, hssContext, userId || undefined).then(setCompanion);
    }
  }, [data, user?.first_name, movementMins, hssScore, theme.label, userId]);

  // Reset in-memory data when userId changes to prevent cross-account display leaks
  useEffect(() => {
    setData(null);
  }, [userId]);

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
  const dismissedAlertsKey = userId ? `@dismissed_alert_ids_${userId}` : "@dismissed_alert_ids_guest";

  useEffect(() => {
    AsyncStorage.getItem(dismissedAlertsKey).then((res) => {
      if (res) {
        try {
          setDismissedAlertIds(JSON.parse(res));
        } catch { }
      }
    });
  }, [dismissedAlertsKey]);

  const handleDismissAlert = async (alertId?: string) => {
    setAlertModalVisible(false);
    if (!alertId) return;
    if (!dismissedAlertIds.includes(alertId)) {
      const updated = [...dismissedAlertIds, alertId];
      setDismissedAlertIds(updated);
      await AsyncStorage.setItem(dismissedAlertsKey, JSON.stringify(updated));
    }
  };

  // Auto-show alert modal ONLY if it hasn't been dismissed by the user yet
  useEffect(() => {
    const alertId = data?.latest_alert?.id;
    if (alertId && !isLoading && !dismissedAlertIds.includes(alertId)) {
      setAlertModalVisible(true);
    }
  }, [data?.latest_alert?.id, isLoading, dismissedAlertIds]);

  // Clean Android BackHandler on the primary Dashboard tab
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          "Exit HeartLink?",
          "Are you sure you want to close the app?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // Common card shadow styling for subtle depth
  const cardShadowStyle = {
    shadowColor: isDark ? "#000000" : "#10231F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  };

  if (isLoading && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-[#EDF1EF] dark:bg-[#101923]">
        <Header />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        >
          {/* Greeting + Coach Skeleton */}
          <View className="mb-3.5">
            <View className="flex-row items-baseline justify-between mb-2">
              <Skeleton className="w-48 h-7 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-20 h-4 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
            <Skeleton className="w-full h-11 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
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
                <Skeleton className="w-24 h-4 rounded-md mt-2 bg-[#DCE3DF] dark:bg-slate-800" />
              </View>
              {/* Right Stacked Vitals Chips */}
              <View className="flex-1 gap-2.5">
                <Skeleton className="w-full h-14 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
                <Skeleton className="w-full h-14 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
              </View>
            </View>
          </View>

          {/* 4-Mission Habit Cards Skeleton */}
          <View className="bg-white dark:bg-[#1A2634] rounded-2xl border border-[#DCE3DF] dark:border-slate-800 p-4 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-[#DCE3DF]/60 dark:border-slate-800">
              <Skeleton className="w-44 h-4 rounded-md bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-24 h-5 rounded-full bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
            <View className="gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-full h-16 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
              ))}
            </View>
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
            <TactileCard
              onPress={() => fetchData(false)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try again to load dashboard"
              className="bg-[#E8532E] px-6 py-3 rounded-xl flex-row items-center gap-2 shadow-xs"
            >
              <Feather name="refresh-cw" size={14} color="#ffffff" />
              <Text className="text-white font-bold text-[14px]">Try again</Text>
            </TactileCard>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const isAlertActive = !!data?.latest_alert;

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
          onClose={() => handleDismissAlert(data?.latest_alert?.id)}
          title="Health Alert"
          message={
            data?.latest_alert?.message ||
            "Your recent metrics suggest you should consider consulting a healthcare facility."
          }
          icon="alert-triangle"
          iconBg="#FBEAE9"
          iconColor="#8A1F1A"
          actions={[
            {
              label: "Find a healthcare facility",
              onPress: () => {
                handleDismissAlert(data?.latest_alert?.id);
                safeNavigate("/locator");
              },
              primary: true,
            },
            {
              label: "Dismiss",
              onPress: () => handleDismissAlert(data?.latest_alert?.id),
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
          <View className="mx-5 mt-3 bg-[#FDEEE9] dark:bg-[#8A1F1A]/25 border border-[#E8532E]/30 px-4 py-2.5 rounded-2xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Feather name="alert-circle" size={14} color="#8A1F1A" />
              <Text className="text-[12px] text-[#8A1F1A] dark:text-[#E0958B] font-medium">
                Couldn't refresh your latest data.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => fetchData(true)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing dashboard"
              className="bg-[#E8532E]/10 dark:bg-[#8A1F1A]/35 px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[11px] font-bold text-[#E8532E] dark:text-[#F2CFC9]">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Offline Banner ── */}
        {isCachedData && (
          <View className="mx-5 mt-3 bg-[#FEF3C7] dark:bg-[#A9741B]/40 border border-[#A9741B]/30 px-4 py-2 rounded-xl flex-row items-center justify-center gap-2">
            <Feather name="wifi-off" size={13} color="#A9741B" />
            <Text className="text-[12px] font-medium text-[#7A5714] dark:text-[#C99A3E]">
              Offline • Showing last saved data
            </Text>
          </View>
        )}

        {/* ── Critical Health Alert Banner (Tap to re-open modal) ── */}
        {isAlertActive && (
          <TactileCard
            onPress={() => setAlertModalVisible(true)}
            className="mx-5 mt-3 bg-[#FBEAE9] dark:bg-[#8A1F1A]/25 border border-[#8A1F1A]/30 rounded-2xl p-4 flex-row items-center gap-3"
            style={cardShadowStyle}
          >
            <View className="w-10 h-10 rounded-xl bg-[#8A1F1A]/10 dark:bg-[#8A1F1A]/25 items-center justify-center flex-shrink-0">
              <Feather name="alert-triangle" size={20} color="#8A1F1A" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-[#8A1F1A] dark:text-[#E0958B] uppercase tracking-wider mb-0.5">
                Active Health Alert
              </Text>
              <Text className="text-[13px] text-[#152131] dark:text-white font-medium leading-snug" numberOfLines={2}>
                {data?.latest_alert?.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8A1F1A" />
          </TactileCard>
        )}

        {/* ── Streamlined Greeting & Tactile Coach Pill ── */}
        <Reanimated.View entering={FadeIn.duration(240)} className="px-5 pt-2 pb-0.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-2xl sm:text-3xl font-extrabold text-[#152131] dark:text-white tracking-tight leading-tight flex-1 mr-2" numberOfLines={1} adjustsFontSizeToFit>
              {getGreeting(data?.user?.first_name || user?.first_name)}
            </Text>
            <View className="px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-800/80 border border-[#DCE3DF] dark:border-slate-700/60 shadow-xs">
              <Text className="text-[11px] text-[#5C6B66] dark:text-slate-300 font-bold uppercase tracking-wider">
                {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </Text>
            </View>
          </View>

          {/* Compact Inline Coach Guidance */}
          <View className="mt-2.5 bg-white dark:bg-[#1A2634] rounded-xl border border-[#DCE3DF] dark:border-slate-800/80 py-2.5 px-3.5 flex-row items-center gap-2.5 shadow-xs">
            <View
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${companion?.tone === "caution"
                  ? "bg-[#A9741B]"
                  : companion?.tone === "warning"
                    ? "bg-[#8A1F1A]"
                    : "bg-[#1B6E63]"
                }`}
            />
            <Text className="text-[12.5px] text-[#152131] dark:text-slate-200 font-medium leading-snug flex-1" numberOfLines={2}>
              {cleanCoachMessage(companion?.greeting)}
            </Text>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. UNIFIED HERO CARD (SCORE + VITALS SIDE-BY-SIDE) */}
        {/* ============================================================== */}
        <Reanimated.View
          entering={FadeInDown.delay(100).duration(260)}
          className="mx-5 mt-3.5 bg-white dark:bg-[#1A2634] rounded-3xl border border-[#DCE3DF] dark:border-slate-800/80 p-4 sm:p-5"
          style={cardShadowStyle}
        >
          {/* Card Header & Status Tier Badge */}
          <View className="flex-row items-center justify-between mb-3.5 pb-3 border-b border-[#DCE3DF]/70 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <View className="w-6 h-6 rounded-lg bg-[#1B6E63]/10 border border-[#1B6E63]/20 items-center justify-center">
                <Feather name="shield" size={12} color="#1B6E63" />
              </View>
              <Text className="text-[13px] font-bold text-[#152131] dark:text-white tracking-tight">
                Heart Health Status
              </Text>
            </View>
            <View
              className="flex-row items-center px-2.5 py-1 rounded-full gap-1.5 border"
              style={{ backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }}
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
              <View className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#152131]/5 dark:bg-white/10 self-center">
                <Text className="text-[11px] font-bold text-[#1B6E63] dark:text-teal-400 text-center" numberOfLines={1}>
                  {getScoreDrivers(data, hssScore)}
                </Text>
              </View>
              <Text
                className="text-[10.5px] text-[#5C6B66] dark:text-slate-400 mt-1 font-medium tracking-tight text-center"
                numberOfLines={1}
              >
                {formatFreshness(data?.last_sync, isCachedData)}
              </Text>
            </View>

            {/* Right: Stacked Vitals Metrics */}
            <View className="flex-1 gap-2.5">
              {/* Heart Rate Chip */}
              <TactileCard
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  data?.latest_vitals?.bpm
                    ? `Heart Rate: ${data.latest_vitals.bpm} BPM. Tap to view or log vitals.`
                    : "Heart Rate: Not recorded today. Tap to log vitals."
                }
                onPress={() => {
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="bg-[#EDF1EF]/60 dark:bg-slate-900/60 rounded-2xl p-2.5 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-8 h-8 rounded-xl bg-[#E8532E]/10 items-center justify-center border border-[#E8532E]/20">
                    <Feather name="heart" size={14} color="#E8532E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10.5px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider" numberOfLines={1}>
                      Heart Rate
                    </Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[17px] font-extrabold text-[#152131] dark:text-white" numberOfLines={1}>
                        {data?.latest_vitals?.bpm || "--"}
                      </Text>
                      <Text className="text-[10px] font-bold text-[#5C6B66] dark:text-slate-400">BPM</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={13} color={isDark ? "#64748b" : "#8D9B96"} />
              </TactileCard>

              {/* Blood Pressure Chip */}
              <TactileCard
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  data?.latest_vitals?.bp
                    ? `Blood Pressure: ${data.latest_vitals.bp} mmHg. Tap to view or log vitals.`
                    : "Blood Pressure: Not recorded today. Tap to log vitals."
                }
                onPress={() => {
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="bg-[#EDF1EF]/60 dark:bg-slate-900/60 rounded-2xl p-2.5 border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2.5 flex-1">
                  <View className="w-8 h-8 rounded-xl bg-[#1B6E63]/10 items-center justify-center border border-[#1B6E63]/20">
                    <Feather name="trending-up" size={14} color="#1B6E63" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between pr-1">
                      <Text className="text-[10.5px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider" numberOfLines={1}>
                        Blood Pressure
                      </Text>
                      {data?.latest_vitals?.bp && data?.latest_vitals?.bp !== "--/--" && (
                        <MiniSparkline color={isDark ? "#4FA79A" : "#1B6E63"} />
                      )}
                    </View>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[17px] font-extrabold text-[#152131] dark:text-white" numberOfLines={1}>
                        {data?.latest_vitals?.bp === "--/--" ? "--/--" : data?.latest_vitals?.bp || "--/--"}
                      </Text>
                      <Text className="text-[10px] font-bold text-[#5C6B66] dark:text-slate-400">mmHg</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={13} color={isDark ? "#64748b" : "#8D9B96"} />
              </TactileCard>
            </View>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 2. TODAY'S 4 HEART MISSIONS & HABIT CENTER (UNIFIED HUB) */}
        {/* ============================================================== */}
        <Reanimated.View
          entering={FadeInDown.delay(180).duration(260)}
          className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-3xl border border-[#DCE3DF] dark:border-slate-800/80 p-4 sm:p-5"
          style={cardShadowStyle}
        >
          {/* Header & Adherence Counter */}
          <View className="mb-3.5 pb-3 border-b border-[#DCE3DF]/70 dark:border-slate-800">
            {/* Top Row: Title and Done Counter */}
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-2">
                <View className="w-6 h-6 rounded-lg bg-[#1B6E63]/10 border border-[#1B6E63]/20 items-center justify-center">
                  <Feather name="check-circle" size={13} color="#1B6E63" />
                </View>
                <Text className="text-[13.5px] font-bold text-[#152131] dark:text-white tracking-tight">
                  Today's Heart Missions
                </Text>
              </View>
              <View className="px-2.5 py-0.5 rounded-full bg-[#1B6E63]/10 dark:bg-[#1B6E63]/25 border border-[#1B6E63]/20">
                <Text className="text-[11px] font-bold text-[#1B6E63] dark:text-[#4FA79A]">
                  {completedCount} of 4 Done
                </Text>
              </View>
            </View>

            {/* Bottom Row: Habit Streak Badge & Remaining Indicator */}
            <View className="flex-row items-center justify-between mt-1">
              <View className="px-2 py-0.5 rounded-full bg-[#A9741B]/10 dark:bg-[#A9741B]/60 border border-[#A9741B]/20">
                <Text className="text-[10px] font-bold text-[#7A5714] dark:text-[#C99A3E]">
                  {streakDays > 0 ? `🔥 ${streakDays}-Day Habit Streak` : "🌱 Day 1 Habit Streak"}
                </Text>
              </View>
              <Text className="text-[10.5px] font-medium text-[#5C6B66] dark:text-slate-400">
                {completedCount === 4 ? "All habits protected today! 🎉" : `${4 - completedCount} remaining today`}
              </Text>
            </View>
          </View>

          {/* AI / Clinical Insight banner */}
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

          {/* 4 Interactive Mission Habit Cards */}
          <View className="gap-2.5">
            {/* Mission 1: Blood Pressure & Pulse Check */}
            <TactileCard
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={vitalsLogged ? "Blood pressure logged today. Tap to view or log again." : "Log morning blood pressure."}
              onPress={() => {
                safeNavigate("/(home)/(health)/log-symptoms");
              }}
              className={`p-3 rounded-2xl border flex-row items-center justify-between ${vitalsLogged
                  ? "bg-[#EDF1EF]/60 dark:bg-slate-900/50 border-[#DCE3DF] dark:border-slate-800"
                  : "bg-[#A9741B]/5 dark:bg-[#A9741B]/20 border-[#A9741B]/30"
                }`}
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${vitalsLogged ? "bg-[#1B6E63]/10 dark:bg-[#1B6E63]/25" : "bg-[#A9741B]/15 dark:bg-[#A9741B]/70"
                  }`}>
                  <Feather name="heart" size={17} color={vitalsLogged ? "#1B6E63" : "#A9741B"} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className="text-[12.5px] font-bold text-[#152131] dark:text-white">
                      1. Blood Pressure & Pulse
                    </Text>
                    {new Date().getHours() < 12 && !vitalsLogged && (
                      <View className="px-1.5 py-0.5 rounded bg-[#A9741B]/20">
                        <Text className="text-[9px] font-bold text-[#7A5714] dark:text-[#C99A3E] uppercase">Morning Anchor</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 font-medium mt-0.5" numberOfLines={2}>
                    {vitalsLogged
                      ? `Recorded: ${data?.latest_vitals?.bp || "--/--"} mmHg • ${data?.latest_vitals?.bpm || "--"} BPM`
                      : "Morning check due today"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                {vitalsLogged ? (
                  <View className="w-5 h-5 rounded-full bg-[#1B6E63] items-center justify-center">
                    <Feather name="check" size={11} color="#ffffff" />
                  </View>
                ) : (
                  <View className="px-2 py-1 rounded-lg bg-[#A9741B]/15">
                    <Text className="text-[10.5px] font-bold text-[#A9741B]">Log Now</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={13} color="#8D9B96" />
              </View>
            </TactileCard>

            {/* Mission 2: DOST-FNRI Salt & Sodium Budget */}
            <View className="p-3 rounded-2xl border bg-[#EDF1EF]/60 dark:bg-slate-900/50 border-[#DCE3DF] dark:border-slate-800">
              <TactileCard
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={mealsLogged ? "Meals logged today. Tap to open food diary." : "Log meals and salt intake."}
                onPress={() => {
                  safeNavigate("/(home)/(meals)/daily-diary");
                }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-9 h-9 rounded-xl bg-[#A9741B]/10 dark:bg-[#A9741B]/70 items-center justify-center">
                      <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#A9741B" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-[12.5px] font-bold text-[#152131] dark:text-white">
                          2. Sodium Budget
                        </Text>
                        {new Date().getHours() >= 12 && new Date().getHours() < 17 && (
                          <View className="px-1.5 py-0.5 rounded bg-[#A9741B]/20">
                            <Text className="text-[9px] font-bold text-[#7A5714] dark:text-[#C99A3E] uppercase">Midday Focus</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 font-medium mt-0.5" numberOfLines={2}>
                        {mealsLogged
                          ? `${data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0} mg used • ${Math.max(0, (data?.nutrition_budget?.sodium?.limit_mg || 2000) - (data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0))} mg left`
                          : "0 of 2,000 mg logged today"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {mealsLogged && (
                      <View className="w-5 h-5 rounded-full bg-[#1B6E63] items-center justify-center">
                        <Feather name="check" size={11} color="#ffffff" />
                      </View>
                    )}
                    <Feather name="chevron-right" size={13} color="#8D9B96" />
                  </View>
                </View>
                {/* Progress bar */}
                <View className="h-2.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden mt-1 border border-[#DCE3DF]/50 dark:border-slate-700/50">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (((data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0) /
                            Math.max(1, data?.nutrition_budget?.sodium?.limit_mg || 2000)) *
                            100)
                        )
                      )}%`,
                      backgroundColor:
                        (data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0) >
                          (data?.nutrition_budget?.sodium?.limit_mg || 2000)
                          ? "#8A1F1A"
                          : "#1B6E63",
                    }}
                  />
                </View>
              </TactileCard>

              {/* Quick-Add Filipino Staples */}
              <View className="flex-row items-center gap-1.5 mt-2.5 pt-2 border-t border-[#DCE3DF]/60 dark:border-slate-800 flex-wrap">
                <Text className="text-[10px] font-semibold text-[#5C6B66] dark:text-slate-400 mr-0.5">Quick Log:</Text>
                {[
                  { name: "Sinigang", est: "480mg" },
                  { name: "Tinola", est: "390mg" },
                  { name: "Rice", est: "5mg" },
                ].map((item) => (
                  <TactileCard
                    key={item.name}
                    onPress={() => {
                      safeNavigate("/(home)/(meals)/estimate-meal", { quick_dish: item.name });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800/90 border border-[#DCE3DF] dark:border-slate-700 flex-row items-center gap-1 shadow-2xs"
                  >
                    <Feather name="plus" size={10} color="#1B6E63" />
                    <Text className="text-[10.5px] font-semibold text-[#152131] dark:text-slate-200">
                      {item.name}
                    </Text>
                  </TactileCard>
                ))}
              </View>
            </View>

            {/* Mission 3: Cardio Heart Movement */}
            <TactileCard
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={exerciseLogged ? "Exercise logged today. Tap to open exercise diary." : "Log cardio exercise."}
              onPress={() => {
                safeNavigate("/(home)/(health)/exercise-diary");
              }}
              className="p-3 rounded-2xl border bg-[#EDF1EF]/60 dark:bg-slate-900/50 border-[#DCE3DF] dark:border-slate-800"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="w-9 h-9 rounded-xl bg-[#1B6E63]/10 dark:bg-[#1B6E63]/25 items-center justify-center">
                    <Feather name="activity" size={18} color="#1B6E63" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12.5px] font-bold text-[#152131] dark:text-white">
                      3. Cardio Heart Movement
                    </Text>
                    <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 font-medium mt-0.5" numberOfLines={1}>
                      {movementMins} of {movementGoal} mins completed today
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  {exerciseLogged && (
                    <View className="w-5 h-5 rounded-full bg-[#1B6E63] items-center justify-center">
                      <Feather name="check" size={11} color="#ffffff" />
                    </View>
                  )}
                  <Feather name="chevron-right" size={13} color="#8D9B96" />
                </View>
              </View>
              {/* Progress bar */}
              <View className="h-2.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden mt-1 border border-[#DCE3DF]/50 dark:border-slate-700/50">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (movementMins / Math.max(1, movementGoal)) * 100)
                    )}%`,
                    backgroundColor: movementMins >= movementGoal ? "#1B6E63" : "#E8532E",
                  }}
                />
              </View>
            </TactileCard>

            {/* Mission 4: Rest & Circadian Sleep */}
            <TactileCard
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={sleepLogged ? "Sleep logged today. Tap to open sleep log." : "Log sleep duration."}
              onPress={() => {
                safeNavigate("/(home)/(health)/log-sleep");
              }}
              className="p-3 rounded-2xl border bg-[#EDF1EF]/60 dark:bg-slate-900/50 border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="w-9 h-9 rounded-xl bg-[#46516B]/10 dark:bg-[#46516B]/25 items-center justify-center">
                  <Feather name="moon" size={18} color="#46516B" />
                </View>
                <View className="flex-1">
                  <Text className="text-[12.5px] font-bold text-[#152131] dark:text-white">
                    4. Rest & Circadian Sleep
                  </Text>
                  <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 font-medium mt-0.5" numberOfLines={2}>
                    {sleepLogged
                      ? `${typeof data?.today_activity?.total_sleep_hours === "number" ? data.today_activity.total_sleep_hours : "Recorded"} hrs logged • Restful recovery`
                      : "Target: 7–9 hrs of restful recovery"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                {sleepLogged ? (
                  <View className="w-5 h-5 rounded-full bg-[#1B6E63] items-center justify-center">
                    <Feather name="check" size={11} color="#ffffff" />
                  </View>
                ) : (
                  <View className="px-2 py-1 rounded-lg bg-[#46516B]/10">
                    <Text className="text-[10.5px] font-bold text-[#46516B]">Log Sleep</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={13} color="#8D9B96" />
              </View>
            </TactileCard>

            {/* Completion Celebration Banner */}
            {completedCount === 4 && (
              <View className="p-3.5 rounded-2xl bg-[#1B6E63]/10 dark:bg-[#1B6E63]/25 border border-[#1B6E63]/25 flex-row items-center gap-3 mt-1 shadow-xs">
                <View className="w-8 h-8 rounded-full bg-[#1B6E63] items-center justify-center shadow-xs">
                  <Feather name="award" size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[12.5px] font-bold text-[#1B6E63] dark:text-[#4FA79A]">
                    All 4 daily heart habits protected today!
                  </Text>
                  <Text className="text-[10.5px] text-[#152131]/80 dark:text-slate-300 font-medium mt-0.5">
                    Your cardiovascular stability index is fully fortified for the day.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Reanimated.View>

        {/* ── Clinical Consultation & Daily Wrap-Up Card (Accessible 24/7) ── */}
        <TactileCard
          onPress={() => safeNavigate("/(home)/(tabs)/wrap-up")}
          className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-3xl p-4 border border-[#DCE3DF] dark:border-slate-800/80 flex-row items-center justify-between"
          style={cardShadowStyle}
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-10 h-10 rounded-xl bg-[#1E5642]/10 dark:bg-[#1E5642]/20 items-center justify-center mr-3">
              <Feather name={new Date().getHours() >= 19 ? "moon" : "clipboard"} size={18} color="#1E5642" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-[#152131] dark:text-white">
                {new Date().getHours() >= 19 ? "Daily Heart Wrap-Up Ready" : "Doctor Consultation & Daily Summary"}
              </Text>
              <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                {new Date().getHours() >= 19
                  ? "Reflect on your vitals, salt balance, and sleep habits for tonight."
                  : "View and present your logged meals, exercise, and vitals summary for clinic visits."}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color="#5C6B66" />
        </TactileCard>

        {isCritical ? (
          <View
            className="mx-5 mt-5 mb-4 bg-[#FBEAE9] dark:bg-[#8A1F1A]/25 rounded-3xl p-4 sm:p-5 border border-[#8A1F1A]/35"
            style={cardShadowStyle}
          >
            <View className="flex-row items-center gap-2 mb-2 pb-2 border-b border-[#8A1F1A]/20">
              <Feather name="shield" size={16} color="#8A1F1A" />
              <Text className="text-[13px] font-bold text-[#8A1F1A] dark:text-[#E0958B] uppercase tracking-wider">
                Calm Clinical Guidance • Take a Breather
              </Text>
            </View>
            <Text className="text-[14px] font-bold text-[#152131] dark:text-white mb-1">
              Elevated indicators detected. Please don't worry.
            </Text>
            <Text className="text-[12px] text-[#5C6B66] dark:text-slate-300 leading-relaxed font-medium mb-3">
              A single high reading can be caused by temporary stress, exertion, or caffeine. Follow these steps:
            </Text>
            <View className="bg-white/80 dark:bg-slate-900/70 rounded-2xl p-3.5 mb-3.5 gap-2.5 border border-[#8A1F1A]/15 shadow-2xs">
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-[#8A1F1A]/15 items-center justify-center">
                  <Text className="text-[10px] font-bold text-[#8A1F1A]">1</Text>
                </View>
                <Text className="text-[12px] text-[#152131] dark:text-slate-200 font-medium flex-1">
                  Sit comfortably with your back supported and feet flat.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-[#8A1F1A]/15 items-center justify-center">
                  <Text className="text-[10px] font-bold text-[#8A1F1A]">2</Text>
                </View>
                <Text className="text-[12px] text-[#152131] dark:text-slate-200 font-medium flex-1">
                  Rest quietly for 5 minutes without talking or using screens.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-[#8A1F1A]/15 items-center justify-center">
                  <Text className="text-[10px] font-bold text-[#8A1F1A]">3</Text>
                </View>
                <Text className="text-[12px] text-[#152131] dark:text-slate-200 font-medium flex-1">
                  Take a second blood pressure measurement.
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2.5">
              <TactileCard
                onPress={() => {
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="flex-1 bg-[#1B6E63] py-3 px-3 rounded-xl items-center justify-center shadow-xs"
              >
                <Text className="text-white text-[12.5px] font-bold">Re-test Vitals</Text>
              </TactileCard>
              <TactileCard
                onPress={() => {
                  safeNavigate("/locator");
                }}
                className="flex-1 bg-[#8A1F1A] py-3 px-3 rounded-xl items-center justify-center flex-row gap-1.5 shadow-xs"
              >
                <Feather name="map-pin" size={13} color="#ffffff" />
                <Text className="text-white text-[12.5px] font-bold">Find Nearby Clinic</Text>
              </TactileCard>
            </View>
          </View>
        ) : (
          <>
            {/* ── Recommendations ── */}
            <View className="mt-6">
              <View className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[16px] font-bold text-[#152131] dark:text-white tracking-tight">
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
            <TactileCard
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Find a healthcare facility. Locate clinics or healthcare providers near you."
              onPress={() => safeNavigate("/locator")}
              className="mx-5 mt-4 bg-white dark:bg-[#1A2634] rounded-3xl p-4 sm:p-5 border border-[#DCE3DF] dark:border-slate-800/80 flex-row items-center justify-between"
              style={cardShadowStyle}
            >
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-11 h-11 bg-[#E8532E]/10 border border-[#E8532E]/20 rounded-2xl items-center justify-center mr-3.5">
                  <Feather name="map-pin" size={18} color="#E8532E" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-[#152131] dark:text-white mb-0.5 tracking-tight">
                    Find a Healthcare Facility
                  </Text>
                  <Text className="text-[12px] text-[#5C6B66] dark:text-slate-400 font-medium leading-relaxed">
                    Locate certified cardiac specialists and emergency care.
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color="#5C6B66" />
            </TactileCard>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}