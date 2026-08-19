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

    const mapSleepHours = (val: string) => {
      switch (val) {
        case "5": return 5.0;
        case "5-6": return 5.5;
        case "7-8": return 7.5;
        case "9": return 9.0;
        default: return parseFloat(val) || 8.0;
      }
    };

    const submitData = async () => {
      try {
        const base_url = process.env.EXPO_PUBLIC_API_URL;
        const authHeaders = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user_id}`,
        };
        
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
          headers: authHeaders,
          body: JSON.stringify(profilePayload),
        });
        
        if (!profileRes.ok) {
          throw new Error("Failed to update user profile biometrics");
        }

        // 2. Complete Baseline
        const safeInt = (val: any) => val && !isNaN(parseInt(val, 10)) ? parseInt(val, 10) : null;
        
        const payload = {
          ...data,
          sleep_hours: mapSleepHours(data.sleep_hours),
          vigorous_days: data.vigorous_activity ? safeInt(data.vigorous_days) : null,
          vigorous_minutes: data.vigorous_activity ? safeInt(data.vigorous_minutes) : null,
          moderate_days: data.moderate_activity ? safeInt(data.moderate_days) : null,
          moderate_minutes: data.moderate_activity ? safeInt(data.moderate_minutes) : null,
          walk_bike_days: data.walk_bike_transport ? safeInt(data.walk_bike_days) : null,
          walk_bike_minutes: data.walk_bike_transport ? safeInt(data.walk_bike_minutes) : null,
          smoke_now: data.ever_smoked ? (data.smoke_now || "Not at all") : "Not at all",
          drink_frequency: data.ever_drank ? (data.drink_frequency || "Never") : "Never",
          drinks_per_occasion: data.ever_drank && data.drink_frequency !== "Never" ? data.drinks_per_occasion : null,
          binge_drinking_freq: data.ever_drank && data.drink_frequency !== "Never" ? data.binge_drinking_freq : null,
        };

        const res = await fetch(`${base_url}/api/users/${user_id}/baseline/complete`, {
          method: "POST",
          headers: authHeaders,
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
    <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Pulse / Status Icon */}
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }] }}
        className={`w-24 h-24 rounded-full items-center justify-center mb-8 border ${
          isComplete ? "bg-success/10 border-success/30" : "bg-card border-border shadow-sm"
        }`}
      >
        {isComplete ? (
          <Feather name="check" size={38} className="text-success" />
        ) : (
          <Feather name="activity" size={36} className="text-primary" />
        )}
      </Animated.View>

      {/* Title Header */}
      <Text className="text-[22px] font-semibold text-foreground mb-3 tracking-tight text-center">
        {isComplete ? "HSS Calibrated!" : "Computing HSS"}
      </Text>

      {/* Dynamic Subtitle Step Text */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
        <Text className="text-[14px] text-muted-foreground font-medium text-center">
          {isComplete ? "Redirecting to your dashboard..." : steps[step]}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
