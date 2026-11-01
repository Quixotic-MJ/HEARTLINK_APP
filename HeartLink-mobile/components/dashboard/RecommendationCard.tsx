import React from "react";
import { View, Text, Platform } from "react-native";
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

/** A card in the dashboard's "Picked for you" row: picture, name, metric reason and clinical endorsement. */
export function RecommendationCard({ rec, reason, onPress }: { rec: DashboardRec; reason: string; onPress: () => void }) {
  const { c, isDark } = useDs();
  const isMeal = rec.type === "recipe";
  const isBreathing = rec.exercise_type === "Breathing";
  const tint = isMeal
    ? isDark ? "rgba(249, 115, 22, 0.16)" : "#FFF7ED"
    : isBreathing
    ? isDark ? "rgba(14, 165, 233, 0.16)" : "#F0F9FF"
    : isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5";
  const iconName: keyof typeof Feather.glyphMap = isMeal
    ? "coffee"
    : isBreathing
    ? "wind"
    : rec.exercise_type === "Light Cardio"
    ? "activity"
    : "user";
  const imageUrl = getRecImageUrl(rec);

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${rec.title}. ${reason}. ${rec.tag}`}
      style={{
        width: PICK_CARD_WIDTH,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.07,
            shadowRadius: 8,
          },
          android: { elevation: 2 },
        }),
      }}
    >
      {/* ── Top Image Container with Overlaid Badges ── */}
      <View style={{ height: 126, backgroundColor: tint, position: "relative", alignItems: "center", justifyContent: "center" }}>
        <Feather
          name={iconName}
          size={isMeal ? 28 : 34}
          color={isDark ? c.steel : c.charcoal}
          style={{ position: "absolute" }}
        />
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        {/* Floating Category Pill Badge (Top-Left) */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 4.5,
            paddingHorizontal: 8.5,
            paddingVertical: 3.5,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.94)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
          }}
        >
          <Feather
            name={isMeal ? "coffee" : "activity"}
            size={11}
            color={isMeal ? (isDark ? "#FB923C" : "#EA580C") : (isDark ? "#34D399" : "#059669")}
          />
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isMeal ? (isDark ? "#FB923C" : "#EA580C") : (isDark ? "#34D399" : "#059669"),
              letterSpacing: 0.1,
            }}
          >
            {isMeal ? "Meal" : "Exercise"}
          </Text>
        </View>

        {/* Floating Tag Badge (Top-Right) */}
        {rec.tag ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              paddingHorizontal: 8,
              paddingVertical: 3.5,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.86)" : "rgba(255, 255, 255, 0.94)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
            }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: 10.5,
                fontWeight: "600",
                color: isDark ? c.ink : c.charcoal,
              }}
            >
              {rec.tag}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Bottom Content Details ── */}
      <View style={{ padding: 13, gap: 8, flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: 4 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 15.5,
              fontWeight: "700",
              lineHeight: 20,
              color: c.ink,
              letterSpacing: -0.2,
            }}
            numberOfLines={2}
          >
            {rec.title}
          </Text>

          {reason ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
              <Feather
                name={isMeal ? "shield" : "clock"}
                size={12}
                color={isDark ? c.steel : c.slate}
              />
              <Text
                maxFontSizeMultiplier={1.3}
                style={{
                  fontSize: 12.5,
                  fontWeight: "500",
                  color: c.slate,
                }}
                numberOfLines={1}
              >
                {reason}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Clinical Endorsement Tag */}
        <View style={{ paddingTop: 4, borderTopWidth: 1, borderTopColor: isDark ? c.hairline : "#F1F5F9" }}>
          <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />
        </View>
      </View>
    </AnimatedButton>
  );
}
