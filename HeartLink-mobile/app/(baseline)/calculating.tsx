import React, { useEffect, useState, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";

export default function CalculatingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user_id = params.user_id as string;
  
  const { refreshUser } = useUser();
  const { showToast } = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data, resetData } = useBaseline();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslateY = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    "Analyzing biometrics & lifestyle...",
    "Applying predictive model...",
    "Generating Health Stability Score...",
  ];

  const animateStepChange = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(textTranslateY, { toValue: -8, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      textTranslateY.setValue(8);
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Rotate text every 1.2s
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep += 1;
        animateStepChange(currentStep);
      }
    }, 1200);

    const submitData = async () => {
      try {
        const base_url = process.env.EXPO_PUBLIC_API_URL;
        
        // 1. Update Profile (Biometrics)
        const profilePayload = {
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          sex: data.sex,
          height_cm: parseFloat(data.height_cm) || 0,
          weight_kg: parseFloat(data.weight_kg) || 0,
          health_goals: data.health_goals
        };
        const profileRes = await fetch(`${base_url}/api/users/${user_id}/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        });
        
        if (!profileRes.ok) {
          throw new Error("Failed to update user profile biometrics");
        }

        // 2. Complete Baseline
        const safeInt = (val: any) => val && !isNaN(parseInt(val, 10)) ? parseInt(val, 10) : null;
        
        const payload = {
          ...data,
          sleep_hours: parseFloat(data.sleep_hours) || 8.0,
          vigorous_days: safeInt(data.vigorous_days),
          vigorous_minutes: safeInt(data.vigorous_minutes),
          moderate_days: safeInt(data.moderate_days),
          moderate_minutes: safeInt(data.moderate_minutes),
          walk_bike_days: safeInt(data.walk_bike_days),
          walk_bike_minutes: safeInt(data.walk_bike_minutes),
        };

        const res = await fetch(`${base_url}/api/users/${user_id}/baseline/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to submit onboarding data");
        }

        // Wait a minimum time to ensure animations finish nicely (approx 3.5s)
        setTimeout(async () => {
          clearInterval(interval);
          setIsComplete(true);
          
          await refreshUser();
          resetData(); // Clean up context

          setTimeout(() => {
            router.replace("/(home)/(tabs)/dashboard");
          }, 800);
        }, 3500);

      } catch (err) {
        clearInterval(interval);
        pulseLoop.stop();
        showToast({ title: "Error", message: "Failed to generate HSS score. Please try again.", type: "error" });
        router.back();
      }
    };

    submitData();

    return () => {
      clearInterval(interval);
      pulseLoop.stop();
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-6" >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Pulse / Status Icon */}
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }] }}
        className={`w-24 h-24 rounded-full items-center justify-center mb-8 border ${
          isComplete ? "bg-emerald-500/10 border-emerald-500/30" : isDark ? "bg-white/10 border-white/20" : "bg-slate-900/10 border-slate-900/20"
        }`}
      >
        {isComplete ? (
          <Feather name="check" size={38} color="#10b981" />
        ) : (
          <Feather name="activity" size={36} color={isDark ? "#ffffff" : "#0f172a"} />
        )}
      </Animated.View>

      {/* Title Header */}
      <Text className="text-[22px] font-semibold text-slate-900 dark:text-white mb-3 tracking-tight text-center">
        {isComplete ? "HSS Calibrated!" : "Computing HSS"}
      </Text>

      {/* Dynamic Subtitle Step Text */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 font-medium text-center">
          {isComplete ? "Redirecting to your dashboard..." : steps[step]}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
