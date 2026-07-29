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
  const { phone, user_id } = useLocalSearchParams();

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

  const handleStartBaseline = () => {
    router.replace({
      pathname: "/(baseline)/health_goals",
      params: { user_id: user_id as string },
    });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "bottom"]}
    >
      <StatusBar style="auto" />

      {/* Header (No back button to trap user) */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card">
            <Feather name="heart" size={14} className="text-foreground" />
          </View>
          <Text
            className="text-base text-foreground tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-card rounded-3xl border border-border px-5 py-10 items-center">
          {/* Animated success icon */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
            className="mb-7"
          >
            {/* Outer ring */}
            <View className="w-24 h-24 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-950/30">
              {/* Inner circle */}
              <View className="w-16 h-16 rounded-full items-center justify-center bg-emerald-600">
                <Feather
                  name="check"
                  size={32}
                  color="#fff"
                  strokeWidth={3}
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
            <Text className="text-3xl font-semibold text-foreground text-center tracking-tight mb-2" accessibilityRole="header">
              Account verified
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-relaxed px-2">
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
            className="w-full gap-3 mb-8"
          >
            <View className="flex-row items-center bg-background border border-border px-4 py-3.5 rounded-2xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-emerald-500/10">
                <MaterialCommunityIcons name="shield-check" size={18} className="text-emerald-600 dark:text-emerald-500" />
              </View>
              <Text className="text-sm text-foreground font-medium flex-1">
                End-to-end encrypted session
              </Text>
              <Feather name="check" size={16} className="text-emerald-600 dark:text-emerald-500" />
            </View>

            <View className="flex-row items-center bg-background border border-border px-4 py-3.5 rounded-2xl gap-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center bg-primary/10">
                <MaterialCommunityIcons name="database-lock" size={18} className="text-primary" />
              </View>
              <Text className="text-sm text-foreground font-medium flex-1">
                Health data stored securely
              </Text>
              <Feather name="check" size={16} className="text-primary" />
            </View>
          </Animated.View>

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStartBaseline}
            className="w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-2"
          >
            <Feather name="user-plus" size={16} className="text-primary-foreground" />
            <Text className="text-primary-foreground text-sm font-semibold">
              Set up clinical profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
