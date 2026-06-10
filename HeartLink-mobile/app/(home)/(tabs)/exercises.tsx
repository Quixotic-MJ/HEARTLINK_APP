import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Routine {
  id: string;
  title: string;
  duration: number;
  goal: string;
  type: "Light Cardio" | "Stationary" | "Breathing";
  intensity: "Low" | "Medium" | "None";
  category: "Stable" | "Monitor Closely" | "Elevated Risk";
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
  },
  {
    id: "2",
    title: "Basic Standing Stretches",
    duration: 10,
    goal: "Enhances flexibility without straining the heart.",
    type: "Light Cardio",
    intensity: "Low",
    category: "Stable",
  },
  {
    id: "3",
    title: "15-Minute Chair Yoga",
    duration: 15,
    goal: "Maintains mobility while keeping heart rate stable.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
  },
  {
    id: "4",
    title: "Seated Leg Lifts",
    duration: 10,
    goal: "Promotes lower body circulation passively.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
  },
  {
    id: "5",
    title: "Shoulder & Neck Release",
    duration: 5,
    goal: "Reduces upper body tension safely.",
    type: "Stationary",
    intensity: "Low",
    category: "Monitor Closely",
  },
  {
    id: "6",
    title: "4-7-8 Deep Breathing Technique",
    duration: 5,
    goal: "Reduces stress-induced heart rate spikes and calms nervous system.",
    type: "Breathing",
    intensity: "None",
    category: "Elevated Risk",
  },
  {
    id: "7",
    title: "Guided Seated Relaxation",
    duration: 10,
    goal: "Lowers blood pressure and induces resting state.",
    type: "Breathing",
    intensity: "None",
    category: "Elevated Risk",
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

// ─── Dev Toggle ───────────────────────────────────────────────────────────────

function DevBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-1 py-1.5 rounded-md items-center"
      style={active ? { backgroundColor: "#fff" } : undefined}
    >
      <Text
        className="text-[12px] font-medium"
        style={{ color: active ? "#0f172a" : "#94a3b8" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

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
      className="bg-white rounded-2xl border border-slate-200/70 mb-3 overflow-hidden"
    >
      {/* Thumbnail */}
      <View className="w-full h-36 bg-slate-100 border-b border-slate-200/50 items-center justify-center relative">
        <Feather name="image" size={28} color="#cbd5e1" />
        <Text className="text-[11px] text-slate-300 mt-1.5">
          Video thumbnail
        </Text>

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
            <View className="w-12 h-12 rounded-full bg-white/90 items-center justify-center">
              <Feather name="check" size={22} color="#3b6d11" />
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 pr-3">
            <Text className="text-[15px] font-medium text-slate-900 leading-snug mb-0.5">
              {routine.title}
            </Text>
            <Text className="text-[12px] text-slate-400 leading-5">
              {routine.goal}
            </Text>
          </View>
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: cfg.bg }}
          >
            <Feather name={cfg.icon} size={16} color={cfg.color} />
          </View>
        </View>

        {/* Intensity chip */}
        <View className="flex-row items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg self-start mb-4">
          <Feather name="zap" size={10} color="#94a3b8" />
          <Text className="text-[10px] text-slate-500 uppercase tracking-wide">
            {routine.intensity} intensity
          </Text>
        </View>

        {/* CTA — all dynamic via style */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStart}
          className="py-3 rounded-xl items-center justify-center flex-row gap-2 border"
          style={{
            backgroundColor: isCompleted ? "#f0fdf4" : "#0f172a",
            borderColor: isCompleted ? "#bbf7d0" : "#0f172a",
          }}
        >
          <Feather
            name={isCompleted ? "repeat" : "play"}
            size={14}
            color={isCompleted ? "#3b6d11" : "#fff"}
          />
          <Text
            className="text-[13px] font-medium"
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
        <View className="bg-white rounded-t-3xl px-5 pb-12 pt-3 border-t border-slate-200/50">
          {/* Drag handle */}
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />

          {/* Icon */}
          <View className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/70 items-center justify-center self-center mb-4">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={26}
              color="#a32d2d"
            />
          </View>

          <Text className="text-[20px] font-medium text-slate-900 text-center mb-2">
            Quick safety check
          </Text>
          <Text className="text-[13px] text-slate-400 text-center leading-relaxed mb-7 px-4">
            Did you experience any chest discomfort, shortness of breath, or
            dizziness during this routine?
          </Text>

          {/* No symptoms */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSafe}
            className="rounded-2xl py-4 items-center mb-2.5 flex-row justify-center gap-2.5 border"
            style={{ backgroundColor: "#eaf3de", borderColor: "#c0dd97" }}
          >
            <Feather name="check-circle" size={18} color="#3b6d11" />
            <Text
              className="text-[15px] font-medium"
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
            <Feather name="alert-triangle" size={16} color="#a32d2d" />
            <Text
              className="text-[15px] font-medium"
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

  const [cssScore, setCssScore] = useState<number>(78);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (params.completedId) {
      const routine = ROUTINES.find((r) => r.id === params.completedId);
      if (routine) {
        setPendingRoutine(routine);
        setShowSafetyCheck(true);
        router.setParams({ completedId: "" });
      }
    }
  }, [params.completedId]);

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
    () => ROUTINES.filter((r) => r.category === cssStatus),
    [cssStatus],
  );
  const statusCfg = STATUS_CONFIG[cssStatus];

  const totalActiveMins = useMemo(
    () =>
      completedExercises.reduce(
        (sum, id) => sum + (ROUTINES.find((r) => r.id === id)?.duration ?? 0),
        0,
      ),
    [completedExercises],
  );

  const progressPercent = Math.min((totalActiveMins / 30) * 100, 100);
  const progressColor = progressPercent >= 100 ? "#639922" : "#0f172a";

  const handleSafetySafe = () => {
    if (pendingRoutine && !completedExercises.includes(pendingRoutine.id)) {
      setCompletedExercises((prev) => [...prev, pendingRoutine.id]);
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
    router.push("/(home)/log-symptoms");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
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
          <View className="w-9 h-9 bg-[#1e4ed8] rounded-xl items-center justify-center">
            <MaterialCommunityIcons name="heart-pulse" size={18} color="white" />
          </View>
          <Text className="text-[16px] font-medium text-slate-900 tracking-tight">HeartLink</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center">
            <Feather name="bell" size={17} color="#64748b" />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center">
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image source={{ uri: "https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/470238702_122163229004273349_6885730481985014209_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeFspkU-pAnduqXzsg0nCMQSc3h1gs4ySEZzeHWCzjJIRiS7qjQy166_bn5hNqi44fxFQkp5tRFulwgVSN60yG1o&_nc_ohc=JjKG5iySuBYQ7kNvwF3zmCi&_nc_oc=AdqJL2LZkjt9IqiM_KPQtb2ZUT6mEm5UdI2cgi-6Mu6INC3QVBLGz8-OKHIG4Fuyfuk&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=zjeomdkvajMCPjEc3tC8YQ&_nc_ss=7b2a8&oh=00_Af_FFO3skv0KzZZjqU44lc3j6qTtYj5r07rF5GLagi9HDg&oe=6A275350" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-5 pt-3">
        <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
          Rehab routines
        </Text>
        <Text className="text-[13px] text-slate-400 mt-0.5">
          Adapted to your daily heart stability
        </Text>
      </View>

      {/* Dev toggle */}
      <View className="px-5 py-3">
        <View className="flex-row bg-slate-100 rounded-lg p-0.5 border border-slate-200/70">
          <DevBtn
            label="Stable (90)"
            active={cssScore === 90}
            onPress={() => setCssScore(90)}
          />
          <DevBtn
            label="Monitor (78)"
            active={cssScore === 78}
            onPress={() => setCssScore(78)}
          />
          <DevBtn
            label="Risk (60)"
            active={cssScore === 60}
            onPress={() => setCssScore(60)}
          />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* CSS score card */}
        <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Current CSS score
            </Text>
            <View
              className="px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: statusCfg.badgeBg }}
            >
              <Text
                className="text-[11px] font-medium"
                style={{ color: statusCfg.badgeText }}
              >
                {cssStatus}
              </Text>
            </View>
          </View>

          <Text className="text-[36px] font-medium text-slate-900 tracking-tight leading-none mb-1">
            {cssScore}
            <Text className="text-[16px] font-normal text-slate-400">
              {" "}
              / 100
            </Text>
          </Text>

          <View className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
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
              className="mt-3 p-3 rounded-xl border flex-row items-start gap-2"
              style={{
                backgroundColor: statusCfg.bannerBg,
                borderColor: statusCfg.bannerBorder,
              }}
            >
              <Feather
                name="alert-triangle"
                size={13}
                color="#e24b4a"
                style={{ marginTop: 1 }}
              />
              <Text
                className="flex-1 text-[12px] leading-[18px]"
                style={{ color: "#791f1f" }}
              >
                Please consult your physician before engaging in physical
                activity. Only breathing exercises are shown.
              </Text>
            </View>
          )}
        </View>

        {/* Daily progress */}
        <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <View>
              <Text className="text-[13px] font-medium text-slate-900">
                Daily active target
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                30 minutes recommended
              </Text>
            </View>
            <View
              className="px-2.5 py-1 rounded-lg"
              style={{
                backgroundColor: progressPercent >= 100 ? "#eaf3de" : "#f8fafc",
                borderWidth: 0.5,
                borderColor: progressPercent >= 100 ? "#c0dd97" : "#e2e8f0",
              }}
            >
              <Text
                className="text-[12px] font-medium"
                style={{ color: progressColor }}
              >
                {totalActiveMins} / 30 min
              </Text>
            </View>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressColor,
              }}
            />
          </View>
          {progressPercent >= 100 && (
            <View className="flex-row items-center gap-1.5 mt-2.5">
              <Feather name="check-circle" size={12} color="#639922" />
              <Text
                className="text-[11px] font-medium"
                style={{ color: "#3b6d11" }}
              >
                Daily target reached!
              </Text>
            </View>
          )}
        </View>

        {/* Routine list */}
        <Text className="text-[14px] font-medium text-slate-900 mb-3">
          Recommended today
        </Text>
        {activeRoutines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            isCompleted={completedExercises.includes(routine.id)}
            onPressCard={() =>
              router.push({
                pathname: "/(home)/routine-player",
                params: { id: routine.id },
              })
            }
            onStart={() =>
              router.push({
                pathname: "/(home)/routine-player",
                params: { id: routine.id },
              })
            }
          />
        ))}
      </ScrollView>

      {/* Safety Check Modal */}
      <SafetyCheckModal
        visible={showSafetyCheck}
        onSafe={handleSafetySafe}
        onSymptoms={handleSafetySymptoms}
      />
    </SafeAreaView>
  );
}
