import React, { useEffect, useState, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function CalculatingScreen() {
  const router = useRouter();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState(0);

  const steps = [
    "Analyzing clinical biometrics...",
    "Calibrating risk thresholds...",
    "Generating personalized insights..."
  ];

  useEffect(() => {
    // Pulse animation
    Animated.loop(
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
    ).start();

    // Step text rotation
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1300);

    // Navigate to dashboard after 4 seconds
    const timeout = setTimeout(() => {
      router.replace("/(home)/(tabs)/dashboard");
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center">
      <StatusBar style="light" />
      
      <Animated.View 
        style={{ transform: [{ scale: pulseAnim }] }}
        className="w-24 h-24 bg-white/10 rounded-full items-center justify-center mb-8 border border-white/20"
      >
        <Feather name="activity" size={36} color="#fff" />
      </Animated.View>

      <Text className="text-white text-[22px] font-medium mb-3 tracking-tight">
        Computing Initial Score
      </Text>
      
      <Text className="text-slate-400 text-[14px]">
        {steps[step]}
      </Text>
    </SafeAreaView>
  );
}
