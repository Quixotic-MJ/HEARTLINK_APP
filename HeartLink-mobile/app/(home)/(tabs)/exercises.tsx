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
    return { icon: "wind" as const, color: "#be185d", bg: "#fce7f3" }; // Pink theme for Breathing
  if (type === "Stationary")
    return { icon: "anchor" as const, color: "#0369a1", bg: "#e0f2fe" }; // Soft blue
  return { icon: "activity" as const, color: "#15803d", bg: "#dcfce3" }; // Soft green for Cardio
}

const STATUS_CONFIG = {
  Stable: {
    badgeBg: "#f0fdf4",
    badgeText: "#166534",
  },
  Moderate: {
    badgeBg: "#fffbeb",
    badgeText: "#b45309",
  },
  "Elevated Risk": {
    badgeBg: "#fff7ed",
    badgeText: "#c2410c",
  },
  Critical: {
    badgeBg: "#fef2f2",
    badgeText: "#b91c1c",
  },
} as const;

// ─── Routine Card ─────────────────────────────────────────────────────────────

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
      activeOpacity={0.8}
      onPress={onPress}
      className={`bg-white rounded-3xl border border-slate-100 mb-5 overflow-hidden ${
        isFeatured ? "shadow-sm shadow-pink-100/50" : "shadow-sm shadow-slate-100/50"
      }`}
    >
      {/* Thumbnail */}
      <View className={`${isFeatured ? "h-48" : "h-36"} bg-slate-50 relative items-center justify-center`}>
        {routine.image ? (
          <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
        ) : (
          <Feather name="image" size={32} color="#cbd5e1" />
        )}
        
        {/* Soft overlay */}
        <View className="absolute inset-0 bg-slate-900/10" />

        <View className="absolute top-4 left-4 flex-row items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full">
          <Feather name="clock" size={12} color="#334155" />
          <Text className="text-[12px] font-medium text-slate-700">
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
              <Feather name="check" size={26} color="#16a34a" />
            </View>
            <Text className="text-green-700 font-bold mt-2 text-[15px]">Completed</Text>
          </View>
        )}
        
        {isPartial && !isCompleted && (
          <View className="absolute inset-0 bg-white/80 backdrop-blur-sm items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center border border-amber-200">
              <Feather name="activity" size={26} color="#d97706" />
            </View>
            <Text className="text-amber-700 font-bold mt-2 text-[15px]">Partial Activity</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className={`p-5 ${isFeatured ? "bg-rose-50/30" : "bg-white"}`}>
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-[18px] font-semibold text-slate-800 leading-snug mb-1.5">
              {routine.title}
            </Text>
            <Text className="text-[14px] text-slate-500 leading-relaxed" numberOfLines={2}>
              {routine.goal}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
              <Feather name="activity" size={12} color="#64748b" />
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {routine.intensity} INTENSITY
              </Text>
            </View>
          </View>
          
          <View className={`w-10 h-10 rounded-full items-center justify-center ${isFeatured ? "bg-primary" : "bg-slate-100"}`}>
            <Feather name="arrow-right" size={18} color={isFeatured ? "#fff" : "#475569"} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ completedId?: string }>();
  const { userId } = useUser();

  const [routinesList, setRoutinesList] = useState<Routine[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [hssScore, setHssScore] = useState<number>(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [partialExercises, setPartialExercises] = useState<string[]>([]);
  const [weeklyConsistency, setWeeklyConsistency] = useState<{ count: number; days: boolean[] }>({ count: 0, days: Array(7).fill(false) });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<string>("All");

  const slideAnim = useRef(new Animated.Value(-100)).current;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setError(false);
    try {
      const [routinesRes, dashboardRes, logsRes] = await Promise.all([
        fetch(`${base_url}/api/exercises/`).catch(() => null),
        fetch(`${base_url}/api/dashboard/me`, {
          headers: { "Authorization": `Bearer ${userId}` }
        }).catch(() => null),
        fetch(`${base_url}/api/exercises/logs/${userId}`).catch(() => null)
      ]);

      if (routinesRes && routinesRes.ok) {
        const data = await routinesRes.json();
        const mapped = data.map((r: any) => ({
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
      } else {
        setError(true);
      }
      
      if (dashboardRes && dashboardRes.ok) {
        const dash = await dashboardRes.json();
        if (dash.hss_score !== undefined) {
          setHssScore(dash.hss_score);
        }
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
        let count = 0;
        
        for (let i = 0; i < 7; i++) {
          const targetDate = new Date(startOfWeek.getTime() + i * oneDay);
          const targetDateStr = targetDate.toDateString();
          const hasMeaningful = data.some((log: any) => 
            new Date(log.logged_at).toDateString() === targetDateStr &&
            log.status !== "abandoned" &&
            (log.duration_minutes >= 1 || log.duration_seconds >= 60)
          );
          days[i] = hasMeaningful;
          if (hasMeaningful) count++;
        }
        setWeeklyConsistency({ count, days });
      }
    } catch (error) {
      console.error(error);
      setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      async function initialLoad() {
        if (!routinesList) setIsLoading(true);
        await fetchData();
        setIsLoading(false);
      }
      initialLoad();
    }, [fetchData])
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
          showToast(`Great job! ${routine.duration} minutes recorded.`);
        }
        router.setParams({ completedId: "" });
      }
    }
  }, [params.completedId, routinesList, completedExercises]);

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

  const hssStatus = useMemo<"Stable" | "Moderate" | "Elevated Risk" | "Critical">(() => {
    if (hssScore >= 80) return "Stable";
    if (hssScore >= 60) return "Moderate";
    if (hssScore >= 50) return "Elevated Risk";
    return "Critical";
  }, [hssScore]);

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

    // Finally, just return the first allowed one even if completed
    return routinesList.find(r => allowedTiers.includes(r.category)) || routinesList[0];
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

  return (
    <SafeAreaView className="flex-1 bg-[#fafaf9]" edges={["top"]}>
      <StatusBar style="dark" />

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
          <View className="flex-row items-center gap-3 px-5 py-4 rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/20">
            <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center">
              <Feather name="check" size={16} color="#4ade80" />
            </View>
            <Text className="flex-1 text-[15px] font-medium text-white">
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── Top bar ── */}
      <Header />

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f43f5e" />}
        >
          <View className="w-20 h-20 bg-rose-50 rounded-full items-center justify-center mb-6">
            <Feather name="wifi-off" size={32} color="#f43f5e" />
          </View>
          <Text className="text-[20px] font-semibold text-slate-800 mb-2">Movements unavailable</Text>
          <Text className="text-[15px] text-slate-500 text-center mb-8 px-4 leading-relaxed">
            We couldn't connect to the server to retrieve your safe training routines. Please check your connection.
          </Text>
          <TouchableOpacity 
            onPress={fetchData}
            activeOpacity={0.8}
            className="bg-primary px-8 py-3.5 rounded-full"
          >
            <Text className="text-white font-bold text-[16px]">Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f43f5e" />
          }
        >
          <View className="mb-6">
            <Text className="text-[28px] font-semibold text-slate-900 tracking-tight mb-1">
              Today's Movement
            </Text>
            <Text className="text-[16px] text-slate-500 mb-4">
              Move safely. Build consistency.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(home)/(health)/exercise-diary")}
              className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm shadow-slate-100 flex-row items-center gap-2 self-start"
            >
              <Feather name="calendar" size={16} color="#64748b" />
              <Text className="text-[13px] font-semibold text-slate-700">History</Text>
            </TouchableOpacity>
          </View>

          {hssStatus === "Elevated Risk" && (
            <Reanimated.View entering={FadeInDown.springify()} className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex-row gap-3 mb-8">
              <Feather name="alert-triangle" size={20} color="#e11d48" className="mt-0.5" />
              <Text className="flex-1 text-[14px] leading-relaxed text-rose-900 font-medium">
                Your heart stability is currently elevated. Please consult your physician before engaging in physical activity. Only breathing exercises are shown.
              </Text>
            </Reanimated.View>
          )}

          {/* Recommended Routine */}
          {recommendedRoutine && selectedType === "All" && (
            <Reanimated.View entering={FadeInDown.delay(100).springify()} className="mb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[18px] font-semibold text-slate-900 tracking-tight">
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

          {/* Consistency Section */}
          <Reanimated.View entering={FadeInDown.delay(200).springify()} className="mb-10 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100/50">
            <Text className="text-[18px] font-semibold text-slate-900 tracking-tight mb-4">
              Your Consistency
            </Text>
            <View className="flex-row items-center justify-between mb-4">
              {weeklyConsistency.days.map((isActiveDay, index) => (
                <View key={index} className={`w-8 h-8 rounded-full items-center justify-center ${isActiveDay ? "bg-green-100" : "bg-slate-100"}`}>
                  <View className={`w-3 h-3 rounded-full ${isActiveDay ? "bg-green-500" : "bg-slate-300"}`} />
                </View>
              ))}
            </View>
            <Text className="text-[15px] text-slate-600 font-medium">
              {weeklyConsistency.count} active {weeklyConsistency.count === 1 ? "day" : "days"} in the last 7 days
            </Text>
          </Reanimated.View>

          {/* Discover Section */}
          <Reanimated.View entering={FadeInDown.delay(200).springify()}>
            <Text className="text-[18px] font-semibold text-slate-900 tracking-tight mb-4">
              Available Training
            </Text>

            {/* Type Filter */}
            {exerciseTypes.length > 2 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="mb-6"
                contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              >
                {exerciseTypes.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.8}
                      onPress={() => setSelectedType(type)}
                      className={`px-5 py-2.5 rounded-full border ${
                        isSelected 
                          ? "bg-slate-800 border-slate-800" 
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text 
                        className={`text-[14px] font-medium ${
                          isSelected 
                            ? "text-white" 
                            : "text-slate-600"
                        }`}
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
                <Text className="text-slate-500 text-[15px]">No routines found in this category.</Text>
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
    </SafeAreaView>
  );
}
