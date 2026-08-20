import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import Animated, { LinearTransition } from "react-native-reanimated";

export default function Step5Diet() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const handleNext = () => {
    const errors: string[] = [];

    if (!data.diet_level) {
      errors.push("diet_level");
      showToast({ title: "Portions Required", message: "Please select your usual meal portion size.", type: "error" });
      setErrorFields(errors);
      return;
    }
    if (!data.fried_food_freq) {
      errors.push("fried_food_freq");
      showToast({ title: "High-Fat Foods Required", message: "Please select your high-fat food frequency.", type: "error" });
      setErrorFields(errors);
      return;
    }
    if (!data.salty_food_freq) {
      errors.push("salty_food_freq");
      showToast({ title: "Processed Foods Required", message: "Please select your salty/processed food frequency.", type: "error" });
      setErrorFields(errors);
      return;
    }
    if (!data.fruit_veg_servings) {
      errors.push("fruit_veg_servings");
      showToast({ title: "Produce Intake Required", message: "Please select your daily fruit and vegetable servings.", type: "error" });
      setErrorFields(errors);
      return;
    }

    setErrorFields([]);
    router.push({ pathname: "/(baseline)/step6_health", params });
  };

  const FREQ_OPTIONS = [
    { val: "rarely", label: "Rarely" },
    { val: "sometimes", label: "Sometimes" },
    { val: "often", label: "Often" },
    { val: "daily", label: "Daily" },
  ];

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
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-3">
          <AnimatedButton 
            onPress={() => router.back()} 
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">Step 5 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Eating Habits</Text>
          </View>
        </View>
        <StepProgress current={5} total={6} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 32 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Meal Portions */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            How would you describe your usual meal portions? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Your typical daily meals
          </Text>

          <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("diet_level") ? "border border-destructive bg-destructive/5" : ""}`}>
            {[
              { val: "light", label: "Light", desc: "Smaller meals" },
              { val: "average", label: "Average", desc: "Typical meals" },
              { val: "heavy", label: "Heavy", desc: "Larger meals" },
              { val: "very_heavy", label: "Very heavy", desc: "Frequently large meals" },
            ].map((opt) => {
              const isActive = data.diet_level === opt.val;
              return (
                <AnimatedButton
                  key={opt.val} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "diet_level"));
                    updateData({ diet_level: opt.val });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${opt.label}, ${opt.desc}, ${isActive ? "selected" : "not selected"}`}
                  className="px-4 py-3 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                >
                  <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <View className="flex-1 pr-3 relative z-10">
                    <Text className={`font-semibold text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                    <Text className={`text-[12px] mt-0.5 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
                  </View>
                  {isActive && <Feather name="check" size={18} color="#ffffff" className="relative z-10" />}
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* High-Fat Foods */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            How often do you eat fried or high-fat foods? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Fried food, fast food, fatty meals
          </Text>

          <View className={`flex-row flex-wrap gap-2 p-1 rounded-2xl ${errorFields.includes("fried_food_freq") ? "border border-destructive bg-destructive/5" : ""}`}>
            {FREQ_OPTIONS.map((opt) => {
              const isActive = data.fried_food_freq === opt.val;
              return (
                <AnimatedButton
                  key={opt.val} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "fried_food_freq"));
                    updateData({ fried_food_freq: opt.val });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${opt.label}, ${isActive ? "selected" : "not selected"}`}
                  className="flex-1 min-w-[45%] py-3 px-3.5 rounded-xl border-0 overflow-hidden items-center justify-center"
                >
                  <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`font-semibold text-[14px] relative z-10 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </Text>
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* Salty / Processed Foods */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            How often do you eat salty or processed foods? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Chips, instant noodles, canned or cured foods
          </Text>

          <View className={`flex-row flex-wrap gap-2 p-1 rounded-2xl ${errorFields.includes("salty_food_freq") ? "border border-destructive bg-destructive/5" : ""}`}>
            {FREQ_OPTIONS.map((opt) => {
              const isActive = data.salty_food_freq === opt.val;
              return (
                <AnimatedButton
                  key={opt.val} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "salty_food_freq"));
                    updateData({ salty_food_freq: opt.val });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${opt.label}, ${isActive ? "selected" : "not selected"}`}
                  className="flex-1 min-w-[45%] py-3 px-3.5 rounded-xl border-0 overflow-hidden items-center justify-center"
                >
                  <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`font-semibold text-[14px] relative z-10 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </Text>
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* Fruits and Vegetables */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            Daily servings of fruits & vegetables? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            1 serving ≈ 1 fruit or 1 cup of vegetables
          </Text>

          <View className={`flex-row gap-2 p-1 rounded-2xl ${errorFields.includes("fruit_veg_servings") ? "border border-destructive bg-destructive/5" : ""}`}>
            {SERVINGS_OPTIONS.map((opt) => {
              const isActive = data.fruit_veg_servings === opt.val;
              return (
                <AnimatedButton
                  key={opt.val} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "fruit_veg_servings"));
                    updateData({ fruit_veg_servings: opt.val });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${opt.label} servings, ${isActive ? "selected" : "not selected"}`}
                  className="flex-1 py-3 rounded-xl border-0 overflow-hidden items-center justify-center"
                >
                  <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`font-bold text-[15px] relative z-10 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </Text>
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

      </ScrollView>

      {/* Bottom CTA */}
      <View 
        className="px-5 pt-3.5 bg-card dark:bg-slate-900 border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <AnimatedButton
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Proceed to step 6"
          className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
        >
          <Text className="text-[16px] font-bold text-primary-foreground">Next Step</Text>
          <Feather name="arrow-right" size={18} color="#ffffff" className="ml-2" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
