import React, { useState } from "react";
import { View, Text, TextInput, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { logMealAndGetToast } from "../../../services/MealLoggingService";
import { calcRiskFromValues } from "../../../components/meals/SharedMealComponents";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { AmountStepper, FoodHeader, ImpactNote, NutrientField } from "../../../components/food/FoodBits";
import { mealTimeForHour } from "../../../services/foodLogging";

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

const GUIDE = [
  {
    title: "1. Ask Google",
    body: 'Search "calories in 1 cup pork adobo" or "sodium in pancit canton". Online fitness databases usually have rough averages you can copy.',
  },
  {
    title: "2. Beware hidden sodium",
    body: "Carinderia and street foods rely heavily on sauces. Remember: just 1 tablespoon of soy sauce or patis has nearly 900mg of sodium!",
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
  const params = useLocalSearchParams<{ quick_dish?: string }>();
  const quickDish = params.quick_dish;

  const { userId, token } = useUser();
  const { showToast } = useToast();

  const preset = quickDish ? FILIPINO_QUICK_PRESETS[quickDish] : undefined;

  const [foodDescription, setFoodDescription] = useState(
    preset?.desc || (quickDish ? `${quickDish} (1 Serving)` : "")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEstimateGuide, setShowEstimateGuide] = useState(false);

  // Manual Entry fields
  const [servings, setServings] = useState(1);
  const [sodium, setSodium] = useState(preset?.sodium || "");
  const [calories, setCalories] = useState(preset?.calories || "");
  const [satFat, setSatFat] = useState(preset?.satFat || "");
  const [fiber, setFiber] = useState(preset?.fiber || "");
  const [cholesterol, setCholesterol] = useState("");

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader title="Estimate a meal" onBack={() => router.back()} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >
        {/* Why and how, in plain words */}
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface, gap: 10 }}>
          <Text style={{ fontSize: 14, lineHeight: 21, color: c.charcoal }}>
            Enter the nutrition from a food label. No label? A rough estimate is fine.
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

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>What did you eat?</Text>
          <TextInput
            value={foodDescription}
            onChangeText={setFoodDescription}
            placeholder="e.g. Pork sinigang, lechon, mango"
            placeholderTextColor={c.steel}
            accessibilityLabel="What did you eat?"
            style={{ height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 8, fontSize: 17, color: c.ink, backgroundColor: c.canvas }}
          />
        </View>

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
      </KeyboardAwareScrollView>

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label="Save meal" onPress={executeSave} loading={isSubmitting} />
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
