import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../../global.css";

export default function VerificationSuccessScreen() {
  const router = useRouter();

  // Spring Animation for the success badge
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    // Route to the initial baseline data collection screen
    router.replace("/core_biometrics");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerClassName="flex-grow justify-center pb-10 pt-10"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Main White Card Container */}
        <View className="bg-white mx-5 rounded-[32px] px-6 py-12 shadow-sm shadow-blue-900/5 items-center">
          {/* 1. Animated Success Icon */}
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
            className="mb-8"
          >
            <View className="w-24 h-24 bg-emerald-50 rounded-full items-center justify-center border-[6px] border-white shadow-lg shadow-emerald-900/10">
              <View className="w-16 h-16 bg-emerald-500 rounded-full items-center justify-center">
                <Feather name="check" size={32} color="white" strokeWidth={3} />
              </View>
            </View>
          </Animated.View>

          {/* 2. Success Text */}
          <View className="mb-10 items-center">
            <Text className="text-[28px] font-black text-slate-900 text-center tracking-tight mb-3">
              Account Verified!
            </Text>
            <Text className="text-[14px] text-slate-500 text-center font-medium leading-relaxed px-2">
              Your credentials have been authenticated. You are now ready to
              establish your cardiovascular baseline.
            </Text>
          </View>

          {/* 3. Security Badge (Optional but adds clinical trust) */}
          <View className="flex-row items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 mb-10">
            <MaterialCommunityIcons
              name="shield-check"
              size={20}
              color="#10b981"
            />
            <Text className="text-[12px] font-bold text-slate-600 ml-2">
              End-to-End Encrypted Session
            </Text>
          </View>

          {/* 4. Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleContinue}
            className="w-full h-[52px] bg-[#1e4ed8] rounded-full flex-row justify-center items-center shadow-sm shadow-blue-900/20"
          >
            <Text className="text-white font-bold text-[15px] mr-2">
              Set Up Clinical Profile
            </Text>
            <Feather name="arrow-right" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Footer Branding */}
        <View className="mt-8">
          <Text className="text-center text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
            CTU - MAIN CAMPUS • CAPSTONE 2026
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
