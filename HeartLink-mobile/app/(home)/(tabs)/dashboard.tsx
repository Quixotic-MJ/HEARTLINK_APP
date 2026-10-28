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
  DeviceEventEmitter,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../../../lib/secureTokenStore";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { DEFAULT_SODIUM_LIMIT_MG } from "../../../services/foodLogging";
import { useNetInfo } from "@react-native-community/netinfo";
import { useToast } from "../../../contexts/ToastContext";

// Import extracted UI components
import { ScoreRing } from "../../../components/dashboard/ScoreRing";
import { MissionList, type MissionId, type MissionItem } from "../../../components/dashboard/MissionList";
import { MissionLogModal } from "../../../components/dashboard/MissionLogModal";
import { LogMealSheet } from "../../../components/dashboard/LogMealSheet";
import { QuickLogModal } from "../../../components/exercise/QuickLogModal";
import {
  RecommendationModal,
  type ActiveRec,
} from "../../../components/dashboard/RecommendationModal";
import { FacilityMapModal } from "../../../components/dashboard/FacilityMapModal";
import { RecommendationCard, recommendationReason, type DashboardRec } from "../../../components/dashboard/RecommendationCard";
import { TodayNote } from "../../../components/dashboard/TodayNote";
import { ScoreCard } from "../../../components/dashboard/ScoreCard";
import { CareTools } from "../../../components/dashboard/CareTools";
import { CheckupBanner, type CheckupReminder } from "../../../components/dashboard/CheckupBanner";
import { useDs } from "../../../components/onboarding/useDs";
import { CustomAlertModal } from "../../../components/dashboard/CustomAlertModal";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { TourSpot, useDashboardTour } from "../../../components/dashboard/DashboardTour";
import { ScoreExplanationModal } from "../../../components/dashboard/ScoreExplanationModal";
import { RitualProgress } from "../../../components/dashboard/RitualProgress";
import { apiFetch } from "../../../lib/api";
import { theme as colors, light as lightColors, dark as darkColors, ds } from "../../../constants/theme";
// ─── Score theme ──────────────────────────────────────────────────────────────
type ScoreTheme = {
  label: string;
  barColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
};

// The heart ring takes its band's colour (it was sky blue for every band): blue, amber, red-orange, dark red.
function ringColor(label: string, isDark: boolean): string {
  const c = isDark ? darkColors : lightColors;
  switch (label) {
    case "Stable":
      return (isDark ? ds.dark : ds.light).line;
    case "Moderate":
      return c.warning;
    case "Elevated Risk":
      return c.dangerMid;
    default:
      return c.dangerSolid;
  }
}

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
      barColor: ringColor("Stable", isDark),
      badgeBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
      badgeBorder: isDark ? "rgba(56, 189, 248, 0.3)" : "#bae6fd",
      badgeText: isDark ? "#38bdf8" : "#0284c7",
      dotColor: isDark ? "#38bdf8" : "#0284c7",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      barColor: ringColor("Moderate", isDark),
      badgeBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
      badgeBorder: isDark ? "rgba(56, 189, 248, 0.3)" : "#bae6fd",
      badgeText: isDark ? "#38bdf8" : "#0284c7",
      dotColor: isDark ? "#38bdf8" : "#0284c7",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      barColor: ringColor("Elevated Risk", isDark),
      badgeBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
      badgeBorder: isDark ? "rgba(56, 189, 248, 0.3)" : "#bae6fd",
      badgeText: isDark ? "#38bdf8" : "#0284c7",
      dotColor: isDark ? "#38bdf8" : "#0284c7",
    };
  return {
    label: "Critical",
    barColor: ringColor("Critical", isDark),
    badgeBg: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
    badgeBorder: isDark ? "rgba(56, 189, 248, 0.3)" : "#bae6fd",
    badgeText: isDark ? "#38bdf8" : "#0284c7",
    dotColor: isDark ? "#38bdf8" : "#0284c7",
  };
}

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let timeStr = "Good Morning";
  if (hour >= 12 && hour < 17) timeStr = "Good Afternoon";
  else if (hour >= 17) timeStr = "Good Evening";
  return name ? `${timeStr}, ${name}` : timeStr;
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { c } = useDs();

  const [nearestClinic, setNearestClinic] = useState<{name: string, distance: string} | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchNearest = async () => {
      try {
        let userLat = 10.3157;
        let userLon = 123.8854;
        
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            userLat = loc.coords.latitude;
            userLon = loc.coords.longitude;
          }
        } catch {}

        if (cancelled) return;

        const res = await apiFetch(`/api/clinics`);
        const data = await res.json();
        
        if (cancelled) return;

        const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        let closest = null;
        let minDistance = Infinity;

        (Array.isArray(data) ? data : []).forEach((c: any) => {
          const lat = Number(c.latitude);
          const lon = Number(c.longitude);
          if (!isNaN(lat) && !isNaN(lon)) {
            const dist = getDistanceKm(userLat, userLon, lat, lon);
            if (dist < minDistance) {
              minDistance = dist;
              closest = {
                name: c.name || "Clinic",
                distance: `${dist.toFixed(1)} km`
              };
            }
          }
        });

        if (closest && !cancelled) {
          setNearestClinic(closest);
        }
      } catch (e) {
        console.log("Failed to fetch nearest clinic", e);
      }
    };
    fetchNearest();
    return () => { cancelled = true; };
  }, []);
  const router = useRouter();
  const { userId, token, user, logout } = useUser();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  // The patient tapped the alert banner to see the popup again.
  const [alertReopened, setAlertReopened] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [showInsight, setShowInsight] = useState(true);
  // HL-057: the review whose checkup reminder the patient hid (a newer review shows it again).
  const checkupHiddenKey = userId ? `@checkup_banner_hidden_${userId}` : null;
  const [hiddenCheckupAt, setHiddenCheckupAt] = useState<string | null>(null);
  useEffect(() => {
    if (!checkupHiddenKey) return;
    AsyncStorage.getItem(checkupHiddenKey).then(setHiddenCheckupAt).catch(() => {});
  }, [checkupHiddenKey]);

  const isNavigatingRef = useRef(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

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
    const storedToken = await getToken();
    const effectiveToken = token || storedToken || "";

    const response = await apiFetch(`/api/dashboard/me`, {
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
  // Weekly score change under the heart ring; today's note says the same thing when there is one.
  const rawTrend = data?.latest_vitals?.trend;
  const scoreTrend =
    !data?.insight && rawTrend && rawTrend !== "0" && rawTrend !== "+0"
      ? `${rawTrend.startsWith("-") ? "Down" : "Up"} ${Math.abs(parseInt(rawTrend, 10))} points this week`
      : null;

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

  const sodiumTodayMg = data?.nutrition_budget?.sodium?.consumed_mg ?? data?.today_activity?.total_sodium_mg ?? 0;
  // The patient's own daily limit (Goals & thresholds), 2,000 mg when not set
  const sodiumLimitMg = data?.nutrition_budget?.sodium?.limit_mg || DEFAULT_SODIUM_LIMIT_MG;
  const movementMins = data?.today_activity?.total_exercise_minutes || 0;
  const movementGoal = (data as any)?.thresholds?.active_minutes_goal || 30;
  const streakDays = typeof data?.streak?.current_streak === "number" ? data.streak.current_streak : 0;

  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

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

  const mealsCount = data?.today_activity?.meals_count || 0;
  const sleepHours = data?.today_activity?.total_sleep_hours;
  const missionItems: MissionItem[] = [
    {
      id: "vitals",
      title: "Blood pressure",
      subtitle: vitalsLogged
        ? data?.latest_vitals?.bp
          ? `${data.latest_vitals.bp} mmHg${data?.latest_vitals?.bpm ? `, ${data.latest_vitals.bpm} bpm` : ""}`
          : "Checked in today"
        : "Morning check due today",
      done: vitalsLogged,
    },
    {
      id: "meals",
      title: "Meals",
      subtitle: mealsLogged
        ? `${mealsCount} logged, ${Number(sodiumTodayMg).toLocaleString()} of ${sodiumLimitMg.toLocaleString()} mg sodium`
        : "Nothing logged yet today",
      done: mealsLogged,
    },
    {
      id: "exercise",
      title: "Movement",
      subtitle: `${movementMins} of ${movementGoal} minutes`,
      done: exerciseLogged,
      progress: movementGoal ? (movementMins / movementGoal) * 100 : 0,
    },
    {
      id: "sleep",
      title: "Sleep",
      subtitle: sleepLogged
        ? typeof sleepHours === "number"
          ? `${sleepHours} hours logged`
          : "Logged today"
        : "Aim for 7 to 9 hours",
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
        safeNavigate("/(home)/(health)/exercise-session", { id: rec.id });
      }
    },
    [safeNavigate]
  );

  // ── First-visit tour (tips drawn inside the page, see DashboardTour) ──
  const tourKey = userId ? `@dashboard_tour_seen_${userId}` : "@dashboard_tour_seen_guest";

  // Scroll so the section's tip sits just under the top bar. Both positions are measured on the
  // same screen, so their difference plus the current scroll is the place in the page.
  const scrollTourSpotIntoView = useCallback((spot: View) => {
    const scroller = scrollViewRef.current?.getNativeScrollRef();
    if (!scroller) return;
    scroller.measureInWindow((_x, scrollTop) => {
      spot.measureInWindow((_sx, spotTop) => {
        const y = spotTop - scrollTop + scrollOffsetRef.current;
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: !reduceMotion });
      });
    });
  }, [reduceMotion]);

  const { tour, start: startTour } = useDashboardTour({
    // The recommendations only show when there are some and the score isn't critical.
    shown: {
      score: true,
      note: !!data?.insight,
      missions: true,
      vitals: true,
      summary: !isCritical && (data?.recommendations?.length ?? 0) > 0,
      care: !isCritical,
    },
    onShown: scrollTourSpotIntoView,
    onFinish: () => {
      AsyncStorage.setItem(tourKey, "true").catch(() => {});
    },
  });

  // Start the tour once the dashboard has loaded, unless this patient has already seen it.
  const dashboardReady = !!data;
  useEffect(() => {
    if (!dashboardReady) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(tourKey)
      .then((seen) => {
        if (cancelled || seen) return;
        // Give the sections a moment to finish their entrance animation first.
        timer = setTimeout(startTour, 900);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tourKey, dashboardReady, startTour]);

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

  // null until the saved list loads, so a dismissed alert doesn't flash back up on every launch.
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[] | null>(null);
  const dismissedAlertsKey = userId ? `@dismissed_alert_ids_${userId}` : "@dismissed_alert_ids_guest";

  useEffect(() => {
    AsyncStorage.getItem(dismissedAlertsKey)
      .then((res) => {
        try {
          setDismissedAlertIds(res ? JSON.parse(res) : []);
        } catch {
          setDismissedAlertIds([]);
        }
      })
      .catch(() => setDismissedAlertIds([]));
  }, [dismissedAlertsKey]);

  const handleDismissAlert = async (alertId?: string) => {
    setAlertReopened(false);
    if (!alertId) return;
    const saved = dismissedAlertIds ?? [];
    if (!saved.includes(alertId)) {
      const updated = [...saved, alertId];
      setDismissedAlertIds(updated);
      await AsyncStorage.setItem(dismissedAlertsKey, JSON.stringify(updated));
    }
  };

  // Auto-show the alert popup ONLY if the patient hasn't dismissed it yet
  const latestAlertId = data?.latest_alert?.id;
  const alertModalVisible =
    alertReopened || (!!latestAlertId && !isLoading && !!dismissedAlertIds && !dismissedAlertIds.includes(latestAlertId));

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
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-background">
        <Header showProfile={false} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pt-3 pb-40 md:max-w-2xl lg:max-w-4xl mx-auto w-full gap-5"
        >
          <View className="pt-1">
            <Skeleton className="w-40 h-4 rounded-md mb-2 bg-border" />
            <Skeleton className="w-28 h-7 rounded-lg bg-border" />
          </View>

          <View className="bg-surface rounded-3xl p-5 items-center shadow-sm shadow-slate-200/50 dark:shadow-none">
            <Skeleton className="w-28 h-6 rounded-full mb-4 bg-border" />
            <Skeleton className="w-44 h-44 rounded-full bg-border" />
          </View>

          <View className="bg-surface rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <Skeleton className="w-36 h-4 rounded-md mb-3 bg-border" />
            <View className="gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-full h-14 rounded-xl bg-border" />
              ))}
            </View>
          </View>

          {/* Recommendations Skeleton */}
          <View className="mt-2">
            <Skeleton className="w-36 h-4 rounded-md mb-3 bg-border" />
            <View className="flex-row gap-3">
              <Skeleton className="w-52 h-32 rounded-3xl bg-border" />
              <Skeleton className="w-52 h-32 rounded-3xl bg-border" />
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (error && !data) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-background">
        <Header showProfile={false} />
        <View className="flex-1 justify-center items-center px-5">
          <View className="bg-surface rounded-3xl p-8 items-center w-full max-w-sm shadow-sm shadow-slate-200/50 dark:shadow-none">
            <View className="w-14 h-14 rounded-3xl bg-danger-tint items-center justify-center mb-4">
              <Feather name="wifi-off" size={24} color={colors.danger} />
            </View>
            <Text className="text-[18px] font-bold text-text mb-1 text-center">
              Unable to load dashboard
            </Text>
            <Text className="text-[13px] text-text-soft text-center mb-6 leading-relaxed">
              Check your connection and try again.
            </Text>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => refetch()}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try again to load dashboard"
              className="bg-primary px-6 py-3 rounded-xl flex-row items-center gap-2 shadow-xs"
            >
              <Feather name="refresh-cw" size={14} color={colors.onPrimary} />
              <Text className="text-on-primary font-bold text-[14px]">Try again</Text>
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
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#33CC82"
            progressViewOffset={50}
          />
        }
      >
        {/* ── Background Refresh Error Banner ── */}
        {refreshError && !isOffline && (
          <View className="mx-5 mt-3 bg-danger-tint border border-danger/30 px-4 py-2.5 rounded-3xl flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 pr-2">
              <Feather name="alert-circle" size={14} color={colors.dangerText} />
              <Text className="text-[12px] text-danger-text font-medium">
                Couldn&apos;t refresh your latest data.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => refetch()}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing dashboard"
              className="bg-danger-tint px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[11px] font-bold text-primary dark:text-danger-tint">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Syncing Banner ── */}
        {isSyncingOffline && !isOffline && (
          <Reanimated.View entering={FadeInDown.duration(200)} className="mx-5 mt-3 bg-success-tint border border-success/30 px-4 py-2 rounded-xl flex-row items-center justify-center gap-2">
            <Feather name="refresh-cw" size={13} color={colors.successMid} />
            <Text className="text-[12px] font-medium text-success-text">
              Syncing offline data...
            </Text>
          </Reanimated.View>
        )}

        {/* ── Critical Health Alert Banner (Tap to re-open modal) ── */}
        {isAlertActive && (
          <TouchableOpacity activeOpacity={0.8}
            onPress={() => setAlertReopened(true)}
            className="mx-5 mt-3 bg-danger-tint border border-danger/30 rounded-3xl p-4 flex-row items-center gap-3"
            style={cardShadowStyle}
          >
            <View className="w-10 h-10 rounded-xl bg-danger-tint items-center justify-center flex-shrink-0">
              <Feather name="alert-triangle" size={20} color={colors.dangerText} />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-danger-text uppercase tracking-wider mb-0.5">
                Active Health Alert
              </Text>
              <Text className="text-[13px] text-text font-medium leading-snug" numberOfLines={2}>
                {data?.latest_alert?.message || "Attention required. Tap to view action items."}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.dangerText} />
          </TouchableOpacity>
        )}

        {/* ── HL-057: checkup reminder after a clinician's review (only sent while the setting is on) ── */}
        {data?.checkup_reminder && hiddenCheckupAt !== (data.checkup_reminder.review_completed_at ?? "") ? (
          <CheckupBanner
            reminder={data.checkup_reminder as CheckupReminder}
            onFindClinic={() => safeNavigate("/locator")}
            onHide={() => {
              const at = data.checkup_reminder.review_completed_at ?? "";
              setHiddenCheckupAt(at);
              if (checkupHiddenKey) AsyncStorage.setItem(checkupHiddenKey, at).catch(() => {});
            }}
          />
        ) : null}

        {/* ── Clean Greeting ── */}
        <Reanimated.View entering={FadeInDown.duration(280)} className="pt-3 pb-1">
          <Text className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
            {getGreeting(data?.user?.first_name || user?.first_name)}
          </Text>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 1. TIER 1 - STATUS */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(100).duration(260)}>
          <TourSpot target="score" tour={tour}>
          <ScoreCard
            label={theme.label}
            hasScore={hasHssScore}
            systolic={latestSbp}
            diastolic={latestDbp}
            bpm={latestBpm}
            streakDays={streakDays}
            trend={scoreTrend}
            onExplain={() => {
              Haptics.selectionAsync();
              setScoreModalVisible(true);
            }}
            onLogBloodPressure={() => handleMissionPress("vitals")}
          >
            <Animated.View
              className="items-center justify-center"
              style={{ transform: [{ scale: pulseAnim }] }}
            >
              {isCritical && (
                <Animated.View
                  className="absolute w-[140px] h-[140px] rounded-full bg-danger-tint"
                  style={{ opacity: glowOpacity }}
                />
              )}
              <ScoreRing
                score={hssScore}
                size={240}
                color={theme.barColor}
                refreshTrigger={dataUpdatedAt}
                celebrateTrigger={completedCount}
                systolic={latestSbp}
                diastolic={latestDbp}
                bpm={latestBpm}
                streakDays={streakDays}
              />
            </Animated.View>
          </ScoreCard>
          </TourSpot>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 2. TIER 2 - PROTECT YOUR SCORE TODAY */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(180).duration(260)}>

          {/* Today's note: what changed in the score and one step to take */}
          {data?.insight ? (
            <View style={{ marginBottom: 12 }}>
              <TourSpot target="note" tour={tour}>
                <TodayNote
                  insight={data.insight}
                  hidden={!showInsight}
                  onHide={() => setShowInsight(false)}
                  onShow={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowInsight(true);
                  }}
                  onAction={(action) => {
                    // An emergency-level reading or symptom: Call 911 and the nearest clinics
                    if (action === "see_what_to_do") safeNavigate("/locator");
                    else if (action === "log_vitals" || action === "log_later") handleMissionPress("vitals");
                    else safeNavigate("/(home)/(meals)/food-diary");
                  }}
                />
              </TourSpot>
            </View>
          ) : null}

          <TourSpot target="missions" tour={tour}>
            <MissionList missions={missionItems} onPress={handleMissionPress} />
          </TourSpot>
        </Reanimated.View>

        {/* ============================================================== */}
        {/* 3. TIER 3 - TODAY'S PROGRESS */}
        {/* ============================================================== */}
        <Reanimated.View entering={FadeInDown.delay(260).duration(260)}>
          <TourSpot target="vitals" tour={tour}>
          <RitualProgress
            calories={Number(data?.today_activity?.total_calories) || 0}
            caloriesBurned={Number(data?.today_activity?.total_calories_burned) || 0}
            exercisesNotCounted={Number(data?.today_activity?.exercises_not_counted) || 0}
            cholesterol={Number(data?.nutrition_budget?.cholesterol?.consumed_mg ?? data?.today_activity?.total_cholesterol_mg) || 0}
            cholesterolLimit={Number(data?.nutrition_budget?.cholesterol?.limit_mg) || 200}
            totalSod={sodiumTodayMg}
            sodiumLimit={sodiumLimitMg}
            satFat={data?.nutrition_budget?.sat_fat?.consumed_g ?? data?.today_activity?.total_saturated_fat_g ?? 0}
            satFatLimit={Number(data?.nutrition_budget?.sat_fat?.limit_g) || 13}
            movementMins={movementMins}
            movementGoal={movementGoal}
            mealsLogged={mealsLogged}
            exerciseLogged={exerciseLogged}
            onLogMeal={() => handleMissionPress("meals")}
          />
          </TourSpot>
        </Reanimated.View>



        {isCritical ? (
          <View
            className="mt-5 mb-4 bg-surface rounded-3xl p-5 border-0 shadow-sm shadow-slate-200/50 dark:shadow-none"
          >
            <View className="flex-row items-center gap-2 mb-2 pb-2 border-b border-border dark:border-borderStrong">
              <Feather name="shield" size={16} color={colors.danger} />
              <Text className="text-[13px] font-bold text-danger-text uppercase tracking-wider">
                Calm Clinical Guidance • Take a Breather
              </Text>
            </View>
            <Text className="text-[14px] font-bold text-text mb-1">
              Elevated indicators detected. Please don&apos;t worry.
            </Text>
            <Text className="text-[12px] text-text-soft leading-relaxed font-medium mb-3">
              A single high reading can be caused by temporary stress, exertion, or caffeine. Follow these steps:
            </Text>
            <View className="bg-surface-alt dark:bg-surface-alt/50 rounded-3xl p-3.5 mb-3.5 gap-2.5 border border-border dark:border-border">
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-danger-tint/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-danger-text">1</Text>
                </View>
                <Text className="text-[12px] text-text font-medium flex-1">
                  Sit comfortably with your back supported and feet flat.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-danger-tint/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-danger-text">2</Text>
                </View>
                <Text className="text-[12px] text-text font-medium flex-1">
                  Rest quietly for 5 minutes without talking or using screens.
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-danger-tint/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-danger-text">3</Text>
                </View>
                <Text className="text-[12px] text-text font-medium flex-1">
                  Take a second blood pressure measurement.
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2.5">
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => {
                  safeNavigate("/(home)/(health)/log-symptoms");
                }}
                className="flex-1 bg-slate-800 dark:bg-surface py-3 px-3 rounded-xl items-center justify-center shadow-sm"
              >
                <Text className="text-onPrimary text-[12.5px] font-bold">Re-test Vitals</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => {
                  safeNavigate("/locator");
                }}
                className="flex-1 bg-danger-tint py-3 px-3 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm"
              >
                <Feather name="map-pin" size={13} color={colors.onPrimary} />
                <Text className="text-onPrimary text-[12.5px] font-bold">Find Clinic</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* ── Recommendations (hidden when empty) ── */}
            {data?.recommendations && data.recommendations.length > 0 && (
              <TourSpot target="summary" tour={tour}>
                <Reanimated.View entering={FadeInDown.delay(340).duration(300)} className="flex-row items-center justify-between mb-3">
                  <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
                    Picked for your score
                  </Text>
                  <TouchableOpacity
                    onPress={() => safeNavigate("/(home)/(tabs)/explore")}
                    accessibilityRole="link"
                    accessibilityLabel="See all picks in Explore"
                    style={{ height: 44, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "500", color: c.link }}>See all</Text>
                  </TouchableOpacity>
                </Reanimated.View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  style={{ marginRight: -20 }}
                  contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                >
                  {data?.recommendations?.map((r: DashboardRec) => (
                    <RecommendationCard
                      key={`${r.type}-${r.id}`}
                      rec={r}
                      reason={recommendationReason(r, {
                        sodiumLeftMg: sodiumLimitMg - sodiumTodayMg,
                        movementLeftMins: Math.max(0, movementGoal - movementMins),
                      })}
                      onPress={() => {
                        if (r.type === "recipe" || r.type === "exercise") {
                          Haptics.selectionAsync();
                          setActiveRec({
                            id: String(r.id),
                            type: r.type,
                            tag: r.tag,
                            title: r.title,
                            subtitle: r.subtitle ?? "",
                          });
                        }
                      }}
                    />
                  ))}
                </ScrollView>
              </TourSpot>
            )}

            <RecommendationModal
              visible={activeRec !== null}
              rec={activeRec}
              today={{
                sodiumMg: sodiumTodayMg,
                sodiumLimitMg: sodiumLimitMg,
                caloriesEaten: Number(data?.today_activity?.total_calories) || 0,
                cholesterolMg: Number(data?.nutrition_budget?.cholesterol?.consumed_mg ?? data?.today_activity?.total_cholesterol_mg) || 0,
                cholesterolLimitMg: Number(data?.nutrition_budget?.cholesterol?.limit_mg) || 200,
                movementMins,
                movementGoal,
              }}
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
              mission={logModal === "meals" ? null : logModal}
              userId={userId}
              token={token}
              initialSleepHours={data?.today_activity?.total_sleep_hours}
              onClose={() => setLogModal(null)}
              onSaved={handleMissionSaved}
            />

            <LogMealSheet
              visible={logModal === "meals"}
              userId={userId}
              token={token}
              sodiumLeftMg={sodiumLimitMg - sodiumTodayMg}
              mealsToday={data?.today_activity?.meals_count || 0}
              onClose={() => setLogModal(null)}
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

            {/* ── Care tools ── */}
            <Reanimated.View entering={FadeInDown.delay(420).duration(300)} className="mb-8">
              <TourSpot target="care" tour={tour}>
                <CareTools
                  nearestClinic={nearestClinic}
                  onOpenSummary={() => safeNavigate("/(home)/(tabs)/consultation-summary")}
                  onOpenClinics={() => {
                    setMapVisible(true);
                    Haptics.selectionAsync();
                  }}
                />
              </TourSpot>
            </Reanimated.View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
