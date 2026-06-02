import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import "../global.css"; // Ensure NativeWind/Tailwind is configured

export default function SplashScreen() {
  // Subtle entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Premium fade and slight scale-up effect on load
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#1e4ed8]" edges={["top", "bottom"]}>
      <StatusBar style="light" />

      {/* Main Centered Content */}
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        className="flex-1 items-center justify-center"
      >
        {/* Logo Box with Embossed Shadow Effect */}
        <View
          className="w-32 h-32 bg-[#1e4ed8] rounded-3xl items-center justify-center mb-6"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 10, // For Android shadow
          }}
        >
          <MaterialCommunityIcons name="heart-pulse" size={80} color="white" />
        </View>

        {/* App Title */}
        <Text className="text-white text-[32px] font-bold tracking-tight">
          HeartLink
        </Text>
      </Animated.View>

      {/* Grounded Footer */}
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="pb-8 items-center"
      >
        <Text className="text-white/60 text-[10px] font-bold tracking-[0.15em] uppercase">
          CTU - Main Campus • Capstone 2026
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
