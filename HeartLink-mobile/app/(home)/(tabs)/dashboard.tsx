import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from '@tanstack/react-query';
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
  DeviceEventEmitter,
} from "react-native";
import Reanimated, { FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { getCompanionGreeting, getCompanionLine, CompanionGreetingResult } from "../../../services/companionService";
import { voiceGreeting } from "../../../services/companionCopy";
import { useNetInfo } from "@react-native-community/netinfo";
import { useToast } from "../../../contexts/ToastContext";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { MissionList, type MissionId, type MissionItem } from "../../../components/dashboard/MissionList";
import { MissionLogModal } from "../../../components/dashboard/MissionLogModal";
import { QuickLogModal } from "../../../components/exercise/QuickLogModal";
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
import { RitualProgress } from "../../../components/dashboard/RitualProgress";


const base_url = process.env.EXPO_PUBLIC_API_URL;


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
  const slateTheme = {
    barColor: isDark ? "#475569" : "#94a3b8",
    badgeBg: isDark ? "rgba(30, 41, 59, 0.6)" : "#f1f5f9",
    badgeBorder: isDark ? "#334155" : "#e2e8f0",
    badgeText: isDark ? "#94a3b8" : "#64748b",
    dotColor: isDark ? "#94a3b8" : "#64748b",
  };

  if (!score || score === 0) {
    return { label: "Score unavailable", ...slateTheme };
  }
  if (score >= 80)
    return {
      label: "Stable",
      barColor: "#34d399", // Emerald 400
      badgeBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
      badgeBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
      badgeText: isDark ? "#34d399" : "#059669",
      dotColor: isDark ? "#34d399" : "#059669",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: "#34d399", // Emerald 400
      badgeBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
      badgeBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
      badgeText: isDark ? "#34d399" : "#059669",
      dotColor: isDark ? "#34d399" : "#059669",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      barColor: "#34d399", // Emerald 400
      badgeBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
      badgeBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
      badgeText: isDark ? "#34d399" : "#059669",
      dotColor: isDark ? "#34d399" : "#059669",
    };
  return {
    label: "Critical",
    barColor: "#34d399", // Emerald 400
    badgeBg: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
    badgeBorder: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
    badgeText: isDark ? "#34d399" : "#059669",
    dotColor: isDark ? "#34d399" : "#059669",
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

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, user, logout } = useUser();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [companion, setCompanion] = useState<CompanionGreetingResult | null>(null);
  // Varnished (LLM) variant of the voiced greeting line, when available.
  const [companionAi, setCompanionAi] = useState<string | null>(null);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);

  const isNavigatingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

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

  const fetchDashboardData = async () => {
    if (!userId) return null;
    const storedToken = await AsyncStorage.getItem("access_token");
    const effectiveToken = token || storedToken || "";

    const response = await fetch(`${base_url}/api/dashboard/me`, {
      headers: {
        "Authorization": `Bearer ${effectiveToken}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      await logout();
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard");
    }

    return response.json();
  };

  const { data, isLoading, isError: error, refetch, isRefetchError, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: fetchDashboardData,
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        refetch();
      }
    }, [userId, refetch])
  );

  const refreshError = isRefetchError; // Map React Query state to existing logic
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  useEffect(() => {
    const subStart = DeviceEventEmitter.addListener("sync_started", () => {
      setIsSyncingOffline(true);
    });
    const subComplete = DeviceEventEmitter.addListener("sync_complete", () => {
      setIsSyncingOffline(false);
      console.log("[Dashboard] Background sync complete, refreshing data...");
      refetch();
    });
    const subSuccess = DeviceEventEmitter.addListener("offline_data_synced", (count: number) => {
      showToast({
        title: "Sync Successful",
        message: `${count} offline ${count === 1 ? 'activity' : 'activities'} synced.`,
        type: "success"
      });
    });
    return () => {
      subStart.remove();
      subComplete.remove();
      subSuccess.remove();
    };
  }, [refetch, showToast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
  const vitalsLogged = !!data?.today_activity?.vitals_logged;
  const completedCount = [mealsLogged, exerciseLogged, sleepLogged, vitalsLogged].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const movementMins = data?.today_activity?.total_exercise_minutes || 0;
  const movementGoal = (data as any)?.thresholds?.active_minutes_goal || 30;
  const streakDays = typeof data?.streak?.current_streak === "number" ? data.streak.current_streak : 0;

  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Mission log modal (replaces the old inline dropdowns).
  // Exercise keeps its separate screen and never opens the modal.
  const [logModal, setLogModal] = useState<null | "vitals" | "meals" | "sleep">(null);

  const handleQuickLogClose = useCallback((success?: boolean) => {
    setShowQuickLogModal(false);
    if (success) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      refetch();
    }
  }, [refetch]);

  const handleMissionSaved = useCallback(() => {
    setLogModal(null);
    refetch();
  }, [refetch]);

  const handleMissionPress = useCallback(
    (id: MissionId) => {
      if (id === "exercise") {
        setShowQuickLogModal(true);
        return;
      }
      if (id === "vitals") {
        safeNavigate("/(home)/(health)/log-symptoms");
        return;
      }
      setLogModal(id);
    },
    [safeNavigate]
  );

  const missionItems: MissionItem[] = [
    {
      id: "vitals",
      title: "Blood pressure",
      subtitle: vitalsLogged
        ? data?.latest_vitals?.bp
          ? `Recorded: ${data.latest_vitals.bp} mmHg${data?.latest_vitals?.bpm ? ` • ${data.latest_vitals.bpm} BPM` : ""}`
          : "Daily check-in recorded today"
        : "Morning check due today",
      icon: "heart",
      tileColors: ["#9E4E5F", "#BF7E8C"],
      done: vitalsLogged,
    },
    {
      id: "meals",
      title: "Meals",
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
      title: "Movement",
      subtitle: `${movementMins} of ${movementGoal} mins completed today`,
      icon: "activity",
      tileColors: ["#3D6494", "#6488B0"],
      done: exerciseLogged,
    },
    {
      id: "sleep",
      title: "Sleep",
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
    refetch();
  }, [refetch]);
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
      } catch { }
    };
    checkTutorial();
  }, [userId]);

  const handleFinishTutorial = async () => {
    setTutorialVisible(false);
    try {
      const tourKey = userId ? `@dashboard_tour_seen_${userId}` : "@dashboard_tour_seen_guest";
      await AsyncStorage.setItem(tourKey, "true");
    } catch { }
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

  // React Query handles isolation automatically by including userId in the queryKey.



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
    shadowOpacity: isDark ? 0.35 : 0.04,
    shadowRadius: 12,
    elevation: 2,
  };

  if (isLoading && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-[#F3F5F7] dark:bg-[#0b1120]">
        <Header showProfile={false} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-40 md:max-w-2xl lg:max-w-4xl mx-auto w-full gap-5"
        >
          <View className="pt-1">
            <Skeleton className="w-40 h-4 rounded-md mb-2 bg-[#DCE3DF] dark:bg-slate-800" />
            <Skeleton className="w-28 h-7 rounded-lg bg-[#DCE3DF] dark:bg-slate-800" />
          </View>

          <View className="bg-surface-card rounded-3xl p-5 items-center shadow-sm shadow-slate-200/50 dark:shadow-none">
            <Skeleton className="w-28 h-6 rounded-full mb-4 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="w-44 h-44 rounded-full bg-slate-200 dark:bg-slate-700" />
          </View>

          <View className="bg-surface-card rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <Skeleton className="w-36 h-4 rounded-md mb-3 bg-slate-200 dark:bg-slate-700" />
            <View className="gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-full h-14 rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </View>
          </View>

          {/* Recommendations Skeleton */}
          <View className="mt-2">
            <Skeleton className="w-36 h-4 rounded-md mb-3 bg-[#DCE3DF] dark:bg-slate-800" />
            <View className="flex-row gap-3">
              <Skeleton className="w-52 h-32 rounded-3xl bg-[#DCE3DF] dark:bg-slate-800" />
              <Skeleton className="w-52 h-32 rounded-3xl bg-[#DCE3DF] dark:bg-slate-800" />
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (error && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-[#F3F5F7] dark:bg-[#0b1120]">
        <Header showProfile={false} />
        <View className="flex-1 justify-center items-center px-5">
          <View className="bg-surface-card rounded-3xl p-8 items-center w-full max-w-sm shadow-sm shadow-slate-200/50 dark:shadow-none">
            <View className="w-14 h-14 rounded-3xl bg-[#8A1F1A]/10 items-center justify-center mb-4">
              <Feather name="wifi-off" size={24} color="#8A1F1A" />
            </View>
            <Text className="text-[18px] font-bold text-slate-700 dark:text-white mb-1 text-center">
              Unable to load dashboard
            </Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Check your connection and try again.
            </Text>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => refetch()}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try again to load dashboard"
              className="bg-[#E8532E] px-6 py-3 rounded-xl flex-row items-center gap-2 shadow-xs"
            >
              <Feather name="refresh-cw" size={14} color="#ffffff" />
              <Text className="text-white font-bold text-[14px]">Try again</Text>
            </TouchableOpacity>
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
        ref={scrollViewRef}
        contentContainerClassName="px-5 pb-40 md:max-w-2xl lg:max-w-4xl mx-auto w-full gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B6E63"
            progressViewOffset={50}
          />
        }
      >
        {/* ── Background Refresh Error Banner ── */}
        {refreshError && !isOffline && (
          <View className="mx-5 mt-3 bg-[#FDEEE9] dark:bg-[#8A1F1A]/25 border border-[#E8532E]/30 px-4 py-2.5 rounded-3xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Feather name="alert-circle" size={14} color="#8A1F1A" />
              <Text className="text-[12px] text-[#8A1F1A] dark:text-[#E0958B] font-medium">
                Couldn't refresh your latest data.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => refetch()}
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

        {/* ── Syncing Banner ── */}
        {isSyncingOffline && !isOffline && (
          <Reanimated.View entering={FadeInDown.duration(200)} className="mx-5 mt-3 bg-[#E2F1ED] dark:bg-[#1B6E63]/20 border border-[#1B6E63]/30 px-4 py-2 rounded-xl flex-row items-center justify-center gap-2">
            <Feather name="refresh-cw" size={13} color="#1B6E63" />
            <Text className="text-[12px] font-medium text-[#1B6E63] dark:text-[#4FA79A]">
              Syncing offline data...
            </Text>
          </Reanimated.View>
        )}

        {/* ── Critical Health Alert Banner (Tap to re-open modal) ── */}
        {isAlertActive && (
          <TouchableOpacity activeOpacity={0.8}
            onPress={() => setAlertModalVisible(true)}
            className="mx-5 mt-3 bg-[#FBEAE9] dark:bg-[#8A1F1A]/25 border border-[#8A1F1A]/30 rounded-3xl p-4 flex-row items-center gap-3"
            style={cardShadowStyle}
          >
            <View className="w-10 h-10 rounded-xl bg-[#8A1F1A]/10 dark:bg-[#8A1F1A]/25 items-center justify-center flex-shrink-0">
              <Feather name="alert-triangle" size={20} color="#8A1F1A" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-[#8A1F1A] dark:text-[#E0958B] uppercase tracking-wider mb-0.5">
                Active Health Alert
              </Text>
              <Text className="text-[13px] text-slate-700 dark:text-white font-medium leading-snug" numberOfLines={2}>
                {data?.latest_alert?.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8A1F1A" />
          </TouchableOpacity>
        )}

        {/* ── Clean Greeting ── */}
        <Reanimated.View entering={FadeInDown.duration(280)} className="pt-3 pb-1">
          <Text className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {getGreeting(data?.user?.first_name || user?.first_name)}
          </Text>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. UNIFIED HERO CARD (HEART HEALTH SCORE) - ALWAYS VISIBLE */}
        {/* ============================================================== */}
        <Reanimated.View
          entering={FadeInDown.delay(100).duration(260)}
          className="bg-surface-card rounded-3xl p-5 items-center shadow-sm shadow-slate-200/50 dark:shadow-none"
        >
          {/* Header Row: Status badge + Distinct Info Button */}
          <View className="flex-row items-center justify-center gap-2">
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setScoreModalVisible(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Heart Health, ${theme.label}. Tap for info on stability score.`}
              accessibilityHint="Opens explanation of your heart health stability score"
              className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F7F5] dark:bg-slate-800/80 border border-slate-100/70 dark:border-slate-700/60"
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
              className="w-8 h-8 rounded-full items-center justify-center bg-[#F3F7F5] dark:bg-slate-800/80 border border-slate-100/70 dark:border-slate-700/60"
            >
              <Feather
                name="info"
                size={18}
                color={isDark ? "#94A3B8" : "#2D554D"}
              />
            </TouchableOpacity>
          </View>

          {/* Centered Score Ring */}
          <View className="items-center justify-center my-0">
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
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: "rgba(138, 31, 26, 0.15)",
                    opacity: glowOpacity,
                  }}
                />
              )}
              <ScoreRing
                score={hssScore}
                size={240}
                color={theme.dotColor}
                refreshTrigger={dataUpdatedAt}
                celebrateTrigger={completedCount}
                systolic={latestSbp}
                diastolic={latestDbp}
                bpm={latestBpm}
                streakDays={streakDays}
                trend={data?.latest_vitals?.trend}
              />
            </Animated.View>
          </View>

          {/* AI / Clinical Insight banner */}
          {data?.insight && (
            <View className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700/50 flex-row items-start gap-3 mt-2">
              <Feather
                name={(data.insight.icon || "zap") as any}
                size={15}
                color={
                  data.insight.icon === "trending-down"
                    ? "#f43f5e" // rose-500
                    : data.insight.icon === "trending-up"
                      ? "#10b981" // emerald-500
                      : "#64748b" // slate-500
                }
                style={{ marginTop: 2 }}
              />
              <Text className="flex-1 text-[12.5px] text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
                <Text className="font-bold text-slate-700 dark:text-white">{data.insight?.title || ""}{" "}</Text>
                {data.insight.body}
              </Text>
            </View>
          )}
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 2. TODAY'S 4 HEART MISSIONS & HABIT CENTER (UNIFIED HUB) */}
        {/* ============================================================== */}
        <Reanimated.View
          entering={FadeInDown.delay(180).duration(260)}
          className="mt-4"
        >
          <RitualProgress
            completedCount={completedCount}
            missedCount={Math.max(0, 4 - completedCount)}
            totalSod={data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0}
            satFat={data?.nutrition_budget?.sat_fat?.consumed_g ?? 0}
            movementMins={movementMins}
            movementGoal={movementGoal}
          />
          <MissionList missions={missionItems} onPress={handleMissionPress} />
        </Reanimated.View>



        {isCritical ? (
          <View
            className="mt-5 mb-4 bg-surface-card rounded-3xl p-5 border-0 shadow-sm shadow-slate-200/50 dark:shadow-none"
          >
            <View className="flex-row items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Feather name="shield" size={16} color="#f43f5e" />
              <Text className="text-[13px] font-bold text-rose-500 uppercase tracking-wider">
                Calm Clinical Guidance • Take a Breather
              </Text>
            </View>
            <Text className="text-[14px] font-bold text-slate-700 dark:text-white mb-1">
              Elevated indicators detected. Please don't worry.
            </Text>
            <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-3">
              A single high reading can be caused by temporary stress, exertion, or caffeine. Follow these steps:
            </Text>
            <View className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-3.5 mb-3.5 gap-2.5 border border-slate-100 dark:border-slate-700/50">
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-rose-500/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-rose-500">1</Text>
                </View>
                <Text className="text-[12px] text-slate-700 dark:text-slate-300 font-medium flex-1">
                  Sit comfortably with your back supported and feet flat.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-rose-500/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-rose-500">2</Text>
                </View>
                <Text className="text-[12px] text-slate-700 dark:text-slate-300 font-medium flex-1">
                  Rest quietly for 5 minutes without talking or using screens.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-rose-500/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-rose-500">3</Text>
                </View>
                <Text className="text-[12px] text-slate-700 dark:text-slate-300 font-medium flex-1">
                  Take a second blood pressure measurement.
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2.5">
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => {
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="flex-1 bg-slate-800 dark:bg-slate-700 py-3 px-3 rounded-xl items-center justify-center shadow-sm"
              >
                <Text className="text-white text-[12.5px] font-bold">Re-test Vitals</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => {
                  safeNavigate("/locator");
                }}
                className="flex-1 bg-rose-500 py-3 px-3 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm"
              >
                <Feather name="map-pin" size={13} color="#ffffff" />
                <Text className="text-white text-[12.5px] font-bold">Find Clinic</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* ── Recommendations (hidden when empty) ── */}
            {data?.recommendations && data.recommendations.length > 0 && (
              <View className="mt-6">
                <Reanimated.View entering={FadeInDown.delay(540).duration(300)} className="flex-row items-center justify-between mb-3">
                  <Text className="text-[16px] font-bold text-slate-700 dark:text-white tracking-tight">
                    Recommended for You
                  </Text>
                </Reanimated.View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  contentContainerClassName="gap-3"
                >
                  {data?.recommendations?.map((r: any, idx: number) => (
                    <RecommendationCard
                      key={`${r.type}-${r.id}`}
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
              budgetLimit={data?.nutrition_budget?.sodium?.limit_mg}
              currentSodium={data?.nutrition_budget?.sodium?.consumed_mg}
              onClose={() => setActiveRec(null)}
              onLogged={handleRecLogged}
              onOpenFull={handleRecOpenFull}
            />

            <ScoreExplanationModal
              visible={scoreModalVisible}
              score={hssScore}
              tierLabel={theme.label}
              hasLoggedData={hasHssScore}
              factors={data?.hss_factors}
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
              initialSleepHours={data?.today_activity?.total_sleep_hours}
              onClose={() => setLogModal(null)}
              onSaved={handleMissionSaved}
              onOpenDiary={() => {
                setLogModal(null);
                safeNavigate("/(home)/(meals)/food-diary");
              }}
            />

            <QuickLogModal
              visible={showQuickLogModal}
              onClose={handleQuickLogClose}
            />

            <FacilityMapModal
              visible={mapVisible}
              onClose={() => setMapVisible(false)}
              onOpenFull={() => {
                setMapVisible(false);
                safeNavigate("/locator");
              }}
            />

            {/* ── Unified Care Tools Toolbox ── */}
            <Reanimated.View entering={FadeInDown.delay(680).duration(300)} className="mt-6 mb-8">
              <Text className="text-[14px] font-bold text-slate-700 dark:text-white tracking-tight mb-3 ml-1">
                Care Tools & Settings
              </Text>

              <View className="gap-3">
                {/* Tool 1: Doctor Consultation */}
                <TouchableOpacity activeOpacity={0.75}
                  onPress={() => safeNavigate("/(home)/(tabs)/wrap-up")}
                  className="flex-row items-center bg-surface-card rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none"
                >
                  <View className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-700/50 items-center justify-center mr-4">
                    <Feather name={new Date().getHours() >= 19 ? "moon" : "clipboard"} size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text
                      numberOfLines={1}
                      className="text-[16px] font-bold text-slate-900 dark:text-slate-50 mb-1"
                    >
                      {new Date().getHours() >= 19 ? "Daily Heart Wrap-Up" : "Doctor Consultation"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-medium text-slate-500 dark:text-slate-400"
                    >
                      {new Date().getHours() >= 19
                        ? "Review your vitals for a calm night"
                        : "Prepare data for clinic visits"}
                    </Text>
                  </View>
                  <View className="w-8 h-8 rounded-full items-center justify-center ml-3 bg-slate-100 dark:bg-slate-800">
                    <Feather name="chevron-right" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                  </View>
                </TouchableOpacity>

                {/* Tool 2: Locator */}
                <TouchableOpacity activeOpacity={0.75}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMapVisible(true);
                  }}
                  className="flex-row items-center bg-surface-card rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none"
                >
                  <View className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-700/50 items-center justify-center mr-4">
                    <Feather name="map-pin" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text
                      numberOfLines={1}
                      className="text-[16px] font-bold text-slate-900 dark:text-slate-50 mb-1"
                    >
                      Healthcare Locator
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-medium text-slate-500 dark:text-slate-400"
                    >
                      Find certified cardiac specialists
                    </Text>
                  </View>
                  <View className="w-8 h-8 rounded-full items-center justify-center ml-3 bg-slate-100 dark:bg-slate-800">
                    <Feather name="chevron-right" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                  </View>
                </TouchableOpacity>
              </View>
            </Reanimated.View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
