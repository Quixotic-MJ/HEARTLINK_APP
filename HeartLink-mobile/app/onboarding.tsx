import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Button } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../global.css"; // Ensure this matches your NativeWind setup

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerClassName="flex-grow pb-8"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. Top Left Header */}
        <View className="flex-row items-center px-6 pt-6 mb-8">
          <View className="w-8 h-8 bg-[#1e4ed8] rounded-full items-center justify-center shadow-sm shadow-blue-900/20">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={18}
              color="white"
            />
          </View>
          <Text className="ml-3 font-bold text-[15px] text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>

        {/* 2. Center Hero Icon */}
        <View className="items-center mb-8">
          <View
            className="w-32 h-32 bg-[#1e4ed8] rounded-full items-center justify-center"
            style={{
              shadowColor: "#1e4ed8",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <MaterialCommunityIcons
              name="heart-pulse"
              size={64}
              color="white"
            />
          </View>
        </View>

        {/* 3. Headings */}
        <View className="px-6 mb-10">
          <Text className="text-[28px] leading-[36px] font-black text-slate-900 text-center tracking-tight mb-4">
            Proactive{"\n"}
            Cardiovascular{"\n"}
            Well-being.
          </Text>
          <Text className="text-[13px] text-slate-500 text-center font-medium leading-relaxed px-2">
            Track your dietary intake and daily symptoms to manage your
            Cardiovascular Stability Score (CSS).
          </Text>
        </View>

        {/* Temporary ONLY */}
        {__DEV__ && (
          <Button title="Go to progress screen (development purposes only)" onPress={() => router.push("/dashboard")} />
        )}

        {/* 4. Feature Cards */}
        <View className="px-6 flex-col">
          {/* Card 1 */}
          <View className="bg-white rounded-3xl p-4 flex-row items-center border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-4">
            <View className="bg-[#e0e7ff] w-12 h-12 rounded-2xl items-center justify-center mr-4">
              <Feather name="bar-chart-2" size={20} color="#1e4ed8" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="font-bold text-slate-900 text-[13px] mb-0.5">
                Adaptive Risk Tracking
              </Text>
              <Text className="text-slate-500 text-[11px] leading-[16px]">
                Log daily health indicators for rule-based insights.
              </Text>
            </View>
          </View>

          {/* Card 2 */}
          <View className="bg-white rounded-3xl p-4 flex-row items-center border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] mb-10">
            <View className="bg-[#1e4ed8] w-12 h-12 rounded-2xl items-center justify-center mr-4 shadow-sm shadow-blue-900/20">
              <MaterialIcons name="lightbulb-outline" size={22} color="white" />
            </View>
            <View className="flex-1 pr-2">
              <Text className="font-bold text-slate-900 text-[13px] mb-0.5">
                Vital Insights
              </Text>
              <Text className="text-slate-500 text-[11px] leading-[16px]">
                Intelligent health journaling and dietary monitoring.
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Bottom Actions (Pushed to bottom of available space) */}
        <View className="px-6 mt-auto">
          {/* Primary Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="w-full h-14 bg-[#1e4ed8] rounded-full flex-row justify-center items-center"
            style={{
              shadowColor: "#1e4ed8",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={() => router.push("/register")}
          >
            <Text className="text-white font-bold text-[15px] tracking-wide mr-2">
              Get Started
            </Text>
            <Feather name="arrow-right" size={18} color="white" />
          </TouchableOpacity>

          {/* Secondary Login Link */}
          <TouchableOpacity
            activeOpacity={0.6}
            className="py-6 flex-row justify-center items-center"
            onPress={() => router.push("/login")}
          >
            <Text className="text-[12px] font-medium text-slate-600">
              Already have an account?{" "}
            </Text>
            <Text className="text-[12px] font-bold text-slate-800">Log In</Text>
          </TouchableOpacity>

          {/* Footer Branding */}
          <Text className="text-center text-[9px] font-bold tracking-[0.2em] text-slate-400 mt-2 uppercase">
            CTU - MAIN CAMPUS • CAPSTONE 2026
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
