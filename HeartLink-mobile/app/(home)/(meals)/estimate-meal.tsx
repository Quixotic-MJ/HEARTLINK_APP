import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { queueMealForSync } from "../../../services/SyncService";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// ─── Choice Chip ──────────────────────────────────────────────────────────────

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

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon, helperText }: { title: string; icon: string; helperText?: string }) {
  return (
    <View className="mb-3 mt-5">
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons name={icon as any} size={16} color="#94a3b8" />
        <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1">
          {title}
        </Text>
      </View>
      {helperText && (
        <Text className="text-[11px] text-slate-400 font-medium mt-1 ml-6">{helperText}</Text>
      )}
    </View>
  );
}

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
      <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </Text>
      <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/70 flex-row items-center px-3 py-2.5">
        <TextInput
          value={value}
          onChangeText={(text) => {
            const sanitized = text.replace(/-/g, "");
            onChange(sanitized);
          }}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType="decimal-pad"
          className="flex-1 text-[14px] text-slate-900 dark:text-white"
        />
        <Text className="text-[12px] text-slate-400 ml-1">{unit}</Text>
      </View>
    </View>
  );
}

// ─── Risk Calculator ──────────────────────────────────────────────────────────

type RiskResult = {
  level: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  icon: "check-circle" | "alert-triangle" | "alert-octagon";
};

function calcRiskFromValues(sodium: number, calories: number, satFat: number): RiskResult {
  let score = 0;
  if (sodium > 800) score += 50;
  else if (sodium > 500) score += 25;
  else if (sodium > 300) score += 10;

  if (calories > 600) score += 20;
  else if (calories > 400) score += 10;

  if (satFat > 15) score += 20;
  else if (satFat > 10) score += 10;

  if (score < 25)
    return {
      level: "Low risk",
      color: "#3b6d11",
      bg: "#eaf3de",
      border: "#c0dd97",
      desc: "This meal is well within a heart-healthy range.",
      icon: "check-circle",
    };
  if (score < 55)
    return {
      level: "Moderate risk",
      color: "#854f0b",
      bg: "#faeeda",
      border: "#fac775",
      desc: "Keep an eye on your remaining sodium budget for today.",
      icon: "alert-triangle",
    };
  return {
    level: "High risk",
    color: "#a32d2d",
    bg: "#fcebeb",
    border: "#f7c1c1",
    desc: "This meal carries a notable sodium or calorie load. Consider a lighter next meal.",
    icon: "alert-octagon",
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualMealLogScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  // Shared
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>("Breakfast");
  const [foodDescription, setFoodDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Entry fields
  const [servings, setServings] = useState(1);
  const [sodium, setSodium] = useState("");
  const [calories, setCalories] = useState("");
  const [satFat, setSatFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [cholesterol, setCholesterol] = useState("");

  const insets = useSafeAreaInsets();

  // Risk calculated from actual entered values
  const risk = calcRiskFromValues(
    (parseFloat(sodium) || 0) * servings,
    (parseFloat(calories) || 0) * servings,
    (parseFloat(satFat) || 0) * servings
  );

  const handleSave = async () => {
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

    try {
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to log meal");

      showToast({ title: "Meal saved", message: "Your meal data has been added to your daily diary.", type: "success" });
      router.back();
    } catch (error) {
      console.log("Network error logging meal, queueing offline...", error);
      await queueMealForSync(userId!, payload);
      
      showToast({ 
        title: "Saved offline", 
        message: "Your meal was saved locally and will sync when you reconnect.", 
        type: "info",
        duration: 4000 
      });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View>
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white">
            Log local food
          </Text>
          <Text className="text-[12px] text-slate-400">
            Manual nutrition entry
          </Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-5 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >

        {/* Mode description pill */}
        <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/70 px-3.5 py-2.5 mb-2 flex-row items-start gap-2.5">
          <Feather
            name="database"
            size={14}
            color="#94a3b8"
            style={{ marginTop: 1 }}
          />
          <Text className="flex-1 text-[12px] text-slate-400 leading-relaxed">
            Enter nutrition values from a food label, nutrition database, or packaging. Used for packaged, restaurant, or local meals with known macros.
          </Text>
        </View>

        {/* ── Risk Banner ── */}
        {((parseFloat(sodium) || 0) > 0 || (parseFloat(calories) || 0) > 0) && (
          <View
            className="rounded-2xl p-4 border mt-2"
            style={{ backgroundColor: risk.bg, borderColor: risk.border }}
          >
            <View className="flex-row items-center gap-2 mb-1.5">
              <Feather name={risk.icon} size={15} color={risk.color} />
              <Text className="text-[12px] font-medium uppercase tracking-wide" style={{ color: risk.color }}>
                Impact estimate · {risk.level}
              </Text>
            </View>
            <Text className="text-[13px] leading-relaxed" style={{ color: risk.color, opacity: 0.85 }}>
              {risk.desc}
            </Text>
          </View>
        )}

        {/* ── Time of Meal ── */}
        <SectionHeader title="Time of meal" icon="clock-outline" />
        <View className="flex-row flex-wrap">
          {(["Breakfast", "Lunch", "Dinner", "Snack"] as TimeOfMeal[]).map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={timeOfMeal === opt} onSelect={setTimeOfMeal} />
          ))}
        </View>

        {/* ── Food Description ── */}
        <SectionHeader title="Food description" icon="food-apple-outline" />
        <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/70 px-3.5 py-2.5">
          <TextInput
            value={foodDescription}
            onChangeText={setFoodDescription}
            placeholder="e.g. Pork sinigang, lechon, mango"
            placeholderTextColor="#cbd5e1"
            className="text-[14px] text-slate-900 dark:text-white"
          />
        </View>

        {/* ── Nutrition Values ── */}
        <SectionHeader title="Nutrition values" icon="nutrition" />

        {/* NUMBER OF SERVINGS stepper */}
        <View className="flex-row items-center justify-between mb-4 mt-2">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Number of servings</Text>
          <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-1.5 gap-4">
            <TouchableOpacity onPress={() => setServings(s => Math.max(1, s - 1))} className="p-1">
              <Feather name="minus" size={16} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[14px] font-medium text-slate-900 dark:text-white w-4 text-center">{servings}</Text>
            <TouchableOpacity onPress={() => setServings(s => s + 1)} className="p-1">
              <Feather name="plus" size={16} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 1: Sodium + Calories */}
        <View className="flex-row gap-3 mb-3">
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
        <View className="flex-row gap-3 mb-3">
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
        <View className="flex-row items-start gap-2 mt-1 mb-1">
          <Feather name="info" size={12} color="#cbd5e1" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11px] text-slate-300 leading-relaxed">
            Values are per serving. Check the food label or use a nutrition database for accurate figures.
          </Text>
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
    </SafeAreaView>
  );
}