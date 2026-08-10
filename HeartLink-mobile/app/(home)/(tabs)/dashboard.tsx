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
} from "react-native";
import Reanimated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { StatCard } from "../../../components/dashboard/StatCard";
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
      barColor: "#0D9488",
      badgeBg: isDark ? "rgba(13, 148, 136, 0.15)" : "#CCFBF1",
      badgeText: isDark ? "#2DD4BF" : "#0F766E",
      dotColor: "#0D9488",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: "#D97706",
      badgeBg: isDark ? "rgba(217, 119, 6, 0.15)" : "#FEF3C7",
      badgeText: isDark ? "#FBBF24" : "#B45309",
      dotColor: "#D97706",
    };
  if (score >= 40)
    return {
      label: "At Risk",
      barColor: "#EA580C",
      badgeBg: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFEDD5",
      badgeText: isDark ? "#FB923C" : "#C2410C",
      dotColor: "#EA580C",
    };
  return {
    label: "Needs Attention",
    barColor: "#E11D48",
    badgeBg: isDark ? "rgba(225, 29, 72, 0.15)" : "#FFE4E6",
    badgeText: isDark ? "#FB7185" : "#BE123C",
    dotColor: "#E11D48",
  };
}

// ─── Timestamp Helper ─────────────────────────────────────────────────────────
function formatTimestamp(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, user, setUserId } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;



  const [isCachedData, setIsCachedData] = useState(false);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!userId) return;
      
      if (!silent) setIsLoading(true);
      setError(false);
      const cacheKey = `@dashboard_cache_${userId}`;

      try {
        const response = await fetch(`${base_url}/api/dashboard/me`, {
          headers: {
            "Authorization": `Bearer ${userId}`
          }
        });
        if (response.ok) {
          const json = await response.json();
          setData(json);
          setIsCachedData(false);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
        } else {
          throw new Error(`Dashboard API responded with ${response.status}`);
        }
      } catch (err) {
        console.error("Dashboard fetch error (checking offline cache):", err);
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
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const hssScore = data?.hss_score || 0;
  const theme = getScoreTheme(hssScore, isDark);
  const isCritical = hssScore < 40;
  const lastSyncTime = data?.last_sync ? new Date(data.last_sync) : new Date();

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [0.2, 0.8],
  });

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (hssScore < 50 && !isLoading) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
  }, [hssScore, pulseAnim, isLoading]);

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

  if (isLoading) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-slate-50 dark:bg-slate-950">
        <Header />
        <View className="px-5 pt-4">
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Skeleton className="w-32 h-6 mb-2" />
              <Skeleton className="w-48 h-4" />
            </View>
          </View>
          <View className="flex-row flex-wrap justify-between">
            <Skeleton className="w-[48%] h-28 mb-4" />
            <Skeleton className="w-[48%] h-28 mb-4" />
            <Skeleton className="w-[48%] h-28 mb-4" />
            <Skeleton className="w-[48%] h-28 mb-4" />
          </View>
          <Skeleton className="w-full h-48 mt-2 mb-6" />
          <Skeleton className="w-40 h-6 mb-4" />
          <Skeleton className="w-full h-32 mb-3" />
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-slate-50 dark:bg-slate-950">
        <Header />
        <View className="flex-1 justify-center items-center px-5">
        <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center mb-4">
          <Feather name="wifi-off" size={28} color="#e24b4a" />
        </View>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white mb-1 text-center">
          Unable to load dashboard
        </Text>
        <Text className="text-[13px] text-slate-400 text-center mb-6 leading-relaxed">
          Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => fetchData()}
          className="bg-slate-900 px-6 py-3 rounded-xl flex-row items-center gap-2"
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={14} color="#fff" />
          <Text className="text-white font-medium text-[14px]">Try again</Text>
        </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const isAlertActive = !!data?.latest_alert && hssScore < 60;

  return (
    <ScreenWrapper
      edges={["top"]}
      withScrollView={false}
      safeAreaClassName="flex-1 bg-slate-50 dark:bg-slate-950"
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
                router.push("/locator");
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
      <Header />

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
        {/* ── Offline Banner ── */}
        {isCachedData && (
          <View className="bg-amber-100 dark:bg-amber-900/40 px-5 py-2.5 flex-row items-center justify-center">
            <Feather name="wifi-off" size={14} color="#b45309" className="mr-2" />
            <Text className="text-[12px] font-medium text-amber-700 dark:text-amber-500">
              Offline - Showing last updated score
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
              <Text className="text-[13px] text-rose-900 dark:text-rose-200 font-medium" numberOfLines={1}>
                {data.latest_alert.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#e11d48" />
          </TouchableOpacity>
        )}

        {/* ── Greeting ── */}
        <View className="px-5 pt-4 pb-1">
          <Text className="text-3xl font-semibold text-foreground tracking-tight leading-tight" numberOfLines={1} adjustsFontSizeToFit>
            Welcome back, {data?.user?.first_name || "Guest"}
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        {/* ── HSS Score hero card ── */}
        <View className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 pt-6 pb-5 px-5 items-center">
          {/* Score Ring Component */}
          <Animated.View
            style={{
              alignItems: "center",
              justify: "center",
              transform: [{ scale: pulseAnim }],
            }}
          >
            {hssScore < 50 && (
              <Animated.View
                style={{
                  position: "absolute",
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: "rgba(226, 75, 74, 0.15)",
                  opacity: glowOpacity,
                }}
              />
            )}
            <ScoreRing score={hssScore} size={140} strokeWidth={12} />
          </Animated.View>

          {/* Timestamp */}
          <Text className="text-[11px] text-slate-400 mt-3">
            Last synced: {formatTimestamp(lastSyncTime)} {isCachedData ? "(Offline Cached)" : ""}
          </Text>

          {/* Label */}
          <Text className="text-[16px] font-bold text-slate-900 dark:text-white mt-3 mb-1">
            Health Stability Score
          </Text>
          <Text className="text-[13px] text-slate-500 dark:text-slate-400 text-center px-4 mb-3">
            Based on your current health profile and habits.
          </Text>

          {/* Status badge */}
          <View
            className="flex-row items-center px-3.5 py-1.5 rounded-full gap-2"
            style={{ backgroundColor: theme.badgeBg }}
          >
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: theme.dotColor }}
            />
            <Text
              className="text-[13px] font-medium"
              style={{ color: theme.badgeText }}
            >
              {theme.label}
            </Text>
          </View>

          {/* Progress bar */}
          <View className="w-full mt-4">
            <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${hssScore}%`,
                  backgroundColor: theme.barColor,
                }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-slate-300">Needs Attention</Text>
              <Text className="text-[10px] text-slate-300">Stable 100</Text>
            </View>
          </View>
        </View>

        {/* ── Compact Vitals Card ── */}
        <Reanimated.View entering={FadeInDown.delay(100).springify()} className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Latest Vitals
            </Text>
            <Text className="text-[11px] text-slate-400">
              {data?.latest_vitals?.logged_at 
                ? `Last recorded: ${new Date(data.latest_vitals.logged_at).toLocaleDateString()}` 
                : "Not recorded"}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="text-[13px] text-slate-500 mb-1">Heart Rate</Text>
              <View className="flex-row items-end gap-1">
                <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
                  {data?.latest_vitals?.bpm || "---"}
                </Text>
                <Text className="text-[12px] text-slate-400 mb-1">BPM</Text>
              </View>
            </View>
            
            <View>
              <Text className="text-[13px] text-slate-500 mb-1">Blood Pressure</Text>
              <View className="flex-row items-end gap-1">
                <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
                  {data?.latest_vitals?.bp === "--/--" ? "--- / ---" : data?.latest_vitals?.bp || "--- / ---"}
                </Text>
                <Text className="text-[12px] text-slate-400 mb-1">mmHg</Text>
              </View>
            </View>
          </View>

          {(!data?.latest_vitals?.logged_at) && (
            <TouchableOpacity 
              onPress={() => router.push("/(home)/(health)/log-symptoms")}
              className="mt-4 bg-primary/10 py-2.5 rounded-lg items-center"
            >
              <Text className="text-primary text-[13px] font-semibold">Log Vitals</Text>
            </TouchableOpacity>
          )}
        </Reanimated.View>



        {/* ── Today's Health ── */}
        {data?.today_activity && (
          <Reanimated.View entering={FadeInDown.delay(350).springify()} className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-3">
              Today's Health
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {/* Meals */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/(home)/(meals)/daily-diary")} className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-xl p-3 mb-3 border border-slate-100 dark:border-slate-800">
                <View className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-2">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={14} color={isDark ? "#fbbf24" : "#ea580c"} />
                </View>
                <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-200">Meals</Text>
                <Text className="text-[12px] text-slate-500">{data.today_activity.meals_count > 0 ? `${data.today_activity.meals_count} logged` : "0 logged"}</Text>
              </TouchableOpacity>

              {/* Exercise */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/(home)/(health)/exercise-diary")} className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-xl p-3 mb-3 border border-slate-100 dark:border-slate-800">
                <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-2">
                  <Feather name="activity" size={14} color={isDark ? "#60a5fa" : "#2563eb"} />
                </View>
                <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-200">Exercise</Text>
                <Text className="text-[12px] text-slate-500">{data.today_activity.exercises_count > 0 ? `${data.today_activity.total_exercise_minutes} min` : "0 min"}</Text>
              </TouchableOpacity>

              {/* Sleep */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/(home)/(health)/log-sleep")} className={`w-[48%] bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800 ${!data.today_activity.sleep_logged ? "opacity-60" : ""}`}>
                <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mb-2">
                  <Feather name="moon" size={14} color={isDark ? "#818cf8" : "#4f46e5"} />
                </View>
                <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-200">Sleep</Text>
                <Text className="text-[12px] text-slate-500">
                  {data.today_activity.sleep_logged 
                    ? `${Math.floor(data.today_activity.total_sleep_hours)}h ${Math.round((data.today_activity.total_sleep_hours % 1) * 60)}m` 
                    : "Not logged"}
                </Text>
              </TouchableOpacity>

              {/* Vitals */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/(home)/(health)/log-symptoms")} className="w-[48%] bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                <View className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 items-center justify-center mb-2">
                  <Feather name="heart" size={14} color={isDark ? "#fb7185" : "#e11d48"} />
                </View>
                <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-200">Vitals</Text>
                <Text className="text-[12px] text-slate-500">{data.today_activity.vitals_logged ? "Logged" : "Not logged"}</Text>
              </TouchableOpacity>
            </View>
          </Reanimated.View>
        )}

        {/* ── Nutrition Today ── */}
        {data?.nutrition_budget && (
          <Reanimated.View entering={FadeInDown.delay(500).springify()} className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-3">
              Nutrition Today
            </Text>
            
            {/* Sodium */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] text-slate-600 dark:text-slate-400">Sodium</Text>
                <Text className="text-[13px] font-medium" style={{ color: (data.nutrition_budget.sodium.limit_mg && data.nutrition_budget.sodium.consumed_mg > data.nutrition_budget.sodium.limit_mg) ? "#e11d48" : (isDark ? "#f8fafc" : "#0f172a") }}>
                  {data.nutrition_budget.sodium.consumed_mg} / {data.nutrition_budget.sodium.limit_mg ? `${data.nutrition_budget.sodium.limit_mg} mg` : "Target not set"}
                </Text>
              </View>
              <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{
                  width: data.nutrition_budget.sodium.limit_mg ? `${Math.min((data.nutrition_budget.sodium.consumed_mg / data.nutrition_budget.sodium.limit_mg) * 100, 100)}%` : "0%",
                  backgroundColor: (data.nutrition_budget.sodium.limit_mg && data.nutrition_budget.sodium.consumed_mg > data.nutrition_budget.sodium.limit_mg) ? "#e11d48" : "#0d9488"
                }} />
              </View>
            </View>

            {/* Calories */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] text-slate-600 dark:text-slate-400">Calories</Text>
                <Text className="text-[13px] font-medium" style={{ color: (data.nutrition_budget.calories.limit && data.nutrition_budget.calories.consumed > data.nutrition_budget.calories.limit) ? "#e11d48" : (isDark ? "#f8fafc" : "#0f172a") }}>
                  {data.nutrition_budget.calories.consumed} / {data.nutrition_budget.calories.limit ? `${data.nutrition_budget.calories.limit} kcal` : "Target not set"}
                </Text>
              </View>
              <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{
                  width: data.nutrition_budget.calories.limit ? `${Math.min((data.nutrition_budget.calories.consumed / data.nutrition_budget.calories.limit) * 100, 100)}%` : "0%",
                  backgroundColor: (data.nutrition_budget.calories.limit && data.nutrition_budget.calories.consumed > data.nutrition_budget.calories.limit) ? "#e11d48" : "#f59e0b"
                }} />
              </View>
            </View>
          </Reanimated.View>
        )}

        {/* ── Today's Insight ── */}
        {data?.insight && (
          <Reanimated.View entering={FadeInDown.delay(300).springify()} className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-3">
              Today's Insight
            </Text>
            <View className="flex-row items-start gap-3">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor:
                    data.insight.icon === "trending-down"
                      ? "#fcebeb"
                      : data.insight.icon === "trending-up"
                      ? "#eaf3de"
                      : "#f1f5f9",
                }}
              >
                <Feather
                  name={(data.insight.icon || "zap") as any}
                  size={16}
                  color={
                    data.insight.icon === "trending-down"
                      ? "#e24b4a"
                      : data.insight.icon === "trending-up"
                      ? "#3b6d11"
                      : "#185fa5"
                  }
                />
              </View>
              <Text className="flex-1 text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                <Text className="font-bold text-foreground">
                  {data.insight?.title || ""}{" "}
                </Text>
                {data.insight.body}
              </Text>
            </View>
          </Reanimated.View>
        )}

        {isCritical ? (
          <View className="mt-6 mb-4">
            <View className="px-5 mb-3">
              <Text className="text-[14px] font-bold text-red-600 uppercase tracking-wide">
                Prioritize Safety
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 bg-red-50 rounded-2xl p-4 border border-red-200 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">
                  Need professional guidance?
                </Text>
                <Text className="text-[13px] text-slate-600">
                  Find a cardiologist near you to discuss your risk level.
                </Text>
              </View>
              <View className="w-10 h-10 bg-red-100 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#e24b4a" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Recommendations ── */}
            <View className="mt-6">
              <View className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Recommended for you
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
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
                        router.push({
                          pathname: "/(home)/(meals)/recipe-details",
                          params: { id: r.id },
                        });
                      } else if (r.type === "exercise") {
                        router.push({
                          pathname: "/(home)/(health)/exercise-details",
                          params: { id: r.id },
                        });
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ── Locator CTA ── */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/locator")}
              className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">
                  Find a healthcare facility
                </Text>
                <Text className="text-[13px] text-slate-400">
                  Locate clinics or healthcare providers near you.
                </Text>
              </View>
              <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#1e4ed8" />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
