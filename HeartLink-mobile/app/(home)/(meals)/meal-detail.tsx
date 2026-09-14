import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { queueMealForSync } from "../../../services/SyncService";
import { useToast } from "../../../contexts/ToastContext";
import { logMealAndGetToast } from "../../../services/MealLoggingService";
import { ChoiceChip, calcRiskFromValues } from "../../../components/meals/SharedMealComponents";

const base_url = process.env.EXPO_PUBLIC_API_URL;

type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// Removed local ChoiceChip in favor of SharedMealComponents ChoiceChip

export default function MealDetailScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  
  const currentHour = new Date().getHours();
  const defaultMealTime: TimeOfMeal =
    currentHour < 11 ? "Breakfast" : currentHour < 16 ? "Lunch" : currentHour < 21 ? "Dinner" : "Snack";

  const [servings, setServings] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [item, setItem] = useState<any>(params.item ? JSON.parse(params.item as string) : null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>(defaultMealTime);

  useEffect(() => {
    async function loadRecipe() {
      if (item) return;
      if (!id) return;
      setIsLoadingRecipe(true);
      try {
        const response = await fetch(`${base_url}/api/recipes/${id}`, {
          headers: { "Authorization": `Bearer ${token || ""}` }
        });
        if (response.ok) {
          const r = await response.json();
          setItem({
            id: r.id,
            name: r.name,
            calories: r.calories,
            sodium_mg: r.sodium_mg,
            saturated_fat_g: r.saturated_fat_g || 0,
            fiber_g: r.fiber_g || 0,
            cholesterol_mg: r.cholesterol_mg || 0,
            image_url: r.image_url,
            category: r.category,
            hss_tier: r.hss_tier || 'Stable'
          });
        }
      } catch (err) {
        console.error("Failed to load recipe detail", err);
      } finally {
        setIsLoadingRecipe(false);
      }
    }
    loadRecipe();
  }, [id, item]);

  if (isLoadingRecipe) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color={isDark ? "#38bdf8" : "#0284c7"} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <Text className="text-slate-900 dark:text-white">Item not found.</Text>
      </SafeAreaView>
    );
  }

  // Calculate scaled values
  const scaledCalories = Math.round((item.calories || 0) * servings);
  const scaledSodium = Math.round((item.sodium_mg || 0) * servings);
  const scaledSatFat = Math.round(((item.saturated_fat_g || 0) * servings) * 10) / 10;
  const scaledFiber = Math.round(((item.fiber_g || 0) * servings) * 10) / 10;
  const scaledCholesterol = Math.round((item.cholesterol_mg || 0) * servings);

  const risk = calcRiskFromValues(scaledSodium, scaledCalories, scaledSatFat);

  const handleLogMeal = async () => {
    setIsSubmitting(true);
    const payload = {
      recipe_id: item.id,
      meal_name: item.name,
      portion: servings,
      calories: scaledCalories,
      sodium_mg: scaledSodium,
      saturated_fat_g: scaledSatFat,
      fiber_g: scaledFiber,
      image_url: item.image_url,
    };
    
    await logMealAndGetToast(
      userId!,
      token,
      payload,
      showToast,
      () => {
        setIsSubmitting(false);
        router.navigate("/(home)/(tabs)/dashboard");
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-[12px] text-slate-400">
            Base serving: {item.servings ? `${item.servings} servings` : "1 serving"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-5 pb-12" showsVerticalScrollIndicator={false}>
        {/* Image and basic info */}
        <View className="items-center mb-6">
          <Image 
            source={{ uri: item.image_url || "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=200&q=80" }} 
            className="w-32 h-32 rounded-3xl mb-4 bg-slate-100 dark:bg-slate-800" 
          />
          <Text className="text-[22px] font-bold text-slate-900 dark:text-white">{item.name}</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">{item.servings ? `${item.servings} servings` : "1 serving"}</Text>
        </View>

        {/* Impact Alert Card */}
        <View
          className="rounded-2xl p-4 border mb-6"
          style={{ backgroundColor: risk.bg, borderColor: risk.border }}
        >
          <View className="flex-row items-center gap-2 mb-1.5">
            <Feather 
              name={risk.icon} 
              size={16} 
              color={risk.color} 
            />
            <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: risk.color }}>
              {risk.level}
            </Text>
          </View>
          <Text className="text-[13px] leading-relaxed" style={{ color: risk.color, opacity: 0.9 }}>
            {risk.desc}
          </Text>
        </View>

        {/* Servings Adjuster */}
        <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/70 mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-0.5">Number of Servings</Text>
            <Text className="text-[12px] text-slate-400">Scale the nutrition values</Text>
          </View>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-1.5 gap-4">
            <TouchableOpacity onPress={() => setServings(s => Math.max(0.5, s - 0.5))} className="p-2">
              <Feather name="minus" size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white w-7 text-center">{servings}</Text>
            <TouchableOpacity onPress={() => setServings(s => s + 0.5)} className="p-2">
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
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4">
          <View className="flex-row border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Sodium</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">{scaledSodium} <Text className="text-[12px] font-medium text-slate-400">mg</Text></Text>
            </View>
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Calories</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">{scaledCalories} <Text className="text-[12px] font-medium text-slate-400">kcal</Text></Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Sat. Fat</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">{scaledSatFat} <Text className="text-[12px] font-medium text-slate-400">g</Text></Text>
            </View>
          </View>
          
          <View className="flex-row pt-1">
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Cholesterol</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">{scaledCholesterol} <Text className="text-[12px] font-medium text-slate-400">mg</Text></Text>
            </View>
            <View className="flex-1 items-center border-r border-slate-100 dark:border-slate-800">
              <Text className="text-[11px] text-slate-400 font-medium mb-1 uppercase">Fiber</Text>
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">{scaledFiber} <Text className="text-[12px] font-medium text-slate-400">g</Text></Text>
            </View>
            <View className="flex-1 items-center">
              {/* Empty placeholder for clean grid */}
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Action Button */}
      <View 
        className="px-5 pt-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={handleLogMeal}
          disabled={isSubmitting}
          className="bg-slate-900 w-full rounded-2xl py-4 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={18} color="#fff" />
          <Text className="text-white text-[15px] font-bold">
            {isSubmitting ? "Logging..." : "Log this meal"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
