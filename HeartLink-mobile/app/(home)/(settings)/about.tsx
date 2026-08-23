import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export default function AboutScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  // Gentle Pulse Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  const openURL = (path: string) => {
    Linking.openURL(`https://heartlink.com/${path}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
          About HeartLink
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        
        {/* App Hero */}
        <View className="items-center mb-7 pt-2">
          <Animated.View 
            style={{ transform: [{ scale: scaleAnim }] }}
            className="w-22 h-22 rounded-3xl bg-white dark:bg-slate-900 items-center justify-center border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 mb-3.5"
          >
            <Feather name="heart" size={36} color="#2563eb" />
          </Animated.View>
          <Text className="text-[26px] font-bold text-slate-900 dark:text-white tracking-tight">
            Heart<Text className="text-blue-600 font-light">Link</Text>
          </Text>
          <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Cardiovascular Health Companion
          </Text>
        </View>

        {/* Build & Release Info Card */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
          <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Application Information
          </Text>

          <View className="flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-[14px] text-slate-600 dark:text-slate-400">Version</Text>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">1.0.0</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-[14px] text-slate-600 dark:text-slate-400">Release Build</Text>
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">2026.1</Text>
          </View>

          <View className="flex-row justify-between py-2">
            <Text className="text-[14px] text-slate-600 dark:text-slate-400">Environment</Text>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">Production API</Text>
            </View>
          </View>
        </View>

        {/* Privacy & Data Transparency Card */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 items-center justify-center">
              <MaterialCommunityIcons name="shield-check" size={16} color="#2563eb" />
            </View>
            <Text className="text-[14px] font-bold text-slate-900 dark:text-white">
              Privacy & Data Transparency
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • <Text className="font-semibold text-slate-800 dark:text-slate-200">Patient Ownership:</Text> Your health logs, blood pressure records, and dietary entries belong solely to your account.
            </Text>
            <Text className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • <Text className="font-semibold text-slate-800 dark:text-slate-200">On-Device Export:</Text> Exported clinical summary reports are generated on your device and shared only with your explicit action.
            </Text>
            <Text className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
              • <Text className="font-semibold text-slate-800 dark:text-slate-200">Private Contacts:</Text> Care team and emergency contacts are stored securely and never shared with third parties.
            </Text>
          </View>
        </View>

        {/* Legal Links */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 px-4 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <TouchableOpacity 
            onPress={() => openURL("terms")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service, opens in browser"
            className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Terms of Service</Text>
            <Feather name="external-link" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("privacy")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy, opens in browser"
            className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Privacy Policy</Text>
            <Feather name="external-link" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => openURL("licenses")}
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Open Source Licenses, opens in browser"
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Open Source Licenses</Text>
            <Feather name="external-link" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <Text className="text-[12px] text-slate-400 text-center px-4 leading-relaxed">
          HeartLink empowers patients to actively track vitals, monitor symptoms, and collaborate with their clinical care team.
        </Text>
        <Text className="text-[11px] text-slate-400 text-center mt-4 mb-8">
          © 2026 HeartLink Inc. All rights reserved.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
