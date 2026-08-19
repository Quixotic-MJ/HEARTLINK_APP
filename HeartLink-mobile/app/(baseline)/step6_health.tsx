import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";

function FieldLabel({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <View className="mb-3 mt-4">
      <Text className="text-[15px] font-bold text-foreground">{title}</Text>
      {subtitle && <Text className="text-[13px] text-muted-foreground mt-1">{subtitle}</Text>}
    </View>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className={`flex-1 h-1 rounded-full ${i < current ? "bg-primary" : "bg-border"}`} />
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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} className="text-foreground" />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-muted-foreground uppercase tracking-wide">Step 6 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Health Background</Text>
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
                className={`p-4 rounded-2xl flex-row items-center border ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isSelected ? "bg-primary-foreground/20" : "bg-border/50"}`}>
                  <MaterialCommunityIcons name={goal.icon as any} size={20} className={isSelected ? "text-primary-foreground" : "text-muted-foreground"} />
                </View>
                <View className="flex-1 flex-col justify-center">
                  <Text className={`font-medium text-[15px] ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{goal.label}</Text>
                  <Text className={`text-[13px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{goal.desc}</Text>
                </View>
                {isSelected && <Feather name="check" size={18} className="text-primary-foreground" />}
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
                className={`px-4 py-2.5 rounded-full border ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
              >
                <Text className={`font-medium ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{a}</Text>
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
              className={`px-4 py-2.5 rounded-full border ${isSelected ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
            >
              <Text className={`font-medium ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>{dp}</Text>
            </AnimatedButton>
          )})}
        </View>

      </ScrollView>

      <View 
        className="px-5 pt-4 bg-card border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <AnimatedButton
          onPress={handleNext} disabled={!isReady}
          className={`h-[54px] rounded-2xl items-center justify-center flex-row shadow-sm ${isReady ? "bg-primary" : "bg-muted/30"}`}
        >
          <Text className={`text-[16px] font-bold ${isReady ? "text-primary-foreground" : "text-muted"}`}>Complete Onboarding</Text>
          <Feather name="check" size={18} className={isReady ? "text-primary-foreground ml-2" : "text-muted ml-2"} />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
