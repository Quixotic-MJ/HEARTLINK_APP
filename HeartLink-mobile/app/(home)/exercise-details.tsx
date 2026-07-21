import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Image, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../contexts/UserContext";
import YoutubePlayer from "react-native-youtube-iframe";

const base_url = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get("window");

const VIDEO_BY_TYPE: Record<string, string> = {
  "Light Cardio": "https://www.youtube.com/watch?v=njeZ29umqVE",
  "Stationary":   "https://www.youtube.com/watch?v=5WEBMhRc_9M",
  "Breathing":    "https://www.youtube.com/watch?v=DbDoBzGY3vo",
};

function StepItem({ number, text, isLast }: { number: number; text: string; isLast: boolean }) {
  return (
    <View className="flex-row items-start">
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

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (routine && timeLeft === 0) {
      setTimeLeft(routine.duration * 60);
    }
  }, [routine]);
  
  const [isActive, setIsActive] = useState(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowSafetyCheck(true);
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSafetySafe = async () => {
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
      setShowSafetyCheck(false);
      router.push({
        pathname: "/(home)/(tabs)/exercises",
        params: { completedId: routine.id },
      });
    }
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    router.push("/(home)/log-symptoms");
  };

  if (isLoading || !routine) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };
  const videoId = routine ? getYoutubeVideoId(routine.videoUrl) : null;

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

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Area */}
        <View className="w-full bg-black relative" style={{ paddingTop: Math.max(insets.top, 10) }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute z-10 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
            style={{ top: Math.max(insets.top, 10) + 10, left: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {videoId ? (
            <YoutubePlayer
              height={width * (9 / 16)}
              width={width}
              play={isActive}
              videoId={videoId}
            />
          ) : (
            <View className="w-full items-center justify-center overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
              <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
              <View className="absolute inset-0 bg-black/40" />
            </View>
          )}
        </View>

        <View className="px-5 pt-6">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
              <Text className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{routine.type}</Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{routine.duration} min</Text>
            </View>
          </View>
          
          <Text className="text-[30px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
            {routine.title}
          </Text>
          <Text className="text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {routine.goal}
          </Text>

          {/* Info Cards */}
          <View className="flex-row items-center gap-3 mb-10">
            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-3">
                <Feather name="activity" size={22} color="#1e4ed8" />
              </View>
              <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-1">Intensity</Text>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white">{routine.intensity}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center mb-3">
                <Feather name="shield" size={22} color="#7e22ce" />
              </View>
              <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-1">Risk Tier</Text>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white">{routine.category}</Text>
            </View>
          </View>

          {/* Timer Section */}
          <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] items-center justify-center mb-6 border border-slate-200 dark:border-slate-800/70 shadow-sm shadow-slate-200/50">
            <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2">Time Remaining</Text>
            <Text className="text-[56px] font-bold text-slate-900 dark:text-white tracking-tighter leading-none" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* ── Step-by-step guide ── */}
          <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-4 mt-2">
            Step-by-step guide
          </Text>
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-5 mb-8 shadow-sm shadow-slate-100">
            {steps.map((step: string, i: number) => (
              <StepItem key={i} number={i + 1} text={step} isLast={i === steps.length - 1} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Button */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 px-5 pt-4 pb-6">
         <TouchableOpacity 
           activeOpacity={0.8}
           onPress={toggleTimer}
           className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${isActive ? 'bg-red-50 border border-red-100' : 'bg-[#1e4ed8] shadow-blue-500/30'}`}
         >
           {isActive ? (
             <>
                <Feather name="pause" size={22} color="#b91c1c" className="mr-2" />
                <Text className="text-red-700 text-[18px] font-bold">Pause Routine</Text>
             </>
           ) : (
             <>
                <Feather name="play" size={22} color={timeLeft < routine.duration * 60 ? "#1e4ed8" : "white"} className="mr-2" />
                <Text className={`${timeLeft < routine.duration * 60 ? 'text-[#1e4ed8]' : 'text-white'} text-[18px] font-bold`}>
                  {timeLeft < routine.duration * 60 ? "Resume Routine" : "Start Routine"}
                </Text>
             </>
           )}
         </TouchableOpacity>
      </View>

      {/* Safety Check Bottom Sheet Modal */}
      <Modal visible={showSafetyCheck} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/40/40 justify-end">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-12 shadow-xl border-t border-slate-200 dark:border-slate-800">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-[22px] font-bold text-slate-900 dark:text-white mb-2 text-center">Great job!</Text>
            <Text className="text-[16px] text-slate-500 dark:text-slate-400 text-center mb-8 leading-relaxed px-4">Did you experience any chest discomfort or dizziness during this routine?</Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={handleSafetySafe}
              className="bg-blue-50 border border-blue-100 py-4 rounded-2xl items-center mb-3 flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">👍</Text>
              <Text className="text-[#1e4ed8] font-bold text-[17px]">
                {isSubmitting ? "Logging..." : "No, I feel great"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySymptoms}
              className="bg-red-50 border border-red-100 py-4 rounded-2xl items-center flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">⚠️</Text>
              <Text className="text-red-700 font-bold text-[17px]">Yes, I felt symptoms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
