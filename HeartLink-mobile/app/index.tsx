import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../global.css";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Splash Screen States
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  // Animation Values
  const revealAnim = useRef(new Animated.Value(0)).current; // For drawing the line
  const pulseAnim = useRef(new Animated.Value(1)).current; // For the heartbeat
  const fadeAnim = useRef(new Animated.Value(1)).current; // For the screen fade

  useEffect(() => {
    // 1. Draw the EKG line (Left to Right)
    const drawLine = Animated.timing(revealAnim, {
      toValue: 120, // The width of the icon
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // Must be false because we are animating 'width'
    });

    // 2. Realistic double-beat (Lub-Dub)
    const heartbeat = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(100), // Tiny pause between lub and dub
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]);

    // 3. Fade out the splash screen
    const fadeOut = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    // Run the master sequence
    Animated.sequence([
      Animated.delay(200), // Brief pause before starting
      drawLine, // Sweep the line across
      heartbeat, // Do the heartbeat
      Animated.delay(400), // Hold for a moment to look nice
      fadeOut, // Disappear
    ]).start(() => setIsSplashVisible(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerClassName="flex-grow pb-40"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Logo */}
        <View className="flex-row items-center px-6 pt-6">
          <View className="w-8 h-8 bg-[#1D4ED8] rounded-full items-center justify-center shadow-sm shadow-blue-200">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={18}
              color="white"
            />
          </View>
          <Text className="ml-3 font-black text-xl text-slate-900 tracking-tight">
            HeartLink
          </Text>
        </View>

        {/* Main Content Area */}
        <View className="px-6 flex-1 pt-12">
          {/* Hero Icon Container */}
          <View className="bg-white w-32 h-32 rounded-[36px] items-center justify-center self-center shadow-lg shadow-blue-500/10 mb-8 border border-slate-100">
            <View className="w-20 h-20 bg-blue-50/50 rounded-2xl items-center justify-center">
              <MaterialCommunityIcons
                name="heart-pulse"
                size={56}
                color="#1D4ED8"
              />
            </View>
          </View>

          {/* Titles */}
          <Text className="text-[30px] leading-[46px] font-black text-center text-slate-900 tracking-tight mb-4">
            Proactive{"\n"}
            <Text className="text-[#1D4ED8]">Cardiovascular</Text>
            {"\n"}
            Well-being.
          </Text>
          <Text className="text-[15px] text-slate-500 text-center font-medium leading-relaxed px-4 mb-10">
            Track, monitor, and improve your heart health with clinical
            precision and real-time insights.
          </Text>

          {/* Feature Cards */}
          <View className="space-y-4">
            <View className="bg-white rounded-[24px] p-5 flex-row items-center border border-slate-100 shadow-sm shadow-slate-200/50">
              <View className="bg-blue-50 w-14 h-14 rounded-2xl items-center justify-center mr-4 border border-blue-100">
                <Feather name="activity" size={24} color="#1D4ED8" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-900 text-[16px] mb-1">
                  Real-time Analysis
                </Text>
                <Text className="text-slate-500 text-[13px] leading-5 pr-2">
                  Continuous monitoring of your cardiac rhythm with high
                  accuracy.
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-[24px] p-5 flex-row items-center border border-slate-100 shadow-sm shadow-slate-200/50">
              <View className="bg-rose-50 w-14 h-14 rounded-2xl items-center justify-center mr-4 border border-rose-100">
                <MaterialCommunityIcons
                  name="shield-heart"
                  size={26}
                  color="#E11D48"
                />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-slate-900 text-[16px] mb-1">
                  Vital Insights
                </Text>
                <Text className="text-slate-500 text-[13px] leading-5 pr-2">
                  Intelligent health journaling and predictive cardiovascular
                  metrics.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Sheet / Action Area */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] pt-8 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-[#1D4ED8] h-14 rounded-full flex-row justify-center items-center shadow-lg shadow-blue-500/30"
          onPress={() => router.push("/(auth)/register")}
        >
          <Text className="text-white font-bold text-lg mr-2">Get Started</Text>
          <Feather name="arrow-right" size={20} color="white" />
        </TouchableOpacity>

        <Text className="text-center text-[10px] font-bold tracking-[0.2em] text-slate-400 mt-6 uppercase">
          The Clinical Atelier • Est. 2024
        </Text>
      </View>

      {/* SPLASH SCREEN OVERLAY */}
      {isSplashVisible && (
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0 bg-[#1D4ED8] justify-center items-center z-50"
        >
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }], alignItems: "center" }}
          >
            {/* 1. Faded Background Icon (The Track) */}
            <MaterialCommunityIcons
              name="heart-pulse"
              size={120}
              color="rgba(255,255,255,0.2)"
            />

            {/* 2. Expanding Foreground Mask (The Drawing Line) */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: revealAnim, // Animates from 0 to 120
                overflow: "hidden",
              }}
            >
              <View style={{ width: 120 }}>
                <MaterialCommunityIcons
                  name="heart-pulse"
                  size={120}
                  color="white"
                />
              </View>
            </Animated.View>
          </Animated.View>

          <Text className="text-white text-5xl font-black mt-8 tracking-tight">
            HeartLink
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
