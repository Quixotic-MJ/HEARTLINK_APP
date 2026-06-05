import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type CookingMethod = "Boiled/Steamed" | "Grilled/Baked" | "Fried/Deep-Fried";
type PortionSize = "Small" | "Medium" | "Large";
type SaltyLevel = "Low" | "Moderate" | "High/Salty";

// ─── UI Helper Components ───────────────────────────────────────────────────

function ChoiceChip<T extends string>({
  label,
  selected,
  onSelect,
}: {
  label: T;
  selected: boolean;
  onSelect: (val: T) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onSelect(label)}
      className={`px-4 py-2.5 rounded-xl border mr-2 mb-2 ${
        selected ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
      }`}
      style={
        selected
          ? {
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 2,
            }
          : undefined
      }
    >
      <Text
        className={`text-[14px] font-medium ${
          selected ? "text-white" : "text-slate-600"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: any }) {
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-6">
      <MaterialCommunityIcons name={icon} size={18} color="#64748b" />
      <Text className="text-[15px] font-bold text-slate-900 tracking-tight">
        {title}
      </Text>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ManualMealLogScreen() {
  const router = useRouter();

  // State
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>("Breakfast");
  const [foodDescription, setFoodDescription] = useState("");
  const [cookingMethod, setCookingMethod] = useState<CookingMethod>("Boiled/Steamed");
  const [portionSize, setPortionSize] = useState<PortionSize>("Medium");
  const [saltyLevel, setSaltyLevel] = useState<SaltyLevel>("Low");

  // Options
  const timeOptions: TimeOfMeal[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const cookingOptions: CookingMethod[] = ["Boiled/Steamed", "Grilled/Baked", "Fried/Deep-Fried"];
  const portionOptions: PortionSize[] = ["Small", "Medium", "Large"];
  const saltyOptions: SaltyLevel[] = ["Low", "Moderate", "High/Salty"];

  // Risk Calculation
  const calculateRisk = () => {
    let base = 0;
    
    // Cooking method weights
    if (cookingMethod === "Grilled/Baked") base += 15;
    if (cookingMethod === "Fried/Deep-Fried") base += 40;

    // Salty level weights
    if (saltyLevel === "Moderate") base += 20;
    if (saltyLevel === "High/Salty") base += 45;

    // Portion multiplier
    let multiplier = 1.0;
    if (portionSize === "Small") multiplier = 0.8;
    if (portionSize === "Large") multiplier = 1.5;

    const totalRisk = base * multiplier;
    
    if (totalRisk < 30) {
      return {
        level: "Low Risk",
        color: "#16a34a",
        bg: "#dcfce7",
        border: "#bbf7d0",
        desc: "Great choice! This meal supports a stable cardiovascular score.",
        icon: "check-circle",
      };
    } else if (totalRisk < 70) {
      return {
        level: "Moderate Risk",
        color: "#d97706",
        bg: "#fef3c7",
        border: "#fde68a",
        desc: "Watch your other meals today to balance your sodium and fat intake.",
        icon: "alert-triangle",
      };
    } else {
      return {
        level: "High Risk",
        color: "#dc2626",
        bg: "#fee2e2",
        border: "#fecaca",
        desc: "Negative weight applied to CSS. Try to stick to lighter meals for the rest of the day.",
        icon: "alert-octagon",
      };
    }
  };

  const risk = calculateRisk();

  const handleSave = () => {
    if (!foodDescription.trim()) {
      Alert.alert("Missing Information", "Please enter a brief food description.");
      return;
    }

    Alert.alert(
      "Meal Saved",
      "Your qualitative meal data has been added to your Daily Diary and Weekly Wrap-Up.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2 bg-slate-50 z-10 border-b border-slate-200/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/70 items-center justify-center mr-3 shadow-sm shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text className="text-[18px] font-bold text-slate-900 tracking-tight">
            Log Local Food
          </Text>
          <Text className="text-[12px] text-slate-500 font-medium">
            Manual estimation for fresh/street food
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Real-time Risk Estimate Card */}
        <View 
          className="rounded-3xl p-5 mb-2 border"
          style={{ backgroundColor: risk.bg, borderColor: risk.border }}
        >
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name={risk.icon as any} size={18} color={risk.color} />
            <Text className="text-[14px] font-bold tracking-wide" style={{ color: risk.color }}>
              IMPACT ESTIMATE: {risk.level}
            </Text>
          </View>
          <Text className="text-[13px] leading-snug" style={{ color: risk.color, opacity: 0.9 }}>
            {risk.desc}
          </Text>
        </View>

        {/* Time of Meal */}
        <SectionHeader title="Time of Meal" icon="clock-outline" />
        <View className="flex-row flex-wrap">
          {timeOptions.map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={timeOfMeal === opt} onSelect={setTimeOfMeal} />
          ))}
        </View>

        {/* Food Description */}
        <SectionHeader title="Food Description" icon="food-apple-outline" />
        <View className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-sm shadow-slate-100">
          <TextInput
            value={foodDescription}
            onChangeText={setFoodDescription}
            placeholder="e.g. Pork Sinigang, Lechon, Mango"
            placeholderTextColor="#94a3b8"
            className="text-[15px] text-slate-900 font-medium"
          />
        </View>

        {/* Cooking Method */}
        <SectionHeader title="Cooking Method" icon="fire" />
        <View className="flex-row flex-wrap">
          {cookingOptions.map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={cookingMethod === opt} onSelect={setCookingMethod} />
          ))}
        </View>

        {/* Portion Size */}
        <SectionHeader title="Estimated Portion Size" icon="scale" />
        <View className="flex-row flex-wrap">
          {portionOptions.map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={portionSize === opt} onSelect={setPortionSize} />
          ))}
        </View>

        {/* Salty/Savory Level */}
        <SectionHeader title="Salty / Savory Level" icon="shaker-outline" />
        <View className="flex-row flex-wrap mb-4">
          {saltyOptions.map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={saltyLevel === opt} onSelect={setSaltyLevel} />
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="bg-[#1e4ed8] w-full rounded-2xl py-4 items-center shadow-md shadow-blue-600/20 mt-6"
        >
          <Text className="text-white font-bold text-[16px]">
            Save Meal
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
