import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeConfig(type: string) {
  if (type === "Breathing")  return { icon: "wind"     as const, color: "#854f0b", bg: "#faeeda" };
  if (type === "Stationary") return { icon: "anchor"   as const, color: "#185fa5", bg: "#e6f1fb" };
  return                            { icon: "activity" as const, color: "#3b6d11", bg: "#eaf3de" };
}

// ─── Step Item ────────────────────────────────────────────────────────────────

function StepItem({ number, text, isLast }: { number: number; text: string; isLast: boolean }) {
  return (
    <View className="flex-row items-start">
      {/* Number + connecting line */}
      <View className="items-center mr-4" style={{ width: 28 }}>
        <View
          className="w-7 h-7 rounded-full items-center justify-center"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{number}</Text>
        </View>
        {!isLast && (
          <View className="w-px flex-1 bg-slate-200 mt-1.5" style={{ minHeight: 20 }} />
        )}
      </View>
      <Text
        className="flex-1 text-[14px] text-slate-600 leading-relaxed pt-0.5"
        style={{ paddingBottom: isLast ? 0 : 20 }}
      >
        {text}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutinePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const response = await fetch(`${base_url}/api/exercises/${id}`);
        if (!response.ok) throw new Error("Failed to fetch routine");
        const data = await response.json();
        
        setRoutine({
          id: data.id,
          title: data.name || "",
          duration: data.duration_minutes || 0,
          goal: data.goal || "",
          type: data.type || "Light Cardio",
          intensity: data.intensity || "Low",
          category: data.css_tier || "Stable",
          steps: data.steps || [],
          mediaUrl: data.media_url,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id]);

  if (isLoading || !routine) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  const cfg = getTypeConfig(routine.type);

  const steps = routine.steps && routine.steps.length > 0 ? routine.steps : [
    "Sit straight on the edge of a sturdy chair with your feet flat on the floor.",
    "Inhale deeply and slowly raise your arms above your head.",
    "Exhale gently while lowering your arms back down to your sides.",
    "Keep your shoulders relaxed and avoid straining your neck.",
    "Repeat this motion smoothly for 10–15 repetitions.",
  ];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="light" />

      {/* ── Video placeholder ── */}
      <View
        className="w-full bg-slate-900 dark:bg-slate-100 relative items-center justify-center"
        style={{ aspectRatio: 16 / 9 }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute z-10 w-9 h-9 rounded-xl bg-black/40 border border-white/15 items-center justify-center"
          style={{ top: insets.top + 12, left: 20 }}
        >
          <Feather name="arrow-left" size={17} color="#fff" />
        </TouchableOpacity>

        {/* Play button */}
        <View className="items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Feather name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            Video preview
          </Text>
        </View>

        {/* Bottom gradient info bar */}
        <View
          className="absolute bottom-0 left-0 right-0 px-4 py-3 flex-row items-center justify-between"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
            {routine.title}
          </Text>
          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg }}>
            <Feather name={cfg.icon} size={11} color={cfg.color} />
            <Text style={{ color: cfg.color, fontSize: 11 }}>{routine.type}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-5 pb-36"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Routine header ── */}
        <View className="mb-5 pb-5 border-b border-slate-200 dark:border-slate-800/50">
          <Text className="text-[22px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug mb-3">
            {routine.title}
          </Text>

          {/* Meta chips */}
          <View className="flex-row gap-2 mb-3">
            <View
              className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border"
              style={{ backgroundColor: cfg.bg, borderColor: cfg.bg }}
            >
              <Feather name="clock" size={11} color={cfg.color} />
              <Text className="text-[11px]" style={{ color: cfg.color }}>
                {routine.duration} mins
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-2.5 py-1 rounded-lg">
              <Feather name="zap" size={11} color="#94a3b8" />
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                {routine.intensity} intensity
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-2.5 py-1 rounded-lg">
              <Feather name={cfg.icon} size={11} color="#94a3b8" />
              <Text className="text-[11px] text-slate-500 dark:text-slate-400">{routine.type}</Text>
            </View>
          </View>

          <Text className="text-[13px] text-slate-400 leading-relaxed">{routine.goal}</Text>
        </View>

        {/* ── Safety note ── */}
        <View className="flex-row items-start gap-3 bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 rounded-2xl p-4 mb-5">
          <View className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 items-center justify-center flex-shrink-0">
            <Feather name="shield" size={14} color="#854f0b" />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-0.5">Safety reminder</Text>
            <Text className="text-[12px] text-slate-400 leading-relaxed">
              Stop immediately if you feel chest pain, dizziness, or shortness of breath. Log any symptoms after the routine.
            </Text>
          </View>
        </View>

        {/* ── Step-by-step guide ── */}
        <Text className="text-[14px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-4">
          Step-by-step guide
        </Text>
        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4">
          {steps.map((step, i) => (
            <StepItem key={i} number={i + 1} text={step} isLast={i === steps.length - 1} />
          ))}
        </View>

        {/* ── Tips ── */}
        <View className="mt-3 bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Feather name="info" size={14} color="#94a3b8" />
            <Text className="text-[12px] text-slate-400 uppercase tracking-wide">Tips</Text>
          </View>
          <View className="gap-2">
            {[
              "Keep your breathing steady and controlled throughout.",
              "Use a chair without wheels for safety.",
              "Do this routine in a quiet, comfortable space.",
            ].map((tip, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
                <Text className="flex-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 dark:bg-slate-100 border-t border-slate-200 dark:border-slate-800/50 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={async () => {
            setIsSubmitting(true);
            try {
              const payload = {
                routine_id: routine.id,
                routine_name: routine.title,
                duration_minutes: routine.duration,
                status: "completed"
              };
              await fetch(`${base_url}/api/exercises/logs/${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            } catch (err) {
              console.error(err);
            } finally {
              setIsSubmitting(false);
              router.push({
                pathname: "/(home)/(tabs)/exercises",
                params: { completedId: routine.id },
              });
            }
          }}
          className="w-full bg-slate-900 dark:bg-slate-100 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <Feather name="check-circle" size={16} color="#fff" />
          <Text className="text-white dark:text-slate-900 text-[14px] font-medium">
            {isSubmitting ? "Logging..." : "Finish & log activity"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}