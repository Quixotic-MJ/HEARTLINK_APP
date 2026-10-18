import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { logMealAndGetToast } from "../../../services/MealLoggingService";
import { calcRiskFromValues } from "../../../components/meals/SharedMealComponents";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { AmountStepper, FoodHeader, ImpactNote, NutrientField, SourceTag } from "../../../components/food/FoodBits";
import { parseAmount } from "../../../services/foodLogging";

type ScannedProduct = {
  product_name: string;
  brands?: string;
  serving_size?: string;
  sodium_mg?: number;
  saturated_fat_g?: number;
  energy_kcal?: number;
  fiber_g?: number;
  cholesterol_mg?: number;
  image_url?: string;
};

type Field = "sodium_mg" | "energy_kcal" | "saturated_fat_g" | "fiber_g" | "cholesterol_mg";
const FIELDS: { key: Field; label: string; unit: string }[] = [
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "energy_kcal", label: "Calories", unit: "kcal" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
  { key: "fiber_g", label: "Fibre", unit: "g" },
  { key: "cholesterol_mg", label: "Cholesterol", unit: "mg" },
];

function parseProduct(raw: unknown): ScannedProduct | null {
  try {
    return raw ? JSON.parse(String(raw)) : null;
  } catch {
    return null;
  }
}

/** Shows numbers the way a label does: whole mg/kcal, one decimal for grams. */
function startText(value: number | undefined, unit: string): string {
  const v = Number(value) || 0;
  return unit === "g" ? String(Math.round(v * 10) / 10) : String(Math.round(v));
}

export default function ScanResultScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [product] = useState<ScannedProduct | null>(() => parseProduct(params.product));
  // Typed values per field; crowd-sourced, so the patient can correct them.
  const [values, setValues] = useState<Record<Field, string>>(() => {
    const p = parseProduct(params.product);
    return Object.fromEntries(FIELDS.map((f) => [f.key, startText(p?.[f.key], f.unit)])) as Record<Field, string>;
  });
  const [servings, setServings] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas, justifyContent: "center", paddingHorizontal: 24, gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>{"We couldn't read that product."}</Text>
        <DsButton label="Go back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const n = (key: Field) => parseAmount(values[key]);
  const calc = {
    sodium: n("sodium_mg") * servings,
    fat: n("saturated_fat_g") * servings,
    calories: n("energy_kcal") * servings,
    fiber: n("fiber_g") * servings,
  };
  const risk = calcRiskFromValues(calc.sodium, calc.calories, calc.fat);
  const per = product.serving_size && product.serving_size !== "1 serving" ? `Per ${product.serving_size}` : "Per serving";

  const executeLogMeal = async () => {
    setConfirming(false);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader title="Check the product" onBack={() => router.back()} />

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 }}>
        {/* Product */}
        <View className="flex-row" style={{ gap: 14, padding: 14, borderWidth: 1, borderColor: c.hairline, borderRadius: 12 }}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={{ width: 72, height: 72, borderRadius: 8 }} contentFit="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: c.peach, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="barcode" size={30} color={c.charcoal} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
            {product.brands ? <Text style={{ fontSize: 13, color: c.slate }}>{product.brands}</Text> : null}
            <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink, lineHeight: 23 }}>
              {product.product_name}
            </Text>
            <SourceTag source="packaged" />
          </View>
        </View>

        <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, flexShrink: 1 }}>How much you ate</Text>
          <AmountStepper
            label="amount"
            value={`${servings} × ${product.serving_size || "serving"}`}
            onLess={() => setServings((s) => Math.max(0.5, s - 0.5))}
            onMore={() => setServings((s) => Math.min(20, s + 0.5))}
          />
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{per}</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>
              Barcode data is shared online and can be wrong. Check these against the package label and fix any that differ.
            </Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {FIELDS.map((f) => (
              <NutrientField
                key={f.key}
                label={f.label}
                unit={f.unit}
                value={values[f.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
            <View style={{ flexBasis: "47%", flexGrow: 1 }} />
          </View>
        </View>

        <ImpactNote risk={risk} />
      </ScrollView>

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label="Log to diary" onPress={() => setConfirming(true)} loading={isSubmitting} />
      </View>

      <ConfirmDialog
        visible={confirming}
        variant="info"
        icon="check-circle"
        title="Numbers checked?"
        message="Have you checked these values against the package label?"
        cancelLabel="Not yet"
        confirmLabel="Log it"
        onCancel={() => setConfirming(false)}
        onConfirm={executeLogMeal}
      />
    </SafeAreaView>
  );
}
