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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { StatCard } from "../../../components/dashboard/StatCard";
import { RecommendationCard } from "../../../components/dashboard/RecommendationCard";
import { CustomAlertModal } from "../../../components/dashboard/CustomAlertModal";

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
      label: "Caution",
      barColor: "#EA580C",
      badgeBg: isDark ? "rgba(234, 88, 12, 0.15)" : "#FFEDD5",
      badgeText: isDark ? "#FB923C" : "#C2410C",
      dotColor: "#EA580C",
    };
  return {
    label: "At risk",
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const cssScore = data?.css_score || 0;
  const theme = getScoreTheme(cssScore, isDark);
  const isCritical = cssScore < 40;
  const lastSyncTime = data?.last_sync ? new Date(data.last_sync) : new Date();

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [0.2, 0.8],
  });

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (cssScore < 50 && !isLoading) {
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
  }, [cssScore, pulseAnim, isLoading]);

  // Auto-show alert modal when critical alert loads
  useEffect(() => {
    if (data?.latest_alert && !isLoading) {
      setAlertModalVisible(true);
    }
  }, [data?.latest_alert, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#0f172a"} />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-8">
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
      </SafeAreaView>
    );
  }

  const isAlertActive = !!data?.latest_alert;

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      {/* Custom Alert Modal */}
      {isAlertActive && (
        <CustomAlertModal
          visible={alertModalVisible}
          onClose={() => setAlertModalVisible(false)}
          title="Health Alert"
          message={
            data.latest_alert.message ||
            "Elevated risk detected. We recommend consulting a nearby specialist."
          }
          icon="alert-triangle"
          iconBg="#fcebeb"
          iconColor="#e24b4a"
          actions={[
            {
              label: "Find Nearby Clinics",
              onPress: () => {
                setAlertModalVisible(false);
                router.push("/locator");
              },
              primary: true,
            },
            {
              label: "Dismiss",
              onPress: () => setAlertModalVisible(false),
            },
          ]}
        />
      )}

      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather
              name="heart"
              size={13}
              color={isDark ? "#fff" : "#0f172a"}
            />
          </View>
          <Text
            className="text-[16px] text-slate-900 dark:text-white tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push("/(home)/(profile)/notifications")}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 items-center justify-center"
          >
            <Feather
              name="bell"
              size={17}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
            <View
              style={{ position: "absolute", top: 8, right: 8 }}
              className="w-1.5 h-1.5 bg-red-500 rounded-full"
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/(home)/(settings)/settings")}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 items-center justify-center"
          >
            <Feather
              name="settings"
              size={17}
              color={isDark ? "#94a3b8" : "#64748b"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push("/(home)/(profile)/profile")}
            activeOpacity={0.8}
            className="ml-1"
          >
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image
                source={{
                  uri:
                    user?.avatar_url ||
                    "https://ui-avatars.com/api/?name=" +
                      (user?.first_name || "U") +
                      "&background=e2e8f0&color=475569&bold=true",
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View
              style={{ position: "absolute", bottom: -1, right: -1 }}
              className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f172a"
          />
        }
      >
        {/* ── Greeting ── */}
        <View className="px-5 pt-4 pb-1">
          <Text className="text-[28px] font-medium text-slate-900 dark:text-white tracking-tight leading-tight">
            Welcome back,{"\n"}
            {data?.user?.first_name || "Guest"}
          </Text>
          <Text className="text-[13px] text-slate-400 mt-1.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        {/* ── CSS Score hero card ── */}
        <View className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 pt-6 pb-5 px-5 items-center">
          {/* Score Ring Component */}
          <Animated.View
            style={{
              alignItems: "center",
              justify: "center",
              transform: [{ scale: pulseAnim }],
            }}
          >
            {cssScore < 50 && (
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
            <ScoreRing score={cssScore} size={140} strokeWidth={12} />
          </Animated.View>

          {/* Timestamp */}
          <Text className="text-[11px] text-slate-400 mt-3">
            Last synced: {formatTimestamp(lastSyncTime)} {isCachedData ? "(Offline Cached)" : ""}
          </Text>

          {/* Label */}
          <Text className="text-[16px] font-medium text-slate-900 dark:text-white mt-3 mb-2">
            Cardiovascular stability
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
                  width: `${cssScore}%`,
                  backgroundColor: theme.barColor,
                }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-[10px] text-slate-300">0 Critical</Text>
              <Text className="text-[10px] text-slate-300">Stable 100</Text>
            </View>
          </View>
        </View>

        {/* ── Stat cards row ── */}
        <View className="flex-row gap-2.5 mx-5 mt-4">
          <StatCard
            icon="heart"
            label="BPM"
            value={String(data?.latest_vitals?.bpm || "--")}
            iconColor={isDark ? "#FB7185" : "#E11D48"}
            iconBg={isDark ? "rgba(225, 29, 72, 0.15)" : "#FFE4E6"}
          />
          <StatCard
            icon="droplet"
            label="BP"
            value={String(data?.latest_vitals?.bp || "--/--")}
            iconColor={isDark ? "#60A5FA" : "#2563EB"}
            iconBg={isDark ? "rgba(37, 99, 235, 0.15)" : "#DBEAFE"}
          />
          <StatCard
            icon="trending-up"
            label="Trend"
            value={String(data?.latest_vitals?.trend || "+0")}
            iconColor={isDark ? "#2DD4BF" : "#0D9488"}
            iconBg={isDark ? "rgba(13, 148, 136, 0.15)" : "#CCFBF1"}
          />
        </View>

        {/* ── Quick Actions ── */}
        <View className="flex-row gap-2.5 mx-5 mt-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/locator")}
            className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mb-1.5">
              <Feather name="map-pin" size={16} color="#1e4ed8" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
              Find Clinics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(home)/(health)/log-symptoms")}
            className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-3 items-center"
          >
            <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center mb-1.5">
              <Feather name="activity" size={16} color="#e11d48" />
            </View>
            <Text className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
              Log Vitals
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Smart insight (dynamic) ── */}
        {data?.insight && (
          <View className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex-row items-start gap-3">
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
            <Text className="flex-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <Text className="font-medium text-slate-900 dark:text-white">
                {data.insight.title}{" "}
              </Text>
              {data.insight.body}
            </Text>
          </View>
        )}

        {/* ── Today's Activity ── */}
        {data?.today_activity && (
          <View className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-3">
              Today's activity
            </Text>
            <View className="gap-2.5">
              {/* Vitals */}
              <View className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-950 rounded-xl px-4 py-3">
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: data.today_activity.vitals_logged
                      ? "#eaf3de"
                      : "#fcebeb",
                  }}
                >
                  <Feather
                    name={
                      data.today_activity.vitals_logged
                        ? "check-circle"
                        : "circle"
                    }
                    size={18}
                    color={
                      data.today_activity.vitals_logged ? "#3b6d11" : "#a32d2d"
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-medium text-slate-800 dark:text-slate-100">
                    Vitals check-in
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {data.today_activity.vitals_logged
                      ? "Completed today"
                      : "Not logged yet"}
                  </Text>
                </View>
                {!data.today_activity.vitals_logged && (
                  <TouchableOpacity
                    onPress={() => router.push("/(home)/(health)/log-symptoms")}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white dark:text-slate-900 text-[11px] font-medium">
                      Log now
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Meals & Exercise row */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl px-4 py-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="w-7 h-7 rounded-lg items-center justify-center bg-orange-100 dark:bg-orange-900/30"
                    >
                      <MaterialCommunityIcons
                        name="silverware-fork-knife"
                        size={13}
                        color={isDark ? "#fbbf24" : "#854f0b"}
                      />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      {data.today_activity.meals_count} Meals
                    </Text>
                  </View>
                  <Text className="text-[11px] text-slate-400 ml-9">
                    {data.today_activity.total_calories} kcal today
                  </Text>
                </View>
                <View className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl px-4 py-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="w-7 h-7 rounded-lg items-center justify-center bg-blue-100 dark:bg-blue-900/30"
                    >
                      <Feather name="activity" size={13} color={isDark ? "#60a5fa" : "#185fa5"} />
                    </View>
                    <Text className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      {data.today_activity.exercises_count} Exercise
                    </Text>
                  </View>
                  <Text className="text-[11px] text-slate-400 ml-9">
                    {data.today_activity.total_exercise_minutes} min active
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Sodium Budget ── */}
        {data?.sodium_budget && (
          <View className="mx-5 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View
                  className="w-7 h-7 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor:
                      data.sodium_budget.consumed_mg >
                      data.sodium_budget.limit_mg
                        ? "#fcebeb"
                        : "#eaf3de",
                  }}
                >
                  <MaterialCommunityIcons
                    name="shaker-outline"
                    size={14}
                    color={
                      data.sodium_budget.consumed_mg >
                      data.sodium_budget.limit_mg
                        ? "#a32d2d"
                        : "#3b6d11"
                    }
                  />
                </View>
                <Text className="text-[12px] text-slate-400 uppercase tracking-wide">
                  Daily sodium
                </Text>
              </View>
              <Text
                className="text-[13px] font-semibold"
                style={{
                  color:
                    data.sodium_budget.consumed_mg >
                    data.sodium_budget.limit_mg
                      ? "#a32d2d"
                      : "#3b6d11",
                }}
              >
                {data.sodium_budget.consumed_mg} / {data.sodium_budget.limit_mg}
                mg
              </Text>
            </View>
            <View className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(
                    (data.sodium_budget.consumed_mg /
                      data.sodium_budget.limit_mg) *
                      100,
                    100
                  )}%`,
                  backgroundColor:
                    data.sodium_budget.consumed_mg >
                    data.sodium_budget.limit_mg
                      ? "#e24b4a"
                      : data.sodium_budget.consumed_mg >
                        data.sodium_budget.limit_mg * 0.75
                      ? "#ba7517"
                      : "#639922",
                }}
              />
            </View>
            {data.sodium_budget.consumed_mg > data.sodium_budget.limit_mg && (
              <View className="flex-row items-center gap-2 mt-2.5 bg-red-50 rounded-lg px-3 py-2">
                <Feather name="alert-circle" size={13} color="#a32d2d" />
                <Text
                  className="text-[12px] flex-1"
                  style={{ color: "#a32d2d" }}
                >
                  You've exceeded your daily sodium limit
                </Text>
              </View>
            )}
          </View>
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
                  Recommended today
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
                  Need professional guidance?
                </Text>
                <Text className="text-[13px] text-slate-400">
                  Find a cardiologist near you.
                </Text>
              </View>
              <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center">
                <Feather name="map-pin" size={18} color="#1e4ed8" />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
