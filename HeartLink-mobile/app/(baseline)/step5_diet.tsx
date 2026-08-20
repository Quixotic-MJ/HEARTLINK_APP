import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import Animated, {
  FadeInRight,
  FadeInLeft,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

// ─── 2x2 Grid Component for Dietary Frequency (Zero Clipping) ─────────────────

function FrequencyGrid({
  value,
  onChange,
  hasError = false,
}: {
  value?: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}) {
  const row1 = [
    { val: "rarely", label: "Rarely" },
    { val: "sometimes", label: "Sometimes" },
  ];
  const row2 = [
    { val: "often", label: "Often" },
    { val: "daily", label: "Daily" },
  ];

  return (
    <View
      className={`gap-2 p-1 rounded-2xl ${
        hasError ? "border border-destructive bg-destructive/5" : ""
      }`}
    >
      {/* Row 1 */}
      <View className="flex-row gap-2">
        {row1.map((opt) => {
          const isActive = value === opt.val;
          return (
            <AnimatedButton
              key={opt.val}
              onPress={() => onChange(opt.val)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${opt.label}, ${
                isActive ? "selected" : "not selected"
              }`}
              className="flex-1 h-[48px] rounded-xl border-0 overflow-hidden items-center justify-center"
            >
              <View
                className={`absolute inset-0 border rounded-xl ${
                  isActive
                    ? "bg-primary border-primary shadow-sm"
                    : "bg-background dark:bg-slate-950 border-border/80 dark:border-slate-800"
                }`}
              />
              <Text
                className={`font-semibold text-[14px] relative z-10 ${
                  isActive ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {opt.label}
              </Text>
            </AnimatedButton>
          );
        })}
      </View>

      {/* Row 2 */}
      <View className="flex-row gap-2">
        {row2.map((opt) => {
          const isActive = value === opt.val;
          return (
            <AnimatedButton
              key={opt.val}
              onPress={() => onChange(opt.val)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${opt.label}, ${
                isActive ? "selected" : "not selected"
              }`}
              className="flex-1 h-[48px] rounded-xl border-0 overflow-hidden items-center justify-center"
            >
              <View
                className={`absolute inset-0 border rounded-xl ${
                  isActive
                    ? "bg-primary border-primary shadow-sm"
                    : "bg-background dark:bg-slate-950 border-border/80 dark:border-slate-800"
                }`}
              />
              <Text
                className={`font-semibold text-[14px] relative z-10 ${
                  isActive ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {opt.label}
              </Text>
            </AnimatedButton>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Step 5 Component ────────────────────────────────────────────────────

export default function Step5Diet() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [subStep, setSubStep] = useState<1 | 2>(1);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  // Tactile CTA button animation
  const btnScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleBtnPressIn = () => {
    btnScale.value = withTiming(0.98, { duration: 100 });
  };

  const handleBtnPressOut = () => {
    btnScale.value = withTiming(1.0, { duration: 100 });
  };

  const handleBack = () => {
    if (subStep === 2) {
      setSubStep(1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    const errors: string[] = [];

    if (subStep === 1) {
      // Validate Part 1
      if (!data.diet_level) {
        errors.push("diet_level");
      }
      if (!data.fruit_veg_servings) {
        errors.push("fruit_veg_servings");
      }

      if (errors.length > 0) {
        setErrorFields(errors);
        showToast({
          title: "Missing Information",
          message: "Please complete all highlighted meal questions.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate Part 2
      if (!data.fried_food_freq) {
        errors.push("fried_food_freq");
      }
      if (!data.salty_food_freq) {
        errors.push("salty_food_freq");
      }

      if (errors.length > 0) {
        setErrorFields(errors);
        showToast({
          title: "Missing Information",
          message: "Please complete all highlighted food questions.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/step6_health", params });
    }
  };

  const SERVINGS_OPTIONS = [
    { val: "0-1", label: "0–1" },
    { val: "2-3", label: "2–3" },
    { val: "4-5", label: "4–5" },
    { val: "6+", label: "6+" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="px-5 pt-4 pb-2.5">
        <View className="flex-row items-center mb-3">
          <AnimatedButton
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3"
          >
            <Feather
              name="arrow-left"
              size={18}
              color={isDark ? "#f8fafc" : "#0f172a"}
            />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Step 5 of 6
            </Text>
            <Text
              className="text-xl font-bold text-foreground mt-0.5"
              numberOfLines={1}
            >
              Eating Habits
            </Text>
          </View>
          <View className="w-9 h-9 rounded-full items-center justify-center border border-primary/20 bg-primary/10 ml-2">
            <Feather
              name="heart"
              size={17}
              color={isDark ? "#60a5fa" : "#2563eb"}
            />
          </View>
        </View>
        <StepProgress current={5} total={6} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sub-step 1: Meal Portions & Produce Intake */}
          {subStep === 1 && (
            <Animated.View
              key="step5-part1"
              entering={FadeInLeft.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-primary uppercase tracking-wide">
                  Part 1 of 2: Meal Portions & Produce
                </Text>
              </View>

              <Text className="text-[14px] text-muted-foreground mb-5 leading-5">
                Your typical meal size and produce consumption inform your nutritional baseline.
              </Text>

              {/* Card 1: Meal Portions */}
              <Animated.View
                layout={LinearTransition}
                className="bg-card dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-border/80 shadow-sm"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${
                      isDark ? "bg-emerald-500/10" : "bg-emerald-50"
                    }`}
                  >
                    <Feather
                      name="disc"
                      size={18}
                      color={isDark ? "#34d399" : "#059669"}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                      How would you describe your usual meal portions?
                    </Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                      Your typical daily meal volume
                    </Text>
                  </View>
                </View>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("diet_level")
                      ? "border border-destructive bg-destructive/5"
                      : ""
                  }`}
                >
                  {[
                    { val: "light", label: "Light", desc: "Smaller, lighter meals" },
                    { val: "average", label: "Moderate", desc: "Balanced, average meals" },
                    { val: "heavy", label: "Substantial", desc: "Larger, filling meals" },
                    { val: "very_heavy", label: "Heavy", desc: "Frequently large, hearty meals" },
                  ].map((opt) => {
                    const isActive = data.diet_level === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "diet_level")
                          );
                          updateData({ diet_level: opt.val });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${opt.label}, ${opt.desc}, ${
                          isActive ? "selected" : "not selected"
                        }`}
                        className="px-4 py-3.5 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                      >
                        <View
                          className={`absolute inset-0 border rounded-xl ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-background dark:bg-slate-950 border-border/80 dark:border-slate-800"
                          }`}
                        />
                        <View className="flex-1 pr-3 relative z-10">
                          <Text
                            className={`font-semibold text-[15px] ${
                              isActive
                                ? "text-primary-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
                          <Text
                            className={`text-[12px] mt-0.5 ${
                              isActive
                                ? "text-primary-foreground/85"
                                : "text-muted-foreground"
                            }`}
                          >
                            {opt.desc}
                          </Text>
                        </View>
                        {isActive && (
                          <Feather
                            name="check"
                            size={18}
                            color="#ffffff"
                            className="relative z-10"
                          />
                        )}
                      </AnimatedButton>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Card 2: Fruits & Vegetables */}
              <Animated.View
                layout={LinearTransition}
                className="bg-card dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-border/80 shadow-sm"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${
                      isDark ? "bg-amber-500/10" : "bg-amber-50"
                    }`}
                  >
                    <Feather
                      name="sun"
                      size={18}
                      color={isDark ? "#fbbf24" : "#d97706"}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                      Daily servings of fruits & vegetables?
                    </Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                      1 serving ≈ 1 whole fruit or 1 cup of vegetables
                    </Text>
                  </View>
                </View>

                <View
                  className={`flex-row gap-2 p-1 rounded-2xl ${
                    errorFields.includes("fruit_veg_servings")
                      ? "border border-destructive bg-destructive/5"
                      : ""
                  }`}
                >
                  {SERVINGS_OPTIONS.map((opt) => {
                    const isActive = data.fruit_veg_servings === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "fruit_veg_servings")
                          );
                          updateData({ fruit_veg_servings: opt.val });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${opt.label} servings, ${
                          isActive ? "selected" : "not selected"
                        }`}
                        className="flex-1 py-3.5 rounded-xl border-0 overflow-hidden items-center justify-center"
                      >
                        <View
                          className={`absolute inset-0 border rounded-xl ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-background dark:bg-slate-950 border-border/80 dark:border-slate-800"
                          }`}
                        />
                        <Text
                          className={`font-bold text-[15px] relative z-10 ${
                            isActive
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </AnimatedButton>
                    );
                  })}
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* Sub-step 2: Dietary Composition */}
          {subStep === 2 && (
            <Animated.View
              key="step5-part2"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-primary uppercase tracking-wide">
                  Part 2 of 2: Dietary Composition
                </Text>
              </View>

              <Text className="text-[14px] text-muted-foreground mb-5 leading-5">
                Frequency of high-fat and processed foods helps gauge cardiovascular nutrition risk.
              </Text>

              {/* Card 1: High-Fat & Fried Foods */}
              <Animated.View
                layout={LinearTransition}
                className="bg-card dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-border/80 shadow-sm"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${
                      isDark ? "bg-orange-500/10" : "bg-orange-50"
                    }`}
                  >
                    <Feather
                      name="zap"
                      size={18}
                      color={isDark ? "#fb923c" : "#ea580c"}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                      How often do you eat fried or high-fat foods?
                    </Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                      Fast food, fried dishes, and fatty meats
                    </Text>
                  </View>
                </View>

                <FrequencyGrid
                  value={data.fried_food_freq}
                  onChange={(val) => {
                    setErrorFields((prev) =>
                      prev.filter((f) => f !== "fried_food_freq")
                    );
                    updateData({ fried_food_freq: val });
                  }}
                  hasError={errorFields.includes("fried_food_freq")}
                />
              </Animated.View>

              {/* Card 2: Salty / Processed Foods */}
              <Animated.View
                layout={LinearTransition}
                className="bg-card dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-border/80 shadow-sm"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${
                      isDark ? "bg-blue-500/10" : "bg-blue-50"
                    }`}
                  >
                    <Feather
                      name="package"
                      size={18}
                      color={isDark ? "#60a5fa" : "#2563eb"}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                      How often do you eat salty or processed foods?
                    </Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                      Chips, instant noodles, canned and cured foods
                    </Text>
                  </View>
                </View>

                <FrequencyGrid
                  value={data.salty_food_freq}
                  onChange={(val) => {
                    setErrorFields((prev) =>
                      prev.filter((f) => f !== "salty_food_freq")
                    );
                    updateData({ salty_food_freq: val });
                  }}
                  hasError={errorFields.includes("salty_food_freq")}
                />
              </Animated.View>
            </Animated.View>
          )}

          {/* Privacy Trust Note */}
          <View className="mt-4 mb-2 flex-row items-center justify-center opacity-80">
            <Feather
              name="shield"
              size={13}
              color={isDark ? "#64748b" : "#94a3b8"}
            />
            <Text className="text-[12px] text-muted-foreground ml-1.5">
              Your nutritional baseline helps customize your health recommendations
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Anchored Bottom CTA */}
      <View
        className="px-5 pt-3.5 bg-card dark:bg-slate-900 border-t border-border/80 shadow-md"
        style={{
          paddingBottom: Math.max(insets.bottom + 16, 32),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Animated.View style={animatedButtonStyle}>
          <Pressable
            onPress={handleNext}
            onPressIn={handleBtnPressIn}
            onPressOut={handleBtnPressOut}
            accessibilityRole="button"
            accessibilityLabel={
              subStep === 1 ? "Continue to part 2" : "Proceed to step 6"
            }
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
          >
            <Text className="text-[16px] font-bold text-primary-foreground">
              {subStep === 1 ? "Continue" : "Next Step"}
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color="#ffffff"
              className="ml-2"
            />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
