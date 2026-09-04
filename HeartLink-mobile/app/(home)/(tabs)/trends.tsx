import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function TrendsTabScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, logout } = useUser();

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;
    try {
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      const response = await fetch(`${base_url}/api/analytics/${userId}`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      });
      if (response.status === 401) {
        await logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch trends", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, token, logout]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const history = Array.isArray(analytics?.history) ? analytics.history : [];
  const latestHSS = history.length > 0 ? history[history.length - 1].score : null;
  const recentPoints = history.slice(-7);
  const oldestScore = recentPoints.length > 1 ? recentPoints[0].score : (latestHSS ?? 0);
  const newestScore = latestHSS ?? 0;
  const scoreDelta = newestScore - oldestScore;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        contentContainerClassName="px-5 pt-3 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8532E" />}
      >
        {/* Screen Title */}
        <View className="mb-4">
          <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
            Health Intelligence
          </Text>
          <Text className="text-[24px] font-bold text-[#152131] dark:text-white tracking-tight">
            Heart Trends & Progress
          </Text>
        </View>

        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="small" color="#E8532E" />
            <Text className="text-[13px] text-slate-400 mt-2 font-medium">Analyzing telemetry history...</Text>
          </View>
        ) : (
          <>
            {/* ── 1. Stability Score Progression Card ── */}
            <View className="bg-white dark:bg-[#121D2B] rounded-3xl p-5 border border-[#DCE3DF] dark:border-slate-800/80 mb-5 shadow-sm shadow-slate-100">
              <View className="flex-row items-start justify-between mb-4">
                <View>
                  <Text className="text-[15px] font-bold text-[#152131] dark:text-white">
                    Cardiovascular Stability (HSS)
                  </Text>
                  <Text className="text-[12px] text-[#5C6B66] dark:text-slate-400 mt-0.5">
                    Last 7 evaluations
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDF1EF] dark:bg-slate-800">
                  <View
                    className={`w-2 h-2 rounded-full ${
                      latestHSS && latestHSS >= 80
                        ? "bg-emerald-500"
                        : latestHSS && latestHSS >= 60
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />
                  <Text className="text-[14px] font-bold text-[#152131] dark:text-white">
                    {latestHSS !== null ? latestHSS : "—"}
                  </Text>
                </View>
              </View>

              {/* Visual Telemetry Bars */}
              <View className="h-28 mb-3 justify-end border-b border-[#DCE3DF] dark:border-slate-800 relative">
                {recentPoints.length === 0 ? (
                  <View className="items-center justify-center h-full pb-3">
                    <Text className="text-[12px] text-slate-400">Log vitals to view your 7-day trend line.</Text>
                  </View>
                ) : (
                  <View className="flex-row items-end justify-between px-2 h-24">
                    {recentPoints.map((point: any, idx: number) => {
                      const score = typeof point.score === "number" ? point.score : 0;
                      const heightPercent = Math.min(100, Math.max(18, Math.round(score)));
                      const barColor = score >= 80 ? "#1B6E63" : score >= 60 ? "#D97706" : "#E8532E";
                      return (
                        <View key={idx} className="items-center w-8">
                          <View
                            style={{
                              height: `${heightPercent}%`,
                              width: 14,
                              backgroundColor: barColor,
                              borderRadius: 6,
                            }}
                          />
                          <Text className="text-[9px] text-[#5C6B66] dark:text-slate-400 mt-1.5 font-medium">
                            {point.computed_at
                              ? new Date(point.computed_at).toLocaleDateString("en-US", { weekday: "narrow" })
                              : `D${idx + 1}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Trend Interpretation Note */}
              <View className="flex-row items-center justify-between pt-1">
                <View className="flex-row items-center gap-1.5">
                  <Feather
                    name={scoreDelta >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={scoreDelta >= 0 ? "#1B6E63" : "#E8532E"}
                  />
                  <Text className="text-[12px] font-semibold text-[#152131] dark:text-white">
                    {scoreDelta > 0
                      ? `+${scoreDelta} pts improvement`
                      : scoreDelta < 0
                      ? `${scoreDelta} pts from baseline`
                      : "Holding steady this week"}
                  </Text>
                </View>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400">
                  Target: ≥ 70
                </Text>
              </View>
            </View>

            {/* ── 2. Quick Log History Gateways ── */}
            <Text className="text-[13px] font-bold text-[#152131] dark:text-white uppercase tracking-wider mb-2.5">
              Habit Logs & Journals
            </Text>
            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                onPress={() => router.push("/(home)/(meals)/daily-diary" as any)}
                activeOpacity={0.7}
                className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800"
              >
                <View className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-2">
                  <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#1B6E63" />
                </View>
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">Meal Diary</Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">Sodium logs & macros</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(home)/(health)/exercise-diary" as any)}
                activeOpacity={0.7}
                className="flex-1 bg-white dark:bg-[#121D2B] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800"
              >
                <View className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center mb-2">
                  <Feather name="activity" size={16} color="#2563eb" />
                </View>
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white">Cardio Log</Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5">Active walking & workouts</Text>
              </TouchableOpacity>
            </View>

            {/* ── 3. Doctor Consultation Preparation Banner ── */}
            <View className="bg-[#EDF1EF] dark:bg-[#1A2634] p-4 rounded-2xl border border-[#DCE3DF] dark:border-slate-800 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-[13px] font-bold text-[#152131] dark:text-white">
                  Preparing for a Clinic Checkup?
                </Text>
                <Text className="text-[11px] text-[#5C6B66] dark:text-slate-400 mt-0.5 leading-4">
                  Show your 7-day trend chart to your attending doctor to review blood pressure stability.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(home)/(profile)/care-team" as any)}
                className="px-3 py-2 rounded-xl bg-[#152131] dark:bg-white"
                activeOpacity={0.8}
              >
                <Text className="text-[11px] font-bold text-white dark:text-[#152131]">
                  My Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
