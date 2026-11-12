import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../onboarding/useDs";
import { IconBadge } from "../onboarding/QuestionLayout";
import AnimatedButton from "../ui/AnimatedButton";
import { useIsPremium } from "../../hooks/usePremium";

// HL-155: the way into the week's meal plan from the Recipes tab. Premium: a free patient sees a lock, and the card
// opens the Premium screen.
export function MealPlanCard() {
  const { c } = useDs();
  const router = useRouter();
  const premium = useIsPremium();
  return (
    <AnimatedButton
      onPress={() => router.push(premium ? "/(home)/(meals)/meal-plan" : "/(home)/(settings)/premium")}
      accessibilityRole="button"
      accessibilityLabel={premium ? "Your week's meals. Open the plan" : "Your week's meals, Premium"}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.hairline,
        backgroundColor: c.canvas,
        marginBottom: 16,
      }}
    >
      <IconBadge icon="calendar-check-outline" tint="yellow" size={44} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>Your week&apos;s meals</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.slate, marginTop: 2 }}>
          {premium
            ? "Breakfast, lunch and dinner planned to fit your sodium limit, with a shopping list."
            : "A week of meals planned to fit your sodium limit, with a shopping list. Premium."}
        </Text>
      </View>
      <Feather name={premium ? "chevron-right" : "lock"} size={18} color={c.steel} />
    </AnimatedButton>
  );
}
