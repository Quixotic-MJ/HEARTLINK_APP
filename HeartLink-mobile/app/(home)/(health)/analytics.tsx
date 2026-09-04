import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function HealthAnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, logout } = useUser();

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const response = await fetch(`${base_url}/api/analytics/${userId}`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
          },
        });
        if (response.status === 401) {
          await logout();
          return;
        }
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
  }, [userId, token, logout]);

  if (isLoading || !analytics) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <Text>Loading analytics...</Text>
      </View>
    );
  }

  // Get the latest HSS score from history
  const history = Array.isArray(analytics?.history) ? analytics.history : [];
  const latestHSS = history.length > 0 ? history[history.length - 1].score : null;

  // Take the last 7 points for the trend
  const recentPoints = history.slice(-7);
  const oldestScore = recentPoints.length > 1 ? recentPoints[0].score : (latestHSS ?? 0);
  const newestScore = latestHSS ?? 0;
  const scoreDelta = newestScore - oldestScore;

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
        
        {/* Tab Filters */}
        <View className="flex-row mb-6 border-b border-slate-100 dark:border-slate-800">
          <View className="pb-3 border-b-2 border-[#1e4ed8] mr-6">
            <Text className="text-[14px] font-bold text-slate-900 dark:text-white">Overview & HSS</Text>
          </View>
          <TouchableOpacity className="pb-3" onPress={() => router.push("/(home)/(meals)/daily-diary" as any)}>
            <Text className="text-[14px] font-medium text-slate-400">Diet & Meals</Text>
          </TouchableOpacity>
          <TouchableOpacity className="pb-3 ml-6" onPress={() => router.push("/(home)/(health)/exercise-diary" as any)}>
            <Text className="text-[14px] font-medium text-slate-400">Activity</Text>
          </TouchableOpacity>
        </View>

        {/* ── HSS Score Card ── */}
        <View className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
          <View className="flex-row items-start justify-between mb-8">
            <View>
              <Text className="text-[16px] font-bold text-slate-900 dark:text-white">Cardiac Stability</Text>
              <Text className="text-[16px] font-bold text-slate-900 dark:text-white">Score (HSS)</Text>
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">Recent trend analysis</Text>
            </View>
            <View 
               className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex-row items-center"
            >
              <View className={`w-2 h-2 rounded-full mr-2 ${latestHSS && latestHSS >= 80 ? "bg-emerald-500" : latestHSS && latestHSS >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
              <Text className="text-[18px] font-bold text-[#1e4ed8]">{latestHSS !== null ? latestHSS : "Pending"}</Text>
            </View>
          </View>

          {/* Dynamic Telemetry Chart */}
          <View className="h-36 mb-4 justify-end border-b border-slate-200 dark:border-slate-800 relative">
             {recentPoints.length === 0 ? (
               <View className="items-center justify-center h-full pb-4">
                 <Text className="text-[12px] text-slate-400">No telemetry recorded yet.</Text>
               </View>
             ) : (
               <View className="absolute left-0 right-0 bottom-2 h-24 flex-row items-end justify-between px-2">
                 {recentPoints.map((point: any, idx: number) => {
                   const score = typeof point.score === "number" ? point.score : 0;
                   const heightPercent = Math.min(100, Math.max(15, Math.round(score)));
                   const barColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
                   return (
                     <View key={idx} className="items-center flex-1">
                       <Text className="text-[9px] text-slate-400 font-bold mb-1">{score}</Text>
                       <View
                         style={{ height: `${heightPercent}%`, backgroundColor: barColor }}
                         className="w-4 rounded-t-md"
                       />
                     </View>
                   );
                 })}
               </View>
             )}
          </View>

          {/* X Axis labels */}
          {recentPoints.length > 0 && (
            <View className="flex-row justify-between px-2 mb-6">
              {recentPoints.map((point: any, idx: number) => {
                const dateObj = point.computed_at ? new Date(point.computed_at) : new Date();
                const dayLabel = isNaN(dateObj.getTime())
                  ? `D${idx + 1}`
                  : dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
                return (
                  <Text key={idx} className="text-[9px] font-bold text-slate-400 text-center flex-1">
                    {dayLabel}
                  </Text>
                );
              })}
            </View>
          )}

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
        <View className="bg-[#1e4ed8] rounded-3xl p-5 shadow-sm shadow-blue-500/30 mb-6">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="auto-fix" size={18} color="#93c5fd" />
            <Text className="text-[14px] font-bold text-white ml-2">Smart Insights</Text>
          </View>
          <Text className="text-[14px] text-blue-50 leading-relaxed">
            {latestHSS !== null ? (
              scoreDelta > 0 ? (
                <>Your stability score improved by <Text className="font-bold text-white">+{scoreDelta} points</Text> across your recent check-in readings.</>
              ) : scoreDelta < 0 ? (
                <>Your stability score changed by <Text className="font-bold text-white">{scoreDelta} points</Text>. Review medication and symptoms in your check-in logs.</>
              ) : (
                <>Your stability score is holding steady at <Text className="font-bold text-white">{latestHSS}</Text>. Continue consistent daily tracking.</>
              )
            ) : (
              "Log daily symptoms, vitals, and meals to generate tailored cardiac insights and trend analysis."
            )}
          </Text>
        </View>

        {/* ── Link to 6-Month Heatmap ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(home)/(profile)/analytics" as any)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 items-center justify-center">
              <Feather name="calendar" size={18} color="#2563eb" />
            </View>
            <View>
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">
                Long-Term Heatmap
              </Text>
              <Text className="text-[12px] text-slate-500 dark:text-slate-400">
                View 6-month check-in streaks & telemetry
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#94a3b8" />
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}
