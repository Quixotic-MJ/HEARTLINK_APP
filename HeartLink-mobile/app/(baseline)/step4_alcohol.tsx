import { Appearance } from "react-native";
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useColorScheme
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import HeartLogo from "../../components/ui/HeartLogo";
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
import { theme } from "../../constants/theme";

export default function Step4Alcohol() {
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
      // Validate typical volume
      if (!data.drinks_per_occasion) {
        setErrorFields(["drinks_per_occasion"]);
        showToast({
          title: "Volume Required",
          message: "Please select your typical drink count.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(3);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate binge frequency
      if (!data.binge_drinking_freq) {
        setErrorFields(["binge_drinking_freq"]);
        showToast({
          title: "Heavy Occasions Required",
          message: "Please select how often you consume 6+ drinks.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/step5_diet", params });
    }
  };

  const isNonDrinker = !data.ever_drank || data.drink_frequency === "Never";

  const renderToggle = (
    label: string,
    value: boolean,
    onChange: (val: boolean) => void
  ) => {
    return (
      <View className="flex-row bg-[#EDF1EF] dark:bg-[#0A0F0E] p-1 rounded-xl h-[46px]">
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
              value ? "bg-[#2E9AE8] dark:bg-[#6EC1F5] shadow-xs" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              value ? "text-white" : "text-text-soft"
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
              !value ? "bg-[#2E9AE8] dark:bg-[#6EC1F5] shadow-xs" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              !value ? "text-white" : "text-text-soft"
            }`}
          >
            No
          </Text>
        </AnimatedButton>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EDF1EF] dark:bg-[#0A0F0E]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-2.5">
        <View className="flex-row items-center mb-3">
          <AnimatedButton
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl bg-surface dark:bg-[#101615] border border-border items-center justify-center mr-3 shadow-xs"
          >
            <Feather
              name="arrow-left"
              size={18}
              color={Appearance.getColorScheme() === "dark" ? "#FFFFFF" : "#152131"}
            />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Step 4 of 6
            </Text>
            <Text
              className="text-xl font-bold text-text mt-0.5"
              numberOfLines={1}
            >
              Alcohol Consumption
            </Text>
          </View>
          <View className="ml-2">
            <HeartLogo size={22} />
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

              <Text className="text-[14px] text-text-soft mb-5 leading-relaxed">
                Alcohol consumption habits help calibrate your metabolic and blood pressure profile.
              </Text>

              {/* Question 1: Gateway Question */}
              <Animated.View
                layout={LinearTransition}
                className="bg-surface dark:bg-[#101615] rounded-2xl p-4 sm:p-5 mb-4 border border-border shadow-xs"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-[#A9741B]/15"
                  >
                    <Feather
                      name="droplet"
                      size={18}
                      color={theme.warningText}
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-text tracking-tight leading-snug">
                      Do you drink alcohol?
                    </Text>
                    <Text className="text-[13px] text-text-soft mt-0.5 leading-5">
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
                  className="bg-surface dark:bg-[#101615] rounded-2xl p-4 sm:p-5 mb-4 border border-border shadow-xs"
                >
                  <View className="flex-row items-start mb-3.5">
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-blue-tint0 dark:bg-blue-400/15"
                    >
                      <Feather
                        name="calendar"
                        size={18}
                        color={Appearance.getColorScheme() === "dark" ? "#6EC1F5" : "#2E9AE8"}
                      />
                    </View>
                    <View className="flex-1 pr-1">
                      <Text className="text-[15px] font-bold text-text tracking-tight leading-snug">
                        How often do you have a drink containing alcohol?
                      </Text>
                      <Text className="text-[13px] text-text-soft mt-0.5 leading-5">
                        In a typical month or year
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`flex-col gap-2.5 p-1 rounded-2xl ${
                      errorFields.includes("drink_frequency")
                        ? "border border-[#A93226] bg-[#A93226]/5"
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
                                ? "bg-[#2E9AE8] dark:bg-[#6EC1F5] border-[#E8532E] shadow-xs"
                                : "bg-surface dark:bg-[#101615] border-border"
                            }`}
                          />
                          <Text
                            className={`font-semibold text-[15px] relative z-10 ${
                              isActive
                                ? "text-white"
                                : "text-text"
                            }`}
                          >
                            {opt.label}
                          </Text>
                          {isActive && (
                            <Feather
                              name="check"
                              size={18}
                              color={theme.onPrimary}
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
                <Text className="text-[16px] font-bold text-text tracking-tight leading-snug mb-5">
                  How many standard drinks do you usually have on a typical drinking day?
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("drinks_per_occasion")
                      ? "border border-[#A93226] bg-[#A93226]/5"
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
                              ? "bg-[#2E9AE8] dark:bg-[#6EC1F5] border-[#E8532E] shadow-xs"
                              : "bg-surface dark:bg-[#101615] border-border"
                          }`}
                        />
                        <Text
                          className={`font-semibold text-[15px] relative z-10 ${
                            isActive
                              ? "text-white"
                              : "text-text"
                          }`}
                        >
                          {opt.label}
                        </Text>
                        {isActive && (
                          <Feather
                            name="check"
                            size={18}
                            color={theme.onPrimary}
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
                <Text className="text-[16px] font-bold text-text tracking-tight leading-snug mb-1">
                  How often do you have 6 or more drinks on a single occasion?
                </Text>
                <Text className="text-[13px] text-text-soft leading-5 mb-5">
                  Sometimes referred to as heavy or episodic drinking.
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("binge_drinking_freq")
                      ? "border border-[#A93226] bg-[#A93226]/5"
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
                              ? "bg-[#2E9AE8] dark:bg-[#6EC1F5] border-[#E8532E] shadow-xs"
                              : "bg-surface dark:bg-[#101615] border-border"
                          }`}
                        />
                        <Text
                          className={`font-semibold text-[15px] relative z-10 ${
                            isActive
                              ? "text-white"
                              : "text-text"
                          }`}
                        >
                          {opt.label}
                        </Text>
                        {isActive && (
                          <Feather
                            name="check"
                            size={18}
                            color={theme.onPrimary}
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
              color={Appearance.getColorScheme() === "dark" ? "#94A3B8" : "#5C6B66"}
            />
            <Text className="text-[12px] text-text-soft ml-1.5">
              Your alcohol habits help calibrate your health risk score
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Anchored Bottom CTA */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        className="px-5 pt-3.5 bg-[#EDF1EF] dark:bg-[#0A0F0E] border-t border-border"
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
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-[#2E9AE8] dark:bg-[#6EC1F5]"
          >
            <Text className="text-[16px] font-bold text-white">
              {(subStep === 1 && !isNonDrinker) || subStep === 2
                ? "Continue"
                : "Next Step"}
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color={theme.onPrimary}
              className="ml-2"
            />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
