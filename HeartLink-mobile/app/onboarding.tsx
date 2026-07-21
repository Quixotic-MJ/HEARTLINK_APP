import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import "../global.css";
import { useUser } from "../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  iconType,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: string;
  iconType: "feather" | "material" | "mci";
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex-row items-center border border-slate-200 dark:border-slate-800/70 mb-3">
      <View
        className="w-11 h-11 rounded-xl items-center justify-center mr-3.5 flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "feather" && (
          <Feather name={icon as any} size={18} color={iconColor} />
        )}
        {iconType === "material" && (
          <MaterialIcons name={icon as any} size={18} color={iconColor} />
        )}
        {iconType === "mci" && (
          <MaterialCommunityIcons
            name={icon as any}
            size={18}
            color={iconColor}
          />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[13px] font-medium text-slate-900 dark:text-white mb-0.5">
          {title}
        </Text>
        <Text className="text-[12px] text-slate-400 leading-relaxed">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { setUserId } = useUser();
  const pingServer = async () => {
    try {
      const response = await fetch(`${base_url}/api/health`);
      const data = await response.json();
      console.log(data.status);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    pingServer();
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerClassName="flex-grow pb-10"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Logo bar ── */}
        <View className="flex-row items-center px-5 pt-5 mb-10">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather name="heart" size={13} color={isDark ? "#f8fafc" : "#0f172a"} />
          </View>
          <Text
            className="ml-2.5 text-[15px] text-slate-900 dark:text-white tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>

        <View className="items-center px-5 mb-10">
          {/* ── Minimalist Heart Icon ── */}
          <View className="w-24 h-24 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather name="heart" size={34} color={isDark ? "#f8fafc" : "#0f172a"} />
          </View>

          {/* Headline */}
          <Text className="text-[30px] font-medium text-slate-900 dark:text-white text-center tracking-tight leading-tight mt-8 mb-3">
            Proactive{"\n"}cardiovascular{"\n"}well-being.
          </Text>
          <Text className="text-[13px] text-slate-400 text-center leading-relaxed px-4">
            Track your dietary intake and daily symptoms to manage your
            Cardiovascular Stability Score (CSS).
          </Text>
        </View>

        {/* ── Feature Cards ── */}
        <View className="px-5 mb-4">
          <FeatureCard
            icon="bar-chart-2"
            iconType="feather"
            iconBg={isDark ? "rgba(37, 99, 235, 0.15)" : "#e6f1fb"}
            iconColor={isDark ? "#60A5FA" : "#185fa5"}
            title="Adaptive risk tracking"
            subtitle="Log daily health indicators for rule-based insights into your cardiovascular score."
          />
          <FeatureCard
            icon="lightbulb-outline"
            iconType="material"
            iconBg={isDark ? "rgba(217, 119, 6, 0.15)" : "#faeeda"}
            iconColor={isDark ? "#FBBF24" : "#854f0b"}
            title="Vital insights"
            subtitle="Intelligent health journaling and dietary monitoring tailored to your conditions."
          />
          <FeatureCard
            icon="silverware-fork-knife"
            iconType="mci"
            iconBg={isDark ? "rgba(13, 148, 136, 0.15)" : "#eaf3de"}
            iconColor={isDark ? "#2DD4BF" : "#3b6d11"}
            title="Heart-healthy recipes"
            subtitle="Discover Filipino-focused meals optimised for low sodium and high potassium."
          />
        </View>

        {/* ── Dev shortcut ── */}
        {__DEV__ && (
          <TouchableOpacity
            onPress={() => {
              setUserId("usr-patient-101");
              router.replace("/(home)/(tabs)/dashboard");
            }}
            className="mx-5 mb-4 bg-[#1e4ed8] border border-slate-200 dark:border-slate-800/70 rounded-xl py-2.5 items-center"
          >
            <Text className="text-[11px] text-white">
              Dev → skip to dashboard
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Actions ── */}
        <View className="px-5 mt-auto">
          {/* Primary CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="w-full bg-blue-600 rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-3"
            onPress={() => router.push("/register")}
          >
            <Text className="text-white text-[14px] font-medium">
              Get started
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>

          {/* Secondary */}
          <TouchableOpacity
            activeOpacity={0.65}
            className="py-3 flex-row justify-center items-center gap-1"
            onPress={() => router.push("/login")}
          >
            <Text className="text-[13px] text-slate-400">
              Already have an account?
            </Text>
            <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Log in
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text className="text-center text-[9px] tracking-widest text-slate-300 mt-4 uppercase">
            CTU — Main Campus · Capstone 2026
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
