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
      barColor: "#94a3b8",
      badgeBg: isDark ? "rgba(148, 163, 184, 0.15)" : "#f1f5f9",
      badgeText: isDark ? "#94a3b8" : "#64748b",
      dotColor: "#94a3b8",
    };
  }
  if (score >= 80)
    return {
      label: "Stable",
      barColor: "#10B981",
      badgeBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
      badgeText: isDark ? "#34D399" : "#047857",
      dotColor: isDark ? "#34D399" : "#10B981",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: "#EAB308",
      badgeBg: isDark ? "rgba(234, 179, 8, 0.15)" : "#FEFCE8",
      badgeText: isDark ? "#FACC15" : "#A16207",
      dotColor: isDark ? "#FACC15" : "#EAB308",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      barColor: "#F97316",
      badgeBg: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFF7ED",
      badgeText: isDark ? "#FB923C" : "#C2410C",
      dotColor: isDark ? "#FB923C" : "#F97316",
    };
  return {
    label: "Critical",
    barColor: "#EF4444",
    badgeBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
    badgeText: isDark ? "#F87171" : "#B91C1C",
    dotColor: isDark ? "#F87171" : "#EF4444",
  };
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
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-background">
        <Header />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        >
          {/* Greeting Skeleton */}
          <View className="mb-3.5">
            <Skeleton className="w-52 h-7 mb-1.5 rounded-xl" />
            <Skeleton className="w-36 h-3.5 rounded-lg" />
          </View>

          {/* Unified Side-by-Side Hero Card Skeleton */}
          <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-border/50">
              <Skeleton className="w-36 h-4 rounded-md" />
              <Skeleton className="w-16 h-4 rounded-full" />
            </View>
            <View className="flex-row items-center gap-4">
              {/* Left Circle Ring */}
              <View className="items-center justify-center">
                <Skeleton className="w-28 h-28 rounded-full" />
                <Skeleton className="w-20 h-2.5 rounded-md mt-2" />
              </View>
              {/* Right Stacked Vitals Chips */}
              <View className="flex-1 gap-2">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
              </View>
            </View>
          </View>

          {/* 4-Button Horizontal Action Strip Skeleton */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2.5 px-1">
              <Skeleton className="w-24 h-4 rounded-md" />
              <Skeleton className="w-20 h-3 rounded-md" />
            </View>
            <View className="flex-row justify-between items-center bg-card rounded-2xl border border-border py-3 px-2.5 shadow-sm">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="items-center flex-1">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <Skeleton className="w-10 h-2.5 rounded-md mt-1.5" />
                </View>
              ))}
            </View>
          </View>

          {/* Minimalist Summary Card Skeleton */}
          <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
            <Skeleton className="w-32 h-4 rounded-md mb-3" />
            <Skeleton className="w-full h-14 rounded-xl mb-3" />
            <Skeleton className="w-full h-5 rounded-md mb-2.5" />
            <Skeleton className="w-full h-5 rounded-md" />
          </View>

          {/* Recommendations Skeleton */}
          <View className="mt-2">
            <Skeleton className="w-36 h-4 rounded-md mb-3" />
            <View className="flex-row gap-3">
              <Skeleton className="w-48 h-28 rounded-2xl" />
              <Skeleton className="w-48 h-28 rounded-2xl" />
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (error && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-background">
        <Header />
        <View className="flex-1 justify-center items-center px-5">
          <View className="bg-card rounded-2xl border border-border p-8 items-center w-full max-w-sm shadow-md">
            <View className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 items-center justify-center mb-4">
              <Feather name="wifi-off" size={24} color="#ef4444" />
            </View>
            <Text className="text-[18px] font-bold text-foreground mb-1 text-center">
              Unable to load dashboard
            </Text>
            <Text className="text-[13px] text-muted-foreground text-center mb-6 leading-relaxed">
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={() => fetchData(false)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try again to load dashboard"
              className="bg-primary px-6 py-3 rounded-xl flex-row items-center gap-2"
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
      safeAreaClassName="flex-1 bg-background"
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
          iconBg="#fcebeb"
          iconColor="#e24b4a"
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
            tintColor="#0f172a"
          />
        }
      >
        {/* ── Background Refresh Error Banner ── */}
        {refreshError && (
          <View className="mx-5 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-4 py-2.5 rounded-2xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Feather name="alert-circle" size={14} color="#e11d48" />
              <Text className="text-[12px] text-rose-800 dark:text-rose-300 font-medium">
                Couldn't refresh your latest data.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => fetchData(true)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing dashboard"
              className="bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[11px] font-semibold text-rose-700 dark:text-rose-200">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Offline Banner ── */}
        {isCachedData && (
          <View className="mx-5 mt-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-4 py-2 rounded-xl flex-row items-center justify-center gap-2">
            <Feather name="wifi-off" size={13} color={isDark ? "#fbbf24" : "#b45309"} />
            <Text className="text-[12px] font-medium text-amber-800 dark:text-amber-300">
              Offline • Showing last saved data
            </Text>
          </View>
        )}

        {/* ── Critical Health Alert Banner (Tap to re-open modal) ── */}
        {isAlertActive && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setAlertModalVisible(true)}
            className="mx-5 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex-row items-center gap-3"
          >
            <View className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 items-center justify-center flex-shrink-0">
              <Feather name="alert-triangle" size={20} color="#e11d48" />
            </View>
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-0.5">
                Active Health Alert
              </Text>
              <Text className="text-[13px] text-foreground font-medium leading-snug" numberOfLines={2}>
                {data.latest_alert.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#e11d48" />
          </TouchableOpacity>
        )}

        {/* ── Greeting ── */}
        <Reanimated.View entering={FadeIn.duration(240)} className="px-5 pt-3 pb-1">
          <Text className="text-3xl font-bold text-foreground tracking-tight leading-tight" numberOfLines={1} adjustsFontSizeToFit>
            Welcome back, {data?.user?.first_name || "Guest"}
          </Text>
          <Text className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. UNIFIED HERO CARD (SCORE + VITALS SIDE-BY-SIDE) */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(100).duration(260)} className="mx-5 mt-3 bg-card rounded-2xl border border-border p-4 shadow-md">
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-border/50">
            <View className="flex-row items-center gap-2">
              <View className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 items-center justify-center">
                <Feather name="shield" size={12} color={isDark ? "#60a5fa" : "#2563eb"} />
              </View>
              <Text className="text-[13px] font-bold text-foreground">
                Heart Health Status
              </Text>
            </View>
            <View
              className="flex-row items-center px-2 py-0.5 rounded-full gap-1"
              style={{ backgroundColor: theme.badgeBg }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
              <Text
                className="text-[10px] font-bold"
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
                      backgroundColor: "rgba(226, 75, 74, 0.15)",
                      opacity: glowOpacity,
                    }}
                  />
                )}
                <ScoreRing score={hssScore} size={115} strokeWidth={9} />
              </Animated.View>
              <Text
                className="text-[10px] text-muted-foreground mt-1.5 font-medium tracking-tight text-center"
                numberOfLines={1}
              >
                {formatFreshness(data?.last_sync, isCachedData)}
              </Text>
            </View>

            {/* Right: Stacked Vitals Metrics */}
            <View className="flex-1 gap-2">
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
                className="bg-background/70 dark:bg-slate-950/70 rounded-xl p-2.5 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-6 h-6 rounded-lg bg-rose-500/10 items-center justify-center">
                    <Feather name="heart" size={12} color="#f43f5e" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted-foreground" numberOfLines={1}>Heart Rate</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
                        {data?.latest_vitals?.bpm || "--"}
                      </Text>
                      <Text className="text-[9px] font-bold text-muted-foreground">BPM</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={12} color={isDark ? "#64748b" : "#94a3b8"} />
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
                className="bg-background/70 dark:bg-slate-950/70 rounded-xl p-2.5 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-6 h-6 rounded-lg bg-blue-500/10 items-center justify-center">
                    <Feather name="trending-up" size={12} color={isDark ? "#60a5fa" : "#2563eb"} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-semibold text-muted-foreground" numberOfLines={1}>Blood Pressure</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
                        {data?.latest_vitals?.bp === "--/--" ? "--/--" : data?.latest_vitals?.bp || "--/--"}
                      </Text>
                      <Text className="text-[9px] font-bold text-muted-foreground">mmHg</Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={12} color={isDark ? "#64748b" : "#94a3b8"} />
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 2. 4-BUTTON HORIZONTAL QUICK ACTION STRIP */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(180).duration(260)} className="mx-5 mt-4">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <Text className="text-[13px] font-bold text-foreground">
              Daily Check-in
            </Text>
            <Text className="text-[11px] font-semibold text-muted-foreground">
              {completedCount} of 4 logged
            </Text>
          </View>
          
          <View className="flex-row justify-between items-center bg-card rounded-2xl border border-border py-3 px-2.5 shadow-sm">
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
                <View className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#f59e0b" />
                </View>
                {mealsLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-card items-center justify-center">
                    <Feather name="check" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-semibold text-foreground mt-1.5" numberOfLines={1}>
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
                <View className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center">
                  <Feather name="activity" size={20} color={isDark ? "#60a5fa" : "#2563eb"} />
                </View>
                {exerciseLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-card items-center justify-center">
                    <Feather name="check" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-semibold text-foreground mt-1.5" numberOfLines={1}>
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
                <View className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center">
                  <Feather name="moon" size={20} color="#6366f1" />
                </View>
                {sleepLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-card items-center justify-center">
                    <Feather name="check" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-semibold text-foreground mt-1.5" numberOfLines={1}>
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
                <View className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center">
                  <Feather name="heart" size={20} color="#f43f5e" />
                </View>
                {vitalsLogged && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-card items-center justify-center">
                    <Feather name="check" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text className="text-[11px] font-semibold text-foreground mt-1.5" numberOfLines={1}>
                Symptoms
              </Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 3. MINIMALIST SUMMARY CARD (AI TIP + TARGETS) */}
        {/* ============================================================== */}
        {(data?.insight || data?.nutrition_budget || data?.today_activity) && (
          <Reanimated.View entering={FadeInDown.delay(240).duration(260)} className="mx-5 mt-4 bg-card rounded-2xl border border-border p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-1.5">
                <Feather name="compass" size={13} color={isDark ? "#60a5fa" : "#2563eb"} />
                <Text className="text-[13px] font-bold text-foreground">
                  Today's Summary
                </Text>
              </View>
            </View>

            {/* AI Insight banner */}
            {data?.insight && (
              <View className="bg-background/70 dark:bg-slate-950/70 rounded-xl p-3 border border-border flex-row items-start gap-2.5 mb-3">
                <Feather
                  name={(data.insight.icon || "zap") as any}
                  size={14}
                  color={
                    data.insight.icon === "trending-down"
                      ? "#ef4444"
                      : data.insight.icon === "trending-up"
                      ? "#10b981"
                      : (isDark ? "#60a5fa" : "#2563eb")
                  }
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 text-[12px] text-muted-foreground leading-relaxed font-medium">
                  <Text className="font-bold text-foreground">{data.insight?.title || ""}{" "}</Text>
                  {data.insight.body}
                </Text>
              </View>
            )}

            {/* Targets */}
            <View className="gap-2.5">
              {/* Sodium */}
              {data?.nutrition_budget?.sodium && (
                <View>
                  <View className="flex-row items-center justify-between mb-1 gap-2">
                    <Text className="text-[11px] font-semibold text-foreground">Sodium Intake</Text>
                    <Text className="text-[11px] font-bold text-muted-foreground">
                      {data.nutrition_budget.sodium.consumed_mg} / {data.nutrition_budget.sodium.limit_mg ? `${data.nutrition_budget.sodium.limit_mg} mg` : "Target not set"}
                    </Text>
                  </View>
                  <View className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                    <View className="h-full rounded-full" style={{
                      width: data.nutrition_budget.sodium.limit_mg ? `${Math.min((data.nutrition_budget.sodium.consumed_mg / data.nutrition_budget.sodium.limit_mg) * 100, 100)}%` : "0%",
                      backgroundColor: (data.nutrition_budget.sodium.limit_mg && data.nutrition_budget.sodium.consumed_mg > data.nutrition_budget.sodium.limit_mg) ? "#ef4444" : "#0d9488"
                    }} />
                  </View>
                </View>
              )}

              {/* Movement */}
              <View>
                <View className="flex-row items-center justify-between mb-1 gap-2">
                  <Text className="text-[11px] font-semibold text-foreground">Daily Movement</Text>
                  <Text className="text-[11px] font-bold text-muted-foreground">
                    {movementMins} / {movementGoal} mins
                  </Text>
                </View>
                <View className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <View className="h-full rounded-full" style={{
                    width: `${Math.min((movementMins / movementGoal) * 100, 100)}%`,
                    backgroundColor: movementMins >= movementGoal ? "#10b981" : (isDark ? "#60a5fa" : "#2563eb")
                  }} />
                </View>
              </View>
            </View>
          </Reanimated.View>
        )}

        {isCritical ? (
          <View className="mt-6 mb-4">
            <View className="px-5 mb-3">
              <Text className="text-[14px] font-bold text-destructive uppercase tracking-wide">
                Prioritize Safety
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Need professional guidance. Find a cardiologist near you to discuss your risk level."
              onPress={() => safeNavigate("/locator")}
              className="mx-5 bg-destructive/10 rounded-2xl p-4 border border-destructive/30 flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold text-foreground mb-0.5">
                  Need professional guidance?
                </Text>
                <Text className="text-[13px] text-muted-foreground leading-relaxed">
                  Find a cardiologist near you to discuss your risk level.
                </Text>
              </View>
              <View className="w-10 h-10 bg-destructive/15 border border-destructive/20 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#ef4444" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recommendations ── */}
            <View className="mt-6">
              <View className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[16px] font-bold text-foreground">
                  Recommended for you
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
              className="mx-5 mt-4 bg-card rounded-2xl p-4 border border-border flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold text-foreground mb-0.5">
                  Find a healthcare facility
                </Text>
                <Text className="text-[13px] text-muted-foreground leading-relaxed">
                  Locate clinics or healthcare providers near you.
                </Text>
              </View>
              <View className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color={isDark ? "#60a5fa" : "#2563eb"} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
