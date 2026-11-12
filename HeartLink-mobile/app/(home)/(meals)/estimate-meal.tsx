import React, { useState } from "react";
import { View, Text, TextInput, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { logMealAndGetToast } from "../../../services/MealLoggingService";
import { calcRiskFromValues } from "../../../components/meals/SharedMealComponents";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { AmountStepper, FoodHeader, ImpactNote, NutrientField } from "../../../components/food/FoodBits";
import { mealTimeForHour } from "../../../services/foodLogging";
import { EstimateHelper } from "../../../components/meals/EstimateHelper";
import { EstimateSelection, describe, estimateTotals } from "../../../services/mealEstimate";
import { InfoNote } from "../../../components/onboarding/QuestionLayout";
import { useChangePlanMeal } from "../../../hooks/useMealPlan";
import { MealName, mealTitle } from "../../../services/mealPlan";

// HL-157: the old quick presets (sinigang, tinola, rice) had no recorded source; "Help me estimate" replaces them with
// cited USDA values (constants/estimateFoods.ts). FNRI values replace those when FNRI's servers are back.
// HL-159: opened from the meal plan (plan_date and plan_meal), it's "My own meal": the estimate goes into the plan as the
// patient's own estimate and nothing is logged.

const GUIDE = [
  {
    title: "1. Use \"Help me estimate\"",
    body: "Pick the closest dish and how much you ate, then add the sauces, salt or processed meats you used. HeartLink adds them up. A food label is more exact when you have one.",
  },
  {
    title: "2. Beware hidden sodium",
    body: "Carinderia and street foods rely heavily on sauces. 1 tablespoon of soy sauce can have about 900 mg of sodium, and patis can have more.",
  },
  {
    title: "3. Rough is better than blank",
    body: "Don't skip logging a meal just because you don't know the exact numbers. A rough guess keeps you accountable and makes your daily charts useful.",
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualMealLogScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();

  const { userId, token } = useUser();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ plan_date?: string; plan_meal?: string }>();
  const planMeal = (["Breakfast", "Lunch", "Dinner"] as const).find((m) => m === params.plan_meal) as MealName | undefined;
  const planMode = !!params.plan_date && !!planMeal;
  const planTitle = planMode && planMeal ? mealTitle(params.plan_date!, planMeal) : "";
  const changePlan = useChangePlanMeal();

  const [foodDescription, setFoodDescription] = useState("");
  // HL-157: "Help me estimate" (the default) or "Use a food label" (exact numbers, as before)
  const [mode, setMode] = useState<"helper" | "label">("helper");
  const [selection, setSelection] = useState<EstimateSelection>({ dishId: null, portionIndex: 0, extras: {} });
  const [nameEdited, setNameEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEstimateGuide, setShowEstimateGuide] = useState(false);

  // Manual Entry fields
  const [servings, setServings] = useState(1);
  const [sodium, setSodium] = useState("");
  const [calories, setCalories] = useState("");
  const [satFat, setSatFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [cholesterol, setCholesterol] = useState("");

  // The helper's choices fill the same fields the label mode uses, for the whole meal (1 serving)
  const totals = estimateTotals(selection);
  const pickEstimate = (next: EstimateSelection) => {
    setSelection(next);
    const t = estimateTotals(next);
    setServings(1);
    setSodium(t.sodium ? String(t.sodium) : "");
    setCalories(t.calories ? String(t.calories) : "");
    setSatFat(t.satFat ? String(t.satFat) : "");
    setFiber(t.fiber ? String(t.fiber) : "");
    setCholesterol(t.cholesterol ? String(t.cholesterol) : "");
    if (!nameEdited) setFoodDescription(describe(next));
  };

  // Risk calculated from actual entered values
  const risk = calcRiskFromValues(
    (parseFloat(sodium) || 0) * servings,
    (parseFloat(calories) || 0) * servings,
    (parseFloat(satFat) || 0) * servings
  );
  const hasNumbers = (parseFloat(sodium) || 0) > 0 || (parseFloat(calories) || 0) > 0;

  const executeSave = async () => {
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

    setIsSubmitting(true);

    if (planMode && planMeal && params.plan_date) {
      // "My own meal" for the plan: saved as the patient's estimate, not logged
      const name = foodDescription.trim().slice(0, 80);
      changePlan.mutate(
        { date: params.plan_date, meal: planMeal, own: { name, sodium_mg: totalSodium, calories: totalCalories || null } },
        {
          onSuccess: () => {
            setIsSubmitting(false);
            showToast({ title: "Plan updated", message: `${name} for ${planTitle}, as your estimate`, type: "success" });
            router.dismissTo("/(home)/(meals)/meal-plan");
          },
          onError: (e) => {
            setIsSubmitting(false);
            showToast({ title: "Couldn't change the meal", message: e.message, type: "error" });
          },
        }
      );
      return;
    }

    const payload = {
      meal_name: foodDescription.trim(),
      portion: servings,
      calories: totalCalories,
      sodium_mg: totalSodium,
      saturated_fat_g: parseFloat(((parseFloat(satFat) || 0) * servings).toFixed(1)),
      fiber_g: parseFloat(((parseFloat(fiber) || 0) * servings).toFixed(1)),
      cholesterol_mg: Math.round((parseFloat(cholesterol) || 0) * servings),
      source: "manual_entry",
      image_url: null,
      // The Food Diary files meals by the time they're logged (see services/foodLogging.ts).
      time_of_meal: mealTimeForHour(new Date().getHours()),
    };

    await logMealAndGetToast(
      userId,
      token,
      payload,
      showToast,
      () => {
        setIsSubmitting(false);
        router.back();
      }
    );
  };

  // In "Help me estimate" the name comes after the choices that fill it in; with a food label it comes first
  const nameLabel = mode === "helper" ? "Meal name" : "What did you eat?";
  const nameField = (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{nameLabel}</Text>
      {mode === "helper" ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>Filled in from your choices. Change it if you like.</Text>
      ) : null}
      <TextInput
        value={foodDescription}
        onChangeText={(t) => {
          setFoodDescription(t);
          setNameEdited(true);
        }}
        placeholder="e.g. Pork sinigang, lechon, mango"
        placeholderTextColor={c.steel}
        accessibilityLabel={nameLabel}
        style={{ height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 8, fontSize: 17, color: c.ink, backgroundColor: c.canvas }}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader title={planMode ? "My own meal" : "Estimate a meal"} onBack={() => router.back()} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >
        {planMode ? (
          <InfoNote icon="calendar" text={`For ${planTitle} in your meal plan, as your own estimate. It isn't logged: log the meal when you eat it.`} />
        ) : null}

        {/* HL-157: help me estimate, or exact numbers from a food label */}
        <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 10, backgroundColor: c.surface }}>
          {([
            ["helper", "Help me estimate"],
            ["label", "Use a food label"],
          ] as const).map(([key, label]) => {
            const on = mode === key;
            return (
              <AnimatedButton
                key={key}
                onPress={() => {
                  setMode(key);
                  // Back to the helper: its choices set the numbers again, so the summary and the saved meal match
                  if (key === "helper" && (selection.dishId || Object.values(selection.extras).some(Boolean))) pickEstimate(selection);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                style={{ flex: 1, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: on ? 1 : 0, borderColor: c.hairline, backgroundColor: on ? c.canvas : "transparent" }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: on ? "600" : "400", color: on ? c.ink : c.slate }}>{label}</Text>
              </AnimatedButton>
            );
          })}
        </View>

        {/* Why and how, in plain words */}
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface, gap: 10 }}>
          <Text style={{ fontSize: 14, lineHeight: 21, color: c.charcoal }}>
            {mode === "helper"
              ? "No label? Pick the closest dish and add what was salty. A rough estimate is better than nothing."
              : "Enter the nutrition from a food label, per serving."}
          </Text>
          <AnimatedButton
            onPress={() => setShowEstimateGuide(true)}
            accessibilityRole="button"
            accessibilityLabel="How to estimate carinderia or home-cooked food"
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}
          >
            <Feather name="help-circle" size={16} color={c.link} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>How to estimate carinderia or home-cooked food</Text>
          </AnimatedButton>
        </View>

        {mode === "label" ? nameField : null}

        {mode === "helper" ? (
          <>
            <EstimateHelper selection={selection} totals={totals} onChange={pickEstimate} />
            {nameField}
            <DsButton label="Change the numbers" variant="quiet" onPress={() => setMode("label")} />
          </>
        ) : (
        <>
        <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, flexShrink: 1 }}>Servings you ate</Text>
          <AmountStepper
            label="servings"
            value={`${servings} ${servings === 1 ? "serving" : "servings"}`}
            onLess={() => setServings((s) => Math.max(0.5, s - 0.5))}
            onMore={() => setServings((s) => Math.min(20, s + 0.5))}
          />
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>Nutrition per serving</Text>
            <Text style={{ fontSize: 13, color: c.slate, lineHeight: 19 }}>Check the food label or a nutrition website for the numbers.</Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            <NutrientField label="Sodium" value={sodium} unit="mg" onChange={setSodium} />
            <NutrientField label="Calories" value={calories} unit="kcal" onChange={setCalories} />
            <NutrientField label="Saturated fat" value={satFat} unit="g" onChange={setSatFat} />
            <NutrientField label="Fibre" value={fiber} unit="g" onChange={setFiber} />
            <NutrientField label="Cholesterol" value={cholesterol} unit="mg" onChange={setCholesterol} />
            <View style={{ flexBasis: "47%", flexGrow: 1 }} />
          </View>
        </View>

        {hasNumbers ? <ImpactNote risk={risk} /> : null}
        </>
        )}
      </KeyboardAwareScrollView>

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label={planMode ? `Use for ${planTitle}` : "Save meal"} onPress={executeSave} loading={isSubmitting} />
      </View>

      {/* Estimation Guide */}
      <Modal visible={showEstimateGuide} transparent animationType="fade" onRequestClose={() => setShowEstimateGuide(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,15,15,0.5)", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: c.canvas, borderRadius: 12, padding: 20, gap: 16, maxHeight: "80%" }}>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.sky, alignItems: "center", justifyContent: "center" }}>
                <Feather name="help-circle" size={20} color={c.onTint} />
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink, flex: 1 }}>How to estimate</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {GUIDE.map((g) => (
                <View key={g.title} style={{ gap: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{g.title}</Text>
                  <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>{g.body}</Text>
                </View>
              ))}
            </ScrollView>
            <DsButton label="Got it" onPress={() => setShowEstimateGuide(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
