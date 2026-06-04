import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";

export default function WrapUpScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-amber-50 rounded-[24px] items-center justify-center mb-6 border border-amber-100">
          <Feather name="calendar" size={36} color="#d97706" />
        </View>
        <Text className="text-[22px] font-black text-slate-900 tracking-tight mb-2">
          Wrap-Up
        </Text>
        <Text className="text-[14px] text-slate-500 font-medium text-center leading-relaxed">
          Daily health summary and{"\n"}progress insights.
        </Text>
      </View>
    </SafeAreaView>
  );
}
