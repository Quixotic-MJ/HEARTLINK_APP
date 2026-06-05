import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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

const ROUTINES: Routine[] = [
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
}: {
  routine: Routine;
  onComplete: () => void;
}) {
  const iconColor = getTypeColor(routine.type);
  const iconBg = getTypeIconBg(routine.type);

  return (
    <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-10">
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-[15px] font-medium text-slate-900 mb-1 leading-snug">
            {routine.title}
          </Text>
          <Text className="text-[13px] text-slate-400 leading-5">
            {routine.goal}
          </Text>
        </View>
        {/* Icon — dynamic bg/color kept as inline style to avoid css-interop issues */}
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Feather name={getTypeIcon(routine.type)} size={17} color={iconColor} />
        </View>
      </View>

      {/* Chips */}
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

      {/* CTA */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onComplete}
        className="bg-slate-900 py-3 rounded-xl items-center justify-center flex-row gap-2"
      >
        <Feather name="check" size={15} color="#fff" />
        <Text className="text-white text-[13px] font-medium">
          Mark as completed
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Status config (no dynamic className — avoids css-interop crash) ──────────

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
// Uses inline style for bg to avoid dynamic className triggering css-interop

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
      // Dynamic bg via style, not className — avoids css-interop crash
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
  const [cssScore, setCssScore] = useState<number>(78);

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

  const handleComplete = (routine: Routine) => {
    Alert.alert(
      "Activity logged",
      `Great job! You logged ${routine.duration} minutes for "${routine.title}".`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

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

      {/* Dev toggle — all dynamic styling via inline style, not className */}
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
        {/* CSS Score Banner */}
        <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Current CSS score
            </Text>
            {/* Badge — dynamic colors via inline style only */}
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
            <Text className="text-[16px] font-normal text-slate-400"> / 100</Text>
          </Text>

          {/* Score bar */}
          <View className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${cssScore}%`,
                backgroundColor: cssScore >= 85 ? "#639922" : cssScore >= 70 ? "#ba7517" : "#e24b4a",
              }}
            />
          </View>

          {/* Elevated risk warning */}
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

        {/* Routine list */}
        <Text className="text-[14px] font-medium text-slate-900 mb-2.5">
          Recommended today
        </Text>

        {activeRoutines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onComplete={() => handleComplete(routine)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}