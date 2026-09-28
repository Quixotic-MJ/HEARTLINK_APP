import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { theme } from "../../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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
  const router = useRouter();
  const { userId, token } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [streakData, setStreakData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${base_url}/api/dashboard/me`, {
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
    <SafeAreaView className="flex-1 bg-surface-alt" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color={theme.text} className="dark:text-white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text">Long-Term Analytics</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.warningText} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          
          <View className="bg-surface rounded-3xl border border-border p-5 mb-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <Feather name="calendar" size={16} color={theme.textSoft} />
              <Text className="text-[13px] font-bold text-text-soft uppercase tracking-wider">Consistency Map</Text>
            </View>
            <Text className="text-[13px] text-text-muted mb-5">Your logging history over the last 6 months.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2" snapToAlignment="end" contentOffset={{ x: 1000, y: 0 }}>
              <View className="flex-row gap-1.5 pb-2">
                {/* Y-Axis Labels */}
                <View className="justify-between py-1 mr-1">
                  <Text className="text-[10px] text-text-muted font-medium h-3">Mon</Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3"></Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3">Wed</Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3"></Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3">Fri</Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3"></Text>
                  <Text className="text-[10px] text-text-muted font-medium h-3">Sun</Text>
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
                          className={`w-3.5 h-3.5 rounded-[3px] ${
                            day.isLogged ? "bg-green-500 dark:bg-green-600" : "bg-surface-alt"
                          }`}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
            
            <View className="flex-row items-center justify-end gap-1.5 mt-3">
              <Text className="text-[10px] text-text-muted">Less</Text>
              <View className="w-2.5 h-2.5 rounded-sm bg-surface-alt" />
              <View className="w-2.5 h-2.5 rounded-sm bg-green-500 dark:bg-green-600" />
              <Text className="text-[10px] text-text-muted">More</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-surface rounded-2xl border border-border p-4 shadow-sm items-center">
              <View className="w-10 h-10 rounded-full bg-blue-tint dark:bg-blue-900/30 items-center justify-center mb-2">
                <Feather name="check-circle" size={18} color={theme.textSoft} />
              </View>
              <Text className="text-2xl font-bold text-text">{totalLogged}</Text>
              <Text className="text-[10px] font-bold text-text-soft uppercase tracking-wide mt-1 text-center">Days Logged</Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl border border-border p-4 shadow-sm items-center">
              <View className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 items-center justify-center mb-2">
                <Text className="text-lg">🔥</Text>
              </View>
              <Text className="text-2xl font-bold text-text">{currentStreak}</Text>
              <Text className="text-[10px] font-bold text-text-soft uppercase tracking-wide mt-1 text-center">Current Streak</Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl border border-border p-4 shadow-sm items-center">
              <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 items-center justify-center mb-2">
                <Feather name="award" size={18} color={theme.primary} />
              </View>
              <Text className="text-2xl font-bold text-text">{maxStreak}</Text>
              <Text className="text-[10px] font-bold text-text-soft uppercase tracking-wide mt-1 text-center">Best Streak</Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
