import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useUser();
  
  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const response = await fetch(`${base_url}/api/recipes/${id}`);
        if (!response.ok) throw new Error("Failed to fetch recipe");
        const data = await response.json();
        setItem(data);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Could not load recipe details.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  const [servings, setServings] = useState(1);
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>("Lunch");

  if (isLoading || !item) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Calculate scaled values
  const scaledCalories = (item.calories || 0) * servings;
  const scaledSodium = (item.sodium_mg || 0) * servings;
  const scaledSatFat = (item.saturated_fat_g || 0) * servings;
  const scaledFiber = (item.fiber_g || 0) * servings;
  const scaledCholesterol = (item.cholesterol_mg || 0) * servings;

  const handleLogMeal = async () => {
    setIsSubmitting(true);
    try {
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
      
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to log meal");
      Alert.alert("Meal Logged", "Your meal has been recorded.");
      router.navigate("/(home)/(tabs)/dashboard");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not log meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          style={{ backgroundColor: item.css_tier === "Stable" ? "#eaf3de" : "#fcebeb", borderColor: (item.css_tier === "Stable" ? "#3b6d11" : "#a32d2d") + '40' }}
        >
          <View className="flex-row items-center gap-2 mb-1.5">
            <Feather 
              name={item.css_tier === "Stable" ? "check-circle" : "alert-triangle"} 
              size={16} 
              color={item.css_tier === "Stable" ? "#3b6d11" : "#a32d2d"} 
            />
            <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: item.css_tier === "Stable" ? "#3b6d11" : "#a32d2d" }}>
              {item.css_tier || "Unknown"}
            </Text>
          </View>
          <Text className="text-[13px] leading-relaxed" style={{ color: item.css_tier === "Stable" ? "#3b6d11" : "#a32d2d", opacity: 0.9 }}>
            {item.css_tier === "Stable" 
              ? "Great choice! This item is low in sodium and fits perfectly into a heart-healthy diet." 
              : "This item consumes a large portion of your daily limit. Proceed with caution."}
          </Text>
        </View>

        {/* Servings Adjuster */}
        <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/70 mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-0.5">Number of Servings</Text>
            <Text className="text-[12px] text-slate-400">Scale the nutrition values</Text>
          </View>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-1.5 gap-4">
            <TouchableOpacity onPress={() => setServings(s => Math.max(1, s - 1))} className="p-2">
              <Feather name="minus" size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white w-5 text-center">{servings}</Text>
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
