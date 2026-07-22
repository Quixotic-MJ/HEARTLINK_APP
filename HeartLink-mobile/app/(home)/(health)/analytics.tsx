import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function HealthAnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId } = useUser();

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`${base_url}/api/analytics/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    if (userId) fetchAnalytics();
  }, [userId]);

  if (isLoading || !analytics) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <Text>Loading analytics...</Text>
      </View>
    );
  }

  // Get the latest CSS score from history
  const history = analytics.history || [];
  const latestCSS = history.length > 0 ? history[history.length - 1].score : 84;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-4"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            Analytics Suite
          </Text>
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">
            Health Analytics
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Time Filters */}
        <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <TouchableOpacity className="flex-1 bg-white dark:bg-slate-900 py-2 rounded-lg shadow-sm shadow-slate-200 items-center">
            <Text className="text-[13px] font-bold text-[#1e4ed8]">7-Day</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2 rounded-lg items-center">
            <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400">30-Day</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
        <View className="flex-row mb-6 border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity className="pb-3 border-b-2 border-[#1e4ed8] mr-6">
            <Text className="text-[14px] font-bold text-slate-900 dark:text-white">Overview & CSS</Text>
          </TouchableOpacity>
          <TouchableOpacity className="pb-3" onPress={() => router.push("/(home)/health-history")}>
            <Text className="text-[14px] font-medium text-slate-400">Diet & Biometrics</Text>
          </TouchableOpacity>
        </View>

        {/* ── CSS Score Card ── */}
        <View className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
          <View className="flex-row items-start justify-between mb-8">
            <View>
              <Text className="text-[16px] font-bold text-slate-900 dark:text-white">Cardiac Stability</Text>
              <Text className="text-[16px] font-bold text-slate-900 dark:text-white">Score (CSS)</Text>
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">Last 7 days trend analysis</Text>
            </View>
            <TouchableOpacity 
               onPress={() => router.push("/(home)/detailed-analytics")}
               className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex-row items-center"
            >
              <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              <Text className="text-[18px] font-bold text-[#1e4ed8]">{latestCSS}</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder for Chart */}
          <View className="h-32 mb-4 justify-end border-b border-slate-200 dark:border-slate-800 relative">
             {/* Fake Line Chart */}
             <View className="absolute left-0 right-0 bottom-4 h-16 flex-row items-end justify-between px-2">
                <View className="w-2 bg-blue-400 rounded-full h-8" />
                <View className="w-2 bg-blue-400 rounded-full h-10" />
                <View className="w-2 bg-blue-400 rounded-full h-6" />
                <View className="w-2 bg-blue-400 rounded-full h-12" />
                <View className="w-2 bg-blue-400 rounded-full h-16" />
                <View className="w-2 bg-blue-600 rounded-full h-14" />
             </View>
          </View>

          {/* X Axis labels */}
          <View className="flex-row justify-between px-2 mb-6">
            <Text className="text-[9px] font-bold text-slate-400">MON</Text>
            <Text className="text-[9px] font-bold text-slate-400">TUE</Text>
            <Text className="text-[9px] font-bold text-slate-400">WED</Text>
            <Text className="text-[9px] font-bold text-slate-400">THU</Text>
            <Text className="text-[9px] font-bold text-slate-400">FRI</Text>
            <Text className="text-[9px] font-bold text-slate-400">SAT</Text>
            <Text className="text-[9px] font-bold text-[#1e4ed8]">SUN</Text>
          </View>

          {/* Legend */}
          <View className="flex-row justify-between">
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <Text className="text-[9px] text-slate-500 dark:text-slate-400">Optimal (80-100)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
              <Text className="text-[9px] text-slate-500 dark:text-slate-400">Moderate (60-79)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
              <Text className="text-[9px] text-slate-500 dark:text-slate-400">At Risk (&lt;60)</Text>
            </View>
          </View>
        </View>

        {/* ── Smart Insights ── */}
        <View className="bg-[#1e4ed8] rounded-3xl p-5 shadow-sm shadow-blue-500/30">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="auto-fix" size={18} color="#93c5fd" />
            <Text className="text-[14px] font-bold text-white ml-2">Smart Insights</Text>
          </View>
          <Text className="text-[14px] text-blue-50 leading-relaxed">
            "Your stability score improved by <Text className="font-bold text-white">5 points</Text> this week. Your consistent medication tracking and mild symptom reports contributed to this."
          </Text>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}
