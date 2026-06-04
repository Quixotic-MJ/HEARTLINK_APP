import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";

export default function ExercisesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-rose-50 rounded-[24px] items-center justify-center mb-6 border border-rose-100">
          <Feather name="activity" size={36} color="#e11d48" />
        </View>
        <Text className="text-[22px] font-black text-slate-900 tracking-tight mb-2">
          Exercises
        </Text>
        <Text className="text-[14px] text-slate-500 font-medium text-center leading-relaxed">
          Guided workouts designed for{"\n"}cardiovascular wellness.
        </Text>
      </View>
    </SafeAreaView>
  );
}
