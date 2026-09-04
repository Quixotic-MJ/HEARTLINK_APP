import React, { useEffect, useState, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import HeartLogo from "../../components/ui/HeartLogo";

export default function CalculatingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { refreshUser, token, userId } = useUser();
  const { showToast } = useToast();
  const { data, resetData } = useBaseline();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslateY = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    "Analyzing biometrics & lifestyle...",
    "Applying cardiovascular predictive model...",
    "Generating your Health Stability Score...",
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
        const storedToken = token || (await AsyncStorage.getItem("access_token")) || "";
        const effectiveUserId = (params.user_id as string) || userId || (await AsyncStorage.getItem("user_id")) || "";

        if (!effectiveUserId) {
          throw new Error("User identifier not found. Please log in again.");
        }

        const authHeaders = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${storedToken}`,
        };
        
        // 1. Update Profile (Biometrics)
        const profilePayload = {
          first_name: data.first_name,
          last_name: data.last_name || "",
          date_of_birth: data.date_of_birth,
          sex: data.sex,
          height_cm: parseFloat(data.height_cm) || 0,
          weight_kg: parseFloat(data.weight_kg) || 0,
          health_goals: data.health_goals || [],
        };
        const profileRes = await fetch(`${base_url}/api/users/${effectiveUserId}/profile`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(profilePayload),
        });

        if (!profileRes.ok) {
          const errData = await profileRes.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to update biometrics profile.");
        }

        // 2. Submit Baseline Assessment Payload & Calibrate HSS
        const vigorousActive = !!data.vigorous_activity;
        const moderateActive = !!data.moderate_activity;
        const walkBikeActive = !!data.walk_bike_transport;
        const everSmoked = !!data.ever_smoked;
        const everDrank = !!data.ever_drank;

        const baselinePayload = {
          vigorous_activity: vigorousActive,
          vigorous_days: vigorousActive ? Math.max(1, parseInt(data.vigorous_days || "1", 10)) : null,
          vigorous_minutes: vigorousActive ? Math.max(1, parseInt(data.vigorous_minutes || "1", 10)) : null,
          moderate_activity: moderateActive,
          moderate_days: moderateActive ? Math.max(1, parseInt(data.moderate_days || "1", 10)) : null,
          moderate_minutes: moderateActive ? Math.max(1, parseInt(data.moderate_minutes || "1", 10)) : null,
          walk_bike_transport: walkBikeActive,
          walk_bike_days: walkBikeActive ? Math.max(1, parseInt(data.walk_bike_days || "1", 10)) : null,
          walk_bike_minutes: walkBikeActive ? Math.max(1, parseInt(data.walk_bike_minutes || "1", 10)) : null,
          sedentary_hours: data.sedentary_hours || "2-4h",
          sleep_hours: mapSleepHours(data.sleep_hours || "7-8"),
          ever_smoked: everSmoked,
          smoke_now: everSmoked ? (data.smoke_now || "Not at all") : null,
          ever_drank: everDrank,
          drink_frequency: everDrank ? (data.drink_frequency || "Never") : null,
          drinks_per_occasion: (everDrank && data.drink_frequency && data.drink_frequency !== "Never") ? data.drinks_per_occasion : null,
          binge_drinking_freq: (everDrank && data.drink_frequency && data.drink_frequency !== "Never") ? data.binge_drinking_freq : null,
          diet_level: data.diet_level || "average",
          fruit_veg_servings: data.fruit_veg_servings || "2-3",
          fried_food_freq: data.fried_food_freq || "sometimes",
          salty_food_freq: data.salty_food_freq || "sometimes",
          allergies: data.allergies?.includes("None") ? [] : (data.allergies || []),
          dietary_practice: data.dietary_practice || "None",
        };

        const baselineRes = await fetch(`${base_url}/api/users/${effectiveUserId}/baseline/complete`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(baselinePayload),
        });

        if (!baselineRes.ok) {
          const errData = await baselineRes.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to generate Health Stability Score.");
        }

        // Ensure transition display feels natural and rewarding
        setTimeout(async () => {
          clearInterval(interval);
          pulseLoop.stop();
          setIsComplete(true);
          
          await refreshUser();
          resetData(); // Clean up context

          setTimeout(() => {
            router.replace("/(home)/(tabs)/dashboard");
          }, 800);
        }, 3000);

      } catch (err: any) {
        clearInterval(interval);
        pulseLoop.stop();
        console.error("Baseline calculation failed:", err);
        showToast({
          title: "Calibration Failed",
          message: err?.message || "Failed to generate HSS score. Please try again.",
          type: "error",
        });
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
    <SafeAreaView className="flex-1 bg-[#EDF1EF] justify-center items-center px-6">
      <StatusBar style="dark" />

      {/* Pulse / Status Icon */}
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }] }}
        className={`w-24 h-24 rounded-full items-center justify-center mb-8 border ${
          isComplete ? "bg-[#1B6E63]/15 border-[#1B6E63]/30" : "bg-white border-[#DCE3DF] shadow-xs"
        }`}
      >
        {isComplete ? (
          <Feather name="check" size={38} color="#1B6E63" />
        ) : (
          <HeartLogo size={42} />
        )}
      </Animated.View>

      {/* Title Header */}
      <Text className="text-[24px] font-semibold text-[#152131] mb-2 tracking-tight text-center">
        {isComplete ? "HSS Calibrated!" : "Computing Health Score"}
      </Text>

      {/* Dynamic Subtitle Step Text */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
        <Text className="text-[14px] text-[#5C6B66] font-medium text-center">
          {isComplete ? "Redirecting to your dashboard..." : steps[step]}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
