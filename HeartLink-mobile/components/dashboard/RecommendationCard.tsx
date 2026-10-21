import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { ApprovedBy, PICK_CARD_WIDTH } from "../explore/ExploreBits";

/** A dashboard recommendation as the backend sends it (only the fields the card uses). */
export type DashboardRec = {
  id: string | number;
  type: "recipe" | "exercise";
  tag: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  sodium_mg?: number;
  duration_minutes?: number;
  intensity?: string;
  exercise_type?: string;
};

/** One line on why this pick suits today, from what is left of the patient's limits and goal. */
export function recommendationReason(rec: DashboardRec, today: { sodiumLeftMg: number; movementLeftMins: number }): string {
  if (rec.type === "recipe") {
    if (rec.sodium_mg === undefined) return rec.subtitle ?? "";
    const sodium = `${Math.round(rec.sodium_mg).toLocaleString()} mg sodium a serving`;
    if (today.sodiumLeftMg <= 0) return sodium;
    return rec.sodium_mg <= today.sodiumLeftMg
      ? `${sodium}, within the ${Math.round(today.sodiumLeftMg).toLocaleString()} mg you have left`
      : `${sodium}, more than the ${Math.round(today.sodiumLeftMg).toLocaleString()} mg you have left`;
  }
  if (!rec.duration_minutes) return rec.subtitle ?? "";
  const effort = rec.intensity && rec.intensity !== "None" ? `, ${rec.intensity.toLowerCase()} effort` : "";
  const goal = today.movementLeftMins > 0 ? `. You have ${today.movementLeftMins} min left of your goal` : "";
  return `${rec.duration_minutes} minutes${effort}${goal}`;
}

/** A card in the dashboard's "Picked for your score" row; same look as Explore's picks. */
export function RecommendationCard({ rec, reason, onPress }: { rec: DashboardRec; reason: string; onPress: () => void }) {
  const { c } = useDs();
  const isMeal = rec.type === "recipe";
  const isBreathing = rec.exercise_type === "Breathing";
  const tint = isMeal ? c.peach : isBreathing ? c.sky : c.mint;
  const icon: keyof typeof Feather.glyphMap = isMeal ? "coffee" : isBreathing ? "wind" : rec.exercise_type === "Light Cardio" ? "activity" : "user";

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${rec.title}. ${reason}. ${rec.tag}`}
      style={{ width: PICK_CARD_WIDTH, borderWidth: 1, borderColor: c.hairline, borderRadius: 14, overflow: "hidden", backgroundColor: c.canvas }}
    >
      <View style={{ height: 128, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={isMeal ? 26 : 34} color={c.charcoal} style={{ position: "absolute" }} />
        {isMeal && rec.image_url ? (
          <Image source={{ uri: rec.image_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : null}
      </View>
      <View style={{ padding: 14, gap: 6 }}>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tint }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>{isMeal ? "Meal" : "Exercise"}</Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: "600", lineHeight: 22, color: c.ink }} numberOfLines={2}>
          {rec.title}
        </Text>
        {reason ? (
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }} numberOfLines={3}>
            {reason}
          </Text>
        ) : null}
        <View style={{ marginTop: 2 }}>
          <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />
        </View>
      </View>
    </AnimatedButton>
  );
}
