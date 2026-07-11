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
import { useLocalSearchParams, useRouter } from "expo-router";
import "../../global.css";

export default function VerificationSuccessScreen() {
  const router = useRouter();
  const base_url = process.env.EXPO_PUBLIC_API_URL;
  const { phone } = useLocalSearchParams();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const test = async () => {
    const response = await fetch(`${base_url}/auth/test/${phone}`);
    const data = await response.json();

    if (response.ok) {
      console.log(data.message);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-6 py-10 items-center">
          {/* Animated success icon */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
            className="mb-7"
          >
            {/* Outer ring */}
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: "#eaf3de" }}
            >
              {/* Inner circle */}
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: "#639922" }}
              >
                <Feather
                  name="check"
                  size={30}
                  color="#fff"
                  strokeWidth={2.5}
                />
              </View>
            </View>
          </Animated.View>

          {/* Text — slides up after icon */}
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="items-center mb-7"
          >
            <Text className="text-[24px] font-medium text-slate-900 dark:text-white dark:text-slate-900 text-center tracking-tight mb-2">
              Account verified
            </Text>
            <Text className="text-[13px] text-slate-400 text-center leading-relaxed px-2">
              Your credentials have been authenticated. You're now ready to
              establish your cardiovascular baseline.
            </Text>
          </Animated.View>

          {/* Trust badges */}
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="w-full gap-2.5 mb-8"
          >
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-4 py-3 rounded-xl gap-3">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: "#eaf3de" }}
              >
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#3b6d11"
                />
              </View>
              <Text className="text-[13px] text-slate-600 font-medium flex-1">
                End-to-end encrypted session
              </Text>
              <Feather name="check" size={14} color="#639922" />
            </View>

            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-4 py-3 rounded-xl gap-3">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: "#e6f1fb" }}
              >
                <MaterialCommunityIcons
                  name="database-lock"
                  size={16}
                  color="#185fa5"
                />
              </View>
              <Text className="text-[13px] text-slate-600 font-medium flex-1">
                Health data stored securely
              </Text>
              <Feather name="check" size={14} color="#185fa5" />
            </View>
          </Animated.View>

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            // onPress={() => router.replace("/health_goals")}
            onPress={test}
            className="w-full bg-slate-900 dark:bg-slate-100 rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
          >
            <Text className="text-white dark:text-slate-900 text-[14px] font-medium">
              Set up clinical profile
            </Text>
            <Feather name="arrow-right" size={15} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text className="text-center text-[9px] tracking-widest text-slate-300 mt-6 uppercase">
          CTU — Main Campus · Capstone 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
