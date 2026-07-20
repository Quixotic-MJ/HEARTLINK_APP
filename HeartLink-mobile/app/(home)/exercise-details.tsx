import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Image, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get("window");

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

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Image Area */}
        <View style={{ height: 340, width: "100%", position: "relative" }}>
          <Image source={{ uri: routine.image }} className="w-full h-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-black/40" />
          
          <View style={{ paddingTop: Math.max(insets.top, 20) }} className="absolute top-0 left-0 right-0 px-5 flex-row items-center justify-between">
             <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md items-center justify-center border border-white/20">
                <Feather name="arrow-left" size={20} color="#fff" />
             </TouchableOpacity>
          </View>

          <View className="absolute bottom-6 left-5 right-5">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-[#1e4ed8] px-3 py-1.5 rounded-lg shadow-sm">
                <Text className="text-[11px] font-bold text-white uppercase tracking-wider">{routine.type}</Text>
              </View>
              <View className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <Text className="text-[11px] font-bold text-white uppercase tracking-wider">{routine.duration} min</Text>
              </View>
            </View>
            <Text className="text-[34px] font-bold text-white leading-tight tracking-tight shadow-sm">
              {routine.title}
            </Text>
          </View>
        </View>

        <View className="px-5 pt-8">
          <Text className="text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {routine.goal}
          </Text>

          {/* Info Cards */}
          <View className="flex-row items-center gap-3 mb-10">
            <View className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-3">
                <Feather name="activity" size={22} color="#1e4ed8" />
              </View>
              <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-1">Intensity</Text>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{routine.intensity}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-900 dark:bg-slate-100 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/70 items-center justify-center shadow-sm shadow-slate-100">
              <View className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center mb-3">
                <Feather name="shield" size={22} color="#7e22ce" />
              </View>
              <Text className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-1">Risk Tier</Text>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{routine.category}</Text>
            </View>
          </View>

          {/* Timer Section */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 p-8 rounded-[32px] items-center justify-center mb-6 border border-slate-200 dark:border-slate-800/70 shadow-sm shadow-slate-200/50">
            <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">Time Remaining</Text>
            <Text className="text-[84px] font-bold text-slate-900 dark:text-white dark:text-slate-900 tracking-tighter leading-none" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(timeLeft)}
            </Text>
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
                <Text className={`${timeLeft < routine.duration * 60 ? 'text-[#1e4ed8]' : 'text-white dark:text-slate-900'} text-[18px] font-bold`}>
                  {timeLeft < routine.duration * 60 ? "Resume Routine" : "Start Routine"}
                </Text>
             </>
           )}
         </TouchableOpacity>
      </View>

      {/* Safety Check Bottom Sheet Modal */}
      <Modal visible={showSafetyCheck} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/40 dark:bg-slate-100/40 justify-end">
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-t-3xl p-6 pb-12 shadow-xl border-t border-slate-200 dark:border-slate-800">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-[22px] font-bold text-slate-900 dark:text-white dark:text-slate-900 mb-2 text-center">Great job!</Text>
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
