import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { theme } from "../../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export interface Routine {
  id: string;
  title: string;
  duration: number;
  goal: string;
  type: string;
  intensity: string;
  category: string;
  calories?: number;
}

function ExerciseCard({
  routine,
  onPress,
}: {
  routine: Routine;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const getTypeProps = (type: string, title: string) => {
    const t = (type + " " + title).toLowerCase();
    if (t.includes("cardio") || t.includes("run") || t.includes("cycle")) {
       return { color: theme.skyTint, icon: "activity", iconColor: theme.skyText };
    }
    if (t.includes("strength") || t.includes("leg")) {
       return { color: theme.dangerTint, icon: "target", iconColor: theme.dangerText };
    }
    return { color: theme.blueTint, icon: "user", iconColor: theme.blueText };
  };
  
  const { color, icon, iconColor } = getTypeProps(routine.type, routine.title);
  const calories = routine.calories || Math.floor(routine.duration * 7.5); // Fallback mock calories

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress} 
      className="flex-row items-center p-3 mb-3 rounded-2xl border bg-surface dark:bg-surface-alt border-border"
    >
      <View className="w-14 h-14 rounded-xl items-center justify-center mr-4">
        <Feather name={icon as any} size={22} color={iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[15px] font-bold mb-1 text-text">{routine.title}</Text>
        <Text className="text-[12px] text-text-soft">{routine.type} - {routine.duration} min - {calories} cal</Text>
      </View>
      <Feather name="chevron-right" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
    </TouchableOpacity>
  );
}

export default function ExercisesScreen({
  isEmbedded = false,
}: {
  isEmbedded?: boolean;
} = {}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token } = useUser();
  const [activeFilter, setActiveFilter] = useState("All");

  const exercisesCacheKey = userId ? `@exercises_list_cache_${userId}` : "@exercises_list_cache";

  const { data: routinesList = [], refetch, isLoading } = useQuery({
    queryKey: ["exercises_list", userId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${base_url}/api/exercises/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const rData = await res.json();
      
      if (!Array.isArray(rData)) return [];

      const mapped: Routine[] = rData.map((r: any) => ({
        id: r.id,
        title: r.name || "",
        duration: r.duration_minutes || 0,
        goal: r.goal || r.description || "",
        type: r.type || "Cardio",
        intensity: r.intensity || "Low",
        category: r.hss_tier || "Stable",
        calories: r.calories || 0,
      }));
      AsyncStorage.setItem(exercisesCacheKey, JSON.stringify(mapped)).catch(() => {});
      return mapped;
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filters = ["All", "Cardio", "Strength", "Flexibility"];

  const filteredRoutines = useMemo(() => {
    let results = Array.isArray(routinesList) ? routinesList : [];
    if (activeFilter !== "All") {
      results = results.filter((r) => 
        (r.type || "").toLowerCase().includes(activeFilter.toLowerCase()) || 
        (r.title || "").toLowerCase().includes(activeFilter.toLowerCase())
      );
    }
    return results;
  }, [activeFilter, routinesList]);

  const Container = isEmbedded ? View : ScreenWrapper;
  const containerProps: any = isEmbedded
    ? { className: "flex-1" }
    : { edges: ["top"], withScrollView: false };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style={isDark ? "light" : "dark"} />}
      
      {/* Top Bar matching the "See All" design */}
      {!isEmbedded && (
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full bg-surface-alt">
            <Feather name="arrow-left" size={20} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </TouchableOpacity>
          <Text className="text-[18px] font-bold text-text">
            Exercises
          </Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center -mr-2 rounded-full bg-surface-alt">
            <Feather name="sliders" size={18} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 max-h-[40px]" contentContainerStyle={{ paddingRight: 40 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
                className="px-5 py-2 rounded-full mr-3 border"
              >
                <Text className="text-[14px] font-semibold">
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#33CC82" />}
      >
        <View className="px-5 mb-4">
          <Text className="text-[13px] font-semibold">
            {filteredRoutines.length} exercises
          </Text>
        </View>

        <View className="px-5">
          {filteredRoutines.map((routine) => (
            <ExerciseCard
              key={routine.id}
              routine={routine}
              onPress={() => router.push(`/(home)/(health)/exercise-session?id=${routine.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>
    </Container>
  );
}
