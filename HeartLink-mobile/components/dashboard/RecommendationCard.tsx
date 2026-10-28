import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { PICK_CARD_WIDTH } from "../explore/ExploreBits";

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

/** One short fact about the pick: its sodium (flagged when it's more than what's left today) or its minutes. */
export function recommendationReason(rec: DashboardRec, today: { sodiumLeftMg: number; movementLeftMins: number }): string {
  if (rec.type === "recipe") {
    if (rec.sodium_mg === undefined) return rec.subtitle ?? "";
    const sodium = `${Math.round(rec.sodium_mg).toLocaleString()} mg sodium`;
    return today.sodiumLeftMg > 0 && rec.sodium_mg > today.sodiumLeftMg ? `${sodium}, over what's left today` : sodium;
  }
  if (!rec.duration_minutes) return rec.subtitle ?? "";
  return `${rec.duration_minutes} min`;
}

/** A card in the dashboard's "Picked for you" row: picture, name and one fact. Only approved picks are offered. */
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
      <View style={{ height: 104, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={isMeal ? 26 : 34} color={c.charcoal} style={{ position: "absolute" }} />
        {isMeal && rec.image_url ? (
          <Image source={{ uri: rec.image_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : null}
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: "600", lineHeight: 21, color: c.ink }} numberOfLines={2}>
          {rec.title}
        </Text>
        {reason ? (
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, lineHeight: 18, color: c.slate }} numberOfLines={2}>
            {reason}
          </Text>
        ) : null}
      </View>
    </AnimatedButton>
  );
}
