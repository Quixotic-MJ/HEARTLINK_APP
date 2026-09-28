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
import { theme } from "../constants/theme";

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
      className="bg-surface rounded-2xl p-4 flex-row items-center border border-border mb-3.5 shadow-sm shadow-slate-100 dark:shadow-none"
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
        <Text className="text-base font-semibold text-text mb-1 tracking-tight">
          {title}
        </Text>
        <Text className="text-xs sm:text-sm text-text-soft leading-relaxed">
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
      className="flex-1 bg-background"
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
          <Text className="ml-2.5 text-lg text-text font-bold tracking-tight">
            HeartLink
          </Text>
        </Animated.View>

        <View className="items-center px-6 mb-8 sm:mb-10">
          {/* Headline */}
          <Animated.Text
            entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)}
            className="text-3xl sm:text-4xl font-bold text-text text-center tracking-tight leading-tight mb-3 sm:mb-4"
            accessibilityRole="header"
          >
            Everyday care for{"\n"}a healthier,{"\n"}stronger heart.
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).springify().damping(12).stiffness(90)}
            className="text-sm sm:text-base text-text-soft text-center leading-relaxed px-1 sm:px-3 font-medium"
          >
            Track daily vitals, discover personalized meals and workouts, and take confident steps toward lifelong cardiovascular wellness.
          </Animated.Text>
        </View>

        {/* ── Feature Cards ── */}
        <View className="px-6 mb-6">
          <FeatureCard
            icon="bar-chart-2"
            iconType="feather"
            iconBgClass="bg-blue-tint"
            iconColorClass="text-blue-text"
            title="Health Stability Score"
            subtitle="Clear, daily insights into your cardiovascular wellness without complex clinical jargon."
            delay={400}
          />
          <FeatureCard
            icon="silverware-fork-knife"
            iconType="mci"
            iconBgClass="bg-teal-tint"
            iconColorClass="text-teal-text"
            title="Heart-Healthy Recipes"
            subtitle="Discover delicious, balanced meals customized specifically to support your heart health."
            delay={500}
          />
          <FeatureCard
            icon="fitness-center"
            iconType="material"
            iconBgClass="bg-lime-tint"
            iconColorClass="text-lime-text"
            title="Personalized Workouts"
            subtitle="Follow tailored, comfortable exercise routines adapted to your current stamina."
            delay={600}
          />
        </View>

      </ScrollView>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View
        entering={FadeInDown.delay(700).springify().damping(12).stiffness(90)}
        className="px-6 pt-4 pb-6 bg-background border-t border-border"
      >
        {/* Server Offline Error */}
        {showError && (
          <Animated.View
            entering={FadeIn}
            className="bg-danger-tint border border-danger/40 rounded-xl p-3 mb-4 flex-row items-center gap-2.5"
            accessible={true}
            accessibilityRole="alert"
          >
            <Feather name="wifi-off" size={16} color={theme.dangerText} />
            <Text className="text-danger-text text-xs sm:text-sm font-medium flex-1 leading-snug">
              Unable to connect to the server. Please check your internet connection and try again.
            </Text>
          </Animated.View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          className="w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-4 shadow-sm shadow-blue-500/20 dark:shadow-none"
          style={isCheckingServer ? { opacity: 0.8 } : {}}
          onPress={handleGetStarted}
          disabled={isCheckingServer}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Get started with Heart Link"
          accessibilityHint="Navigates to the registration screen"
        >
          {isCheckingServer ? (
            <ActivityIndicator size="small" color={theme.onPrimary} />
          ) : (
            <>
              <Text className="text-on-primary text-sm font-bold tracking-wide">
                Get started
              </Text>
              <Feather name="arrow-right" size={16} color={theme.onPrimary} />
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
          <Text className="text-sm font-medium text-text-soft">
            Already have an account?
          </Text>
          <Text className="text-sm font-bold text-text">
            Log in
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
