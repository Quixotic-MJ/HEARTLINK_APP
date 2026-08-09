import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import { Colors } from "../../constants/theme";
import AnimatedButton from "../../components/ui/AnimatedButton";

function FieldLabel({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <View className="mb-3 mt-4">
      <Text className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</Text>
      {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">{subtitle}</Text>}
    </View>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i < current ? Colors.light.tint : "#e2e8f0" }} />
      ))}
    </View>
  );
}

const HEALTH_GOALS = [
  { id: "bp", label: "Blood Pressure", desc: "Track and manage hypertension", icon: "heart-pulse" },
  { id: "cholesterol", label: "Cholesterol", desc: "Monitor and lower LDL levels", icon: "water" },
  { id: "recovery", label: "Post-Surgery Recovery", desc: "Rehabilitation and healing", icon: "hospital" },
  { id: "preventive", label: "Preventive Health", desc: "General heart health and wellness", icon: "shield-check" },
];

const ALLERGIES = ["Peanuts", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs"];
const DIETARY_PRACTICES = ["None", "Halal", "Vegan", "Vegetarian", "Low-Carb"];

export default function Step6Health() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  const activeBg = Colors[isDark ? "dark" : "light"].tint;
  const activeText = isDark ? "#11181C" : "#ffffff";

  const isReady = data.health_goals.length > 0 && data.dietary_practice;

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/calculating", params });
  };

  const toggleGoal = (id: string) => {
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 6 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Health Background</Text>
          </View>
        </View>
        <StepProgress current={6} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <FieldLabel title="Primary Health Focus" subtitle="What are your main goals for using HeartLink?" />
        <View className="flex-col gap-3 mt-2">
          {HEALTH_GOALS.map((goal) => {
            const isSelected = data.health_goals.includes(goal.id);
            return (
              <AnimatedButton
                key={goal.id} onPress={() => toggleGoal(goal.id)}
                className="p-4 rounded-2xl flex-row items-center border"
                style={{
                  backgroundColor: isSelected ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: isSelected ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
                }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : (isDark ? "#1e293b" : "#f1f5f9") }}>
                  <MaterialCommunityIcons name={goal.icon as any} size={20} color={isSelected ? activeText : "#64748b"} />
                </View>
                <View className="flex-1 flex-col justify-center">
                  <Text className="font-medium text-[15px]" style={{ color: isSelected ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{goal.label}</Text>
                  <Text className="text-[13px] mt-0.5" style={{ color: isSelected ? activeText : "#64748b" }}>{goal.desc}</Text>
                </View>
                {isSelected && <Feather name="check" size={18} color={activeText} />}
              </AnimatedButton>
            );
          })}
        </View>

        <FieldLabel title="Food Allergies" subtitle="Select any allergies we should know about for meal recommendations." />
        <View className="flex-row flex-wrap gap-2 mt-2">
          {ALLERGIES.map((a) => {
            const isSelected = data.allergies.includes(a);
            return (
              <AnimatedButton
                key={a} onPress={() => toggleAllergy(a)}
                className="px-4 py-2.5 rounded-full border"
                style={{
                  backgroundColor: isSelected ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: isSelected ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
                }}
              >
                <Text className="font-medium" style={{ color: isSelected ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{a}</Text>
              </AnimatedButton>
            );
          })}
        </View>

        <FieldLabel title="Dietary Restrictions" subtitle="Select your preferred dietary practice." />
        <View className="flex-row flex-wrap gap-2 mt-2">
          {DIETARY_PRACTICES.map((dp) => {
            const isSelected = data.dietary_practice === dp;
            return (
            <AnimatedButton
              key={dp} onPress={() => updateData({ dietary_practice: dp })}
              className="px-4 py-2.5 rounded-full border"
              style={{
                backgroundColor: isSelected ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
                borderColor: isSelected ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
              }}
            >
              <Text className="font-medium" style={{ color: isSelected ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{dp}</Text>
            </AnimatedButton>
          )})}
        </View>

      </ScrollView>

      <View 
        className="px-5 pt-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <AnimatedButton
          onPress={handleNext} disabled={!isReady}
          className="h-[54px] rounded-2xl items-center justify-center flex-row"
          style={{ backgroundColor: isReady ? activeBg : (isDark ? "#1e293b" : "#e2e8f0") }}
        >
          <Text className="text-[16px] font-bold" style={{ color: isReady ? activeText : "#94a3b8" }}>Complete Onboarding</Text>
          <Feather name="check" size={18} color={isReady ? activeText : "#94a3b8"} style={{ marginLeft: 8 }} />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
