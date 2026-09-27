import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import "../global.css";
import { useUser } from "../contexts/UserContext";
import { Feather, MaterialCommunityIcons, MaterialIcons } from "../lib/icons";
import HeartLogo from "../components/ui/HeartLogo";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  iconType,
  iconBgClass,
  iconColorClass,
  title,
  subtitle,
  delay,
}: {
  icon: string;
  iconType: "feather" | "material" | "mci";
  iconBgClass: string;
  iconColorClass: string;
  title: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(12).stiffness(90)}
      className="bg-white dark:bg-[#101615] rounded-2xl p-4 flex-row items-center border border-slate-200 dark:border-slate-800 mb-3.5 shadow-sm shadow-slate-100 dark:shadow-none"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View
        className={`w-12 h-12 rounded-xl items-center justify-center mr-4 flex-shrink-0 ${iconBgClass}`}
        importantForAccessibility="no"
      >
        {iconType === "feather" && (
          <Feather name={icon as any} size={20} className={iconColorClass} />
        )}
        {iconType === "material" && (
          <MaterialIcons name={icon as any} size={20} className={iconColorClass} />
        )}
        {iconType === "mci" && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            className={iconColorClass}
          />
        )}
      </View>
      <View className="flex-1 pr-1">
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1 tracking-tight">
          {title}
        </Text>
        <Text className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { setUserId } = useUser();

  const [isServerUp, setIsServerUp] = useState<boolean | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [showError, setShowError] = useState(false);

  // Silent check on mount
  useEffect(() => {
    const silentPing = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${base_url}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) setIsServerUp(true);
      } catch (e) {
        setIsServerUp(false);
      }
    };
    silentPing();
  }, []);

  const handleGetStarted = async () => {
    if (isServerUp === true) {
      router.push("/register");
      return;
    }

    setIsCheckingServer(true);
    setShowError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${base_url}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        setIsServerUp(true);
        router.push("/register");
      } else {
        setIsServerUp(false);
        setShowError(true);
      }
    } catch (e) {
      setIsServerUp(false);
      setShowError(true);
    } finally {
      setIsCheckingServer(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#EDF1EF] dark:bg-[#0A0F0E]"
      edges={["top", "bottom"]}
    >
      <StatusBar style="auto" />

      <ScrollView
        contentContainerClassName="flex-grow pb-6"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Logo bar ── */}
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(14).stiffness(100)}
          className="flex-row items-center px-6 pt-4 sm:pt-6 mb-6 sm:mb-8"
        >
          <HeartLogo size={24} />
          <Text className="ml-2.5 text-lg text-slate-900 dark:text-white font-bold tracking-tight">
            HeartLink
          </Text>
        </Animated.View>

        <View className="items-center px-6 mb-8 sm:mb-10">
          {/* Headline */}
          <Animated.Text
            entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)}
            className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white text-center tracking-tight leading-tight mb-3 sm:mb-4"
            accessibilityRole="header"
          >
            Everyday care for{"\n"}a healthier,{"\n"}stronger heart.
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).springify().damping(12).stiffness(90)}
            className="text-sm sm:text-base text-slate-600 dark:text-slate-400 text-center leading-relaxed px-1 sm:px-3 font-medium"
          >
            Track daily vitals, discover personalized meals and workouts, and take confident steps toward lifelong cardiovascular wellness.
          </Animated.Text>
        </View>

        {/* ── Feature Cards ── */}
        <View className="px-6 mb-6">
          <FeatureCard
            icon="bar-chart-2"
            iconType="feather"
            iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            iconColorClass="text-blue-600 dark:text-blue-400"
            title="Health Stability Score"
            subtitle="Clear, daily insights into your cardiovascular wellness without complex clinical jargon."
            delay={400}
          />
          <FeatureCard
            icon="silverware-fork-knife"
            iconType="mci"
            iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            iconColorClass="text-emerald-600 dark:text-emerald-400"
            title="Heart-Healthy Recipes"
            subtitle="Discover delicious, balanced meals customized specifically to support your heart health."
            delay={500}
          />
          <FeatureCard
            icon="fitness-center"
            iconType="material"
            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            iconColorClass="text-orange-600 dark:text-orange-400"
            title="Personalized Workouts"
            subtitle="Follow tailored, comfortable exercise routines adapted to your current stamina."
            delay={600}
          />
        </View>

      </ScrollView>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View
        entering={FadeInDown.delay(700).springify().damping(12).stiffness(90)}
        className="px-6 pt-4 pb-6 bg-[#EDF1EF] dark:bg-[#0A0F0E] border-t border-slate-200 dark:border-slate-800"
      >
        {/* Server Offline Error */}
        {showError && (
          <Animated.View
            entering={FadeIn}
            className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 mb-4 flex-row items-center gap-2.5"
            accessible={true}
            accessibilityRole="alert"
          >
            <Feather name="wifi-off" size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <Text className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium flex-1 leading-snug">
              Unable to connect to the server. Please check your internet connection and try again.
            </Text>
          </Animated.View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          className="w-full bg-[#2E9AE8] dark:bg-[#6EC1F5] rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-4 shadow-sm shadow-blue-500/20 dark:shadow-none"
          style={isCheckingServer ? { opacity: 0.8 } : {}}
          onPress={handleGetStarted}
          disabled={isCheckingServer}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Get started with Heart Link"
          accessibilityHint="Navigates to the registration screen"
        >
          {isCheckingServer ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text className="text-white dark:text-slate-900 text-sm font-bold tracking-wide">
                Get started
              </Text>
              <Feather name="arrow-right" size={16} className="text-white dark:text-slate-900" />
            </>
          )}
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          activeOpacity={0.65}
          className="py-2 flex-row justify-center items-center gap-1.5"
          onPress={() => router.push("/login")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Log in to existing account"
          accessibilityHint="Navigates to the login screen"
        >
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Already have an account?
          </Text>
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            Log in
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
