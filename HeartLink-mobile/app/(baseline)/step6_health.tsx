import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";

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
    <View className="flex-row gap-1.5 mb-2">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i < current ? "#0f172a" : "#e2e8f0" }} />
      ))}
    </View>
  );
}

const HEALTH_GOALS = [
  { id: "bp", label: "Blood Pressure", icon: "heart-pulse" },
  { id: "cholesterol", label: "Cholesterol", icon: "water" },
  { id: "recovery", label: "Post-Surgery Recovery", icon: "hospital" },
  { id: "preventive", label: "Preventive Health", icon: "shield-check" },
];

const ALLERGIES = ["Peanuts", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs"];
const DIETARY_PRACTICES = ["None", "Halal", "Vegan", "Vegetarian", "Low-Carb"];

export default function Step6Health() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();

  const isReady = data.health_goals.length > 0 && data.dietary_practice;

  const handleNext = () => {
    router.push({ pathname: "/calculating", params });
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
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
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
              <TouchableOpacity
                key={goal.id} onPress={() => toggleGoal(goal.id)}
                className={`p-4 rounded-2xl flex-row items-center border ${isSelected ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isSelected ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <MaterialCommunityIcons name={goal.icon as any} size={20} color={isSelected ? "white" : "#64748b"} />
                </View>
                <Text className={`font-medium flex-1 ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{goal.label}</Text>
                {isSelected && <Feather name="check" size={18} color="white" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <FieldLabel title="Food Allergies" subtitle="Select any allergies we should know about for meal recommendations." />
        <View className="flex-row flex-wrap gap-2 mt-2">
          {ALLERGIES.map((a) => {
            const isSelected = data.allergies.includes(a);
            return (
              <TouchableOpacity
                key={a} onPress={() => toggleAllergy(a)}
                className={`px-4 py-2.5 rounded-full border ${isSelected ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
              >
                <Text className={`font-medium ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{a}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FieldLabel title="Dietary Restrictions" subtitle="Select your preferred dietary practice." />
        <View className="flex-row flex-wrap gap-2 mt-2">
          {DIETARY_PRACTICES.map((dp) => (
            <TouchableOpacity
              key={dp} onPress={() => updateData({ dietary_practice: dp })}
              className={`px-4 py-2.5 rounded-full border ${data.dietary_practice === dp ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
            >
              <Text className={`font-medium ${data.dietary_practice === dp ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{dp}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <View className="px-5 pb-8 pt-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <TouchableOpacity
          onPress={handleNext} disabled={!isReady}
          className={`h-[54px] rounded-2xl items-center justify-center flex-row ${isReady ? "bg-[#0f172a]" : "bg-slate-200 dark:bg-slate-800"}`}
        >
          <Text className={`text-[16px] font-bold ${isReady ? "text-white" : "text-slate-400"}`}>Complete Onboarding</Text>
          <Feather name="check" size={18} color={isReady ? "white" : "#94a3b8"} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
