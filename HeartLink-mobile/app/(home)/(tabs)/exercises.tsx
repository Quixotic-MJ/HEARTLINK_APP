import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export interface Routine {
  id: string;
  title: string;
  duration: number;
  goal: string;
  type: string;
  intensity: string;
  category: string;
  image?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveMediaUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = base_url?.endsWith("/") ? base_url.slice(0, -1) : base_url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase || "http://localhost:8000"}${cleanPath}`;
}

function getTypeConfig(type: string) {
  if (type === "Breathing")
    return { icon: "wind" as const, color: "#BE185D", bg: "#FDF2F8" };
  if (type === "Stationary")
    return { icon: "anchor" as const, color: "#0369A1", bg: "#E0F2FE" };
  return { icon: "activity" as const, color: "#15803D", bg: "#DCFCE7" };
}

const STATUS_CONFIG = {
  Stable: {
    badgeBg: "#F0FDF4",
    badgeText: "#166534",
  },
  Moderate: {
    badgeBg: "#FFFBEB",
    badgeText: "#B45309",
  },
  "Elevated Risk": {
    badgeBg: "#FFF7ED",
    badgeText: "#C2410C",
  },
  Critical: {
    badgeBg: "#FEF2F2",
    badgeText: "#B91C1C",
  },
} as const;

// ─── Day Labels ───────────────────────────────────────────────────────────────
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── Routine Card (Premium Apple Fitness Style) ───────────────────────────────

function RoutineCard({
  routine,
  onPress,
  isCompleted,
  isPartial,
  isFeatured = false,
}: {
  routine: Routine;
  onPress: () => void;
  isCompleted: boolean;
  isPartial?: boolean;
  isFeatured?: boolean;
}) {
  const cfg = getTypeConfig(routine.type);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="rounded-3xl overflow-hidden mb-5"
      style={{
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "rgba(232,236,234,0.6)",
        ...Platform.select({
          ios: {
            shadowColor: isFeatured ? "#E8532E" : "#000",
            shadowOffset: { width: 0, height: isFeatured ? 6 : 4 },
            shadowRadius: isFeatured ? 20 : 16,
            shadowOpacity: isFeatured ? 0.1 : 0.08,
          },
          android: {
            elevation: isFeatured ? 6 : 4,
          },
        }),
      }}
    >
      {/* Thumbnail */}
      <View className={`${isFeatured ? "h-48" : "h-36"} bg-[#F1F5F3] relative items-center justify-center`}>
        {routine.image ? (
          <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
        ) : (
          <Feather name="image" size={32} color="#D1D9D5" />
        )}
        
        {/* Soft overlay */}
        <View className="absolute inset-0 bg-slate-900/10" />

        <View
          className="absolute top-4 left-4 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 4,
                shadowOpacity: 0.08,
              },
              android: { elevation: 2 },
            }),
          }}
        >
          <Feather name="clock" size={12} color="#334155" />
          <Text className="text-[12px] font-semibold text-[#334155]">
            {routine.duration} min
          </Text>
        </View>

        <View
          className="absolute top-4 right-4 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: cfg.bg }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: cfg.color }}
          >
            {routine.type}
          </Text>
        </View>

        {isCompleted && (
          <View className="absolute inset-0 bg-white/80 backdrop-blur-sm items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center border border-green-200">
              <Feather name="check" size={26} color="#16A34A" />
            </View>
            <Text className="text-green-700 font-bold mt-2 text-[15px]">Completed</Text>
          </View>
        )}
        
        {isPartial && !isCompleted && (
          <View className="absolute inset-0 bg-white/80 backdrop-blur-sm items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center border border-amber-200">
              <Feather name="activity" size={26} color="#D97706" />
            </View>
            <Text className="text-amber-700 font-bold mt-2 text-[15px]">Partial Activity</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className={`p-5 ${isFeatured ? "bg-rose-50/20" : "bg-white"}`}>
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-[18px] font-bold text-[#152131] leading-snug mb-1.5">
              {routine.title}
            </Text>
            <Text className="text-[14px] text-[#64748B] leading-relaxed" numberOfLines={2}>
              {routine.goal}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center gap-2">
            <View
              className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: "#F4F7F5" }}
            >
              <Feather name="activity" size={12} color="#64748B" />
              <Text className="text-[11px] font-bold text-[#5C6B66] uppercase tracking-wider">
                {routine.intensity} Intensity
              </Text>
            </View>
          </View>
          
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: isFeatured ? "#1B6E63" : "#F1F5F3",
            }}
          >
            <Feather name="arrow-right" size={18} color={isFeatured ? "#FFFFFF" : "#475569"} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExercisesScreen({
  hideHeader = false,
  isEmbedded = false,
}: {
  hideHeader?: boolean;
  isEmbedded?: boolean;
} = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ completedId?: string; durationSeconds?: string }>();
  const { userId, token } = useUser();

  const [routinesList, setRoutinesList] = useState<Routine[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [dashboardFailed, setDashboardFailed] = useState(false);
  
  const [hssScore, setHssScore] = useState<number>(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [partialExercises, setPartialExercises] = useState<string[]>([]);
  const [weeklyConsistency, setWeeklyConsistency] = useState<{ count: number; days: boolean[]; labels: string[] }>({
    count: 0,
    days: Array(7).fill(false),
    labels: ["M", "T", "W", "T", "F", "S", "S"],
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>("All");

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const exercisesCacheKey = userId ? `@exercises_cache_${userId}` : "@exercises_cache";
  const hssCacheKey = userId ? `@exercises_cache_hss_${userId}` : "@exercises_cache_hss";

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setError(false);
    try {
      const [routinesRes, dashboardRes, logsRes] = await Promise.all([
        fetch(`${base_url}/api/exercises/`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        }).catch(() => null),
        fetch(`${base_url}/api/dashboard/me`, {
          headers: { "Authorization": `Bearer ${token || ""}` }
        }).catch(() => null),
        fetch(`${base_url}/api/exercises/logs/${userId}`, {
          headers: { "Authorization": `Bearer ${token || ""}` }
        }).catch(() => null)
      ]);

      if (routinesRes && routinesRes.ok) {
        const data = await routinesRes.json();
        const mapped: Routine[] = data.map((r: any) => ({
          id: r.id,
          title: r.name || "",
          duration: r.duration_minutes || 0,
          goal: r.goal || r.description || "",
          type: r.type || "Light Cardio",
          intensity: r.intensity || "Low",
          category: r.hss_tier || "Stable",
          image: resolveMediaUrl(r.media_url || r.image_url || ""),
        }));
        setRoutinesList(mapped);
        setIsOffline(false);
        await AsyncStorage.setItem(exercisesCacheKey, JSON.stringify(mapped)).catch(() => {});
      } else {
        throw new Error("Failed to fetch fresh routines from network");
      }
      
      if (dashboardRes && dashboardRes.ok) {
        setDashboardFailed(false);
        const dash = await dashboardRes.json();
        if (dash.hss_score !== undefined && dash.hss_score !== null) {
          setHssScore(dash.hss_score);
          await AsyncStorage.setItem(
            hssCacheKey,
            JSON.stringify({ score: dash.hss_score, tier: dash.hss_tier || null })
          ).catch(() => {});
        }
      } else {
        setDashboardFailed(true);
        // Defensive fallback hydration when dashboard endpoint fails or times out (HL-ENG-13)
        try {
          const cachedHssStr = await AsyncStorage.getItem(hssCacheKey);
          if (cachedHssStr) {
            const parsedHss = JSON.parse(cachedHssStr);
            if (parsedHss && typeof parsedHss.score === "number") {
              setHssScore(parsedHss.score);
            }
          } else if (userId) {
            const dashCache = await AsyncStorage.getItem(`@dashboard_cache_${userId}`);
            if (dashCache) {
              const parsedDash = JSON.parse(dashCache);
              if (parsedDash && typeof parsedDash.hss_score === "number") {
                setHssScore(parsedDash.hss_score);
              }
            }
          }
        } catch {}
      }
      
      if (logsRes && logsRes.ok) {
        const data = await logsRes.json();
        const todayStr = new Date().toDateString();
        
        const completedIds = data
          .filter((log: any) => new Date(log.logged_at).toDateString() === todayStr && log.status === "completed")
          .map((log: any) => log.routine_id);
          
        const partialIds = data
          .filter((log: any) => new Date(log.logged_at).toDateString() === todayStr && (log.status === "partial" || log.status === "incomplete_due_to_symptoms"))
          .map((log: any) => log.routine_id);
          
        setCompletedExercises(completedIds);
        setPartialExercises(partialIds);

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        const startOfWeek = new Date(now.getTime() - 6 * oneDay);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const days = Array(7).fill(false);
        const labels: string[] = [];
        let count = 0;
        
        for (let i = 0; i < 7; i++) {
          const targetDate = new Date(startOfWeek.getTime() + i * oneDay);
          const targetDateStr = targetDate.toDateString();
          labels.push(targetDate.toLocaleDateString("en-US", { weekday: "narrow" }));
          const hasMeaningful = data.some((log: any) => 
            new Date(log.logged_at).toDateString() === targetDateStr &&
            log.status !== "abandoned" &&
            (log.duration_seconds !== undefined && log.duration_seconds !== null ? log.duration_seconds >= 30 : (log.duration_minutes || 0) >= 1)
          );
          days[i] = hasMeaningful;
          if (hasMeaningful) count++;
        }
        setWeeklyConsistency({ count, days, labels });
      }
    } catch (error) {
      if (__DEV__) {
        console.log("Network error loading routines, checking offline cache...", error);
      }
      try {
        const cachedHssStr = await AsyncStorage.getItem(hssCacheKey);
        if (cachedHssStr) {
          const parsedHss = JSON.parse(cachedHssStr);
          if (parsedHss && typeof parsedHss.score === "number") {
            setHssScore(parsedHss.score);
          }
        } else if (userId) {
          const dashCache = await AsyncStorage.getItem(`@dashboard_cache_${userId}`);
          if (dashCache) {
            const parsedDash = JSON.parse(dashCache);
            if (parsedDash && typeof parsedDash.hss_score === "number") {
              setHssScore(parsedDash.hss_score);
            }
          }
        }

        const cached = await AsyncStorage.getItem(exercisesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoutinesList(parsed);
            setIsOffline(true);
            setError(false);
            return;
          }
        }
      } catch (cacheErr) {
        if (__DEV__) {
          console.error("Failed to read exercise offline cache:", cacheErr);
        }
      }
      setError(true);
    }
  }, [userId, token, exercisesCacheKey, hssCacheKey]);

  useFocusEffect(
    useCallback(() => {
      async function initialLoad() {
        // Read local offline cache first for instant UI availability
        try {
          const cachedHssStr = await AsyncStorage.getItem(hssCacheKey);
          if (cachedHssStr) {
            const parsedHss = JSON.parse(cachedHssStr);
            if (parsedHss && typeof parsedHss.score === "number") {
              setHssScore(parsedHss.score);
            }
          } else if (userId) {
            const dashCache = await AsyncStorage.getItem(`@dashboard_cache_${userId}`);
            if (dashCache) {
              const parsedDash = JSON.parse(dashCache);
              if (parsedDash && typeof parsedDash.hss_score === "number") {
                setHssScore(parsedDash.hss_score);
              }
            }
          }

          const cached = await AsyncStorage.getItem(exercisesCacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRoutinesList(parsed);
            }
          }
        } catch {}
        if (!routinesList) setIsLoading(true);
        await fetchData();
        setIsLoading(false);
      }
      initialLoad();
    }, [fetchData, exercisesCacheKey, hssCacheKey, userId])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (params.completedId && routinesList) {
      const routine = routinesList.find((r) => r.id === params.completedId);
      if (routine) {
        if (!completedExercises.includes(routine.id)) {
          const actualSeconds = params.durationSeconds ? parseInt(params.durationSeconds as string, 10) : routine.duration * 60;
          let timeText = "";
          if (actualSeconds < 60) {
            timeText = `${actualSeconds} second${actualSeconds === 1 ? "" : "s"}`;
          } else {
            const mins = Math.round(actualSeconds / 60);
            timeText = `${mins} minute${mins === 1 ? "" : "s"}`;
          }
          showToast(`Great job! ${timeText} recorded.`);
        }
        router.setParams({ completedId: "", durationSeconds: "" });
      }
    }
  }, [params.completedId, params.durationSeconds, routinesList, completedExercises]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: Platform.OS === 'ios' ? 60 : 40,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(3500),
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  // Safe boundary handling: if user is uncalibrated (hssScore <= 0):
  // Online & telemetry verified -> default to "Stable" (baseline safe for onboarding)
  // Offline or unverified partial API failure -> default to "Elevated Risk" (fail-safe protection against unverified acute strain)
  const isCalibrated = hssScore > 0;
  const hssStatus = useMemo<"Stable" | "Moderate" | "Elevated Risk" | "Critical">(() => {
    if (!isCalibrated) return (isOffline || dashboardFailed) ? "Elevated Risk" : "Stable";
    if (hssScore >= 80) return "Stable";
    if (hssScore >= 60) return "Moderate";
    if (hssScore >= 50) return "Elevated Risk";
    return "Critical";
  }, [hssScore, isCalibrated, isOffline, dashboardFailed]);

  // Determine allowed tiers
  const allowedTiers = useMemo(() => {
    const TIER_HIERARCHY: Record<string, string[]> = {
      "Stable": ["Stable", "Moderate", "Elevated Risk", "Critical"],
      "Moderate": ["Moderate", "Elevated Risk", "Critical"],
      "Elevated Risk": ["Elevated Risk", "Critical"],
      "Critical": ["Critical"]
    };
    return TIER_HIERARCHY[hssStatus] || [hssStatus];
  }, [hssStatus]);

  // Recommended routine: the first incomplete routine matching the user's exact tier, or just the first allowed one
  const recommendedRoutine = useMemo(() => {
    if (!routinesList || routinesList.length === 0) return null;
    
    // Prioritize exactly matching tier and not completed
    const exactMatch = routinesList.find(r => r.category === hssStatus && !completedExercises.includes(r.id) && !partialExercises.includes(r.id));
    if (exactMatch) return exactMatch;
    
    // Otherwise fallback to first allowed and not completed/partial
    const allowed = routinesList.find(r => allowedTiers.includes(r.category) && !completedExercises.includes(r.id) && !partialExercises.includes(r.id));
    if (allowed) return allowed;

    // Return the first allowed one even if completed
    const firstAllowed = routinesList.find(r => allowedTiers.includes(r.category));
    if (firstAllowed) return firstAllowed;

    // CLINICAL SAFETY GUARD (HL-ENG-08): Under Critical or Elevated Risk, NEVER fall back to routinesList[0]
    if (hssStatus === "Critical" || hssStatus === "Elevated Risk") {
      return null;
    }

    return routinesList[0];
  }, [routinesList, hssStatus, allowedTiers, completedExercises]);

  // All other active routines
  const availableRoutines = useMemo(() => {
    if (!routinesList) return [];
    return routinesList.filter((r) => {
      // Don't show the recommended one twice in the 'All' list unless filtered
      const matchesTier = allowedTiers.includes(r.category);
      const matchesType = selectedType === "All" || r.type === selectedType;
      return matchesTier && matchesType && r.id !== recommendedRoutine?.id;
    });
  }, [routinesList, allowedTiers, selectedType, recommendedRoutine]);

  // Available types for filters based on what actually exists in backend data
  const exerciseTypes = useMemo(() => {
    if (!routinesList) return ["All"];
    const types = new Set<string>();
    routinesList.forEach(r => {
      if (allowedTiers.includes(r.category)) {
        types.add(r.type);
      }
    });
    return ["All", ...Array.from(types).sort()];
  }, [routinesList, allowedTiers]);

  const handleRoutinePress = (id: string) => {
    router.push({
      pathname: "/(home)/(health)/exercise-details",
      params: { id },
    });
  };

  const Container = isEmbedded ? View : SafeAreaView;
  const containerProps = isEmbedded
    ? { className: "flex-1 bg-[#F8FAF9]" }
    : { className: "flex-1 bg-[#F8FAF9]", edges: ["top"] as const };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style="dark" />}

      {/* Toast */}
      {toastMessage && (
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            position: "absolute",
            left: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <View
            className="flex-row items-center gap-3 px-5 py-4 rounded-2xl"
            style={{
              backgroundColor: "#152131",
              ...Platform.select({
                ios: {
                  shadowColor: "#152131",
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 24,
                  shadowOpacity: 0.3,
                },
                android: { elevation: 12 },
              }),
            }}
          >
            <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
              <Feather name="check" size={16} color="#4ADE80" />
            </View>
            <Text className="flex-1 text-[15px] font-semibold text-white">
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── Top bar ── */}
      {!hideHeader && <Header />}

      {isLoading && !refreshing ? (
        <View className="px-6 mt-6">
          <Skeleton className="w-full h-56 rounded-3xl mb-8" />
          <Skeleton className="w-1/3 h-6 mb-4" />
          <View className="flex-row gap-3 mb-6">
            <Skeleton className="w-24 h-10 rounded-full" />
            <Skeleton className="w-24 h-10 rounded-full" />
          </View>
          <Skeleton className="w-full h-40 rounded-3xl mb-4" />
          <Skeleton className="w-full h-40 rounded-3xl" />
        </View>
      ) : error || !routinesList || routinesList.length === 0 ? (
        <ScrollView
          contentContainerClassName="flex-1 items-center justify-center px-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B6E63" />}
        >
          <View className="w-20 h-20 bg-rose-50 rounded-full items-center justify-center mb-6">
            <Feather name="wifi-off" size={32} color="#F43F5E" />
          </View>
          <Text className="text-[20px] font-bold text-[#152131] mb-2">Movements unavailable</Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-8 px-4 leading-relaxed">
            We couldn't connect to the server to retrieve your safe training routines. Please check your connection.
          </Text>
          <TouchableOpacity 
            onPress={fetchData}
            activeOpacity={0.8}
            className="px-8 py-3.5 rounded-full"
            style={{
              backgroundColor: "#1B6E63",
              ...Platform.select({
                ios: {
                  shadowColor: "#1B6E63",
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 12,
                  shadowOpacity: 0.3,
                },
                android: { elevation: 6 },
              }),
            }}
          >
            <Text className="text-white font-bold text-[16px]">Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full pt-3"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B6E63" />
          }
        >
          {hideHeader ? (
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                <View className="w-[5px] h-[5px] rounded-full bg-[#2563EB] flex-shrink-0" />
                <Text className="text-[13px] font-semibold text-[#5C6B66] dark:text-slate-400 flex-1" numberOfLines={1}>
                  Cardio routines for your stability
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(home)/(health)/exercise-diary")}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "rgba(232,236,234,0.7)",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowRadius: 3,
                      shadowOpacity: 0.06,
                    },
                    android: { elevation: 1 },
                  }),
                }}
              >
                <Feather name="calendar" size={13} color="#2563EB" />
                <Text className="text-[12px] font-bold text-[#2563EB]">History</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-6">
              <Text
                className="text-[28px] font-bold text-[#152131] mb-1"
                style={{ letterSpacing: -0.5 }}
              >
                Today's Movement
              </Text>
              <Text className="text-[16px] text-[#64748B] mb-4">
                Move safely. Build consistency.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(home)/(health)/exercise-diary")}
                className="flex-row items-center gap-2 self-start px-4 py-2.5 rounded-xl"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "rgba(232,236,234,0.7)",
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      shadowOpacity: 0.06,
                    },
                    android: { elevation: 2 },
                  }),
                }}
              >
                <Feather name="calendar" size={16} color="#64748B" />
                <Text className="text-[13px] font-semibold text-[#5C6B66]">History</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Offline Banner */}
          {isOffline && (
            <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-4 py-2.5 rounded-2xl mb-4">
              <Feather name="wifi-off" size={14} color="#D97706" />
              <Text className="text-[12px] font-medium text-amber-800 dark:text-amber-300 flex-1">
                Offline Mode — Showing saved movement routines
              </Text>
            </View>
          )}

          {/* ── Clinical Stability Warning Callout (HL-ENG-01) ── */}
          {(hssStatus === "Elevated Risk" || hssStatus === "Critical") && (
            <Reanimated.View
              entering={FadeInDown.springify()}
              className="p-4 rounded-2xl flex-row gap-3 mb-6"
              style={{
                backgroundColor: hssStatus === "Critical" ? "#FEF2F2" : "#FFFBEB",
                borderWidth: 1,
                borderColor: hssStatus === "Critical" ? "#FECACA" : "#FDE68A",
              }}
            >
              <Feather
                name="alert-triangle"
                size={20}
                color={hssStatus === "Critical" ? "#DC2626" : "#D97706"}
                style={{ marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-[14px] font-bold mb-0.5"
                  style={{ color: hssStatus === "Critical" ? "#991B1B" : "#92400E" }}
                >
                  {hssStatus === "Critical"
                    ? "Critical Cardiac Strain Detected"
                    : "Elevated Heart Stability Risk"}
                </Text>
                <Text
                  className="text-[13px] leading-relaxed font-medium"
                  style={{ color: hssStatus === "Critical" ? "#B91C1C" : "#B45309" }}
                >
                  {hssStatus === "Critical"
                    ? "Active cardiovascular workouts are paused to protect your heart. Please rest seated or lying down comfortably and contact your attending care team or emergency services immediately."
                    : "Your heart stability is currently elevated. Please consult your physician before engaging in physical activity. Only gentle breathing exercises are shown."}
                </Text>
              </View>
            </Reanimated.View>
          )}

          {/* Recommended Routine */}
          {recommendedRoutine && selectedType === "All" && (
            <Reanimated.View entering={FadeInDown.delay(100).springify()} className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="text-[18px] font-bold text-[#152131]"
                  style={{ letterSpacing: -0.3 }}
                >
                  Recommended Movement
                </Text>
              </View>
              <RoutineCard
                routine={recommendedRoutine}
                isCompleted={completedExercises.includes(recommendedRoutine.id)}
                isPartial={partialExercises.includes(recommendedRoutine.id)}
                onPress={() => handleRoutinePress(recommendedRoutine.id)}
                isFeatured={true}
              />
            </Reanimated.View>
          )}

          {/* ── Enhanced Consistency Tracker (HL-ENG-05) ── */}
          <Reanimated.View
            entering={FadeInDown.delay(200).springify()}
            className="mb-8 p-5 rounded-3xl"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "rgba(232,236,234,0.6)",
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 16,
                  shadowOpacity: 0.06,
                },
                android: { elevation: 3 },
              }),
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className="text-[18px] font-bold text-[#152131]"
                style={{ letterSpacing: -0.3 }}
              >
                Your Consistency
              </Text>
              <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4]">
                <View className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <Text className="text-[12px] font-bold text-[#166534]">
                  {weeklyConsistency.count}/7
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mb-2">
              {weeklyConsistency.days.map((isActiveDay, index) => (
                <View key={index} className="items-center gap-1.5">
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isActiveDay ? "#F0FDF4" : "#F4F7F5",
                      borderWidth: isActiveDay ? 2 : 1,
                      borderColor: isActiveDay ? "#86EFAC" : "#E8ECEA",
                    }}
                  >
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: isActiveDay ? "#16A34A" : "#D1D9D5",
                      }}
                    />
                  </View>
                  <Text
                    className="text-[10px] font-semibold"
                    style={{ color: isActiveDay ? "#166534" : "#94A3B8" }}
                  >
                    {weeklyConsistency.labels[index] || DAY_LABELS[index]}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-[14px] text-[#5C6B66] font-medium mt-1">
              {weeklyConsistency.count} active {weeklyConsistency.count === 1 ? "day" : "days"} in the last 7 days
            </Text>
          </Reanimated.View>

          {/* ── Available Training ── */}
          <Reanimated.View entering={FadeInDown.delay(200).springify()}>
            <Text
              className="text-[18px] font-bold text-[#152131] mb-4"
              style={{ letterSpacing: -0.3 }}
            >
              Available Training
            </Text>

            {/* Type Filter — Dark/Light Chips */}
            {exerciseTypes.length > 2 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="mb-6"
                contentContainerStyle={{ gap: 8, paddingRight: 20 }}
              >
                {exerciseTypes.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.8}
                      onPress={() => setSelectedType(type)}
                      className="min-h-[40px] rounded-full flex-row items-center justify-center"
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: isSelected ? "#152131" : "#F1F5F3",
                        ...isSelected ? Platform.select({
                          ios: {
                            shadowColor: "#152131",
                            shadowOffset: { width: 0, height: 2 },
                            shadowRadius: 6,
                            shadowOpacity: 0.2,
                          },
                          android: { elevation: 3 },
                        }) : {},
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-[13px] font-semibold"
                        style={{ color: isSelected ? "#FFFFFF" : "#5C6B66" }}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {availableRoutines.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <Text className="text-[#64748B] text-[15px]">No routines found in this category.</Text>
              </View>
            ) : (
              <View className="flex-col pb-10">
                {availableRoutines.map((routine, index) => (
                  <Reanimated.View key={routine.id} entering={FadeIn.delay(100 + index * 50)}>
                    <RoutineCard
                      routine={routine}
                      isCompleted={completedExercises.includes(routine.id)}
                      isPartial={partialExercises.includes(routine.id)}
                      onPress={() => handleRoutinePress(routine.id)}
                    />
                  </Reanimated.View>
                ))}
              </View>
            )}
          </Reanimated.View>
        </ScrollView>
      )}
    </Container>
  );
}
