import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "../../contexts/UserContext";
import * as WebBrowser from "expo-web-browser";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Video URLs mapped by exercise type ───────────────────────────────────────

const VIDEO_BY_TYPE: Record<string, string> = {
  "Light Cardio": "https://www.youtube.com/watch?v=njeZ29umqVE",   // Heart-safe walking routine
  "Stationary":   "https://www.youtube.com/watch?v=5WEBMhRc_9M",   // Chair yoga / seated stretches
  "Breathing":    "https://www.youtube.com/watch?v=DbDoBzGY3vo",   // 4-7-8 breathing technique
};

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
  const [hasWatched, setHasWatched] = useState(false);

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
          videoUrl: data.video_url || VIDEO_BY_TYPE[data.type] || VIDEO_BY_TYPE["Light Cardio"],
          image: data.image_url || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoutine();
  }, [id]);

  const openVideo = async () => {
    if (routine?.videoUrl) {
      await WebBrowser.openBrowserAsync(routine.videoUrl);
      // User is back from the in-app browser
      setHasWatched(true);
    }
  };

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

      {/* ── Video Thumbnail ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openVideo}
        className="w-full bg-slate-900 relative items-center justify-center overflow-hidden"
        style={{ aspectRatio: 16 / 9 }}
      >
        <Image
          source={{ uri: routine.image }}
          className="absolute inset-0 w-full h-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/40" />

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute z-10 w-9 h-9 rounded-xl bg-black/40 border border-white/15 items-center justify-center"
          style={{ top: Math.max(insets.top, 20), left: 20 }}
        >
          <Feather name="arrow-left" size={17} color="#fff" />
        </TouchableOpacity>

        {/* Play button */}
        <View className="items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-2"
            style={{ backgroundColor: hasWatched ? "rgba(59,109,17,0.85)" : "rgba(255,0,0,0.85)" }}
          >
            <Feather name={hasWatched ? "check" : "play"} size={28} color="#fff" style={hasWatched ? {} : { marginLeft: 4 }} />
          </View>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
            {hasWatched ? "Tap to Rewatch" : "Watch Tutorial Video"}
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
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-0 pb-36"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Watched banner ── */}
        {hasWatched && (
          <View className="mx-0 mt-4 mb-2 p-3.5 rounded-2xl border flex-row items-center gap-2.5" style={{ backgroundColor: "#eaf3de", borderColor: "#c0dd97" }}>
            <Feather name="check-circle" size={16} color="#3b6d11" />
            <Text className="flex-1 text-[13px] font-medium" style={{ color: "#27500a" }}>
              Video watched! Follow the steps below, then tap "Finish & log" when done.
            </Text>
          </View>
        )}

        {/* ── Routine header ── */}
        <View className="mb-5 pb-5 pt-4 border-b border-slate-200 dark:border-slate-800/50">
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

          <Text className="text-[13px] text-slate-400 leading-relaxed mb-4">{routine.goal}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/(home)/exercise-details", params: { id: routine.id } })}
            className="w-full bg-blue-50 dark:bg-blue-900/20 py-3.5 rounded-xl border border-blue-100 dark:border-blue-800 flex-row items-center justify-center gap-2"
          >
            <Feather name="clock" size={16} color="#1e4ed8" />
            <Text className="text-[#1e4ed8] text-[14px] font-bold">
              Start Guided Timer
            </Text>
          </TouchableOpacity>
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