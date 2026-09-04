import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
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
  withSequence,
} from "react-native-reanimated";

// ─── Sub-Input Field for Activity Days & Minutes ───────────────────────────────

function ActivitySubInput({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  maxLength,
  hasError = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  unit: string;
  maxLength: number;
  hasError?: boolean;
}) {
  const shakeAnim = useSharedValue(0);

  React.useEffect(() => {
    if (hasError) {
      shakeAnim.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
    borderColor: hasError ? "#A93226" : "#DCE3DF",
  }));

  return (
    <View className="flex-1">
      <Text className="text-[12px] font-semibold text-[#5C6B66] mb-1.5 ml-0.5">
        {label}
      </Text>
      <Animated.View
        style={animatedStyle}
        className="h-[50px] bg-white rounded-xl px-3.5 border flex-row items-center"
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8D9B96"
          keyboardType="numeric"
          maxLength={maxLength}
          className="flex-1 text-[15px] font-semibold text-[#152131] h-full py-0"
        />
        <Text className="text-[13px] text-[#5C6B66] ml-1 font-semibold">
          {unit}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Activity Question Card ───────────────────────────────────────────────────

function ActivityCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  value,
  onToggle,
  daysValue,
  onDaysChange,
  minsValue,
  onMinsChange,
  daysError,
  minsError,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  daysValue: string;
  onDaysChange: (val: string) => void;
  minsValue: string;
  onMinsChange: (val: string) => void;
  daysError: boolean;
  minsError: boolean;
}) {
  return (
    <Animated.View
      layout={LinearTransition}
      className="bg-white rounded-2xl p-4 sm:p-5 mb-4 border border-[#DCE3DF] shadow-xs"
    >
      <View className="flex-row items-start mb-3.5">
        <View
          className={`w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 ${iconBg}`}
        >
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View className="flex-1 pr-1">
          <Text className="text-[15px] font-bold text-[#152131] tracking-tight leading-snug">
            {title}
          </Text>
          <Text className="text-[13px] text-[#5C6B66] mt-0.5 leading-4">
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Yes / No Segmented Control */}
      <View className="flex-row bg-[#EDF1EF] p-1 rounded-xl h-[46px]">
        <AnimatedButton
          onPress={() => onToggle(true)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value }}
          accessibilityLabel={`${title} Yes, ${value ? "selected" : "not selected"}`}
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
          onPress={() => onToggle(false)}
          accessibilityRole="radio"
          accessibilityState={{ selected: !value }}
          accessibilityLabel={`${title} No, ${!value ? "selected" : "not selected"}`}
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

      {/* Conditional Days & Minutes Inputs */}
      {value && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(150)}
          className="flex-row gap-3 mt-3.5 pt-3.5 border-t border-[#DCE3DF]"
        >
          <ActivitySubInput
            label="Days per week"
            value={daysValue || ""}
            onChangeText={onDaysChange}
            placeholder="3"
            unit="days"
            maxLength={1}
            hasError={daysError}
          />
          <ActivitySubInput
            label="Minutes each day"
            value={minsValue || ""}
            onChangeText={onMinsChange}
            placeholder="30"
            unit="min"
            maxLength={3}
            hasError={minsError}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Main Step 2 Component ────────────────────────────────────────────────────

export default function Step2Activity() {
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
      // Validate Part 1 (Movement & Exercise)
      if (data.vigorous_activity) {
        const vDays = parseInt(data.vigorous_days || "", 10);
        const vMin = parseInt(data.vigorous_minutes || "", 10);
        if (!data.vigorous_days?.trim() || isNaN(vDays) || vDays < 1 || vDays > 7) {
          errors.push("vigorous_days");
        }
        if (!data.vigorous_minutes?.trim() || isNaN(vMin) || vMin < 1 || vMin > 720) {
          errors.push("vigorous_minutes");
        }
      }

      if (data.moderate_activity) {
        const mDays = parseInt(data.moderate_days || "", 10);
        const mMin = parseInt(data.moderate_minutes || "", 10);
        if (!data.moderate_days?.trim() || isNaN(mDays) || mDays < 1 || mDays > 7) {
          errors.push("moderate_days");
        }
        if (!data.moderate_minutes?.trim() || isNaN(mMin) || mMin < 1 || mMin > 720) {
          errors.push("moderate_minutes");
        }
      }

      if (data.walk_bike_transport) {
        const wDays = parseInt(data.walk_bike_days || "", 10);
        const wMin = parseInt(data.walk_bike_minutes || "", 10);
        if (!data.walk_bike_days?.trim() || isNaN(wDays) || wDays < 1 || wDays > 7) {
          errors.push("walk_bike_days");
        }
        if (!data.walk_bike_minutes?.trim() || isNaN(wMin) || wMin < 1 || wMin > 720) {
          errors.push("walk_bike_minutes");
        }
      }

      if (errors.length > 0) {
        setErrorFields(errors);
        showToast({
          title: "Missing Information",
          message: "Please complete all highlighted activity questions.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate Part 2 (Daily Sitting Time)
      if (!data.sedentary_hours) {
        setErrorFields(["sedentary_hours"]);
        showToast({
          title: "Sitting Time Required",
          message: "Please select your daily sitting or resting time.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/step3_sleep_smoking", params });
    }
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
              Step 2 of 6
            </Text>
            <Text
              className="text-xl font-bold text-[#152131] mt-0.5"
              numberOfLines={1}
            >
              Physical Activity
            </Text>
          </View>
          <View className="ml-2">
            <HeartLogo size={22} />
          </View>
        </View>
        <StepProgress current={2} total={6} />
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
          {/* Sub-step 1: Movement & Exercise */}
          {subStep === 1 ? (
            <Animated.View
              key="step2-part1"
              entering={FadeInLeft.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 1 of 2: Movement & Workouts
                </Text>
              </View>

              <Text className="text-[14px] text-[#5C6B66] mb-5 leading-relaxed">
                Tell us about your active physical movement throughout a typical week.
              </Text>

              {/* Question 1: Vigorous Activity */}
              <ActivityCard
                icon="zap"
                iconBg="bg-[#A9741B]/15"
                iconColor="#A9741B"
                title="Do you do high-intensity exercise that makes you breathe hard or sweat?"
                subtitle="Examples: Running, fast cycling, HIIT, heavy lifting (10+ mins)"
                value={data.vigorous_activity}
                onToggle={(val) => {
                  setErrorFields((prev) =>
                    prev.filter(
                      (f) => f !== "vigorous_days" && f !== "vigorous_minutes"
                    )
                  );
                  updateData({
                    vigorous_activity: val,
                    ...(val ? {} : { vigorous_days: "", vigorous_minutes: "" }),
                  });
                }}
                daysValue={data.vigorous_days ?? ""}
                onDaysChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "vigorous_days")
                  );
                  updateData({ vigorous_days: t });
                }}
                minsValue={data.vigorous_minutes ?? ""}
                onMinsChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "vigorous_minutes")
                  );
                  updateData({ vigorous_minutes: t });
                }}
                daysError={errorFields.includes("vigorous_days")}
                minsError={errorFields.includes("vigorous_minutes")}
              />

              {/* Question 2: Moderate Activity */}
              <ActivityCard
                icon="activity"
                iconBg="bg-[#1B6E63]/15"
                iconColor="#1B6E63"
                title="Do you do moderate activities that slightly increase your heart rate?"
                subtitle="Examples: Brisk walking, light cycling, yard work, swimming (10+ mins)"
                value={data.moderate_activity}
                onToggle={(val) => {
                  setErrorFields((prev) =>
                    prev.filter(
                      (f) => f !== "moderate_days" && f !== "moderate_minutes"
                    )
                  );
                  updateData({
                    moderate_activity: val,
                    ...(val ? {} : { moderate_days: "", moderate_minutes: "" }),
                  });
                }}
                daysValue={data.moderate_days ?? ""}
                onDaysChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "moderate_days")
                  );
                  updateData({ moderate_days: t });
                }}
                minsValue={data.moderate_minutes ?? ""}
                onMinsChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "moderate_minutes")
                  );
                  updateData({ moderate_minutes: t });
                }}
                daysError={errorFields.includes("moderate_days")}
                minsError={errorFields.includes("moderate_minutes")}
              />

              {/* Question 3: Walking or Cycling Transport */}
              <ActivityCard
                icon="navigation"
                iconBg="bg-[#E8532E]/15"
                iconColor="#E8532E"
                title="Do you walk or bike to travel to places for at least 10 minutes?"
                subtitle="Examples: Walking or cycling to work, school, errands, or transit"
                value={data.walk_bike_transport}
                onToggle={(val) => {
                  setErrorFields((prev) =>
                    prev.filter(
                      (f) => f !== "walk_bike_days" && f !== "walk_bike_minutes"
                    )
                  );
                  updateData({
                    walk_bike_transport: val,
                    ...(val ? {} : { walk_bike_days: "", walk_bike_minutes: "" }),
                  });
                }}
                daysValue={data.walk_bike_days ?? ""}
                onDaysChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "walk_bike_days")
                  );
                  updateData({ walk_bike_days: t });
                }}
                minsValue={data.walk_bike_minutes ?? ""}
                onMinsChange={(t) => {
                  setErrorFields((prev) =>
                    prev.filter((f) => f !== "walk_bike_minutes")
                  );
                  updateData({ walk_bike_minutes: t });
                }}
                daysError={errorFields.includes("walk_bike_days")}
                minsError={errorFields.includes("walk_bike_minutes")}
              />
            </Animated.View>
          ) : (
            /* Sub-step 2: Daily Sitting Time */
            <Animated.View
              key="step2-part2"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 2 of 2: Daily Sitting Habits
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-[16px] font-bold text-[#152131] tracking-tight leading-snug mb-1">
                  On a typical day, how much total time do you spend sitting or resting?
                </Text>
                <Text className="text-[13px] text-[#5C6B66] leading-5 mb-5">
                  Includes desk work, driving, screen time, studying, and relaxing (excluding sleep).
                </Text>

                <View
                  className={`flex-col gap-2.5 p-1 rounded-2xl ${
                    errorFields.includes("sedentary_hours")
                      ? "border border-[#A93226] bg-[#A93226]/5"
                      : ""
                  }`}
                >
                  {[
                    { val: "<2h", label: "Less than 2 hours" },
                    { val: "2-4h", label: "2 to 4 hours" },
                    { val: "4-6h", label: "4 to 6 hours" },
                    { val: "6-8h", label: "6 to 8 hours" },
                    { val: "8+h", label: "More than 8 hours" },
                  ].map((opt) => {
                    const isActive = data.sedentary_hours === opt.val;
                    return (
                      <AnimatedButton
                        key={opt.val}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "sedentary_hours")
                          );
                          updateData({ sedentary_hours: opt.val });
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
                            isActive ? "text-white" : "text-[#152131]"
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
              color="#5C6B66"
            />
            <Text className="text-[12px] text-[#5C6B66] ml-1.5">
              Your activity data helps calibrate your heart score
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
              subStep === 1 ? "Continue to part 2" : "Proceed to step 3"
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
