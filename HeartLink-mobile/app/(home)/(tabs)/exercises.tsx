import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Routine {
  id: string;
  title: string;
  duration: number;
  goal: string;
  type: "Light Cardio" | "Stationary" | "Breathing";
  intensity: "Low" | "Medium" | "None";
  category: "Stable" | "Monitor Closely" | "Elevated Risk";
  image?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const ROUTINES: Routine[] = [
  {
    id: "1",
    title: "20-Minute Neighborhood Walk",
    duration: 20,
    goal: "Improves blood circulation and builds gentle endurance.",
    type: "Light Cardio",
    intensity: "Medium",
    category: "Stable",
    image: "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    title: "Basic Standing Stretches",
    duration: 10,
    goal: "Enhances flexibility without straining the heart.",
    type: "Light Cardio",
    intensity: "Low",
    category: "Stable",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    title: "15-Minute Chair Yoga",
    duration: 15,
    goal: "Maintains mobility while keeping heart rate stable.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
    image: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    title: "Seated Leg Lifts",
    duration: 10,
    goal: "Promotes lower body circulation passively.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
  },
  {
    id: "5",
    title: "Shoulder & Neck Release",
    duration: 5,
    goal: "Reduces upper body tension safely.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
  },
  {
    id: "6",
    title: "4-7-8 Deep Breathing Technique",
    duration: 5,
    goal: "Reduces stress-induced heart rate spikes and calms nervous system.",
    type: "Breathing",
    intensity: "None",
    category: "Elevated Risk",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop",
  },
  {
    id: "7",
    title: "Guided Seated Relaxation",
    duration: 10,
    goal: "Lowers blood pressure and induces resting state.",
    type: "Breathing",
    intensity: "None",
    category: "Elevated Risk",
    image: "https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=400&h=300&fit=crop",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeConfig(type: Routine["type"]) {
  if (type === "Breathing")
    return { icon: "wind" as const, color: "#854f0b", bg: "#faeeda" };
  if (type === "Stationary")
    return { icon: "anchor" as const, color: "#185fa5", bg: "#e6f1fb" };
  return { icon: "activity" as const, color: "#3b6d11", bg: "#eaf3de" };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Stable: {
    badgeBg: "#eaf3de",
    badgeText: "#3b6d11",
    bannerBg: undefined as string | undefined,
    bannerBorder: undefined as string | undefined,
  },
  "Monitor Closely": {
    badgeBg: "#faeeda",
    badgeText: "#854f0b",
    bannerBg: undefined as string | undefined,
    bannerBorder: undefined as string | undefined,
  },
  "Elevated Risk": {
    badgeBg: "#fcebeb",
    badgeText: "#a32d2d",
    bannerBg: "#fcebeb",
    bannerBorder: "#f7c1c1",
  },
} as const;

// ─── Routine Card ─────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onStart,
  onPressCard,
  isCompleted,
}: {
  routine: Routine;
  onStart: () => void;
  onPressCard: () => void;
  isCompleted: boolean;
}) {
  const cfg = getTypeConfig(routine.type);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPressCard}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 mb-4 overflow-hidden"
    >
      {/* Thumbnail */}
      <View className="w-full h-36 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800/50 items-center justify-center relative overflow-hidden">
        {routine.image ? (
          <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
        ) : (
          <>
            <Feather name="image" size={28} color="#cbd5e1" />
            <Text className="text-[11px] text-slate-300 mt-1.5">
              Video thumbnail
            </Text>
          </>
        )}

        {/* Duration pill — top left */}
        <View className="absolute top-3 left-3 flex-row items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
          <Feather name="clock" size={10} color="rgba(255,255,255,0.85)" />
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11 }}>
            {routine.duration} min
          </Text>
        </View>

        {/* Type badge — top right */}
        <View
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg }}
        >
          <Text
            className="text-[10px] font-medium uppercase tracking-wide"
            style={{ color: cfg.color }}
          >
            {routine.type}
          </Text>
        </View>

        {/* Completed checkmark overlay */}
        {isCompleted && (
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <View className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 items-center justify-center">
              <Feather name="check" size={22} color="#3b6d11" />
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 pr-3">
            <Text className="text-[16px] font-medium text-slate-900 dark:text-white leading-snug mb-1">
              {routine.title}
            </Text>
            <Text className="text-[13px] text-slate-400 leading-5">
              {routine.goal}
            </Text>
          </View>
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: cfg.bg }}
          >
            <Feather name={cfg.icon} size={18} color={cfg.color} />
          </View>
        </View>

        {/* Intensity chip */}
        <View className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-2.5 py-1.5 rounded-lg self-start mb-4">
          <Feather name="zap" size={12} color="#94a3b8" />
          <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {routine.intensity} intensity
          </Text>
        </View>

        {/* CTA — all dynamic via style */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStart}
          className="py-3.5 rounded-xl items-center justify-center flex-row gap-2 border"
          style={{
            backgroundColor: isCompleted ? "#f0fdf4" : "#0f172a",
            borderColor: isCompleted ? "#bbf7d0" : "#0f172a",
          }}
        >
          <Feather
            name={isCompleted ? "repeat" : "play"}
            size={16}
            color={isCompleted ? "#3b6d11" : "#fff"}
          />
          <Text
            className="text-[14px] font-medium"
            style={{ color: isCompleted ? "#3b6d11" : "#fff" }}
          >
            {isCompleted ? "Do it again" : "Start routine"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Safety Check Modal ───────────────────────────────────────────────────────

function SafetyCheckModal({
  visible,
  onSafe,
  onSymptoms,
}: {
  visible: boolean;
  onSafe: () => void;
  onSymptoms: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] px-6 pb-12 pt-4 border-t border-slate-200 dark:border-slate-800/50 shadow-lg">
          {/* Drag handle */}
          <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />

          {/* Icon */}
          <View className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center self-center mb-5">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={32}
              color="#a32d2d"
            />
          </View>

          <Text className="text-[22px] font-medium text-slate-900 dark:text-white text-center mb-2">
            Quick safety check
          </Text>
          <Text className="text-[14px] text-slate-400 text-center leading-relaxed mb-8 px-2">
            Did you experience any chest discomfort, shortness of breath, or
            dizziness during this routine?
          </Text>

          {/* No symptoms */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSafe}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2.5 border"
            style={{ backgroundColor: "#eaf3de", borderColor: "#c0dd97" }}
          >
            <Feather name="check-circle" size={20} color="#3b6d11" />
            <Text
              className="text-[16px] font-medium"
              style={{ color: "#3b6d11" }}
            >
              No, I feel great
            </Text>
          </TouchableOpacity>

          {/* Has symptoms */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSymptoms}
            className="rounded-2xl py-4 items-center flex-row justify-center gap-2.5 border"
            style={{ backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }}
          >
            <Feather name="alert-triangle" size={18} color="#a32d2d" />
            <Text
              className="text-[16px] font-medium"
              style={{ color: "#a32d2d" }}
            >
              Yes, I felt symptoms
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ completedId?: string }>();
  const { userId, user } = useUser();

  const [routinesList, setRoutinesList] = useState<Routine[]>(ROUTINES);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [cssScore, setCssScore] = useState<number>(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(-100)).current;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [routinesRes, dashboardRes, logsRes] = await Promise.all([
        fetch(`${base_url}/api/exercises/`),
        fetch(`${base_url}/api/dashboard/${userId}`),
        fetch(`${base_url}/api/exercises/logs/${userId}`)
      ]);

      if (routinesRes.ok) {
        const data = await routinesRes.json();
        const mapped = data.map((r: any) => ({
          id: r.id,
          title: r.name || "",
          duration: r.duration_minutes || 0,
          goal: r.goal || "",
          type: r.type || "Light Cardio",
          intensity: r.intensity || "Low",
          category: r.css_tier || "Stable",
          image: r.image_url || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
        }));
        setRoutinesList(mapped.length > 0 ? mapped : ROUTINES);
      }
      
      if (dashboardRes.ok) {
        const dash = await dashboardRes.json();
        if (dash.css_score !== undefined) {
          setCssScore(dash.css_score);
        }
      }
      
      if (logsRes.ok) {
        const data = await logsRes.json();
        const today = new Date().toDateString();
        const todayIds = data
          .filter((log: any) => new Date(log.logged_at).toDateString() === today)
          .map((log: any) => log.routine_id);
        setCompletedExercises(todayIds);
      }
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    }
    initialLoad();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (params.completedId) {
      const routine = routinesList.find((r) => r.id === params.completedId);
      if (routine) {
        setPendingRoutine(routine);
        setShowSafetyCheck(true);
        router.setParams({ completedId: "" });
      }
    }
  }, [params.completedId, routinesList]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 56,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const cssStatus = useMemo<Routine["category"]>(() => {
    if (cssScore >= 85) return "Stable";
    if (cssScore >= 70) return "Monitor Closely";
    return "Elevated Risk";
  }, [cssScore]);

  const activeRoutines = useMemo(
    () => routinesList.filter((r) => r.category === cssStatus),
    [cssStatus, routinesList],
  );
  const statusCfg = STATUS_CONFIG[cssStatus];

  const totalActiveMins = useMemo(
    () =>
      completedExercises.reduce(
        (sum, id) => sum + (routinesList.find((r) => r.id === id)?.duration ?? 0),
        0,
      ),
    [completedExercises, routinesList],
  );

  const progressPercent = Math.min((totalActiveMins / 30) * 100, 100);
  const progressColor = progressPercent >= 100 ? "#639922" : "#0f172a";

  const handleSafetySafe = () => {
    if (pendingRoutine && !completedExercises.includes(pendingRoutine.id)) {
      showToast(
        `${pendingRoutine.duration} active minutes added to today's tracker.`,
      );
    }
    setShowSafetyCheck(false);
    setPendingRoutine(null);
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    setPendingRoutine(null);
    router.push("/(home)/(health)/log-symptoms");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Toast */}
      {toastMessage && (
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            position: "absolute",
            left: 20,
            right: 20,
            zIndex: 50,
          }}
        >
          <View
            className="flex-row items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ backgroundColor: "#eaf3de", borderColor: "#c0dd97" }}
          >
            <Feather name="check-circle" size={16} color="#3b6d11" />
            <Text
              className="flex-1 text-[13px] font-medium"
              style={{ color: "#27500a" }}
            >
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather name="heart" size={13} color="#0f172a" />
          </View>
          <Text className="text-[16px] text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: "300" }}>Heart<Text style={{ fontWeight: "600" }}>Link.</Text></Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/(profile)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center">
            <Feather name="bell" size={17} color="#64748b" />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/(settings)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center">
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/(profile)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-5 pt-3 mb-4">
        <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight">
          Rehab routines
        </Text>
        <Text className="text-[14px] text-slate-400 mt-0.5">
          Adapted to your daily heart stability
        </Text>
      </View>

      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-5 pb-28"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
          }
        >
          {/* CSS score card */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-5 mb-4 shadow-sm shadow-slate-100">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">
                Current CSS score
              </Text>
              <View
                className="px-3 py-1.5 rounded-lg border"
                style={{ backgroundColor: statusCfg.badgeBg, borderColor: statusCfg.badgeBg !== "#fff" ? statusCfg.badgeBg : "#e2e8f0" }}
              >
                <Text
                  className="text-[12px] font-bold tracking-wide uppercase"
                  style={{ color: statusCfg.badgeText }}
                >
                  {cssStatus}
                </Text>
              </View>
            </View>

            <Text className="text-[40px] font-medium text-slate-900 dark:text-white tracking-tight leading-none mb-1">
              {cssScore}
              <Text className="text-[18px] font-normal text-slate-400">
                {" "}
                / 100
              </Text>
            </Text>

            <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${cssScore}%`,
                  backgroundColor:
                    cssScore >= 85
                      ? "#639922"
                      : cssScore >= 70
                        ? "#ba7517"
                        : "#e24b4a",
                }}
              />
            </View>

            {cssStatus === "Elevated Risk" && (
              <View
                className="mt-4 p-3.5 rounded-xl border flex-row items-start gap-2.5"
                style={{
                  backgroundColor: statusCfg.bannerBg,
                  borderColor: statusCfg.bannerBorder,
                }}
              >
                <Feather
                  name="alert-triangle"
                  size={15}
                  color="#e24b4a"
                  style={{ marginTop: 1 }}
                />
                <Text
                  className="flex-1 text-[13px] leading-5"
                  style={{ color: "#791f1f" }}
                >
                  Please consult your physician before engaging in physical
                  activity. Only breathing exercises are shown.
                </Text>
              </View>
            )}
          </View>

          {/* Daily progress */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-5 mb-5 shadow-sm shadow-slate-100">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-0.5">
                  Daily active target
                </Text>
                <Text className="text-[12px] text-slate-400">
                  30 minutes recommended
                </Text>
              </View>
              <View
                className="px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: progressPercent >= 100 ? "#eaf3de" : "#f8fafc",
                  borderWidth: 1,
                  borderColor: progressPercent >= 100 ? "#c0dd97" : "#e2e8f0",
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: progressColor }}
                >
                  {totalActiveMins} / 30 min
                </Text>
              </View>
            </View>
            <View className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: progressColor,
                }}
              />
            </View>
            {progressPercent >= 100 && (
              <View className="flex-row items-center gap-2 mt-3.5 bg-[#f0fdf4] self-start px-2.5 py-1 rounded-md border border-[#bbf7d0]">
                <Feather name="check-circle" size={13} color="#639922" />
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: "#3b6d11" }}
                >
                  Daily target reached!
                </Text>
              </View>
            )}
          </View>

          {/* Routine list */}
          <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-4">
            Recommended today
          </Text>
          {activeRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              isCompleted={completedExercises.includes(routine.id)}
              onPressCard={() =>
                router.push({
                  pathname: "/(home)/(health)/exercise-details",
                  params: { id: routine.id },
                })
              }
              onStart={() =>
                router.push({
                  pathname: "/(home)/(health)/exercise-details",
                  params: { id: routine.id },
                })
              }
            />
          ))}
        </ScrollView>
      )}

      {/* Safety Check Modal */}
      <SafetyCheckModal
        visible={showSafetyCheck}
        onSafe={handleSafetySafe}
        onSymptoms={handleSafetySymptoms}
      />
    </SafeAreaView>
  );
}
