import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { Header } from "../../../components/Header";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import RecipesScreen from "./recipes";
import ExercisesScreen from "./exercises";

export default function ExploreTabScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeSegment, setActiveSegment] = useState<"recipes" | "exercises">("recipes");

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      {/* Segmented Switcher Header */}
      <View className="px-5 pt-2 pb-3 bg-transparent">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
              Cardiovascular Lifestyle
            </Text>
            <Text className="text-[24px] font-bold text-[#152131] dark:text-white tracking-tight">
              Explore & Habits
            </Text>
          </View>
        </View>

        {/* Pill Toggle Bar */}
        <View className="flex-row p-1 bg-[#EDF1EF] dark:bg-[#121D2B] rounded-2xl border border-[#DCE3DF] dark:border-slate-800">
          <TouchableOpacity
            onPress={() => setActiveSegment("recipes")}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeSegment === "recipes"
                ? "bg-white dark:bg-[#1A2634] shadow-xs"
                : "bg-transparent"
            }`}
          >
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={15}
              color={activeSegment === "recipes" ? "#1B6E63" : isDark ? "#94a3b8" : "#5C6B66"}
            />
            <Text
              className={`ml-1.5 text-[13px] font-bold ${
                activeSegment === "recipes"
                  ? "text-[#152131] dark:text-white"
                  : "text-[#5C6B66] dark:text-slate-400 font-medium"
              }`}
            >
              Recipes & Meals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSegment("exercises")}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
              activeSegment === "exercises"
                ? "bg-white dark:bg-[#1A2634] shadow-xs"
                : "bg-transparent"
            }`}
          >
            <Feather
              name="activity"
              size={15}
              color={activeSegment === "exercises" ? "#2563eb" : isDark ? "#94a3b8" : "#5C6B66"}
            />
            <Text
              className={`ml-1.5 text-[13px] font-bold ${
                activeSegment === "exercises"
                  ? "text-[#152131] dark:text-white"
                  : "text-[#5C6B66] dark:text-slate-400 font-medium"
              }`}
            >
              Cardio Workouts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-View Render */}
      <View className="flex-1">
        {activeSegment === "recipes" ? (
          <RecipesScreen hideHeader isEmbedded />
        ) : (
          <ExercisesScreen hideHeader isEmbedded />
        )}
      </View>
    </SafeAreaView>
  );
}
