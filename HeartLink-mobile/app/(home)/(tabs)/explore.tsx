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
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import { Header } from "../../../components/Header";
import { Feather } from "@expo/vector-icons";
import RecipesScreen from "./recipes";
import ExercisesScreen from "./exercises";

const SEGMENTS = [
  { key: "recipes" as const, label: "Recipes", icon: "coffee" as const },
  { key: "exercises" as const, label: "Workouts", icon: "activity" as const },
];

export default function ExploreTabScreen() {
  const router = useRouter();
  const { initialSegment } = useLocalSearchParams<{ initialSegment?: "recipes" | "exercises" }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeSegment, setActiveSegment] = useState<"recipes" | "exercises">(
    initialSegment === "exercises" ? "exercises" : "recipes"
  );

  const slideAnim = useRef(new Animated.Value(activeSegment === "recipes" ? 0 : 1)).current;
  const [pillWidth, setPillWidth] = useState(0);

  useEffect(() => {
    if (initialSegment === "recipes" || initialSegment === "exercises") {
      setActiveSegment(initialSegment);
    }
  }, [initialSegment]);

  const onTrayLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    setPillWidth((totalWidth - 8) / 2);
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeSegment === "recipes" ? 0 : 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 2,
    }).start();
  }, [activeSegment, slideAnim]);

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

  const openLog = () => {
    if (activeSegment === "recipes") {
      router.push("/(home)/(meals)/food-diary");
    } else {
      router.push("/(home)/(health)/exercise-diary");
    }
  };

  return (
    <ScreenWrapper
      edges={["top"]}
      withScrollView={false}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <View className="px-5 pt-1 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-[22px] font-bold text-[#152131] dark:text-white"
            style={{ letterSpacing: -0.4 }}
          >
            Explore
          </Text>
          <TouchableOpacity
            onPress={openLog}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel={activeSegment === "recipes" ? "Open meal diary" : "Open workout history"}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-full min-h-[36px]"
            style={{
              backgroundColor: isDark ? "#162232" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E8ECEA",
            }}
          >
            <Feather
              name={activeSegment === "recipes" ? "book-open" : "calendar"}
              size={14}
              color={isDark ? "#94A3B8" : "#5C6B66"}
            />
            <Text className="text-[13px] font-semibold text-[#5C6B66] dark:text-slate-300">
              {activeSegment === "recipes" ? "Diary" : "History"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          accessible
          accessibilityRole="tablist"
          onLayout={onTrayLayout}
          className="flex-row p-1 rounded-full"
          style={{ backgroundColor: isDark ? "#121D2B" : "#E8EEEB" }}
        >
          {pillWidth > 0 && (
            <Animated.View
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: 4,
                width: pillWidth,
                borderRadius: 999,
                backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
                transform: [{ translateX }],
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 4,
                    shadowOpacity: 0.08,
                  },
                  android: { elevation: 2 },
                }),
              }}
            />
          )}

          {SEGMENTS.map((segment) => {
            const selected = activeSegment === segment.key;
            return (
              <TouchableOpacity
                key={segment.key}
                onPress={() => handleSwitchSegment(segment.key)}
                activeOpacity={0.85}
                accessible
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={segment.label}
                className="flex-1 flex-row items-center justify-center min-h-[40px] py-2 z-10"
              >
                <Feather
                  name={segment.icon}
                  size={15}
                  color={selected ? "#1B6E63" : isDark ? "#64748B" : "#8896A0"}
                />
                <Text
                  className={`ml-1.5 text-[14px] ${
                    selected
                      ? "font-bold text-[#152131] dark:text-white"
                      : "font-medium text-[#8896A0] dark:text-slate-500"
                  }`}
                >
                  {segment.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="flex-1">
        {activeSegment === "recipes" ? (
          <RecipesScreen hideHeader isEmbedded />
        ) : (
          <ExercisesScreen hideHeader isEmbedded />
        )}
      </View>
    </ScreenWrapper>
  );
}
