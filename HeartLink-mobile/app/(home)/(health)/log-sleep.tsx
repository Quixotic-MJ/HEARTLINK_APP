import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Header } from "../../../components/Header";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function LogSleepScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token } = useUser();

  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(30);
  const [quality, setQuality] = useState("Good");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    
    const durationHours = hours + (minutes / 60);

    try {
      const payload = {
        duration_hours: durationHours,
        quality: quality
      };
      
      const res = await fetch(`${base_url}/api/sleep-logs/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to save sleep log");
      }

      router.back();
    } catch (err) {
      console.log("Network error saving sleep, queueing offline...", err);
      const { queueSleepForSync } = await import("../../../services/SyncService");
      await queueSleepForSync(userId!, {
        duration_hours: durationHours,
        quality: quality
      });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-slate-50 dark:bg-slate-950">
      <Header />
      <ScrollView contentContainerClassName="p-5 pb-24 md:max-w-2xl lg:max-w-4xl mx-auto w-full">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mb-6"
        >
          <Feather name="arrow-left" size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Log Sleep</Text>
        <Text className="text-[14px] text-slate-500 mb-8">Record your sleep duration and quality for better insights.</Text>

        {/* Duration Selection */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">Duration</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => setHours(Math.max(0, hours - 1))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center">
                <Feather name="minus" size={16} color={isDark ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-slate-900 dark:text-white">{hours}h</Text>
              <TouchableOpacity onPress={() => setHours(Math.min(24, hours + 1))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center">
                <Feather name="plus" size={16} color={isDark ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => setMinutes(Math.max(0, minutes - 15))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center">
                <Feather name="minus" size={16} color={isDark ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
              <Text className="text-3xl font-bold text-slate-900 dark:text-white">{minutes}m</Text>
              <TouchableOpacity onPress={() => setMinutes(Math.min(45, minutes + 15))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center">
                <Feather name="plus" size={16} color={isDark ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quality Selection */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">Sleep Quality</Text>
          <View className="flex-row flex-wrap gap-3">
            {["Poor", "Fair", "Good", "Excellent"].map((q) => (
              <TouchableOpacity 
                key={q}
                onPress={() => setQuality(q)}
                className={`px-4 py-2.5 rounded-full border ${quality === q ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}
              >
                <Text className={`text-[14px] font-medium ${quality === q ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave} 
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl items-center flex-row justify-center ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-white font-bold text-[16px]">Save Sleep Log</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}
