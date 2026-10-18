import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../../contexts/UserContext";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { FoodHeader, SourceTag } from "../../../components/food/FoodBits";
import { useSodiumBudget } from "../../../hooks/useSodiumBudget";
import { logMeals } from "../../../services/MealLoggingService";
import {
  FoodItem,
  Nutrition,
  SOURCE_RULES,
  amountLabel,
  eaten,
  formatMg,
  mealTimeForHour,
  parseAmount,
  reviewSodiumLine,
  sodiumSummary,
  stepAmount,
  toMealPayload,
} from "../../../services/foodLogging";

// HL-032: review everything picked in search, then log it in one go.
// HeartLink recipes are locked (patients change the amount); recent meals and
// packaged foods can be corrected.

type NutritionKey = keyof Nutrition;
const CELLS: { key: NutritionKey; label: string; unit: string }[] = [
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
  { key: "fiber_g", label: "Fibre", unit: "g" },
];

function parseItems(raw: unknown): FoodItem[] {
  try {
    const list = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(list) ? list.filter((f) => f && f.id && f.source && f.base) : [];
  } catch {
    return [];
  }
}

function showNumber(v: number, unit: string): string {
  return unit === "g" ? String(Math.round(v * 10) / 10) : formatMg(v);
}

function Stepper({ label, value, onLess, onMore }: { label: string; value: string; onLess: () => void; onMore: () => void }) {
  const { c } = useDs();
  const box = { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, backgroundColor: c.canvas, alignItems: "center" as const, justifyContent: "center" as const };
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <AnimatedButton onPress={onLess} accessibilityRole="button" accessibilityLabel={`Less ${label}`} style={box}>
        <Feather name="minus" size={18} color={c.ink} />
      </AnimatedButton>
      <Text style={{ minWidth: 92, textAlign: "center", fontSize: 17, fontWeight: "600", color: c.ink }} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <AnimatedButton onPress={onMore} accessibilityRole="button" accessibilityLabel={`More ${label}`} style={box}>
        <Feather name="plus" size={18} color={c.ink} />
      </AnimatedButton>
    </View>
  );
}

export default function MultiLogReviewScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { userId, token } = useUser();
  const budget = useSodiumBudget();

  const [items, setItems] = useState<FoodItem[]>(() => parseItems(params.items));
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(parseItems(params.items).map((f) => [f.id, SOURCE_RULES[f.source].start])),
  );
  // Text being typed into editable boxes, per food and nutrient.
  const [edits, setEdits] = useState<Record<string, Partial<Record<NutritionKey, string>>>>({});
  const [submitting, setSubmitting] = useState(false);

  const baseFor = (item: FoodItem): Nutrition => {
    const e = edits[item.id];
    if (!e || SOURCE_RULES[item.source].locked) return item.base;
    return {
      sodium_mg: e.sodium_mg !== undefined ? parseAmount(e.sodium_mg) : item.base.sodium_mg,
      calories: e.calories !== undefined ? parseAmount(e.calories) : item.base.calories,
      saturated_fat_g: e.saturated_fat_g !== undefined ? parseAmount(e.saturated_fat_g) : item.base.saturated_fat_g,
      fiber_g: e.fiber_g !== undefined ? parseAmount(e.fiber_g) : item.base.fiber_g,
    };
  };

  const mealSodium = items.reduce((sum, item) => sum + eaten(baseFor(item), item.source, amounts[item.id]).sodium_mg, 0);
  const summary = useMemo(() => sodiumSummary(budget.consumedMg, mealSodium, budget.limitMg), [budget.consumedMg, budget.limitMg, mealSodium]);
  const mealColour = summary.over ? c.warmText : c.line;

  const remove = (id: string) => {
    const next = items.filter((f) => f.id !== id);
    setItems(next);
    if (next.length === 0) router.back();
  };

  const logAll = async () => {
    if (!userId || items.length === 0) return;
    setSubmitting(true);
    const meal = mealTimeForHour(new Date().getHours());
    const payloads = items.map((item) => toMealPayload(item, baseFor(item), amounts[item.id], meal));
    const result = await logMeals(userId, token, payloads);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setSubmitting(false);
    router.replace({
      pathname: "/(home)/(meals)/meal-logged",
      params: {
        meal,
        earlier: String(summary.earlier),
        limit: String(summary.limit),
        offline: String(result.offlineCount),
        foods: JSON.stringify(
          items.map((item, i) => ({
            name: item.name,
            amount: amountLabel(item.source, amounts[item.id]),
            sodium: payloads[i].sodium_mg,
          })),
        ),
      },
    });
  };

  const countText = items.length === 1 ? "1 food" : `${items.length} foods`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader title="Review your meal" onBack={() => router.back()} backLabel="Back to search" />

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}>
        {/* Sodium today: what was eaten earlier, what this meal adds, against the patient's own limit */}
        <View style={{ padding: 16, borderRadius: 12, backgroundColor: summary.over ? c.peach : c.surface, gap: 10 }}>
          <View className="flex-row items-baseline justify-between" style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Sodium today</Text>
            <Text style={{ fontSize: 13, color: c.slate }}>
              {formatMg(summary.after)} of {formatMg(summary.limit)} mg
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Earlier today ${formatMg(summary.earlier)} milligrams, this meal ${formatMg(summary.meal)} milligrams, daily limit ${formatMg(summary.limit)} milligrams`}
            style={{ height: 10, borderRadius: 9999, backgroundColor: c.hairlineSoft, overflow: "hidden", flexDirection: "row" }}
          >
            <View style={{ width: `${summary.earlierShare * 100}%`, backgroundColor: c.steel }} />
            <View style={{ width: `${summary.mealShare * 100}%`, backgroundColor: mealColour }} />
          </View>
          <View className="flex-row flex-wrap" style={{ columnGap: 16, rowGap: 4 }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.steel }} />
              <Text style={{ fontSize: 13, color: c.charcoal }}>Earlier today {formatMg(summary.earlier)} mg</Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: mealColour }} />
              <Text style={{ fontSize: 13, color: c.charcoal }}>This meal {formatMg(summary.meal)} mg</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, lineHeight: 21, fontWeight: "500", color: summary.over ? c.warmText : c.ink }}>{reviewSodiumLine(summary)}</Text>
        </View>

        {items.map((item) => {
          const rule = SOURCE_RULES[item.source];
          const base = baseFor(item);
          const amount = amounts[item.id];
          const total = eaten(base, item.source, amount);
          const setAmount = (direction: 1 | -1) => setAmounts((prev) => ({ ...prev, [item.id]: stepAmount(item.source, prev[item.id], direction) }));
          return (
            <View key={item.id} style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink, lineHeight: 23 }}>
                  {item.name}
                </Text>
                <SourceTag source={item.source} />
              </View>

              <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, flexShrink: 1 }}>{rule.unit === "g" ? "Amount you ate" : "Servings you ate"}</Text>
                <Stepper label={`${item.name} amount`} value={amountLabel(item.source, amount)} onLess={() => setAmount(-1)} onMore={() => setAmount(1)} />
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.charcoal }}>{rule.per.charAt(0).toUpperCase() + rule.per.slice(1)}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {CELLS.map((cell) =>
                    rule.locked ? (
                      <View key={cell.key} style={{ flexBasis: "47%", flexGrow: 1, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: c.surface, gap: 2 }}>
                        <Text style={{ fontSize: 13, color: c.slate }}>{cell.label}</Text>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                          {showNumber(base[cell.key], cell.unit)} <Text style={{ fontSize: 13, fontWeight: "400", color: c.slate }}>{cell.unit}</Text>
                        </Text>
                      </View>
                    ) : (
                      <View key={cell.key} style={{ flexBasis: "47%", flexGrow: 1, gap: 4 }}>
                        <Text style={{ fontSize: 13, color: c.slate }}>{cell.label}</Text>
                        <View className="flex-row items-center" style={{ height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 8, backgroundColor: c.canvas }}>
                          <TextInput
                            value={edits[item.id]?.[cell.key] ?? showNumber(item.base[cell.key], cell.unit).replace(/,/g, "")}
                            onChangeText={(text) =>
                              setEdits((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [cell.key]: text.replace(/[^0-9.]/g, "") } }))
                            }
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            accessibilityLabel={`${cell.label} ${rule.per}, ${item.name}`}
                            style={{ flex: 1, fontSize: 16, fontWeight: "500", color: c.ink, paddingVertical: 0 }}
                          />
                          <Text style={{ fontSize: 13, color: c.slate }}>{cell.unit}</Text>
                        </View>
                      </View>
                    ),
                  )}
                </View>
                <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>{rule.hint}</Text>
              </View>

              <View className="flex-row items-center justify-between" style={{ gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}>
                <Text style={{ flex: 1, fontSize: 14, color: c.charcoal }}>
                  This adds {formatMg(total.sodium_mg)} mg sodium, {formatMg(total.calories)} kcal
                </Text>
                <AnimatedButton onPress={() => remove(item.id)} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} style={{ height: 44, paddingHorizontal: 4, justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>Remove</Text>
                </AnimatedButton>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label={`Log ${countText}`} onPress={logAll} loading={submitting} disabled={items.length === 0} />
      </View>
    </SafeAreaView>
  );
}
