import React, { useEffect, useState, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useUser } from "../../contexts/UserContext";

export default function CalculatingScreen() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslateY = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    "Analyzing clinical biometrics...",
    "Calibrating risk thresholds...",
    "Generating personalized insights...",
  ];

  // Animate text changes (fade out/slide up -> step change -> fade in/slide from below)
  const animateStepChange = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: -8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      textTranslateY.setValue(8);
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Step text rotation with animations
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep += 1;
        animateStepChange(currentStep);
      }
    }, 1200);

    // Transition to completion checkmark state at ~3.6s
    const completionTimeout = setTimeout(() => {
      clearInterval(interval);
      setIsComplete(true);
    }, 3600);

    // Final navigation after completion feedback (~4.4s total)
    const navTimeout = setTimeout(async () => {
      try {
        await refreshUser();
      } catch (e) {
        console.log("Failed to refresh user during calculating:", e);
      }
      router.replace("/(home)/(tabs)/dashboard");
    }, 4400);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimeout);
      clearTimeout(navTimeout);
      pulseLoop.stop();
    };
  }, []);

  const currentAccessibilityText = isComplete
    ? "Calculation complete. Score calibrated!"
    : `Step ${step + 1} of ${steps.length}: ${steps[step]}`;

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-6"
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel={currentAccessibilityText}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Pulse / Status Icon */}
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }] }}
        className={`w-24 h-24 rounded-full items-center justify-center mb-8 border ${
          isComplete
            ? "bg-emerald-500/10 border-emerald-500/30"
            : isDark
            ? "bg-white/10 border-white/20"
            : "bg-slate-900/10 border-slate-900/20"
        }`}
      >
        {isComplete ? (
          <Feather name="check" size={38} color="#10b981" />
        ) : (
          <Feather
            name="activity"
            size={36}
            color={isDark ? "#ffffff" : "#0f172a"}
          />
        )}
      </Animated.View>

      {/* Title Header */}
      <Text className="text-[22px] font-semibold text-slate-900 dark:text-white mb-3 tracking-tight text-center">
        {isComplete ? "Score Calibrated!" : "Computing Initial Score"}
      </Text>

      {/* Dynamic Subtitle Step Text */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
        }}
      >
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 font-medium text-center">
          {isComplete ? "Redirecting to your dashboard..." : steps[step]}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
