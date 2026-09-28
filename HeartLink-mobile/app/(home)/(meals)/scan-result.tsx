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
import { queueMealForSync } from "../../../services/SyncService";
import { Image } from "expo-image";
import { useToast } from "../../../contexts/ToastContext";
import { logMealAndGetToast } from "../../../services/MealLoggingService";
import { ChoiceChip, calcRiskFromValues } from "../../../components/meals/SharedMealComponents";
import { theme } from "../../../constants/theme";

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
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text
          className="text-[10px] uppercase tracking-wide"
        >
          {label}
        </Text>
        <Feather name="edit-2" size={10} color={highlight ? "#a32d2d" : "#cbd5e1"} />
      </View>
      <View className="flex-row items-end gap-1">
        <TextInput
          value={localValue}
          onChangeText={(text) => {
            const sanitized = text.replace(/-/g, "");
            setLocalValue(sanitized);
            onChange(Math.max(0, parseFloat(sanitized) || 0));
          }}
          keyboardType="numeric"
          className="text-[22px] font-medium p-0 m-0"
          selectTextOnFocus
        />
        <Text
          className="text-[12px] mb-1"
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

// Removed local MealTimeChip in favor of SharedMealComponents ChoiceChip

export default function ScanResultScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [product, setProduct] = useState(() => 
    params.product ? JSON.parse(params.product as string) : null
  );

  const currentHour = new Date().getHours();
  const defaultMealTime: MealTime =
    currentHour < 11 ? "Breakfast" : currentHour < 16 ? "Lunch" : currentHour < 21 ? "Dinner" : "Snack";

  const [servingsStr, setServingsStr] = useState("1");
  const [mealTime, setMealTime] = useState<MealTime>(defaultMealTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-surface-alt items-center justify-center">
        <Text className="text-text">No product data found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-slate-900 rounded-xl">
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const servings = parseFloat(servingsStr) || 1;

  const calc = {
    sodium:      (product.sodium_mg || 0) * servings,
    fat:         (product.saturated_fat_g || 0) * servings,
    calories:    (product.energy_kcal || 0) * servings,
    fiber:       (product.fiber_g || 0) * servings,
    cholesterol: (product.cholesterol_mg || 0) * servings,
  };

  const risk = calcRiskFromValues(calc.sodium, calc.calories, calc.fat);

  const executeLogMeal = async () => {
    setIsSubmitting(true);
    const payload = {
      meal_name: product.product_name,
      portion: servings,
      calories: calc.calories,
      sodium_mg: calc.sodium,
      saturated_fat_g: calc.fat,
      fiber_g: calc.fiber,
      image_url: "",
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

  const handleLogMeal = () => {
    Alert.alert(
      "Confirm Log",
      "Have you reviewed the nutritional values to ensure they are accurate?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Meal", style: "default", onPress: executeLogMeal }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-alt" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-border bg-surface">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-surface border border-border/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-text" numberOfLines={1}>
            {product.product_name}
          </Text>
          <Text className="text-[12px] text-text-muted">
            {params.source === 'recent' ? 'Recent log' : params.source === 'search' ? 'Search result' : 'Scan result'}
          </Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-10" showsVerticalScrollIndicator={false}>

        {/* Product header card */}
        <View className="bg-surface rounded-2xl border border-border/70 p-4 mb-3 flex-row items-start gap-3">
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={{ width: 72, height: 72, borderRadius: 14 }}
              contentFit="cover"
            />
          ) : (
            <View
              className="w-18 h-18 rounded-xl items-center justify-center flex-shrink-0"
            >
              <MaterialCommunityIcons name="food-apple" size={32} color={theme.successText} />
            </View>
          )}
          <View className="flex-1 justify-center min-h-[72px]">
            <Text className="text-[12px] text-text-muted uppercase tracking-wide mb-1">
              {product.brands}
            </Text>
            <Text className="text-[17px] font-medium text-text leading-snug">
              {product.product_name}
            </Text>
            <Text className="text-[13px] text-text-muted mt-1">
              Base serving: {product.serving_size}
            </Text>
          </View>
        </View>

        {/* Dynamic Risk warning */}
        {risk.level !== "Heart-Friendly" && (
          <View className="rounded-2xl p-4 mb-3 border flex-row items-start gap-3">
            <Feather name={risk.icon} size={15} color={risk.color} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-[13px] font-medium mb-0.5">
                {risk.level}
              </Text>
              <Text className="text-[12px] leading-relaxed">
                {risk.desc}
              </Text>
            </View>
          </View>
        )}

        {/* Servings + meal time */}
        <View className="bg-surface rounded-2xl border border-border/70 p-4 mb-3">
          {/* Servings stepper */}
          <Text className="text-[11px] text-text-muted uppercase tracking-wide mb-2">
            Servings consumed
          </Text>
          <View className="flex-row items-center justify-between bg-surface-alt border border-border/70 rounded-xl px-3 py-2 mb-4">
            <TouchableOpacity
              onPress={() => setServingsStr(String(Math.max(0.5, servings - 0.5)))}
              className="w-9 h-9 rounded-lg bg-surface border border-border/70 items-center justify-center"
            >
              <Feather name="minus" size={15} color={theme.textSoft} />
            </TouchableOpacity>
            <View className="items-center">
              <TextInput
                value={servingsStr}
                onChangeText={(text) => setServingsStr(text.replace(/-/g, ""))}
                keyboardType="numeric"
                className="text-[20px] font-medium text-text text-center w-16"
              />
            </View>
            <TouchableOpacity
              onPress={() => setServingsStr(String(servings + 0.5))}
              className="w-9 h-9 rounded-lg bg-surface border border-border/70 items-center justify-center"
            >
              <Feather name="plus" size={15} color={theme.textSoft} />
            </TouchableOpacity>
          </View>

          {/* Meal time chips */}
          <Text className="text-[11px] text-text-muted uppercase tracking-wide mb-2">
            Time of meal
          </Text>
          <View className="flex-row flex-wrap">
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealTime[]).map((t) => (
              <ChoiceChip key={t} label={t} selected={mealTime === t} onSelect={setMealTime as any} />
            ))}
          </View>
        </View>

        {/* Crowd-sourced data disclaimer */}
        <View className="flex-row items-start gap-2 bg-surface-alt/50 rounded-xl px-3 py-2.5 mb-3">
          <Feather name="info" size={14} color={theme.textSoft} style={{ marginTop: 2 }} />
          <Text className="text-[11px] text-text-soft leading-relaxed flex-1">
            Nutritional data is crowd-sourced and may occasionally differ from the physical package. Please double-check the values below and tap to edit if needed.
          </Text>
        </View>

        {/* Nutrition grid */}
        <View className="bg-surface rounded-2xl border border-border/70 p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[11px] text-text-muted uppercase tracking-wide">
              Base nutrition (per serving)
            </Text>
            <Text className="text-[10px] text-text-muted">
              Tap to edit
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <NutritionTile 
              label="Sodium" 
              value={product.sodium_mg} 
              unit="mg" 
              highlight={risk.level === "High Sodium"} 
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
        className="px-5 pt-3 bg-surface border-t border-border"
      >
        <TouchableOpacity
          onPress={handleLogMeal}
          disabled={isSubmitting}
          className="bg-slate-900 w-full rounded-2xl py-4 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={18} color={theme.onPrimary} />
          <Text className="text-white text-[15px] font-bold">
            {isSubmitting ? "Logging..." : "Log to daily diary"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
