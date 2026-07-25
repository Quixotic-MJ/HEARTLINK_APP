import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Image } from "expo-image";

const base_url = process.env.EXPO_PUBLIC_API_URL;

type MealTime = "Breakfast" | "Lunch" | "Dinner" | "Snack";

function NutritionTile({
  label,
  value,
  unit,
  highlight,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  onChange: (val: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  return (
    <View
      className="rounded-2xl p-4 border"
      style={{
        width: "48%",
        backgroundColor: highlight ? "#fcebeb" : "#f8fafc",
        borderColor: highlight ? "#f7c1c1" : "#e2e8f0",
      }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text
          className="text-[10px] uppercase tracking-wide"
          style={{ color: highlight ? "#a32d2d" : "#94a3b8" }}
        >
          {label}
        </Text>
        <Feather name="edit-2" size={10} color={highlight ? "#a32d2d" : "#cbd5e1"} />
      </View>
      <View className="flex-row items-end gap-1">
        <TextInput
          value={localValue}
          onChangeText={(text) => {
            setLocalValue(text);
            onChange(parseFloat(text) || 0);
          }}
          keyboardType="numeric"
          className="text-[22px] font-medium p-0 m-0"
          style={{ color: highlight ? "#a32d2d" : "#0f172a", minWidth: 20 }}
          selectTextOnFocus
        />
        <Text
          className="text-[12px] mb-1"
          style={{ color: highlight ? "#f7c1c1" : "#94a3b8" }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

function MealTimeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="px-4 py-2 rounded-full border mr-2 mb-2"
      style={{
        backgroundColor: active ? "#0f172a" : "#fff",
        borderColor: active ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[12px] font-medium"
        style={{ color: active ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ScanResultScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { userId } = useUser();

  const [product, setProduct] = useState(() => 
    params.product ? JSON.parse(params.product as string) : null
  );

  const [servingsStr, setServingsStr] = useState("1");
  const [mealTime, setMealTime] = useState<MealTime>("Lunch");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <Text className="text-slate-900 dark:text-white">No product data found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-slate-900 rounded-xl">
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const servings = parseFloat(servingsStr) || 1;

  const calc = {
    sodium:      product.sodium_mg * servings,
    fat:         product.saturated_fat_g * servings,
    calories:    product.energy_kcal * servings,
    fiber:       product.fiber_g * servings,
    cholesterol: product.cholesterol_mg * servings,
  };

  const isHighSodium = calc.sodium > 500;

  const handleLogMeal = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        meal_name: product.product_name,
        portion: servings,
        calories: calc.calories,
        sodium_mg: calc.sodium,
        saturated_fat_g: calc.fat,
        fiber_g: calc.fiber,
        image_url: "",
      };
      
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to log meal");
      Alert.alert("Meal Logged", "Successfully added to your daily diary.", [
        { text: "OK", onPress: () => router.navigate("/(home)/(tabs)/dashboard") },
      ]);
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
            {product.product_name}
          </Text>
          <Text className="text-[12px] text-slate-400">
            Scan result
          </Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-10" showsVerticalScrollIndicator={false}>

        {/* Product header card */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3 flex-row items-start gap-3">
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={{ width: 72, height: 72, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="w-18 h-18 rounded-xl items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#eaf3de", width: 72, height: 72 }}
            >
              <MaterialCommunityIcons name="food-apple" size={32} color="#3b6d11" />
            </View>
          )}
          <View className="flex-1 justify-center min-h-[72px]">
            <Text className="text-[12px] text-slate-400 uppercase tracking-wide mb-1">
              {product.brands}
            </Text>
            <Text className="text-[17px] font-medium text-slate-900 dark:text-white leading-snug">
              {product.product_name}
            </Text>
            <Text className="text-[13px] text-slate-400 mt-1">
              Base serving: {product.serving_size}
            </Text>
          </View>
        </View>

        {/* High sodium warning */}
        {isHighSodium && (
          <View className="rounded-2xl p-4 mb-3 border flex-row items-start gap-3"
            style={{ backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }}>
            <Feather name="alert-triangle" size={15} color="#a32d2d" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-[13px] font-medium mb-0.5" style={{ color: "#a32d2d" }}>
                High sodium
              </Text>
              <Text className="text-[12px] leading-relaxed" style={{ color: "#791f1f" }}>
                Consider reducing portion size to keep your cardiovascular score stable.
              </Text>
            </View>
          </View>
        )}

        {/* Servings + meal time */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
          {/* Servings stepper */}
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
            Servings consumed
          </Text>
          <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-3 py-2 mb-4">
            <TouchableOpacity
              onPress={() => setServingsStr(String(Math.max(0.5, servings - 0.5)))}
              className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
            >
              <Feather name="minus" size={15} color="#475569" />
            </TouchableOpacity>
            <View className="items-center">
              <TextInput
                value={servingsStr}
                onChangeText={setServingsStr}
                keyboardType="numeric"
                className="text-[20px] font-medium text-slate-900 dark:text-white text-center w-16"
              />
            </View>
            <TouchableOpacity
              onPress={() => setServingsStr(String(servings + 0.5))}
              className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center"
            >
              <Feather name="plus" size={15} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Meal time chips */}
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
            Time of meal
          </Text>
          <View className="flex-row flex-wrap">
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealTime[]).map((t) => (
              <MealTimeChip key={t} label={t} active={mealTime === t} onPress={() => setMealTime(t)} />
            ))}
          </View>
        </View>

        {/* Nutrition grid */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Base nutrition (per serving)
            </Text>
            <Text className="text-[10px] text-slate-400">
              Tap to edit
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <NutritionTile 
              label="Sodium" 
              value={product.sodium_mg} 
              unit="mg" 
              highlight={isHighSodium} 
              onChange={(val) => setProduct((p: any) => ({ ...p, sodium_mg: val }))} 
            />
            <NutritionTile 
              label="Calories" 
              value={product.energy_kcal} 
              unit="kcal" 
              onChange={(val) => setProduct((p: any) => ({ ...p, energy_kcal: val }))} 
            />
            <NutritionTile 
              label="Sat. fat" 
              value={product.saturated_fat_g} 
              unit="g" 
              onChange={(val) => setProduct((p: any) => ({ ...p, saturated_fat_g: val }))} 
            />
            <NutritionTile 
              label="Fiber" 
              value={product.fiber_g} 
              unit="g" 
              onChange={(val) => setProduct((p: any) => ({ ...p, fiber_g: val }))} 
            />
            <NutritionTile 
              label="Cholesterol" 
              value={product.cholesterol_mg} 
              unit="mg" 
              onChange={(val) => setProduct((p: any) => ({ ...p, cholesterol_mg: val }))} 
            />
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
            {isSubmitting ? "Logging..." : "Log to daily diary"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
