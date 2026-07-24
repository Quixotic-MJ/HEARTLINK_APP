import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function RecordScreen() {
  const { colorScheme } = useColorScheme();
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-blue-50 rounded-[24px] items-center justify-center mb-6 border border-blue-100">
          <MaterialCommunityIcons
            name="barcode-scan"
            size={36}
            color="#1e4ed8"
          />
        </View>
        <Text className="text-[22px] font-black text-slate-900 dark:text-white tracking-tight mb-2">
          Record
        </Text>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium text-center leading-relaxed">
          Scan meals, log vitals, and{"\n"}track your daily health data.
        </Text>
      </View>
    </SafeAreaView>
  );
}
