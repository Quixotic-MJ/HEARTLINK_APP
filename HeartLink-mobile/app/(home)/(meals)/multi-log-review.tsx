import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Image } from "expo-image";
import { useToast } from "../../../contexts/ToastContext";
import { logMultipleMealsAndGetToast } from "../../../services/MealLoggingService";
import { ChoiceChip, calcRiskFromValues } from "../../../components/meals/SharedMealComponents";
import { theme } from "../../../constants/theme";

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

export default function MultiLogReviewScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>(() => {
    if (!params.items) return [];
    try {
      const parsed = JSON.parse(params.items as string);
      return parsed.map((p: any) => ({
        ...p,
        servings: 1,
        // Make sure values exist
        calories: p.calories || 0,
        sodium_mg: p.sodium_mg || 0,
        saturated_fat_g: p.saturated_fat_g || 0,
        fiber_g: p.fiber_g || 0,
      }));
    } catch (e) {
      return [];
    }
  });

  const [expandedId, setExpandedId] = useState<string | null>(items.length > 0 ? items[0].id : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface-alt items-center justify-center">
        <Text className="text-text">No items found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-slate-900 rounded-xl">
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const updateItem = (id: string, updates: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const executeLogMeals = async () => {
    setIsSubmitting(true);
    const payloads = items.map(item => ({
      meal_name: item.name,
      portion: item.servings,
      calories: item.calories * item.servings,
      sodium_mg: item.sodium_mg * item.servings,
      saturated_fat_g: item.saturated_fat_g * item.servings,
      fiber_g: item.fiber_g * item.servings,
      image_url: item.image_url || "",
      source: item.source || "search",
    }));

    await logMultipleMealsAndGetToast(
      userId!,
      token,
      payloads,
      showToast,
      () => {
        setIsSubmitting(false);
        router.navigate("/(home)/(tabs)/dashboard");
      }
    );
  };

  const handleLogMeals = () => {
    Alert.alert(
      "Confirm Batch Log",
      `Are you sure you want to log these ${items.length} items to your diary?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log All", style: "default", onPress: executeLogMeals }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-alt" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

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
            Review Basket
          </Text>
          <Text className="text-[12px] text-text-muted">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] font-medium text-text-soft mb-4 ml-1">
          Review and adjust servings for each item before logging.
        </Text>

        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const totalSodium = item.sodium_mg * item.servings;
          const totalCalories = item.calories * item.servings;
          const totalFat = item.saturated_fat_g * item.servings;
          const risk = calcRiskFromValues(totalSodium, totalCalories, totalFat);

          return (
            <View 
              key={item.id} 
              className="bg-surface rounded-2xl border mb-3 overflow-hidden"
            >
              {/* Accordion Header */}
              <TouchableOpacity
                onPress={() => toggleAccordion(item.id)}
                className="p-4 flex-row items-center gap-3"
                activeOpacity={0.7}
              >
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: 50, height: 50, borderRadius: 10 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center flex-shrink-0"
                  >
                    <MaterialCommunityIcons name="food-apple" size={24} color={theme.successText} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-text leading-snug" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-[12px] text-text-muted mt-0.5">
                    {item.servings} serving{item.servings !== 1 ? 's' : ''} • {Math.round(totalCalories)} kcal • <Text className="text-danger-text font-medium">{Math.round(totalSodium)}mg sodium</Text>
                  </Text>
                </View>
                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSoft} />
              </TouchableOpacity>

              {/* Accordion Body */}
              {isExpanded && (
                <View className="px-4 pb-4 pt-1 border-t border-border dark:border-slate-800/50">
                  {/* Dynamic Risk warning */}
                  {risk.level !== "Heart-Friendly" && (
                    <View className="rounded-xl p-3 mb-4 border flex-row items-start gap-2">
                      <Feather name={risk.icon} size={14} color={risk.color} style={{ marginTop: 1 }} />
                      <View className="flex-1">
                        <Text className="text-[12px] font-medium mb-0.5">
                          {risk.level}
                        </Text>
                        <Text className="text-[11px] leading-relaxed">
                          {risk.desc}
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text className="text-[11px] text-text-muted uppercase tracking-wide mb-2">
                    Servings consumed
                  </Text>
                  <View className="flex-row items-center justify-between bg-surface-alt border border-border/70 rounded-xl px-3 py-2 mb-4">
                    <TouchableOpacity
                      onPress={() => updateItem(item.id, { servings: Math.max(0.5, item.servings - 0.5) })}
                      className="w-9 h-9 rounded-lg bg-surface border border-border/70 items-center justify-center"
                    >
                      <Feather name="minus" size={15} color={theme.textSoft} />
                    </TouchableOpacity>
                    <View className="items-center">
                      <TextInput
                        value={String(item.servings)}
                        onChangeText={(text) => {
                          const val = text.replace(/-/g, "");
                          updateItem(item.id, { servings: parseFloat(val) || 0 });
                        }}
                        keyboardType="numeric"
                        className="text-[20px] font-medium text-text text-center w-16 p-0"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => updateItem(item.id, { servings: item.servings + 0.5 })}
                      className="w-9 h-9 rounded-lg bg-surface border border-border/70 items-center justify-center"
                    >
                      <Feather name="plus" size={15} color={theme.textSoft} />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between items-center mb-2">
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
                      value={item.sodium_mg} 
                      unit="mg" 
                      highlight={risk.level === "High Sodium"} 
                      onChange={(val) => updateItem(item.id, { sodium_mg: val })} 
                    />
                    <NutritionTile 
                      label="Calories" 
                      value={item.calories} 
                      unit="kcal" 
                      onChange={(val) => updateItem(item.id, { calories: val })} 
                    />
                    <NutritionTile 
                      label="Sat. fat" 
                      value={item.saturated_fat_g} 
                      unit="g" 
                      onChange={(val) => updateItem(item.id, { saturated_fat_g: val })} 
                    />
                    <NutritionTile 
                      label="Fiber" 
                      value={item.fiber_g} 
                      unit="g" 
                      onChange={(val) => updateItem(item.id, { fiber_g: val })} 
                    />
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => {
                      const newItems = items.filter(i => i.id !== item.id);
                      setItems(newItems);
                      if (newItems.length === 0) router.back();
                    }}
                    className="mt-4 flex-row items-center justify-center gap-1.5 py-2"
                  >
                    <Feather name="trash-2" size={14} color={theme.danger} />
                    <Text className="text-danger-text font-medium text-[13px]">Remove item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky Action Button */}
      <View 
        className="px-5 pt-3 bg-surface border-t border-border"
      >
        <TouchableOpacity
          onPress={handleLogMeals}
          disabled={isSubmitting}
          className="bg-emerald-600 w-full rounded-2xl py-4 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="check-circle" size={18} color={theme.onPrimary} />
          <Text className="text-white text-[15px] font-bold">
            {isSubmitting ? "Logging..." : `Log All ${items.length} items to diary`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
