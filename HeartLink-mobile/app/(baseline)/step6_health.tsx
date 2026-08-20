import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import Animated, { LinearTransition } from "react-native-reanimated";

const HEALTH_GOALS = [
  { id: "bp", label: "Blood Pressure", desc: "Track and manage blood pressure", icon: "heart-pulse" },
  { id: "cholesterol", label: "Cholesterol", desc: "Monitor and optimize lipid levels", icon: "water" },
  { id: "recovery", label: "Recovery Support", desc: "Rehabilitation and healing", icon: "hospital" },
  { id: "preventive", label: "Preventive Health", desc: "General heart health and wellness", icon: "shield-check" },
];

const ALLERGIES = ["Peanuts", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs"];
const DIETARY_PRACTICES = ["None", "Halal", "Vegan", "Vegetarian", "Low-Carb"];

export default function Step6Health() {
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

    if (!data.health_goals || data.health_goals.length === 0) {
      errors.push("health_goals");
      showToast({ title: "Health Goals Required", message: "Please select at least one primary health goal.", type: "error" });
      setErrorFields(errors);
      return;
    }
    if (!data.dietary_practice) {
      errors.push("dietary_practice");
      showToast({ title: "Dietary Preferences Required", message: "Please select your dietary preference.", type: "error" });
      setErrorFields(errors);
      return;
    }

    setErrorFields([]);
    router.push({ pathname: "/(baseline)/calculating", params });
  };

  const toggleGoal = (id: string) => {
    setErrorFields((prev) => prev.filter((f) => f !== "health_goals"));
    const goals = [...data.health_goals];
    if (goals.includes(id)) {
      updateData({ health_goals: goals.filter((g) => g !== id) });
    } else {
      goals.push(id);
      updateData({ health_goals: goals });
    }
  };

  const toggleAllergy = (a: string) => {
    const allergies = [...data.allergies];
    if (allergies.includes(a)) {
      updateData({ allergies: allergies.filter((item) => item !== a) });
    } else {
      allergies.push(a);
      updateData({ allergies: allergies });
    }
  };

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
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">Step 6 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Health Goals</Text>
          </View>
        </View>
        <StepProgress current={6} total={6} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 32 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Health Goals */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            What are your main health goals? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Choose at least one
          </Text>

          <View className={`flex-col gap-2.5 p-1 rounded-2xl ${errorFields.includes("health_goals") ? "border border-destructive bg-destructive/5" : ""}`}>
            {HEALTH_GOALS.map((goal) => {
              const isSelected = data.health_goals.includes(goal.id);
              return (
                <AnimatedButton
                  key={goal.id} 
                  onPress={() => toggleGoal(goal.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${goal.label}, ${goal.desc}, ${isSelected ? "selected" : "not selected"}`}
                  className="p-3.5 rounded-2xl border-0 overflow-hidden flex-row items-center"
                >
                  <View className={`absolute inset-0 border rounded-2xl ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <View className={`w-9 h-9 rounded-full items-center justify-center mr-3.5 relative z-10 ${isSelected ? "bg-primary-foreground/20" : "bg-border/40 dark:bg-slate-800"}`}>
                    <MaterialCommunityIcons name={goal.icon as any} size={19} color={isSelected ? "#ffffff" : (isDark ? "#94a3b8" : "#64748b")} />
                  </View>
                  <View className="flex-1 flex-col justify-center relative z-10">
                    <Text className={`font-semibold text-[15px] ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{goal.label}</Text>
                    <Text className={`text-[12px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{goal.desc}</Text>
                  </View>
                  {isSelected && <Feather name="check" size={18} color="#ffffff" className="relative z-10" />}
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* Food Allergies */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            Do you have any food allergies?
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Select all that apply
          </Text>

          <View className="flex-row flex-wrap gap-2 p-1">
            {ALLERGIES.map((a) => {
              const isSelected = data.allergies.includes(a);
              return (
                <AnimatedButton
                  key={a} 
                  onPress={() => toggleAllergy(a)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Allergy ${a}, ${isSelected ? "selected" : "not selected"}`}
                  className="px-4 py-2.5 rounded-full border-0 overflow-hidden"
                >
                  <View className={`absolute inset-0 border rounded-full ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`text-[13px] font-semibold relative z-10 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{a}</Text>
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* Dietary Preferences */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            Do you follow any dietary preferences? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Select your preferred dietary practice
          </Text>

          <View className={`flex-row flex-wrap gap-2 p-1 rounded-2xl ${errorFields.includes("dietary_practice") ? "border border-destructive bg-destructive/5" : ""}`}>
            {DIETARY_PRACTICES.map((dp) => {
              const isSelected = data.dietary_practice === dp;
              return (
                <AnimatedButton
                  key={dp} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "dietary_practice"));
                    updateData({ dietary_practice: dp });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Dietary practice ${dp}, ${isSelected ? "selected" : "not selected"}`}
                  className="px-4 py-2.5 rounded-full border-0 overflow-hidden"
                >
                  <View className={`absolute inset-0 border rounded-full ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`text-[13px] font-semibold relative z-10 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{dp}</Text>
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
          accessibilityLabel="Complete onboarding"
          className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
        >
          <Text className="text-[16px] font-bold text-primary-foreground">Complete Setup</Text>
          <Feather name="check" size={18} color="#ffffff" className="ml-2" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
