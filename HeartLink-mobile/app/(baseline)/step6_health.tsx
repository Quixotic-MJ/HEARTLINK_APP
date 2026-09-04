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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import HeartLogo from "../../components/ui/HeartLogo";
import Animated, {
  FadeInRight,
  FadeInLeft,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

const HEALTH_GOALS = [
  {
    id: "bp",
    label: "Blood Pressure",
    desc: "Track, manage, and stabilize blood pressure",
    icon: "heart-pulse",
    color: "#E8532E",
    bg: "bg-[#E8532E]/15",
  },
  {
    id: "cholesterol",
    label: "Cholesterol & Lipids",
    desc: "Monitor and optimize blood lipid levels",
    icon: "water",
    color: "#1B6E63",
    bg: "bg-[#1B6E63]/15",
  },
  {
    id: "recovery",
    label: "Cardiac Recovery",
    desc: "Rehabilitation, pacing, and restorative health",
    icon: "hospital-box",
    color: "#8A1F1A",
    bg: "bg-[#8A1F1A]/15",
  },
  {
    id: "preventive",
    label: "Preventive Longevity",
    desc: "General cardiovascular wellness and fitness",
    icon: "shield-check",
    color: "#1B6E63",
    bg: "bg-[#1B6E63]/15",
  },
];

const ALLERGIES = ["None", "Peanuts", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs"];
const DIETARY_PRACTICES = ["None", "Halal", "Vegan", "Vegetarian", "Low-Carb"];

export default function Step6Health() {
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
      // Validate Health Goals
      if (!data.health_goals || data.health_goals.length === 0) {
        setErrorFields(["health_goals"]);
        showToast({
          title: "Health Goals Required",
          message: "Please select at least one primary health goal.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      setSubStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // Validate Dietary Preferences
      if (!data.dietary_practice) {
        setErrorFields(["dietary_practice"]);
        showToast({
          title: "Dietary Preferences Required",
          message: "Please select your primary dietary preference.",
          type: "error",
        });
        return;
      }

      setErrorFields([]);
      router.push({ pathname: "/(baseline)/calculating", params });
    }
  };

  const toggleGoal = (id: string) => {
    setErrorFields((prev) => prev.filter((f) => f !== "health_goals"));
    const goals = [...(data.health_goals || [])];
    if (goals.includes(id)) {
      updateData({ health_goals: goals.filter((g) => g !== id) });
    } else {
      goals.push(id);
      updateData({ health_goals: goals });
    }
  };

  const toggleAllergy = (a: string) => {
    let allergies = [...(data.allergies || [])];
    if (a === "None") {
      if (allergies.includes("None")) {
        updateData({ allergies: [] });
      } else {
        updateData({ allergies: ["None"] });
      }
      return;
    }

    allergies = allergies.filter((item) => item !== "None");
    if (allergies.includes(a)) {
      allergies = allergies.filter((item) => item !== a);
    } else {
      allergies.push(a);
    }
    updateData({ allergies });
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
              Step 6 of 6
            </Text>
            <Text
              className="text-xl font-bold text-[#152131] mt-0.5"
              numberOfLines={1}
            >
              Health Goals
            </Text>
          </View>
          <View className="ml-2">
            <HeartLogo size={22} />
          </View>
        </View>
        <StepProgress current={6} total={6} />
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
          {/* Sub-step 1: Primary Health Goals */}
          {subStep === 1 && (
            <Animated.View
              key="step6-part1"
              entering={FadeInLeft.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 1 of 2: Primary Health Goals
                </Text>
              </View>

              <Text className="text-[14px] text-[#5C6B66] mb-5 leading-relaxed">
                Choose one or more areas you want HeartLink to focus on for your heart care pathway.
              </Text>

              {/* Health Goals List */}
              <View
                className={`flex-col gap-2.5 p-1 rounded-2xl ${
                  errorFields.includes("health_goals")
                    ? "border border-[#A93226] bg-[#A93226]/5"
                    : ""
                }`}
              >
                {HEALTH_GOALS.map((goal) => {
                  const isSelected = data.health_goals?.includes(goal.id);
                  return (
                    <AnimatedButton
                      key={goal.id}
                      onPress={() => toggleGoal(goal.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${goal.label}, ${goal.desc}, ${
                        isSelected ? "selected" : "not selected"
                      }`}
                      className="p-4 rounded-2xl border-0 overflow-hidden flex-row items-center"
                    >
                      <View
                        className={`absolute inset-0 border rounded-2xl ${
                          isSelected
                            ? "bg-[#E8532E] border-[#E8532E] shadow-xs"
                            : "bg-white border-[#DCE3DF]"
                        }`}
                      />
                      <View
                        className={`w-10 h-10 rounded-xl items-center justify-center mr-3.5 relative z-10 ${
                          isSelected
                            ? "bg-white/20"
                            : `${goal.bg}`
                        }`}
                      >
                        <MaterialCommunityIcons
                          name={goal.icon as any}
                          size={20}
                          color={
                            isSelected
                              ? "#ffffff"
                              : goal.color
                          }
                        />
                      </View>
                      <View className="flex-1 flex-col justify-center relative z-10 pr-2">
                        <Text
                          className={`font-semibold text-[15px] ${
                            isSelected
                              ? "text-white"
                              : "text-[#152131]"
                          }`}
                        >
                          {goal.label}
                        </Text>
                        <Text
                          className={`text-[12px] mt-0.5 ${
                            isSelected
                              ? "text-white/85"
                              : "text-[#5C6B66]"
                          }`}
                        >
                          {goal.desc}
                        </Text>
                      </View>
                      {isSelected && (
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

          {/* Sub-step 2: Dietary Lifestyle & Allergies */}
          {subStep === 2 && (
            <Animated.View
              key="step6-part2"
              entering={FadeInRight.duration(220)}
            >
              {/* Section Subtitle */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] font-bold text-[#E8532E] uppercase tracking-wide">
                  Part 2 of 2: Dietary Preferences & Allergies
                </Text>
              </View>

              <Text className="text-[14px] text-[#5C6B66] mb-5 leading-relaxed">
                Ensure meal suggestions and nutrient alerts align safely with your dietary habits.
              </Text>

              {/* Card 1: Food Allergies */}
              <Animated.View
                layout={LinearTransition}
                className="bg-white rounded-2xl p-4 sm:p-5 mb-4 border border-[#DCE3DF] shadow-xs"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-[#A9741B]/15"
                  >
                    <Feather
                      name="alert-circle"
                      size={18}
                      color="#A9741B"
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-[#152131] tracking-tight leading-snug">
                      Do you have any food allergies?
                    </Text>
                    <Text className="text-[13px] text-[#5C6B66] mt-0.5 leading-5">
                      Select all ingredients you avoid or are allergic to
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2.5 pt-1">
                  {ALLERGIES.map((a) => {
                    const isSelected = data.allergies?.includes(a);
                    return (
                      <AnimatedButton
                        key={a}
                        onPress={() => toggleAllergy(a)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`Allergy ${a}, ${
                          isSelected ? "selected" : "not selected"
                        }`}
                        className="px-4 py-2.5 rounded-full border-0 overflow-hidden"
                      >
                        <View
                          className={`absolute inset-0 border rounded-full ${
                            isSelected
                              ? "bg-[#E8532E] border-[#E8532E] shadow-xs"
                              : "bg-white border-[#DCE3DF]"
                          }`}
                        />
                        <Text
                          className={`text-[13px] font-semibold relative z-10 ${
                            isSelected
                              ? "text-white"
                              : "text-[#152131]"
                          }`}
                        >
                          {a}
                        </Text>
                      </AnimatedButton>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Card 2: Dietary Preferences */}
              <Animated.View
                layout={LinearTransition}
                className="bg-white rounded-2xl p-4 sm:p-5 mb-4 border border-[#DCE3DF] shadow-xs"
              >
                <View className="flex-row items-start mb-3.5">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5 bg-[#1B6E63]/15"
                  >
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#1B6E63"
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text className="text-[15px] font-bold text-[#152131] tracking-tight leading-snug">
                      Do you follow any dietary preferences?
                    </Text>
                    <Text className="text-[13px] text-[#5C6B66] mt-0.5 leading-5">
                      Select your primary nutritional lifestyle
                    </Text>
                  </View>
                </View>

                <View
                  className={`flex-row flex-wrap gap-2.5 pt-1 rounded-2xl ${
                    errorFields.includes("dietary_practice")
                      ? "border border-[#A93226] bg-[#A93226]/5 p-1"
                      : ""
                  }`}
                >
                  {DIETARY_PRACTICES.map((dp) => {
                    const isSelected = data.dietary_practice === dp;
                    return (
                      <AnimatedButton
                        key={dp}
                        onPress={() => {
                          setErrorFields((prev) =>
                            prev.filter((f) => f !== "dietary_practice")
                          );
                          updateData({ dietary_practice: dp });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Dietary practice ${dp}, ${
                          isSelected ? "selected" : "not selected"
                        }`}
                        className="px-4 py-2.5 rounded-full border-0 overflow-hidden"
                      >
                        <View
                          className={`absolute inset-0 border rounded-full ${
                            isSelected
                              ? "bg-[#E8532E] border-[#E8532E] shadow-xs"
                              : "bg-white border-[#DCE3DF]"
                          }`}
                        />
                        <Text
                          className={`text-[13px] font-semibold relative z-10 ${
                            isSelected
                              ? "text-white"
                              : "text-[#152131]"
                          }`}
                        >
                          {dp}
                        </Text>
                      </AnimatedButton>
                    );
                  })}
                </View>
              </Animated.View>
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
              Your profile enables personalized heart risk score calculation
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
              subStep === 1 ? "Continue to part 2" : "Complete assessment"
            }
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-[#E8532E]"
          >
            <Text className="text-[16px] font-bold text-white">
              {subStep === 1 ? "Continue" : "Complete Assessment"}
            </Text>
            <Feather
              name={subStep === 1 ? "arrow-right" : "check-circle"}
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
