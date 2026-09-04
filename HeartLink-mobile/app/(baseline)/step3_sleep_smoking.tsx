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

export default function Step3SleepSmoking() {
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
    if (subStep === 1) {
      // Validate Sleep Duration
      if (!data.sleep_hours) {
        setErrorFields(["sleep_hours"]);
        showToast({
          title: "Sleep Duration Required",
          message: "Please select your typical nightly sleep duration.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate Smoking Status
      if (data.ever_smoked && !data.smoke_now) {
        setErrorFields(["smoke_now"]);
        showToast({
          title: "Smoking Status Required",
          message: "Please select your current smoking routine.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/step4_alcohol", params });
    }
  };

  const renderToggle = (
    label: string,
    value: boolean,
    onChange: (val: boolean) => void
  ) => {
    return (
      <View className="flex-row bg-[#EDF1EF] p-1 rounded-xl h-[46px]">
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
              value ? "bg-[#E8532E] shadow-xs" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              value ? "text-white" : "text-[#5C6B66]"
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
              !value ? "bg-[#E8532E] shadow-xs" : "bg-transparent"
            }`}
          />
          <Text
            className={`text-[14px] font-semibold relative z-10 ${
              !value ? "text-white" : "text-[#5C6B66]"
            }`}
          >
            No
          </Text>
        </AnimatedButton>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EDF1EF]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-2.5">
        <View className="flex-row items-center mb-3">
          <AnimatedButton
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-xl bg-white border border-[#DCE3DF] items-center justify-center mr-3 shadow-xs"
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#152131"
            />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-[#E8532E] uppercase tracking-wider">
              Step 3 of 6
            </Text>
            <Text
              className="text-xl font-bold text-[#152131] mt-0.5"
              numberOfLines={1}
            >
              Sleep & Smoking
            </Text>
          </View>
          <View className="ml-2">
            <HeartLogo size={22} />
          </View>
        </View>
        <StepProgress current={3} total={6} />
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
          {/* Sub-step 1: Sleep Habits */}
          {subStep === 1 ? (
            <Animated.View
              key="step3-part1"
              entering={FadeInLeft.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 1 of 2: Sleep Routine
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-[16px] font-bold text-[#152131] tracking-tight leading-snug mb-1">
                  How many hours of sleep do you usually get each night?
                </Text>
                <Text className="text-[13px] text-[#5C6B66] leading-relaxed mb-5">
                  Consistent nightly sleep is essential for cardiac recovery and blood pressure regulation.
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("sleep_hours")
                      ? "border border-[#A93226] bg-[#A93226]/5"
                      : ""
                  }`}
                >
                  {[
                    { val: "5", label: "Less than 5 hours" },
                    { val: "5-6", label: "5 to 6 hours" },
                    { val: "7-8", label: "7 to 8 hours" },
                    { val: "9", label: "9 or more hours" },
                  ].map((opt) => {
                    const isActive = data.sleep_hours === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "sleep_hours")
                          );
                          updateData({ sleep_hours: opt.val });
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
                              ? "bg-[#E8532E] border-[#E8532E] shadow-xs"
                              : "bg-white border-[#DCE3DF]"
                          }`}
                        />
                        <Text
                          className={`font-semibold text-[15px] relative z-10 ${
                            isActive
                              ? "text-white"
                              : "text-[#152131]"
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
          ) : (
            /* Sub-step 2: Tobacco & Smoking History */
            <Animated.View
              key="step3-part2"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 2 of 2: Tobacco & Smoking History
                </Text>
              </View>

              <Text className="text-[14px] text-[#5C6B66] mb-5 leading-relaxed">
                Smoking history is a primary metric for personalizing your cardiovascular health risk profile.
              </Text>

              {/* Question 1: Lifetime Smoking Card */}
              <Animated.View
                layout={LinearTransition}
                className="bg-white rounded-2xl p-4 sm:p-5 mb-4 border border-[#DCE3DF] shadow-xs"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-[#A9741B]/15"
                  >
                    <Feather
                      name="wind"
                      size={18}
                      color="#A9741B"
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-[#152131] tracking-tight leading-snug">
                      Have you ever smoked regularly in your lifetime?
                    </Text>
                    <Text className="text-[13px] text-[#5C6B66] mt-0.5 leading-4">
                      Defined as having smoked at least 100 cigarettes (about 5 packs)
                    </Text>
                  </View>
                </View>

                {renderToggle("ever_smoked", data.ever_smoked, (val) => {
                  setErrorFields((prev) => prev.filter((f) => f !== "smoke_now"));
                  updateData({
                    ever_smoked: val,
                    smoke_now: val ? data.smoke_now : "Not at all",
                  });
                })}
              </Animated.View>

              {/* Question 2: Current Smoking Status Card (Conditional) */}
              {data.ever_smoked && (
                <Animated.View
                  entering={FadeInUp.duration(200)}
                  exiting={FadeOutUp.duration(150)}
                  layout={LinearTransition}
                  className="bg-white rounded-2xl p-4 sm:p-5 mb-4 border border-[#DCE3DF] shadow-xs"
                >
                  <View className="flex-row items-start mb-3.5">
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-[#1B6E63]/15"
                    >
                      <Feather
                        name="clock"
                        size={18}
                        color="#1B6E63"
                      />
                    </View>
                    <View className="flex-1 pr-1">
                      <Text className="text-[15px] font-bold text-[#152131] tracking-tight leading-snug">
                        Do you currently smoke tobacco products?
                      </Text>
                      <Text className="text-[13px] text-[#5C6B66] mt-0.5 leading-4">
                        Select the option that reflects your current routine
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`flex-col gap-2.5 p-1 rounded-2xl ${
                      errorFields.includes("smoke_now")
                        ? "border border-[#A93226] bg-[#A93226]/5"
                        : ""
                    }`}
                  >
                    {[
                      { val: "Every day", label: "Yes, every day" },
                      { val: "Some days", label: "Yes, on some days" },
                      { val: "Not at all", label: "No, I have quit" },
                    ].map((opt) => {
                      const isActive = data.smoke_now === opt.val;
                      return (
                        <AnimatedButton
                          key={opt.val}
                          onPress={() => {
                            setErrorFields((prev) =>
                              prev.filter((f) => f !== "smoke_now")
                            );
                            updateData({ smoke_now: opt.val });
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
                                ? "bg-[#E8532E] border-[#E8532E] shadow-xs"
                                : "bg-white border-[#DCE3DF]"
                            }`}
                          />
                          <Text
                            className={`font-semibold text-[15px] relative z-10 ${
                              isActive
                                ? "text-white"
                                : "text-[#152131]"
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

          {/* Privacy Trust Note */}
          <View className="mt-4 mb-2 flex-row items-center justify-center opacity-80">
            <Feather
              name="shield"
              size={13}
              color="#5C6B66"
            />
            <Text className="text-[12px] text-[#5C6B66] ml-1.5">
              Your lifestyle habits help calibrate your health risk score
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Anchored Bottom CTA */}
      <View
        className="px-5 pt-3.5 bg-[#EDF1EF] border-t border-[#DCE3DF]"
        style={{
          paddingBottom: Math.max(insets.bottom + 16, 32),
        }}
      >
        <Animated.View style={animatedButtonStyle}>
          <Pressable
            onPress={handleNext}
            onPressIn={handleBtnPressIn}
            onPressOut={handleBtnPressOut}
            accessibilityRole="button"
            accessibilityLabel={
              subStep === 1 ? "Continue to part 2" : "Proceed to step 4"
            }
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-[#E8532E]"
          >
            <Text className="text-[16px] font-bold text-white">
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
