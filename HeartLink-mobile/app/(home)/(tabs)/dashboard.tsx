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
import Reanimated, { FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { getCompanionGreeting, getCompanionLine, CompanionGreetingResult } from "../../../services/companionService";
import { voiceGreeting } from "../../../services/companionCopy";

import Svg, { Path } from "react-native-svg";



// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { MissionList, type MissionId, type MissionItem } from "../../../components/dashboard/MissionList";
import { MissionLogModal } from "../../../components/dashboard/MissionLogModal";
import {
  RecommendationModal,
  type ActiveRec,
} from "../../../components/dashboard/RecommendationModal";
import { FacilityMapModal } from "../../../components/dashboard/FacilityMapModal";
import { RecommendationCard } from "../../../components/dashboard/RecommendationCard";
import { CustomAlertModal } from "../../../components/dashboard/CustomAlertModal";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { DashboardTutorialModal } from "../../../components/dashboard/DashboardTutorialModal";
import { ScoreExplanationModal } from "../../../components/dashboard/ScoreExplanationModal";

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
      barColor: "#C0502E",
      badgeBg: isDark ? "rgba(192, 80, 46, 0.2)" : "#FDEEE9",
      badgeBorder: isDark ? "rgba(192, 80, 46, 0.35)" : "#F9D5CB",
      badgeText: isDark ? "#D0714E" : "#C0502E",
      dotColor: isDark ? "#D0714E" : "#C0502E",
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
  let timeStr = "Good Morning";
  if (hour >= 12 && hour < 17) timeStr = "Good Afternoon";
  else if (hour >= 17) timeStr = "Good Evening";
  return name ? `${timeStr}, ${name}` : timeStr;
}

function getDaypartTitle(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Start your day";
  if (hour < 17) return "Keep the rhythm";
  return "Wind down tonight";
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
  // Varnished (LLM) variant of the voiced greeting line, when available.
  const [companionAi, setCompanionAi] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);

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
          setRefreshTrigger((prev) => prev + 1);
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
    setRefreshTrigger((prev) => prev + 1);
    fetchData(true);
  }, [fetchData]);

  const hssScore = typeof data?.hss_score === "number" ? data.hss_score : 0;
  const hasHssScore = hssScore > 0;
  const theme = getScoreTheme(hssScore, isDark);
  const isCritical = hasHssScore && hssScore < 50;

  // Latest vitals for the swipe card under the score ring.
  const rawLatestBp = typeof data?.latest_vitals?.bp === "string" ? data.latest_vitals.bp : "";
  let latestSbp: number | null = null;
  let latestDbp: number | null = null;
  if (rawLatestBp && rawLatestBp !== "--/--") {
    const parts = rawLatestBp.split("/").map((p: string) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      latestSbp = parts[0];
      latestDbp = parts[1];
    }
  }
  const rawBpm = (data?.latest_vitals as any)?.bpm;
  const parsedBpm = typeof rawBpm === "number" ? rawBpm : parseInt(rawBpm, 10);
  const latestBpm = !isNaN(parsedBpm) && parsedBpm > 0 ? parsedBpm : null;

  const mealsLogged = (data?.today_activity?.meals_count || 0) > 0;
  const exerciseLogged = (data?.today_activity?.exercises_count || 0) > 0;
  const sleepLogged = !!data?.today_activity?.sleep_logged;
  const vitalsLogged = !!data?.today_activity?.vitals_logged || !!data?.latest_vitals?.logged_at;
  const completedCount = [mealsLogged, exerciseLogged, sleepLogged, vitalsLogged].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const movementMins = data?.today_activity?.total_exercise_minutes || 0;
  const movementGoal = (data as any)?.thresholds?.active_minutes_goal || 30;
  const streakDays = typeof data?.streak?.current_streak === "number" ? data.streak.current_streak : 0;

  const [tutorialVisible, setTutorialVisible] = useState(false);

  // Mission log modal (replaces the old inline dropdowns).
  // Exercise keeps its separate screen and never opens the modal.
  const [logModal, setLogModal] = useState<null | "vitals" | "meals" | "sleep">(null);
  const handleMissionSaved = useCallback(() => {
    setLogModal(null);
    fetchData(true);
  }, [fetchData]);
  const handleMissionPress = useCallback(
    (id: MissionId) => {
      if (id === "exercise") {
        safeNavigate("/(home)/(health)/exercise-diary");
        return;
      }
      setLogModal(id);
    },
    [safeNavigate]
  );

  const missionItems: MissionItem[] = [
    {
      id: "vitals",
      title: "Blood Pressure & Pulse",
      subtitle: vitalsLogged
        ? `Recorded: ${data?.latest_vitals?.bp || "--/--"} mmHg • ${data?.latest_vitals?.bpm || "--"} BPM`
        : "Morning check due today",
      icon: "heart",
      tileColors: ["#9E4E5F", "#BF7E8C"],
      done: vitalsLogged,
    },
    {
      id: "meals",
      title: "Sodium Budget",
      subtitle: mealsLogged
        ? `${data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0} mg used`
        : "0 of 2,000 mg logged today",
      icon: "silverware-fork-knife",
      iconType: "material",
      tileColors: ["#8A6820", "#B08B45"],
      done: mealsLogged,
    },
    {
      id: "exercise",
      title: "Cardio Heart Movement",
      subtitle: `${movementMins} of ${movementGoal} mins completed today`,
      icon: "activity",
      tileColors: ["#3D6494", "#6488B0"],
      done: exerciseLogged,
    },
    {
      id: "sleep",
      title: "Rest & Circadian Sleep",
      subtitle: sleepLogged
        ? `${typeof data?.today_activity?.total_sleep_hours === "number" ? data.today_activity.total_sleep_hours : "Recorded"} hrs logged`
        : "Target: 7–9 hrs of restful recovery",
      icon: "moon",
      tileColors: ["#5A5E96", "#8589BC"],
      done: sleepLogged,
    },
  ];

  // Recommendation detail modal (compiled expandable card).
  const [activeRec, setActiveRec] = useState<ActiveRec | null>(null);
  // Facility map modal (compiled map blueprint, Cebu scope).
  const [mapVisible, setMapVisible] = useState(false);
  const handleRecLogged = useCallback(() => {
    setActiveRec(null);
    fetchData(true);
  }, [fetchData]);
  const handleRecOpenFull = useCallback(
    (rec: ActiveRec) => {
      setActiveRec(null);
      if (rec.type === "recipe") {
        safeNavigate("/(home)/(meals)/recipe-details", { id: rec.id });
      } else {
        safeNavigate("/(home)/(health)/exercise-details", { id: rec.id });
      }
    },
    [safeNavigate]
  );

  // Check if user has already seen the interactive dashboard walkthrough
  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const tourKey = userId ? `@dashboard_tour_seen_${userId}` : "@dashboard_tour_seen_guest";
        const seen = await AsyncStorage.getItem(tourKey);
        if (!seen) {
          const timer = setTimeout(() => setTutorialVisible(true), 700);
          return () => clearTimeout(timer);
        }
      } catch {}
    };
    checkTutorial();
  }, [userId]);

  const handleFinishTutorial = async () => {
    setTutorialVisible(false);
    try {
      const tourKey = userId ? `@dashboard_tour_seen_${userId}` : "@dashboard_tour_seen_guest";
      await AsyncStorage.setItem(tourKey, "true");
    } catch {}
  };

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

      getCompanionGreeting(firstName, activityContext, hssContext, userId || undefined).then((result) => {
        setCompanion(result);
        // v2 variety layer: instant cached varnish (or template), warming the
        // cache for next open. Crisis tones bypass AI entirely.
        if (result.tone !== "warning" && result.tone !== "caution") {
          const voiced = voiceGreeting(
            result,
            typeof streakDays === "number" ? streakDays : 0
          );
          if (voiced.voiced) {
            getCompanionLine(
              "greeting",
              { streak_days: typeof streakDays === "number" ? streakDays : 0 },
              voiced.text,
              userId || undefined,
              token || undefined
            ).then((line) => {
              setCompanionAi(line.source === "ai" ? line.text : null);
            });
          } else {
            setCompanionAi(null);
          }
        } else {
          setCompanionAi(null);
        }
      });
    }
  }, [data, user?.first_name, movementMins, hssScore, theme.label, userId, streakDays, token]);

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
        <Header showProfile={false} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-40 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        >
          {/* Greeting Skeleton */}
          <View className="mb-4 pt-1">
            <Skeleton className="w-36 h-4 rounded-md mb-1.5 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-48 h-8 rounded-xl bg-[#DCE3DF] dark:bg-slate-800" />
          </View>

          {/* Score Ring Hero Card Skeleton */}
          <View className="bg-white dark:bg-[#1A2634] rounded-3xl border border-[#DCE3DF] dark:border-slate-800 p-5 mb-4 shadow-xs items-center">
            <Skeleton className="w-40 h-4 rounded-md mb-4 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-36 h-36 rounded-full mb-5 bg-[#DCE3DF] dark:bg-slate-800" />
            <View className="w-full h-4 mb-4 items-center justify-center">
              <View className="w-full h-[1.5px] bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
            <View className="flex-row gap-3 w-full">
              <Skeleton className="flex-1 h-28 rounded-2xl bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="flex-1 h-28 rounded-2xl bg-[#DCE3DF] dark:bg-slate-800" />
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
        <Header showProfile={false} />
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
      {/* ── Interactive First-Time Coachmark Walkthrough Tour ── */}
      <DashboardTutorialModal
        visible={tutorialVisible}
        onClose={handleFinishTutorial}
        isDark={isDark}
      />

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
      <Header unreadCount={data?.unread_notifications_count} showProfile={false} />

      <ScrollView
        contentContainerClassName="pb-40 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B6E63"
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

        {/* ── Clean 2-Line Greeting ── */}
        <Reanimated.View entering={FadeInDown.duration(280)} className="px-5 pt-3 pb-1">
          <Text className="text-[13px] sm:text-sm font-medium text-[#5C6B66] dark:text-slate-400 mb-0.5">
            {getGreeting(data?.user?.first_name || user?.first_name)}
          </Text>
          <Text className="text-2xl sm:text-3xl font-bold text-[#152131] dark:text-white tracking-tight">
            {getDaypartTitle()}
          </Text>
          {companion && (
            <Text
              numberOfLines={3}
              className="text-[12.5px] text-[#5C6B66] dark:text-slate-300 leading-relaxed font-medium mt-1 pr-2"
            >
              {companionAi ??
                voiceGreeting(
                  companion,
                  streakDays
                ).text}
            </Text>
          )}
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. UNIFIED HERO CARD (HEART HEALTH SCORE) - ALWAYS VISIBLE */}
        {/* ============================================================== */}
        <Reanimated.View
          entering={FadeInDown.delay(100).duration(260)}
          className="mx-5 mt-3.5 bg-white dark:bg-[#1A2634] rounded-3xl border border-[#DCE3DF] dark:border-slate-800/80 p-5 items-center"
          style={cardShadowStyle}
        >
          {/* Header Row: Status badge + Distinct Info Button */}
          <View className="flex-row items-center justify-center gap-2 mb-4">
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setScoreModalVisible(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Heart Health, ${theme.label}. Tap for info on stability score.`}
              accessibilityHint="Opens explanation of your heart health stability score"
              className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F7F5] dark:bg-slate-800/80 border border-[#DCE3DF]/70 dark:border-slate-700/60"
            >
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
              <Text className="text-[12px] font-bold uppercase tracking-widest text-[#2D554D] dark:text-slate-200">
                HEART HEALTH · {theme.label.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setScoreModalVisible(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="About Heart Health Stability Score"
              accessibilityHint="Opens explanation sheet for this score"
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full items-center justify-center bg-[#F3F7F5] dark:bg-slate-800/80 border border-[#DCE3DF]/70 dark:border-slate-700/60"
            >
              <Feather
                name="info"
                size={18}
                color={isDark ? "#94A3B8" : "#2D554D"}
              />
            </TouchableOpacity>
          </View>

          {/* Centered Score Ring */}
          <View className="items-center justify-center my-2">
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
                    width: 196,
                    height: 196,
                    borderRadius: 98,
                    backgroundColor: "rgba(138, 31, 26, 0.15)",
                    opacity: glowOpacity,
                  }}
                />
              )}
              <ScoreRing
                score={hssScore}
                size={278}
                color={theme.dotColor}
                refreshTrigger={refreshTrigger}
                celebrateTrigger={completedCount}
                systolic={latestSbp}
                diastolic={latestDbp}
                bpm={latestBpm}
                streakDays={streakDays}
              />
            </Animated.View>
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
          {/* Hero progress panel */}
          <View className="mb-3.5 rounded-2xl overflow-hidden">
            <LinearGradient
              colors={["#0C2E29", "#1B6E63"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 14 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-lg bg-white/15 items-center justify-center">
                    <Feather name="check-circle" size={13} color="#fff" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/70">
                      Today's Ritual
                    </Text>
                    <Text className="text-[15px] font-bold text-white tracking-tight">
                      Heart Missions
                    </Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 flex-row items-center gap-1">
                  <Text className="text-[11px] font-bold text-white">
                    {streakDays > 0 ? `🔥 ${streakDays}-day streak` : "🌱 Day 1"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-baseline gap-1.5 mb-2">
                <Text className="text-[26px] font-bold text-white tracking-tight">
                  {completedCount}
                  <Text className="text-[15px] font-semibold text-white/60">/4</Text>
                </Text>
                <Text className="text-[11px] font-medium text-white/70">
                  {completedCount === 4 ? "fully protected 🎉" : "habits protected"}
                </Text>
              </View>

              {/* Animated mission progress track */}
              <View className="h-2 rounded-full bg-white/20 overflow-hidden">
                <Reanimated.View
                  layout={LinearTransition.duration(400)}
                  style={{ width: `${progressPercent}%`, height: "100%" }}
                >
                  <LinearGradient
                    colors={["#5EEAD4", "#A7F3D0"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 999 }}
                  />
                </Reanimated.View>
              </View>
              {completedCount < 4 && (
                <Text className="text-[10.5px] font-medium text-white/60 mt-1.5">
                  {4 - completedCount} remaining today — tap a mission to log it
                </Text>
              )}
            </LinearGradient>
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

          {/* Heart missions list (compiled pin-list: done rises with check) */}
          <MissionList missions={missionItems} onPress={handleMissionPress} />

            {/* Completion Celebration Banner */}
            {completedCount === 4 && (
              <Reanimated.View entering={ZoomIn.springify().damping(13)} className="mt-1 rounded-2xl overflow-hidden">
                <LinearGradient
                  colors={["#1B6E63", "#0C2E29"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View className="w-10 h-10 rounded-full bg-white/20 border border-white/30 items-center justify-center">
                    <Feather name="award" size={18} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-white">
                      All 4 daily heart habits protected! 🎉
                    </Text>
                    <Text className="text-[11px] text-white/70 font-medium mt-0.5">
                      Your stability index is fully fortified for the day.
                    </Text>
                  </View>
                </LinearGradient>
              </Reanimated.View>
            )}
          </Reanimated.View>

        {/* ── Clinical Consultation & Daily Wrap-Up Card (Accessible 24/7) ── */}
        <Reanimated.View entering={FadeInDown.delay(500).duration(300)}>
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
                  ? "Let's look back at your vitals, salt balance, and sleep together — and set up a calm night."
                  : "View and present your logged meals, exercise, and vitals summary for clinic visits."}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color="#5C6B66" />
        </TactileCard>
        </Reanimated.View>

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
            {/* ── Recommendations (hidden when empty) ── */}
            {data?.recommendations && data.recommendations.length > 0 && (
            <View className="mt-6">
              <Reanimated.View entering={FadeInDown.delay(540).duration(300)} className="px-5 flex-row items-center justify-between mb-3">
                <Text className="text-[16px] font-bold text-[#152131] dark:text-white tracking-tight">
                  Recommended for You
                </Text>
              </Reanimated.View>
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
                    index={idx}
                    tag={r.tag}
                    title={r.title}
                    subtitle={r.subtitle}
                    icon={r.icon}
                    bg={r.bg}
                    image={r.image_url}
                    tagBg={r.tagBg}
                    tagText={r.tagText}
                    subColor={r.subColor}
                    onPress={() => {
                      if (r.type === "recipe" || r.type === "exercise") {
                        Haptics.selectionAsync();
                        setActiveRec({
                          id: String(r.id),
                          type: r.type,
                          tag: r.tag,
                          title: r.title,
                          subtitle: r.subtitle,
                        });
                      }
                    }}
                  />
                ))}
              </ScrollView>
            </View>
            )}

            <RecommendationModal
              visible={activeRec !== null}
              rec={activeRec}
              onClose={() => setActiveRec(null)}
              onLogged={handleRecLogged}
              onOpenFull={handleRecOpenFull}
            />

            <ScoreExplanationModal
              visible={scoreModalVisible}
              score={hssScore}
              tierLabel={theme.label}
              hasLoggedData={hasHssScore}
              onClose={() => setScoreModalVisible(false)}
              onNavigateToLogging={() => {
                setScoreModalVisible(false);
                setLogModal("vitals");
              }}
            />

            <MissionLogModal
              mission={logModal}
              userId={userId}
              token={token}
              initialSys={latestSbp}
              initialDia={latestDbp}
              initialBpm={latestBpm}
              onClose={() => setLogModal(null)}
              onSaved={handleMissionSaved}
              onContinueToSymptoms={(sys, dia) => {
                setLogModal(null);
                safeNavigate("/(home)/(health)/log-symptoms", {
                  default_sys: sys,
                  default_dia: dia,
                });
              }}
              onOpenDiary={() => {
                setLogModal(null);
                safeNavigate("/(home)/(meals)/daily-diary");
              }}
            />

            <FacilityMapModal
              visible={mapVisible}
              onClose={() => setMapVisible(false)}
              onOpenFull={() => {
                setMapVisible(false);
                safeNavigate("/locator");
              }}
            />

            {/* ── Locator CTA ── */}
            <Reanimated.View entering={FadeInDown.delay(680).duration(300)}>
            <TactileCard
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Find a healthcare facility. Show the closest Cebu clinics on a map."
              onPress={() => {
                Haptics.selectionAsync();
                setMapVisible(true);
              }}
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
            </Reanimated.View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}