import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import "../global.css";
import { useUser } from "../contexts/UserContext";
import { Feather, MaterialCommunityIcons, MaterialIcons } from "../lib/icons";

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
      className="bg-card rounded-2xl p-4 flex-row items-center border border-border/80 shadow-sm mb-3.5"
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
        <Text className="text-base font-semibold text-foreground mb-1 tracking-tight">
          {title}
        </Text>
        <Text className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
          <View 
            className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card shadow-sm" 
            importantForAccessibility="no"
          >
            <Feather name="heart" size={14} className="text-foreground" />
          </View>
          <Text
            className="ml-3 text-base text-foreground tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </Animated.View>

        <View className="items-center px-6 mb-8 sm:mb-10">
          {/* Headline */}
          <Animated.Text 
            entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)} 
            className="text-3xl sm:text-4xl font-semibold text-foreground text-center tracking-tight leading-tight mb-3 sm:mb-4" 
            accessibilityRole="header"
          >
            Everyday care for{"\n"}a healthier,{"\n"}stronger heart.
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(300).springify().damping(12).stiffness(90)} 
            className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed px-1 sm:px-3"
          >
            Track daily vitals, discover personalized meals and workouts, and take confident steps toward lifelong cardiovascular wellness.
          </Animated.Text>
        </View>

        {/* ── Feature Cards ── */}
        <View className="px-6 mb-6">
          <FeatureCard
            icon="bar-chart-2"
            iconType="feather"
            iconBgClass="bg-primary/15"
            iconColorClass="text-primary"
            title="Health Stability Score"
            subtitle="Clear, daily insights into your cardiovascular wellness without complex clinical jargon."
            delay={400}
          />
          <FeatureCard
            icon="silverware-fork-knife"
            iconType="mci"
            iconBgClass="bg-emerald-500/15 dark:bg-emerald-400/15"
            iconColorClass="text-emerald-600 dark:text-emerald-400"
            title="Heart-Healthy Recipes"
            subtitle="Discover delicious, balanced meals customized specifically to support your heart health."
            delay={500}
          />
          <FeatureCard
            icon="fitness-center"
            iconType="material"
            iconBgClass="bg-amber-500/15 dark:bg-amber-400/15"
            iconColorClass="text-amber-600 dark:text-amber-400"
            title="Personalized Workouts"
            subtitle="Follow tailored, comfortable exercise routines adapted to your current stamina."
            delay={600}
          />
        </View>

      </ScrollView>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View 
        entering={FadeInDown.delay(700).springify().damping(12).stiffness(90)} 
        className="px-6 pt-2 pb-6 bg-background border-t border-border/40"
      >
        {/* Server Offline Error */}
        {showError && (
          <Animated.View 
            entering={FadeIn} 
            className="bg-destructive/15 border border-destructive/40 rounded-xl p-3 mb-4 flex-row items-center gap-2.5" 
            accessible={true} 
            accessibilityRole="alert"
          >
            <Feather name="wifi-off" size={16} className="text-destructive flex-shrink-0" />
            <Text className="text-destructive text-xs sm:text-sm font-medium flex-1 leading-snug">
              Unable to connect to the server. Please check your internet connection and try again.
            </Text>
          </Animated.View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          className={`w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-3 shadow-sm ${isCheckingServer ? 'opacity-80' : ''}`}
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
              <Text className="text-primary-foreground text-sm font-semibold tracking-wide">
                Get started
              </Text>
              <Feather name="arrow-right" size={16} className="text-primary-foreground" />
            </>
          )}
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          activeOpacity={0.65}
          className="py-3.5 flex-row justify-center items-center gap-1.5"
          onPress={() => router.push("/login")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Log in to existing account"
          accessibilityHint="Navigates to the login screen"
        >
          <Text className="text-sm text-muted-foreground">
            Already have an account?
          </Text>
          <Text className="text-sm font-semibold text-foreground">
            Log in
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
