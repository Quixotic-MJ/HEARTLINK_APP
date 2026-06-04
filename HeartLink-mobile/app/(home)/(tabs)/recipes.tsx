import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function RecipesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-emerald-50 rounded-[24px] items-center justify-center mb-6 border border-emerald-100">
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={36}
            color="#059669"
          />
        </View>
        <Text className="text-[22px] font-black text-slate-900 tracking-tight mb-2">
          Recipes
        </Text>
        <Text className="text-[14px] text-slate-500 font-medium text-center leading-relaxed">
          Heart-healthy recipes tailored{"\n"}to your dietary needs.
        </Text>
      </View>
    </SafeAreaView>
  );
}
