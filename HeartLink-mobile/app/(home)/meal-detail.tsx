import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MOCK_ITEMS } from "./search-meal";

// Basic specific mock nutrition values based on item
const MOCK_NUTRITION: Record<string, any> = {
  "1": { satFat: 12, fiber: 0, cholesterol: 85 }, // Jollibee
  "2": { satFat: 8, fiber: 2, cholesterol: 45 }, // Sinigang
  "3": { satFat: 1.5, fiber: 0, cholesterol: 186 }, // Egg
};

type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// Choice chip
function ChoiceChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: (val: string) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onSelect(label)}
      className="px-4 py-2 rounded-xl border mr-2 mb-2"
      style={{
        backgroundColor: selected ? "#0f172a" : "#fff",
        borderColor: selected ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[13px] font-medium"
        style={{ color: selected ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function MealDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const item = MOCK_ITEMS.find((i) => i.id === id) || MOCK_ITEMS[0];
  const nutrition = MOCK_NUTRITION[item.id] || MOCK_NUTRITION["1"];

  const [servings, setServings] = useState(1);
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>("Lunch");

  // Calculate scaled values
  const scaledCalories = item.calories * servings;
  const scaledSodium = item.sodium * servings;
  const scaledSatFat = nutrition.satFat * servings;
  const scaledFiber = nutrition.fiber * servings;
  const scaledCholesterol = nutrition.cholesterol * servings;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900 dark:bg-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[12px] text-slate-400">
            Base serving: {item.portion}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-5 pb-12" showsVerticalScrollIndicator={false}>
        {/* Image and basic info */}
        <View className="items-center mb-6">
          <Image 
            source={{ uri: item.imageUrl }} 
            className="w-32 h-32 rounded-3xl mb-4 bg-slate-100 dark:bg-slate-800" 
          />
          <Text className="text-[22px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{item.name}</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">{item.portion}</Text>
        </View>

        {/* Impact Alert Card */}
        <View
          className="rounded-2xl p-4 border mb-6"
          style={{ backgroundColor: item.tagBg, borderColor: item.tagColor + '40' }}
        >
          <View className="flex-row items-center gap-2 mb-1.5">
            <Feather 
              name={item.tag === "Low Risk" ? "check-circle" : "alert-triangle"} 
              size={16} 
              color={item.tagColor} 
            />
            <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: item.tagColor }}>
              {item.tag}
            </Text>
          </View>
          <Text className="text-[13px] leading-relaxed" style={{ color: item.tagColor, opacity: 0.9 }}>
            {item.tag === "Low Risk" 
              ? "Great choice! This item is low in sodium and fits perfectly into a heart-healthy diet." 
              : item.tag === "Moderate"
                ? "This item has a moderate amount of sodium. Balance your other meals today."
                : "This item consumes a large portion of your daily limit. Proceed with caution."}
          </Text>
        </View>

        {/* Servings Adjuster */}
        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/70 mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[14px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-0.5">Number of Servings</Text>
            <Text className="text-[12px] text-slate-400">Scale the nutrition values</Text>
          </View>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-1.5 gap-4">
            <TouchableOpacity onPress={() => setServings(s => Math.max(1, s - 1))} className="p-2">
              <Feather name="minus" size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white dark:text-slate-900 w-5 text-center">{servings}</Text>
            <TouchableOpacity onPress={() => setServings(s => s + 1)} className="p-2">
              <Feather name="plus" size={16} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time of Meal Selector */}
        <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 ml-1 mt-1">
          Time of Meal
        </Text>
        <View className="flex-row flex-wrap mb-5">
          {(["Breakfast", "Lunch", "Dinner", "Snack"] as TimeOfMeal[]).map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={timeOfMeal === opt} onSelect={setTimeOfMeal as any} />
          ))}
        </View>

        {/* Nutrition Breakdown Grid */}
        <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 ml-1 mt-1">
          Nutrition Breakdown
        </Text>
        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4">
          <View className="flex-row border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Sodium</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{scaledSodium} <Text className="text-[12px] font-medium text-slate-400">mg</Text></Text>
            </View>
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Calories</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{scaledCalories} <Text className="text-[12px] font-medium text-slate-400">kcal</Text></Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Sat. Fat</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{scaledSatFat} <Text className="text-[12px] font-medium text-slate-400">g</Text></Text>
            </View>
          </View>
          
          <View className="flex-row pt-1">
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Cholesterol</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{scaledCholesterol} <Text className="text-[12px] font-medium text-slate-400">mg</Text></Text>
            </View>
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Fiber</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white dark:text-slate-900">{scaledFiber} <Text className="text-[12px] font-medium text-slate-400">g</Text></Text>
            </View>
            <View className="flex-1 items-center">
              {/* Empty placeholder for clean grid */}
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Action Button */}
      <View 
        className="px-5 pt-3 bg-white dark:bg-slate-900 dark:bg-slate-100 border-t border-slate-200 dark:border-slate-800/50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Meal Logged", "Your meal has been recorded.");
            router.navigate("/(home)/(tabs)/dashboard");
          }}
          className="bg-slate-900 dark:bg-slate-100 w-full rounded-2xl py-4 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={18} color="#fff" />
          <Text className="text-white dark:text-slate-900 text-[15px] font-medium">
            Log This Meal
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
