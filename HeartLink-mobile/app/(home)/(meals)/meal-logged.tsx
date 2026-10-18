import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { formatMg, loggedSodiumLine, sodiumSummary } from "../../../services/foodLogging";

// HL-032: the end of the food flow. Says what was logged and where the patient
// stands on sodium for today, in place of the old quick toast.

type LoggedFood = { name: string; amount: string; sodium: number };

function parseFoods(raw: unknown): LoggedFood[] {
  try {
    const list = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default function MealLoggedScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams();

  const foods = parseFoods(params.foods);
  const meal = String(params.meal || "Meal");
  const offline = Number(params.offline) || 0;
  const mealSodium = foods.reduce((sum, f) => sum + (Number(f.sodium) || 0), 0);
  const summary = sodiumSummary(Number(params.earlier) || 0, mealSodium, Number(params.limit) || undefined);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24, gap: 24 }}>
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.mint, alignItems: "center", justifyContent: "center" }}>
          <Feather name="check" size={28} color={c.ink} />
        </View>

        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "600", color: c.ink, lineHeight: 35 }}>
            {meal} logged
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 25, color: c.charcoal }}>{loggedSodiumLine(summary)}</Text>
          {offline > 0 ? (
            <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
              {offline >= foods.length
                ? "You're offline, so this meal is saved on your phone. It will upload when you're back online."
                : `${offline} of ${foods.length} foods are saved on your phone and will upload when you're back online.`}
            </Text>
          ) : null}
        </View>

        <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, paddingHorizontal: 16 }}>
          {foods.map((food, i) => (
            <View
              key={`${food.name}-${i}`}
              className="flex-row items-center justify-between"
              style={{ minHeight: 56, gap: 12, borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}
            >
              <View style={{ flex: 1, gap: 2, paddingVertical: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{food.name}</Text>
                <Text style={{ fontSize: 13, color: c.slate }}>{food.amount}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{formatMg(food.sodium)} mg</Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between" style={{ minHeight: 52 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Sodium in this meal</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{formatMg(mealSodium)} mg</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pt-3 pb-5" style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label="Back to food diary" onPress={() => router.dismissTo("/(home)/(meals)/food-diary")} />
        <DsButton label="Add more food" variant="secondary" block onPress={() => router.replace("/(home)/(meals)/search-meal")} />
      </View>
    </SafeAreaView>
  );
}
