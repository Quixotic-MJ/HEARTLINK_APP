import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = "estimate" | "specific";
type TimeOfMeal = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type CookingMethod = "Boiled/Steamed" | "Grilled/Baked" | "Fried/Deep-Fried";
type PortionSize = "Small" | "Medium" | "Large";
type SaltyLevel = "Low" | "Moderate" | "High/Salty";
type FiberContent = "None" | "Side Portion" | "Main Ingredient";

// ─── Choice Chip ──────────────────────────────────────────────────────────────
// Dynamic bg/border via inline style — avoids css-interop crash

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
          onChangeText={onChange}
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

function calcEstimateRisk(
  cookingMethod: CookingMethod,
  saltyLevel: SaltyLevel,
  portionSize: PortionSize
): RiskResult {
  let base = 0;
  if (cookingMethod === "Grilled/Baked") base += 15;
  if (cookingMethod === "Fried/Deep-Fried") base += 40;
  if (saltyLevel === "Moderate") base += 20;
  if (saltyLevel === "High/Salty") base += 45;
  const mult = portionSize === "Small" ? 0.8 : portionSize === "Large" ? 1.5 : 1.0;
  const total = base * mult;

  if (total < 30)
    return {
      level: "Low risk",
      color: "#3b6d11",
      bg: "#eaf3de",
      border: "#c0dd97",
      desc: "Great choice! This meal supports a stable cardiovascular score.",
      icon: "check-circle",
    };
  if (total < 70)
    return {
      level: "Moderate risk",
      color: "#854f0b",
      bg: "#faeeda",
      border: "#fac775",
      desc: "Watch your other meals today to balance your sodium and fat intake.",
      icon: "alert-triangle",
    };
  return {
    level: "High risk",
    color: "#a32d2d",
    bg: "#fcebeb",
    border: "#f7c1c1",
    desc: "Negative weight applied to CSS. Try to stick to lighter meals for the rest of the day.",
    icon: "alert-octagon",
  };
}

function calcSpecificRisk(sodium: string, calories: string, satFat: string): RiskResult {
  const na = parseFloat(sodium) || 0;
  const cal = parseFloat(calories) || 0;
  const satFatG = parseFloat(satFat) || 0;

  // Simple weighted score
  let score = 0;
  if (na > 600) score += 50;
  else if (na > 300) score += 25;
  if (cal > 600) score += 20;
  else if (cal > 300) score += 10;
  if (satFatG > 20) score += 20;
  else if (satFatG > 10) score += 10;

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

  // Mode toggle
  const [inputMode, setInputMode] = useState<InputMode>("estimate");

  // Shared
  const [timeOfMeal, setTimeOfMeal] = useState<TimeOfMeal>("Breakfast");
  const [foodDescription, setFoodDescription] = useState("");

  // Estimate mode
  const [cookingMethod, setCookingMethod] = useState<CookingMethod>("Boiled/Steamed");
  const [portionSize, setPortionSize] = useState<PortionSize>("Medium");
  const [saltyLevel, setSaltyLevel] = useState<SaltyLevel>("Low");
  const [fiberContent, setFiberContent] = useState<FiberContent>("Side Portion");

  // Specific mode
  const [servings, setServings] = useState(1);
  const [sodium, setSodium] = useState("");
  const [calories, setCalories] = useState("");
  const [satFat, setSatFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [cholesterol, setCholesterol] = useState("");

  const insets = useSafeAreaInsets();

  const risk =
    inputMode === "estimate"
      ? calcEstimateRisk(cookingMethod, saltyLevel, portionSize)
      : calcSpecificRisk(sodium, calories, satFat);

  const handleSave = () => {
    if (!foodDescription.trim()) {
      Alert.alert("Missing information", "Please enter a brief food description.");
      return;
    }
    Alert.alert(
      "Meal saved",
      "Your meal data has been added to your daily diary and weekly wrap-up.",
      [{ text: "OK", onPress: () => router.back() }]
    );
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
            Manual food logging
          </Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-5 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >

        {/* ── Mode Selector ── */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-1 flex-row mb-4">
          {/* Estimate — dynamic bg via style */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setInputMode("estimate")}
            className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{ backgroundColor: inputMode === "estimate" ? "#0f172a" : "transparent" }}
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={15}
              color={inputMode === "estimate" ? "#fff" : "#94a3b8"}
            />
            <Text
              className="text-[13px] font-medium"
              style={{ color: inputMode === "estimate" ? "#fff" : "#94a3b8" }}
            >
              Estimate
            </Text>
          </TouchableOpacity>

          {/* Specific — dynamic bg via style */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setInputMode("specific")}
            className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{ backgroundColor: inputMode === "specific" ? "#0f172a" : "transparent" }}
          >
            <Feather
              name="sliders"
              size={14}
              color={inputMode === "specific" ? "#fff" : "#94a3b8"}
            />
            <Text
              className="text-[13px] font-medium"
              style={{ color: inputMode === "specific" ? "#fff" : "#94a3b8" }}
            >
              Specific values
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode description pill */}
        <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/70 px-3.5 py-2.5 mb-2 flex-row items-start gap-2.5">
          <Feather
            name={inputMode === "estimate" ? "info" : "database"}
            size={14}
            color="#94a3b8"
            style={{ marginTop: 1 }}
          />
          <Text className="flex-1 text-[12px] text-slate-400 leading-relaxed">
            {inputMode === "estimate"
              ? "Describe your meal using cooking method, portion, and saltiness. Best for fresh, local, or street food where exact values are unknown."
              : "Enter nutrition values from a food label or nutrition database. Used for packaged or restaurant meals with known macros."}
          </Text>
        </View>

        {/* ── Risk Banner ── */}
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

        {/* ── Shared: Time of Meal ── */}
        <SectionHeader title="Time of meal" icon="clock-outline" />
        <View className="flex-row flex-wrap">
          {(["Breakfast", "Lunch", "Dinner", "Snack"] as TimeOfMeal[]).map((opt) => (
            <ChoiceChip key={opt} label={opt} selected={timeOfMeal === opt} onSelect={setTimeOfMeal} />
          ))}
        </View>

        {/* ── Shared: Food Description ── */}
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

        {/* ══ ESTIMATE MODE ══ */}
        {inputMode === "estimate" && (
          <>
            <SectionHeader title="Cooking method" icon="fire" helperText="(Affects fat tracking)" />
            <View className="flex-row flex-wrap">
              {(["Boiled/Steamed", "Grilled/Baked", "Fried/Deep-Fried"] as CookingMethod[]).map((opt) => (
                <ChoiceChip key={opt} label={opt} selected={cookingMethod === opt} onSelect={setCookingMethod} />
              ))}
            </View>

            <SectionHeader title="Vegetable / Fiber Content" icon="leaf" helperText="(Boosts your stability score)" />
            <View className="flex-row flex-wrap">
              {(["None", "Side Portion", "Main Ingredient"] as FiberContent[]).map((opt) => (
                <ChoiceChip key={opt} label={opt} selected={fiberContent === opt} onSelect={setFiberContent} />
              ))}
            </View>

            <SectionHeader title="Estimated portion size" icon="scale" />
            <View className="flex-row flex-wrap">
              {(["Small", "Medium", "Large"] as PortionSize[]).map((opt) => (
                <ChoiceChip key={opt} label={opt} selected={portionSize === opt} onSelect={setPortionSize} />
              ))}
            </View>

            <SectionHeader title="Salty / savory level" icon="shaker-outline" helperText="(Affects sodium tracking)" />
            <View className="flex-row flex-wrap">
              {(["Low", "Moderate", "High/Salty"] as SaltyLevel[]).map((opt) => (
                <ChoiceChip key={opt} label={opt} selected={saltyLevel === opt} onSelect={setSaltyLevel} />
              ))}
            </View>
          </>
        )}

        {/* ══ SPECIFIC MODE ══ */}
        {inputMode === "specific" && (
          <>
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
          </>
        )}

      </KeyboardAwareScrollView>

      {/* Save Button Container */}
      <View 
        className="px-5 pt-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={handleSave}
          className="bg-slate-900 w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text className="text-white text-[14px] font-medium">
            Save meal
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}