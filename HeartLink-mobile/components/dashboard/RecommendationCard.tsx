import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { PICK_CARD_WIDTH, ApprovedBy } from "../explore/ExploreBits";

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

const REC_FALLBACK_IMAGES: Record<string, string> = {
  breathing: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  cardio: "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
  "light cardio": "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
  stationary: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
  general: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
};

function getRecImageUrl(rec: DashboardRec): string | undefined {
  if (rec.image_url && rec.image_url.trim()) return rec.image_url.trim();
  if (rec.type === "exercise") {
    const et = (rec.exercise_type || "").toLowerCase();
    const title = (rec.title || "").toLowerCase();
    if (et.includes("breath") || title.includes("breath")) return REC_FALLBACK_IMAGES.breathing;
    if (et.includes("cardio") || title.includes("walk")) return REC_FALLBACK_IMAGES.cardio;
    if (et.includes("station") || title.includes("stretch")) return REC_FALLBACK_IMAGES.stationary;
    return REC_FALLBACK_IMAGES.general;
  }
  return undefined;
}

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

/**
 * A card in the dashboard's "Picked for you" row: picture, a pastel Meal or Exercise tag, the name, one fact (sodium or
 * minutes) and who approved it. Flat white card with a thin border, as the design system's cards are; the approval
 * shows once (the backend's tag is the same "Dietitian approved" / "PT approved").
 */
export function RecommendationCard({ rec, reason, onPress }: { rec: DashboardRec; reason: string; onPress: () => void }) {
  const { c } = useDs();
  const isMeal = rec.type === "recipe";
  const isBreathing = rec.exercise_type === "Breathing";
  // Topic pastels from HEARTLINK.md: food peach, movement mint, breathing sky
  const tint = isMeal ? c.peach : isBreathing ? c.sky : c.mint;
  const iconName: keyof typeof Feather.glyphMap = isMeal
    ? "coffee"
    : isBreathing
    ? "wind"
    : rec.exercise_type === "Light Cardio"
    ? "activity"
    : "user";
  const imageUrl = getRecImageUrl(rec);
  const overToday = isMeal && reason.includes("over what's left");

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${rec.title}. ${reason}. ${rec.tag}`}
      style={{
        width: PICK_CARD_WIDTH,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: c.canvas,
        borderWidth: 1,
        borderColor: c.hairline,
      }}
    >
      {/* Picture, with the topic icon on its pastel while it loads or when there's none */}
      <View style={{ height: 124, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Feather name={iconName} size={30} color={c.charcoal} style={{ position: "absolute" }} />
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : null}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: tint,
          }}
        >
          <Feather name={isMeal ? "coffee" : "activity"} size={12} color={c.charcoal} />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "700", color: c.charcoal }}>
            {isMeal ? "Meal" : "Exercise"}
          </Text>
        </View>
      </View>

      <View style={{ padding: 14, gap: 10, flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: 6 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={2}
            style={{ fontSize: 16, fontWeight: "700", lineHeight: 21, color: c.ink, letterSpacing: -0.2 }}
          >
            {rec.title}
          </Text>
          {reason ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name={isMeal ? "droplet" : "clock"} size={13} color={overToday ? c.warmText : c.slate} />
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 13.5, fontWeight: "500", color: overToday ? c.warmText : c.slate }}
              >
                {reason}
              </Text>
            </View>
          ) : null}
        </View>
        <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />
      </View>
    </AnimatedButton>
  );
}
