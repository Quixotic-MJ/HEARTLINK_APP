import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { getToken } from "../../../lib/secureTokenStore";
import { apiFetch } from "../../../lib/api";
import { DsColors } from "../../../constants/theme";
import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { IconBadge } from "../../../components/onboarding/QuestionLayout";

/** Band tag colours, as on the score ring: mint good, peach moderate, rose at risk (dark text). */
function bandTone(score: number | null, c: DsColors) {
  if (score === null) return { bg: c.surfaceAlt, fg: c.slate };
  if (score >= 80) return { bg: c.mint, fg: c.charcoal };
  if (score >= 60) return { bg: c.peach, fg: c.warmText };
  return { bg: c.rose, fg: c.ink };
}

export default function HealthAnalyticsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token, logout } = useUser();

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const storedToken = await getToken();
        const effectiveToken = token || storedToken || "";
        const response = await apiFetch(`/api/analytics/${userId}`, {
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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: c.canvas }}>
        <Text style={{ fontSize: 15, color: c.slate }}>Loading analytics...</Text>
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
  const latestTone = bandTone(latestHSS, c);

  const legend: { label: string; score: number }[] = [
    { label: "Optimal (80-100)", score: 80 },
    { label: "Moderate (60-79)", score: 60 },
    { label: "At Risk (<60)", score: 0 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3" style={{ gap: 12, borderBottomWidth: 1, borderBottomColor: c.hairline }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <View className="flex-1">
          <Text style={{ fontSize: 13, fontWeight: "500", color: c.steel, marginBottom: 2 }}>
            Analytics Suite
          </Text>
          <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
            Health Analytics
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>

        {/* Tab Filters */}
        <View className="flex-row mb-6" style={{ borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
          <View className="mr-6" style={{ paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: c.ink }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Overview & HSS</Text>
          </View>
          <TouchableOpacity style={{ paddingBottom: 12 }} onPress={() => router.push("/(home)/(meals)/food-diary" as any)}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.steel }}>Diet & Meals</Text>
          </TouchableOpacity>
          <TouchableOpacity className="ml-6" style={{ paddingBottom: 12 }} onPress={() => router.push("/(home)/(health)/exercise-diary" as any)}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.steel }}>Activity</Text>
          </TouchableOpacity>
        </View>

        {/* ── HSS Score Card ── */}
        <View className="mb-6" style={{ borderRadius: 12, padding: 20, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
          <View className="flex-row items-start justify-between mb-8">
            <View>
              <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>Cardiac Stability</Text>
              <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>Score (HSS)</Text>
              <Text style={{ fontSize: 13, color: c.slate, marginTop: 4 }}>Recent trend analysis</Text>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: latestTone.bg }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: latestTone.fg }}>{latestHSS !== null ? latestHSS : "Pending"}</Text>
            </View>
          </View>

          {/* Dynamic Telemetry Chart */}
          <View className="h-36 mb-4 justify-end relative" style={{ borderBottomWidth: 1, borderBottomColor: c.hairline }}>
             {recentPoints.length === 0 ? (
               <View className="items-center justify-center h-full pb-4">
                 <Text style={{ fontSize: 13, color: c.steel }}>No telemetry recorded yet.</Text>
               </View>
             ) : (
               <View className="absolute left-0 right-0 bottom-2 h-24 flex-row items-end justify-between px-2">
                 {recentPoints.map((point: any, idx: number) => {
                   const score = typeof point.score === "number" ? point.score : 0;
                   const heightPercent = Math.min(100, Math.max(15, Math.round(score)));
                   return (
                     <View key={idx} className="items-center flex-1">
                       <Text style={{ fontSize: 11, fontWeight: "500", color: c.steel, marginBottom: 4 }}>{score}</Text>
                       <View
                         style={{ height: `${heightPercent}%`, width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: c.line }}
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
                  <Text key={idx} className="text-center flex-1" style={{ fontSize: 11, fontWeight: "500", color: c.steel }}>
                    {dayLabel}
                  </Text>
                );
              })}
            </View>
          )}

          {/* Legend: the band tag colours */}
          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
            {legend.map((item) => {
              const tone = bandTone(item.score, c);
              return (
                <View key={item.label} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tone.bg }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: tone.fg }}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Smart Insights ── */}
        <View className="mb-6" style={{ borderRadius: 12, padding: 20, backgroundColor: c.tint }}>
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="auto-fix" size={18} color={c.onTint} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.onTint, marginLeft: 8 }}>Smart Insights</Text>
          </View>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.onTint }}>
            {latestHSS !== null ? (
              scoreDelta > 0 ? (
                <>Your stability score improved by <Text style={{ fontWeight: "700" }}>+{scoreDelta} points</Text> across your recent check-in readings.</>
              ) : scoreDelta < 0 ? (
                <>Your stability score changed by <Text style={{ fontWeight: "700" }}>{scoreDelta} points</Text>. Review medication and symptoms in your check-in logs.</>
              ) : (
                <>Your stability score is holding steady at <Text style={{ fontWeight: "700" }}>{latestHSS}</Text>. Continue consistent daily tracking.</>
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
          className="flex-row items-center justify-between"
          style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
        >
          <View className="flex-row items-center gap-3 flex-1">
            <IconBadge icon="calendar-month-outline" tint="sky" size={40} />
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>
                Long-Term Heatmap
              </Text>
              <Text style={{ fontSize: 13, color: c.slate }}>
                View 6-month check-in streaks & telemetry
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={c.steel} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
