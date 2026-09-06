import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Animated,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import { Header } from "../../../components/Header";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import RecipesScreen from "./recipes";
import ExercisesScreen from "./exercises";

export default function ExploreTabScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeSegment, setActiveSegment] = useState<"recipes" | "exercises">("recipes");

  // ─── Sliding Indicator Animation ──────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [pillWidth, setPillWidth] = useState(0);

  const onTrayLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    // Account for tray padding (6px each side = 12 total)
    setPillWidth((totalWidth - 12) / 2);
  };

  useEffect(() => {
    const toValue = activeSegment === "recipes" ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 3,
    }).start();
  }, [activeSegment]);

  // Android Hardware Back Navigation back to Today Dashboard
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/(home)/(tabs)/dashboard");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [router])
  );

  const handleSwitchSegment = (segment: "recipes" | "exercises") => {
    if (activeSegment === segment) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSegment(segment);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth],
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      {/* ── Zone 1: Header + Segmented Toggle ── */}
      <View className="px-5 pt-1 pb-3">
        {/* Title Block */}
        <View className="mb-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Feather name="heart" size={12} color="#E8532E" />
            <Text className="text-[11px] font-bold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider">
              Cardiovascular Lifestyle
            </Text>
          </View>
          <Text
            className="text-[26px] font-bold text-[#152131] dark:text-white"
            style={{ letterSpacing: -0.5 }}
          >
            Explore & Habits
          </Text>
          <Text className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">
            {activeSegment === "recipes"
              ? "Heart-healthy meals curated for cardiovascular wellness"
              : "Safe cardio movements & routines for cardiovascular stability"}
          </Text>
        </View>

        {/* ── Premium Segmented Toggle ── */}
        <View
          accessible={true}
          accessibilityRole="tablist"
          onLayout={onTrayLayout}
          className="flex-row p-1.5 rounded-2xl"
          style={{
            backgroundColor: isDark ? "#121D2B" : "#EAEFEC",
          }}
        >
          {/* Sliding Active Indicator */}
          {pillWidth > 0 && (
            <Animated.View
              style={{
                position: "absolute",
                top: 6,
                bottom: 6,
                left: 6,
                width: pillWidth,
                borderRadius: 12,
                backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
                transform: [{ translateX }],
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 8,
                    shadowOpacity: 0.1,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              }}
            />
          )}

          {/* Recipes Tab */}
          <TouchableOpacity
            onPress={() => handleSwitchSegment("recipes")}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === "recipes" }}
            accessibilityLabel="Recipes and meals tab, heart-healthy nutrition"
            className="flex-1 flex-row items-center justify-center min-h-[46px] py-2.5 px-3 rounded-[14px] z-10"
          >
            <View
              className="w-7 h-7 rounded-lg items-center justify-center mr-2"
              style={{
                backgroundColor:
                  activeSegment === "recipes"
                    ? isDark ? "rgba(27,110,99,0.2)" : "rgba(27,110,99,0.1)"
                    : "transparent",
              }}
            >
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={15}
                color={activeSegment === "recipes" ? "#1B6E63" : isDark ? "#64748B" : "#8896A0"}
              />
            </View>
            <Text
              className={`text-[14px] ${
                activeSegment === "recipes"
                  ? "font-bold text-[#152131] dark:text-white"
                  : "font-medium text-[#8896A0] dark:text-slate-500"
              }`}
            >
              Recipes & Meals
            </Text>
          </TouchableOpacity>

          {/* Exercises Tab */}
          <TouchableOpacity
            onPress={() => handleSwitchSegment("exercises")}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === "exercises" }}
            accessibilityLabel="Cardio workouts tab, cardiovascular movement and breathwork"
            className="flex-1 flex-row items-center justify-center min-h-[46px] py-2.5 px-3 rounded-[14px] z-10"
          >
            <View
              className="w-7 h-7 rounded-lg items-center justify-center mr-2"
              style={{
                backgroundColor:
                  activeSegment === "exercises"
                    ? isDark ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.1)"
                    : "transparent",
              }}
            >
              <Feather
                name="activity"
                size={15}
                color={activeSegment === "exercises" ? "#2563EB" : isDark ? "#64748B" : "#8896A0"}
              />
            </View>
            <Text
              className={`text-[14px] ${
                activeSegment === "exercises"
                  ? "font-bold text-[#152131] dark:text-white"
                  : "font-medium text-[#8896A0] dark:text-slate-500"
              }`}
            >
              Cardio Workouts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-View Render */}
      <View className="flex-1">
        {activeSegment === "recipes" ? (
          <RecipesScreen hideHeader isEmbedded />
        ) : (
          <ExercisesScreen hideHeader isEmbedded />
        )}
      </View>
    </SafeAreaView>
  );
}
