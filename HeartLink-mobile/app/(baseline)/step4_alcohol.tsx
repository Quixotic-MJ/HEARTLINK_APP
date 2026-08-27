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
  FadeInUp,
  FadeOutUp,
  FadeInRight,
  FadeInLeft,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export default function Step4Alcohol() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
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
    if (subStep === 3) {
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (subStep === 2) {
      setSubStep(1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (!data.ever_drank) {
      // Non-drinker can proceed immediately to Step 5
      setErrorFields([]);
      updateData({
        drink_frequency: "Never",
        drinks_per_occasion: undefined,
        binge_drinking_freq: undefined,
      });
      router.push({ pathname: "/(baseline)/step5_diet", params });
      return;
    }

    if (subStep === 1) {
      // Validate drinking frequency
      if (!data.drink_frequency) {
        setErrorFields(["drink_frequency"]);
        showToast({
          title: "Frequency Required",
          message: "Please select how often you drink alcohol.",
          type: "error",
        });
        return;
      }

      if (data.drink_frequency === "Never") {
        setErrorFields([]);
        updateData({
          drinks_per_occasion: undefined,
          binge_drinking_freq: undefined,
        });
        router.push({ pathname: "/(baseline)/step5_diet", params });
        return;
      }

      setErrorFields([]);
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else if (subStep === 2) {
      // Validate Part 2: typical volume
      if (!data.drinks_per_occasion) {
        setErrorFields(["drinks_per_occasion"]);
        showToast({
          title: "Drink Count Required",
          message: "Please select your typical number of drinks.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(3);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate Part 3: heavy drinking frequency
      if (!data.binge_drinking_freq) {
        setErrorFields(["binge_drinking_freq"]);
        showToast({
          title: "Occasion Frequency Required",
          message: "Please select how often you have 6+ drinks.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/step5_diet", params });
    }
  };

  const renderToggle = (
    label: string,
    value: boolean,
    onChange: (val: boolean) => void
  ) => {
    return (
      <View className="flex-row bg-border/40 dark:bg-slate-800/60 p-1 rounded-xl h-[46px]">
        <AnimatedButton
          onPress={() => onChange(true)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value }}
          accessibilityLabel={`${label} Yes, ${
            value ? "selected" : "not selected"
          }`}
          className="flex-1 items-center justify-center rounded-lg overflow-hidden relative"
        >
          <View
            className={`absolute inset-0 ${
              value ? "bg-primary shadow-sm" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              value ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Yes
          </Text>
        </AnimatedButton>
        <AnimatedButton
          onPress={() => onChange(false)}
          accessibilityRole="radio"
          accessibilityState={{ selected: !value }}
          accessibilityLabel={`${label} No, ${
            !value ? "selected" : "not selected"
          }`}
          className="flex-1 items-center justify-center rounded-lg overflow-hidden relative"
        >
          <View
            className={`absolute inset-0 ${
              !value ? "bg-primary shadow-sm" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              !value ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            No
          </Text>
        </AnimatedButton>
      </View>
    );
  };

  const isNonDrinker = !data.ever_drank || data.drink_frequency === "Never";

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
              Step 4 of 6
            </Text>
            <Text
              className="text-xl font-bold text-foreground mt-0.5"
              numberOfLines={1}
            >
              Alcohol Habits
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
        <StepProgress current={4} total={6} />
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
          {/* Sub-step 1: Drinking Status & Frequency */}
          {subStep === 1 && (
            <Animated.View
              key="step4-part1"
              entering={FadeInLeft.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-primary uppercase tracking-wide">
                  {data.ever_drank
                    ? "Part 1 of 3: Alcohol Routine"
                    : "Alcohol Consumption"}
                </Text>
              </View>

              <Text className="text-[14px] text-muted-foreground mb-5 leading-5">
                Alcohol consumption habits help calibrate your metabolic and blood pressure profile.
              </Text>

              {/* Question 1: Gateway Question */}
              <Animated.View
                layout={LinearTransition}
                className="bg-card dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-border/80 shadow-sm"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${
                      isDark ? "bg-purple-500/10" : "bg-purple-50"
                    }`}
                  >
                    <Feather
                      name="droplet"
                      size={18}
                      color={isDark ? "#c084fc" : "#9333ea"}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                      Do you drink alcohol?
                    </Text>
                    <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                      Includes beer, wine, cocktails, or spirits
                    </Text>
                  </View>
                </View>

                {renderToggle("ever_drank", data.ever_drank, (val) => {
                  setErrorFields([]);
                  updateData({
                    ever_drank: val,
                    drink_frequency: val ? data.drink_frequency : "Never",
                    drinks_per_occasion: val ? data.drinks_per_occasion : undefined,
                    binge_drinking_freq: val ? data.binge_drinking_freq : undefined,
                  });
                })}
              </Animated.View>

              {/* Question 2: Frequency Question (Conditional) */}
              {data.ever_drank && (
                <Animated.View
                  entering={FadeInUp.duration(200)}
                  exiting={FadeOutUp.duration(150)}
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
                        name="calendar"
                        size={18}
                        color={isDark ? "#60a5fa" : "#2563eb"}
                      />
                    </View>
                    <View className="flex-1 pr-1">
                      <Text className="text-[15px] font-bold text-foreground tracking-tight leading-snug">
                        How often do you have a drink containing alcohol?
                      </Text>
                      <Text className="text-[13px] text-muted-foreground mt-0.5 leading-5">
                        In a typical month or year
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`flex-col gap-2.5 p-1 rounded-2xl ${
                      errorFields.includes("drink_frequency")
                        ? "border border-destructive bg-destructive/5"
                        : ""
                    }`}
                  >
                    {[
                      { val: "Monthly or less", label: "Monthly or less" },
                      { val: "2-4x/month", label: "2 to 4 times a month" },
                      { val: "2-3x/week", label: "2 to 3 times a week" },
                      { val: "4+/week", label: "4 or more times a week" },
                      { val: "Never", label: "Never" },
                    ].map((opt) => {
                      const isActive = data.drink_frequency === opt.val;
                      return (
                        <AnimatedButton
                          key={opt.val}
                          onPress={() => {
                            setErrorFields((prev) =>
                              prev.filter((f) => f !== "drink_frequency")
                            );
                            if (opt.val === "Never") {
                              updateData({
                                drink_frequency: opt.val,
                                drinks_per_occasion: undefined,
                                binge_drinking_freq: undefined,
                              });
                            } else {
                              updateData({ drink_frequency: opt.val });
                            }
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isActive }}
                          accessibilityLabel={`${opt.label}, ${
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
                          <Text
                            className={`font-semibold text-[15px] relative z-10 ${
                              isActive
                                ? "text-primary-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
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
              )}
            </Animated.View>
          )}

          {/* Sub-step 2: Typical Drink Volume */}
          {subStep === 2 && (
            <Animated.View
              key="step4-part2"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-primary uppercase tracking-wide">
                  Part 2 of 3: Drink Volume
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-[16px] font-bold text-foreground tracking-tight leading-snug mb-5">
                  How many standard drinks do you usually have on a typical drinking day?
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("drinks_per_occasion")
                      ? "border border-destructive bg-destructive/5"
                      : ""
                  }`}
                >
                  {[
                    { val: "1-2", label: "1 or 2 standard drinks" },
                    { val: "3-4", label: "3 or 4 standard drinks" },
                    { val: "5+", label: "5 or more standard drinks" },
                  ].map((opt) => {
                    const isActive = data.drinks_per_occasion === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "drinks_per_occasion")
                          );
                          updateData({ drinks_per_occasion: opt.val });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${opt.label}, ${
                          isActive ? "selected" : "not selected"
                        }`}
                        className="px-4 py-4 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                      >
                        <View
                          className={`absolute inset-0 border rounded-xl ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"
                          }`}
                        />
                        <Text
                          className={`font-semibold text-[15px] relative z-10 ${
                            isActive
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
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
              </View>
            </Animated.View>
          )}

          {/* Sub-step 3: Heavy Occasions Frequency */}
          {subStep === 3 && (
            <Animated.View
              key="step4-part3"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-primary uppercase tracking-wide">
                  Part 3 of 3: Heavy Occasions
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-[16px] font-bold text-foreground tracking-tight leading-snug mb-1">
                  How often do you have 6 or more drinks on a single occasion?
                </Text>
                <Text className="text-[13px] text-muted-foreground leading-5 mb-5">
                  Sometimes referred to as heavy or episodic drinking.
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("binge_drinking_freq")
                      ? "border border-destructive bg-destructive/5"
                      : ""
                  }`}
                >
                  {[
                    { val: "Never", label: "Never" },
                    { val: "Monthly or less", label: "Monthly or less" },
                    { val: "2-4x/month", label: "2 to 4 times a month" },
                    { val: "2-3x/week", label: "2 to 3 times a week" },
                    { val: "4+/week", label: "4 or more times a week" },
                  ].map((opt) => {
                    const isActive = data.binge_drinking_freq === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "binge_drinking_freq")
                          );
                          updateData({ binge_drinking_freq: opt.val });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${opt.label}, ${
                          isActive ? "selected" : "not selected"
                        }`}
                        className="px-4 py-3.5 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                      >
                        <View
                          className={`absolute inset-0 border rounded-xl ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"
                          }`}
                        />
                        <Text
                          className={`font-semibold text-[15px] relative z-10 ${
                            isActive
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
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
              </View>
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
              Your alcohol habits help calibrate your health risk score
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
              (subStep === 1 && !isNonDrinker) || subStep === 2
                ? `Continue to part ${subStep + 1}`
                : "Proceed to step 5"
            }
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
          >
            <Text className="text-[16px] font-bold text-primary-foreground">
              {(subStep === 1 && !isNonDrinker) || subStep === 2
                ? "Continue"
                : "Next Step"}
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
