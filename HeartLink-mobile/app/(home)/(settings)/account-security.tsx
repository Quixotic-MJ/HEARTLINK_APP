import React from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function AccountSecurityScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Account security</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Manage your password and security preferences to keep your health data safe.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-6">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4">Change Password</Text>
          
          <View className="mb-4">
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Current Password</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12">
              <Feather name="lock" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                style={{ paddingVertical: 0 }}
                placeholder="Enter current password"
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">New Password</Text>
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-12">
              <Feather name="key" size={16} color="#64748b" />
              <TextInput 
                className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
                style={{ paddingVertical: 0 }}
                placeholder="Enter new password"
                secureTextEntry
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <TouchableOpacity className="bg-slate-900 h-12 rounded-xl items-center justify-center mt-2">
            <Text className="text-white font-medium text-[15px]">Update Password</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
