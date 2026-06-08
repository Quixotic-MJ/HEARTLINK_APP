import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Routine {
  id: string;
  title: string;
  duration: number;
  goal: string;
  type: "Light Cardio" | "Stationary" | "Breathing";
  intensity: "Low" | "Medium" | "None";
  category: "Stable" | "Monitor Closely" | "Elevated Risk";
}

// ─── Routine Data ────────────────────────────────────────────────────────────

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
    goal: "Lower blood pressure and induces resting state.",
    type: "Breathing",
    intensity: "None",
    category: "Elevated Risk",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTypeIcon(type: Routine["type"]): React.ComponentProps<typeof Feather>["name"] {
  if (type === "Breathing") return "wind";
  if (type === "Stationary") return "anchor";
  return "activity";
}

function getTypeColor(type: Routine["type"]): string {
  if (type === "Breathing") return "#854f0b";   // amber
  if (type === "Stationary") return "#185fa5";  // blue
  return "#3b6d11";                              // green
}

function getTypeIconBg(type: Routine["type"]): string {
  if (type === "Breathing") return "#faeeda";
  if (type === "Stationary") return "#e6f1fb";
  return "#eaf3de";
}

// ─── Routine Card ─────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onComplete,
  onPressCard,
  isCompleted
}: {
  routine: Routine;
  onComplete: () => void;
  onPressCard: () => void;
  isCompleted: boolean;
}) {
  const iconColor = getTypeColor(routine.type);
  const iconBg = getTypeIconBg(routine.type);

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPressCard}
      className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5"
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-[15px] font-medium text-slate-900 mb-1 leading-snug">
            {routine.title}
          </Text>
          <Text className="text-[13px] text-slate-400 leading-5">
            {routine.goal}
          </Text>
        </View>
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Feather name={getTypeIcon(routine.type)} size={17} color={iconColor} />
        </View>
      </View>

      <View className="flex-row gap-2 mb-4">
        <View className="flex-row items-center bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg gap-1.5">
          <Feather name="clock" size={11} color="#94a3b8" />
          <Text className="text-[11px] text-slate-500 uppercase tracking-wide">
            {routine.duration} mins
          </Text>
        </View>
        <View className="flex-row items-center bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg gap-1.5">
          <Feather name="zap" size={11} color="#94a3b8" />
          <Text className="text-[11px] text-slate-500 uppercase tracking-wide">
            {routine.intensity} intensity
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          // Don't want onPressCard to fire
          if (!isCompleted) {
             onComplete();
          }
        }}
        disabled={isCompleted}
        className={`py-3 rounded-xl items-center justify-center flex-row gap-2 ${isCompleted ? 'bg-slate-100' : 'bg-slate-900'}`}
      >
        {isCompleted ? (
           <MaterialCommunityIcons name="check-all" size={16} color="#94a3b8" />
        ) : (
           <Feather name="check" size={15} color="#fff" />
        )}
        <Text className={`text-[13px] font-medium ${isCompleted ? 'text-slate-400' : 'text-white'}`}>
          {isCompleted ? "Completed Today" : "Mark as completed"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Status config ──────────────────────────

const STATUS_CONFIG = {
  Stable: {
    badgeBg: "#eaf3de",
    badgeText: "#3b6d11",
    bannerBg: undefined,
    bannerBorder: undefined,
  },
  "Monitor Closely": {
    badgeBg: "#faeeda",
    badgeText: "#854f0b",
    bannerBg: undefined,
    bannerBorder: undefined,
  },
  "Elevated Risk": {
    badgeBg: "#fcebeb",
    badgeText: "#a32d2d",
    bannerBg: "#fcebeb",
    bannerBorder: "#f7c1c1",
  },
} as const;

// ─── Dev Toggle Button ────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const router = useRouter();
  const [cssScore, setCssScore] = useState<number>(78);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const slideAnim = useRef(new Animated.Value(-150)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 50, duration: 400, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(slideAnim, { toValue: -150, duration: 300, useNativeDriver: true })
    ]).start(() => setToastMessage(null));
  };

  const cssStatus = useMemo<Routine["category"]>(() => {
    if (cssScore >= 85) return "Stable";
    if (cssScore >= 70) return "Monitor Closely";
    return "Elevated Risk";
  }, [cssScore]);

  const activeRoutines = useMemo(
    () => ROUTINES.filter((r) => r.category === cssStatus),
    [cssStatus]
  );

  const statusCfg = STATUS_CONFIG[cssStatus];

  const totalActiveMins = useMemo(() => {
    return completedExercises.reduce((sum, id) => {
      const routine = ROUTINES.find(r => r.id === id);
      return sum + (routine ? routine.duration : 0);
    }, 0);
  }, [completedExercises]);

  const progressPercent = Math.min((totalActiveMins / 30) * 100, 100);

  const handleMarkCompleteClick = (routine: Routine) => {
    setPendingRoutine(routine);
    setShowSafetyCheck(true);
  };

  const handleSafetySafe = () => {
    if (pendingRoutine && !completedExercises.includes(pendingRoutine.id)) {
      setCompletedExercises([...completedExercises, pendingRoutine.id]);
      setShowSafetyCheck(false);
      showToast(`Awesome! ${pendingRoutine.duration} active minutes added to your daily tracker.`);
      setPendingRoutine(null);
    }
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    setPendingRoutine(null);
    router.push("/(home)/log-symptoms");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }} className="absolute left-5 right-5 z-50 bg-green-50 border border-green-200 p-4 rounded-2xl flex-row items-center shadow-sm">
          <Feather name="check-circle" size={18} color="#16a34a" className="mr-3" />
          <Text className="flex-1 text-[13px] font-medium text-green-900">{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View className="flex-row items-start justify-between px-5 pt-4 pb-1">
        <View>
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Rehab routines
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">
            Adapted to your daily heart stability
          </Text>
        </View>
        <View className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 items-center justify-center">
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#a32d2d" />
        </View>
      </View>

      {/* Dev toggle */}
      <View className="px-5 py-3">
        <View className="flex-row bg-slate-100 rounded-lg p-0.5 border border-slate-200/70">
          <DevBtn label="Stable (90)" active={cssScore === 90} onPress={() => setCssScore(90)} />
          <DevBtn label="Monitor (78)" active={cssScore === 78} onPress={() => setCssScore(78)} />
          <DevBtn label="Risk (60)" active={cssScore === 60} onPress={() => setCssScore(60)} />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* CSS Score Banner */}
        <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Current CSS score
            </Text>
            <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: statusCfg.badgeBg }}>
              <Text className="text-[11px] font-medium" style={{ color: statusCfg.badgeText }}>
                {cssStatus}
              </Text>
            </View>
          </View>

          <Text className="text-[36px] font-medium text-slate-900 tracking-tight leading-none mb-1">
            {cssScore}
            <Text className="text-[16px] font-normal text-slate-400"> / 100</Text>
          </Text>

          <View className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${cssScore}%`,
                backgroundColor: cssScore >= 85 ? "#639922" : cssScore >= 70 ? "#ba7517" : "#e24b4a",
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
              <Feather name="alert-triangle" size={14} color="#e24b4a" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[12px] leading-[18px]" style={{ color: "#791f1f" }}>
                Please consult your physician before engaging in physical activity. Only breathing exercises are shown.
              </Text>
            </View>
          )}
        </View>

        {/* Daily Progress Goal */}
        <View className="mb-6 bg-white p-4 rounded-2xl border border-slate-200/70">
           <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[14px] font-bold text-slate-900">Daily Active Target: 30 Mins</Text>
              <Text className="text-[12px] text-slate-500 font-medium">{totalActiveMins} / 30 mins</Text>
           </View>
           <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full bg-[#1e4ed8] rounded-full" style={{ width: `${progressPercent}%` }} />
           </View>
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
            onPressCard={() => router.push({ pathname: "/(home)/exercise-details", params: { id: routine.id } })}
            onComplete={() => handleMarkCompleteClick(routine)}
          />
        ))}
      </ScrollView>

      {/* Safety Check Bottom Sheet Modal */}
      <Modal visible={showSafetyCheck} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-12 shadow-xl border-t border-slate-200">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-[20px] font-bold text-slate-900 mb-2 text-center">Great job! Quick safety check.</Text>
            <Text className="text-[15px] text-slate-500 text-center mb-8 leading-relaxed px-2">Did you experience any chest discomfort or dizziness during this routine?</Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySafe}
              className="bg-blue-50 border border-blue-100 py-4 rounded-xl items-center mb-3 flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">👍</Text>
              <Text className="text-[#1e4ed8] font-bold text-[16px]">No, I feel great</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySymptoms}
              className="bg-red-50 border border-red-100 py-4 rounded-xl items-center flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">⚠️</Text>
              <Text className="text-red-700 font-bold text-[16px]">Yes, I felt symptoms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}