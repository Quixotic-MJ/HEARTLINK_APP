import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { IconBadge } from "../../../components/onboarding/QuestionLayout";
// Generate the last 26 weeks of days (approx 6 months)
function generateHeatmapCalendar(loggedDates: Set<string>) {
  const weeks = [];
  const today = new Date();
  
  // Find the most recent Sunday
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday...
  const diffToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + diffToSunday);
  
  let currentDate = new Date(endDate);
  currentDate.setDate(currentDate.getDate() - (26 * 7) + 1); // Go back 26 weeks (to a Monday)

  let totalLogged = 0;

  for (let w = 0; w < 26; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const isLogged = loggedDates.has(dateStr);
      const isFuture = currentDate > today;

      week.push({
        date: dateStr,
        isLogged,
        isFuture,
      });

      if (isLogged) {
        totalLogged++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  return { weeks, totalLogged };
}

export default function AnalyticsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [streakData, setStreakData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/dashboard/me`, {
        headers: {
          "Authorization": `Bearer ${token || ""}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStreakData(data.streak || null);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const { weeks, totalLogged } = useMemo(() => {
    const loggedDates = new Set<string>(streakData?.history || []);
    return generateHeatmapCalendar(loggedDates);
  }, [streakData]);

  const currentStreak = streakData?.current_streak || 0;
  const maxStreak = streakData?.best_streak || 0;

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">Long-Term Analytics</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={c.line} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          
          <View className="bg-ds-canvas rounded-xl border border-ds-hairline p-5 mb-6">
            <View className="flex-row items-center gap-2 mb-1">
              <Feather name="calendar" size={16} color={c.charcoal} />
              <Text className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Consistency Map</Text>
            </View>
            <Text className="text-[13px] text-ds-steel mb-5">Your logging history over the last 6 months.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2" snapToAlignment="end" contentOffset={{ x: 1000, y: 0 }}>
              <View className="flex-row gap-1.5 pb-2">
                {/* Y-Axis Labels */}
                <View className="justify-between py-1 mr-1">
                  <Text className="text-[12px] text-ds-steel font-medium h-3">Mon</Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3"></Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3">Wed</Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3"></Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3">Fri</Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3"></Text>
                  <Text className="text-[12px] text-ds-steel font-medium h-3">Sun</Text>
                </View>

                {/* Heatmap Grid */}
                {weeks.map((week, wIdx) => (
                  <View key={`week-${wIdx}`} className="gap-1.5">
                    {week.map((day, dIdx) => {
                      if (day.isFuture) {
                        return <View key={`day-${wIdx}-${dIdx}`} className="w-3.5 h-3.5 rounded-sm bg-transparent" />;
                      }
                      return (
                        <View
                          key={`day-${wIdx}-${dIdx}`}
                          className="w-3.5 h-3.5"
                          style={{ borderRadius: 3, backgroundColor: day.isLogged ? c.line : c.surfaceAlt }}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
            
            <View className="flex-row items-center justify-end gap-1.5 mt-3">
              <Text className="text-[12px] text-ds-steel">Less</Text>
              <View className="w-2.5 h-2.5 rounded-sm bg-ds-surface-alt" />
              <View className="w-2.5 h-2.5 rounded-sm bg-ds-line" />
              <Text className="text-[12px] text-ds-steel">More</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-ds-canvas rounded-xl border border-ds-hairline p-4 items-center">
              <View className="mb-2">
                <IconBadge icon="check-circle-outline" tint="sky" size={40} />
              </View>
              <Text className="text-2xl font-semibold text-ds-ink">{totalLogged}</Text>
              <Text className="text-[12px] font-semibold text-ds-slate uppercase tracking-wide mt-1 text-center">Days Logged</Text>
            </View>

            <View className="flex-1 bg-ds-canvas rounded-xl border border-ds-hairline p-4 items-center">
              <View className="w-10 h-10 rounded-lg bg-ds-peach items-center justify-center mb-2">
                <Text className="text-lg">🔥</Text>
              </View>
              <Text className="text-2xl font-semibold text-ds-ink">{currentStreak}</Text>
              <Text className="text-[12px] font-semibold text-ds-slate uppercase tracking-wide mt-1 text-center">Current Streak</Text>
            </View>

            <View className="flex-1 bg-ds-canvas rounded-xl border border-ds-hairline p-4 items-center">
              <View className="mb-2">
                <IconBadge icon="trophy-outline" tint="lavender" size={40} />
              </View>
              <Text className="text-2xl font-semibold text-ds-ink">{maxStreak}</Text>
              <Text className="text-[12px] font-semibold text-ds-slate uppercase tracking-wide mt-1 text-center">Best Streak</Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
