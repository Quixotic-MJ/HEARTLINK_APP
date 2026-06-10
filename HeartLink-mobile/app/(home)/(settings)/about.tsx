import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900 dark:bg-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900">About HeartLink</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-8 pb-16" showsVerticalScrollIndicator={false}>
        
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-900 dark:bg-slate-100 items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
            <Feather name="heart" size={36} color="#0f172a" />
          </View>
          <Text className="text-[24px] font-semibold text-slate-900 dark:text-white dark:text-slate-900 tracking-tight">
            Heart<Text style={{ fontWeight: "300" }}>Link.</Text>
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">Version 1.0.0</Text>
        </View>

        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Terms of Service</Text>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Open Source Licenses</Text>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
        
        <Text className="text-[13px] text-slate-400 text-center px-4 leading-relaxed mt-4">
          HeartLink is dedicated to helping individuals manage cardiovascular health proactively through data tracking and meaningful insights.
        </Text>
        <Text className="text-[12px] text-slate-400 text-center mt-6">
          © 2026 HeartLink Inc. All rights reserved.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
