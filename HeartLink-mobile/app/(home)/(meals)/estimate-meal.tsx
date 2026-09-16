import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { queueMealForSync } from "../../../services/SyncService";
import { useToast } from "../../../contexts/ToastContext";
import { useLogMeal } from "../../../hooks/useLogMeal";
import { ChoiceChip, SectionHeader, calcRiskFromValues } from "../../../components/meals/SharedMealComponents";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Filipino Staple Presets ──────────────────────────────────────────────────

const FILIPINO_QUICK_PRESETS: Record<
  string,
  { desc: string; sodium: string; calories: string; satFat: string; fiber: string }
> = {
  Sinigang: {
    desc: "Sinigang (1 Bowl)",
    sodium: "480",
    calories: "220",
    satFat: "4.0",
    fiber: "3.5",
  },
  Tinola: {
    desc: "Chicken Tinola (1 Bowl)",
    sodium: "390",
    calories: "190",
    satFat: "2.5",
    fiber: "2.0",
  },
  Rice: {
    desc: "Steamed White Rice (1 Cup)",
    sodium: "5",
    calories: "206",
    satFat: "0.1",
    fiber: "0.6",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// Removed ChoiceChip and SectionHeader since they are now in SharedMealComponents

// ─── Numeric Input Field ──────────────────────────────────────────────────────

function NumericField({
  label,
  value,
  unit,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
        {label}
      </Text>
      <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex-row items-center px-4 py-3">
        <TextInput
          value={value}
          onChangeText={(text) => {
            const sanitized = text.replace(/[^0-9.]/g, "");
            onChange(sanitized);
          }}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          className="flex-1 text-[15px] font-medium text-slate-900 dark:text-white"
        />
        <Text className="text-[13px] font-bold text-slate-400 ml-1">{unit}</Text>
      </View>
    </View>
  );
}

// Removed calcRiskFromValues since it is now in SharedMealComponents

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualMealLogScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams<{ quick_dish?: string }>();
  const quickDish = params.quick_dish;

  const { userId, token } = useUser();
  const { showToast } = useToast();

  // Contextual time of meal based on current hour
  const currentHour = new Date().getHours();
  const defaultMealTime: TimeOfMeal =
    currentHour < 11 ? "Breakfast" : currentHour < 16 ? "Lunch" : currentHour < 21 ? "Dinner" : "Snack";

  const preset = quickDish ? FILIPINO_QUICK_PRESETS[quickDish] : undefined;

  // Shared
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>(defaultMealTime);
  const [foodDescription, setFoodDescription] = useState(
    preset?.desc || (quickDish ? `${quickDish} (1 Serving)` : "")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Manual Entry fields
  const [servings, setServings] = useState(1);
  const [sodium, setSodium] = useState(preset?.sodium || "");
  const [calories, setCalories] = useState(preset?.calories || "");
  const [satFat, setSatFat] = useState(preset?.satFat || "");
  const [fiber, setFiber] = useState(preset?.fiber || "");
  const [cholesterol, setCholesterol] = useState("");

  const insets = useSafeAreaInsets();

  // Risk calculated from actual entered values
  const risk = calcRiskFromValues(
    (parseFloat(sodium) || 0) * servings,
    (parseFloat(calories) || 0) * servings,
    (parseFloat(satFat) || 0) * servings
  );

  const { mutate: logMeal } = useLogMeal(userId, token);

  const handleSave = () => {
    if (!userId) {
      showToast({ title: "Authentication required", message: "Please sign in to log meals.", type: "error" });
      return;
    }

    if (!foodDescription.trim()) {
      showToast({ title: "Missing information", message: "Please enter a brief food description.", type: "error" });
      return;
    }

    const totalSodium = Math.round((parseFloat(sodium) || 0) * servings);
    const totalCalories = Math.round((parseFloat(calories) || 0) * servings);

    if (totalSodium === 0 && totalCalories === 0) {
      showToast({ title: "Missing nutrition data", message: "Please enter at least sodium or calorie values.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        meal_name: foodDescription.trim(),
        portion: servings,
        calories: totalCalories,
        sodium_mg: totalSodium,
        saturated_fat_g: parseFloat(((parseFloat(satFat) || 0) * servings).toFixed(1)),
        fiber_g: parseFloat(((parseFloat(fiber) || 0) * servings).toFixed(1)),
        source: "manual_entry",
        image_url: null,
      };

      logMeal(payload);
      // Show success modal on the next tick
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccessDialog(true);
      }, 50);
    } catch (e) {
      console.error("Failed to enqueue meal:", e);
      setIsSubmitting(false);
      showToast({ title: "Error", message: "Failed to queue meal", type: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header Bar ── */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-200/50 dark:bg-slate-800 items-center justify-center z-10"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[22px] font-bold text-slate-900 dark:text-white absolute left-0 right-0 text-center pointer-events-none">
          Log Food
        </Text>
        <View className="w-9" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-5 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >

        {/* Mode description pill */}
        <View className="bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl px-4 py-3.5 mb-6 flex-row items-start gap-3">
          <Feather
            name="database"
            size={16}
            color={isDark ? "#94a3b8" : "#64748b"}
            style={{ marginTop: 2 }}
          />
          <Text className="flex-1 text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Enter nutrition values from a food label, nutrition database, or packaging. Used for packaged or restaurant meals.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
          {/* ── Risk Banner ── */}
          {((parseFloat(sodium) || 0) > 0 || (parseFloat(calories) || 0) > 0) && (
            <View
              className="rounded-2xl p-4 border mb-4"
              style={{ backgroundColor: risk.bg, borderColor: risk.border }}
            >
              <View className="flex-row items-center gap-2 mb-1.5">
                <Feather name={risk.icon} size={15} color={risk.color} />
                <Text className="text-[12px] font-bold uppercase tracking-wide" style={{ color: risk.color }}>
                  Impact estimate · {risk.level}
                </Text>
              </View>
              <Text className="text-[13px] font-medium leading-relaxed" style={{ color: risk.color, opacity: 0.9 }}>
                {risk.desc}
              </Text>
            </View>
          )}

          {/* ── Time of Meal ── */}
          <SectionHeader title="Time of meal" icon="clock-outline" />
          <View className="flex-row flex-wrap mb-2">
            {(["Breakfast", "Lunch", "Dinner", "Snack"] as TimeOfMeal[]).map((opt) => (
              <ChoiceChip key={opt} label={opt} selected={timeOfMeal === opt} onSelect={setTimeOfMeal} />
            ))}
          </View>

          {/* ── Food Description ── */}
          <SectionHeader title="Food description" icon="food-apple-outline" />
          <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 px-4 py-3.5">
            <TextInput
              value={foodDescription}
              onChangeText={setFoodDescription}
              placeholder="e.g. Pork sinigang, lechon, mango"
              placeholderTextColor="#94a3b8"
              className="text-[15px] font-medium text-slate-900 dark:text-white"
            />
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
          {/* ── Nutrition Values ── */}
          <SectionHeader title="Nutrition values" icon="nutrition" />

          {/* NUMBER OF SERVINGS stepper */}
          <View className="flex-row items-center justify-between mb-5 mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/50">
            <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-2">Number of servings</Text>
            <View className="flex-row items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1.5 gap-4 shadow-sm">
              <TouchableOpacity onPress={() => setServings(s => Math.max(0.5, s - 0.5))} className="p-1">
                <Feather name="minus" size={16} color={isDark ? "#f8fafc" : "#0f172a"} />
              </TouchableOpacity>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white w-8 text-center">{servings}</Text>
              <TouchableOpacity onPress={() => setServings(s => Math.min(20, s + 0.5))} className="p-1">
                <Feather name="plus" size={16} color={isDark ? "#f8fafc" : "#0f172a"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 1: Sodium + Calories */}
          <View className="flex-row gap-3 mb-4">
            <NumericField
              label="Sodium"
              value={sodium}
              unit="mg"
              onChange={setSodium}
              placeholder="0"
            />
            <NumericField
              label="Calories"
              value={calories}
              unit="kcal"
              onChange={setCalories}
              placeholder="0"
            />
          </View>

          {/* Row 2: Sat. Fat + Fiber */}
          <View className="flex-row gap-3 mb-4">
            <NumericField
              label="Sat. Fat"
              value={satFat}
              unit="g"
              onChange={setSatFat}
              placeholder="0"
            />
            <NumericField
              label="Fiber"
              value={fiber}
              unit="g"
              onChange={setFiber}
              placeholder="0"
            />
          </View>

          {/* Row 3: Cholesterol */}
          <View className="flex-row gap-3 mb-2">
            <NumericField
              label="Cholesterol"
              value={cholesterol}
              unit="mg"
              onChange={setCholesterol}
              placeholder="0"
            />
            <View className="flex-1" />
          </View>

          {/* Helper note */}
          <View className="flex-row items-start gap-2 mt-3 mb-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Feather name="info" size={14} color={isDark ? "#64748b" : "#94a3b8"} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Values are per serving. Check the food label or use a nutrition database for accurate figures.
            </Text>
          </View>
        </View>

      </KeyboardAwareScrollView>

      {/* Save Button Container */}
      <View 
        className="px-5 pt-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className="bg-slate-900 w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="check" size={16} color="#fff" />
          )}
          <Text className="text-white text-[14px] font-medium">
            {isSubmitting ? "Saving..." : "Save meal"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showSuccessDialog} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full items-center">
            <View className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-4">
              <Feather name="check-circle" size={32} color="#16a34a" />
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
              Meal Logged Successfully!
            </Text>
            <Text className="text-center text-slate-500 dark:text-slate-400 mb-6">
              Great job keeping track of your nutrition. Every step counts toward a healthier heart!
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowSuccessDialog(false);
                router.back();
              }}
              className="bg-green-600 w-full py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-[15px]">Awesome</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}