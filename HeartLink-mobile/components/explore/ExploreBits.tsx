import React from "react";
import { Text, View, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { ExploreExercise, ExploreRecipe, exerciseLine } from "../../services/explore";

// Pieces shared by Explore, its browse-by-need lists and Saved.

const EXERCISE_ICON = (e: ExploreExercise): keyof typeof Feather.glyphMap =>
  e.type === "Breathing" ? "wind" : e.type === "Light Cardio" ? "activity" : "user";

const EXERCISE_FALLBACK_IMAGES: Record<string, string> = {
  breathing: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  cardio: "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
  "light cardio": "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
  stationary: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
  general: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
};

export function exerciseFallbackImage(e: { image?: string | null; type?: string | null; title?: string | null }): string {
  if (e.image && e.image.trim()) return e.image.trim();
  const typeKey = (e.type || "").toLowerCase();
  const titleWords = (e.title || "").toLowerCase();
  if (typeKey.includes("breath") || titleWords.includes("breath")) return EXERCISE_FALLBACK_IMAGES.breathing;
  if (typeKey.includes("cardio") || titleWords.includes("walk")) return EXERCISE_FALLBACK_IMAGES.cardio;
  if (typeKey.includes("station") || titleWords.includes("stretch")) return EXERCISE_FALLBACK_IMAGES.stationary;
  return EXERCISE_FALLBACK_IMAGES.general;
}

/** Green tick + who approved it (HL-026 / HL-037). */
export function ApprovedBy({ who }: { who: "Dietitian" | "PT" }) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4.5,
        alignSelf: "flex-start",
        paddingVertical: 2.5,
        paddingHorizontal: 7.5,
        borderRadius: 6,
        backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
        borderWidth: 1,
        borderColor: isDark ? "rgba(16, 185, 129, 0.28)" : "#A7F3D0",
      }}
    >
      <Feather name="check" size={11} color={isDark ? "#34D399" : "#059669"} />
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 11.5,
          fontWeight: "600",
          color: isDark ? "#34D399" : "#059669",
          letterSpacing: -0.1,
        }}
      >
        {who} approved
      </Text>
    </View>
  );
}

/**
 * What in a recipe clashes with the patient's allergies or diet, in red. `compact` is a small tag with the first
 * warning (lists); otherwise a full-width banner with every warning (a recipe's page).
 */
export function FoodWarning({ warnings, compact }: { warnings: string[]; compact?: boolean }) {
  const { c, isDark } = useDs();
  if (!warnings.length) return null;
  if (!compact) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLabel={`Check before you eat this. ${warnings.join(". ")}`}
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEF2F2",
          borderWidth: 1,
          borderColor: isDark ? "rgba(239, 68, 68, 0.28)" : "#FECACA",
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Feather name="alert-triangle" size={16} color={isDark ? "#F87171" : "#DC2626"} />
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 13.5,
              fontWeight: "700",
              color: isDark ? "#F87171" : "#DC2626",
            }}
          >
            Check before you eat this
          </Text>
        </View>
        <View style={{ gap: 3, paddingLeft: 23 }}>
          {warnings.map((w) => (
            <Text
              key={w}
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: 12.5,
                lineHeight: 18,
                color: isDark ? "#FCA5A5" : "#991B1B",
              }}
            >
              {w}
            </Text>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Warning: ${warnings[0]}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        paddingVertical: 2.5,
        paddingHorizontal: 7.5,
        borderRadius: 6,
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEF2F2",
        borderWidth: 1,
        borderColor: isDark ? "rgba(239, 68, 68, 0.28)" : "#FECACA",
        maxWidth: "100%",
      }}
    >
      <Feather name="alert-circle" size={12} color={isDark ? "#F87171" : "#DC2626"} />
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={{
          fontSize: 11.5,
          fontWeight: "600",
          color: isDark ? "#F87171" : "#DC2626",
          letterSpacing: -0.1,
        }}
      >
        {warnings[0]}
      </Text>
    </View>
  );
}

/** Warning banner at the top of a recipe page (HL-037). */
export function RecipeBannerWarning({ warnings }: { warnings: string[] }) {
  const { isDark } = useDs();
  if (!warnings.length) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Allergy notice. ${warnings.join(". ")}`}
      style={{
        padding: 12,
        borderRadius: 14,
        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
        borderWidth: 1,
        borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FCA5A5",
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <Feather name="alert-triangle" size={17} color={isDark ? "#F87171" : "#DC2626"} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {warnings.map((w) => (
          <Text
            key={w}
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            style={{
              fontSize: 11.5,
              lineHeight: 16,
              fontWeight: "600",
              color: isDark ? "#F87171" : "#DC2626",
            }}
          >
            {w}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A meal's picture, or a plain tile while it loads or when it has none. */
export function RecipeThumb({ recipe, size, height }: { recipe: ExploreRecipe; size?: number; height?: number }) {
  const { c, isDark } = useDs();
  const radius = size ? 12 : 0;
  return (
    <View
      style={{
        width: size ?? "100%",
        height: height ?? size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : c.peach,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather
        name="coffee"
        size={size ? 20 : 28}
        color={isDark ? "#FBBF24" : c.charcoal}
        style={{ position: "absolute" }}
      />
      {recipe.image ? (
        <Image
          source={{ uri: recipe.image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
    </View>
  );
}

/** An exercise's picture, or a plain tinted tile with icon while it loads or when it has none. */
export function ExerciseThumb({
  exercise,
  size,
  height,
  borderRadius,
}: {
  exercise: { image?: string | null; type?: string | null; title?: string | null };
  size?: number;
  height?: number;
  borderRadius?: number;
}) {
  const { c, isDark } = useDs();
  const isBreathing = (exercise.type || "").toLowerCase().includes("breath");
  const isCardio =
    (exercise.type || "").toLowerCase().includes("cardio") ||
    (exercise.title || "").toLowerCase().includes("walk");
  const tint = isBreathing
    ? isDark ? "rgba(59, 130, 246, 0.18)" : c.sky
    : isCardio
    ? isDark ? "rgba(16, 185, 129, 0.18)" : c.mint
    : isDark ? "rgba(168, 85, 247, 0.18)" : c.lavender;
  const iconColor = isBreathing
    ? isDark ? "#60A5FA" : "#2563EB"
    : isCardio
    ? isDark ? "#34D399" : "#059669"
    : isDark ? "#C084FC" : "#7C3AED";
  const iconName: keyof typeof Feather.glyphMap = isBreathing ? "wind" : isCardio ? "activity" : "user";
  const radius = borderRadius !== undefined ? borderRadius : size ? 12 : 0;
  const uri = exerciseFallbackImage(exercise);

  return (
    <View
      style={{
        width: size ?? "100%",
        height: height ?? size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather
        name={iconName}
        size={size ? Math.round(size * 0.38) : 34}
        color={iconColor}
        style={{ position: "absolute" }}
      />
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
    </View>
  );
}

export const PICK_CARD_WIDTH = 236;

/** One card in the swipeable "Picked for your score" row: a meal or an exercise, and why it suits. */
export function PickCard({ pick, reason, onPress }: { pick: Pick; reason: string; onPress: () => void }) {
  const { c, isDark } = useDs();
  const isMeal = pick.kind === "recipe";
  const title = isMeal ? pick.recipe.title : pick.exercise.title;

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${title}. ${reason} ${isMeal ? "Dietitian" : "PT"} approved${isMeal && pick.recipe.warnings.length ? `. Warning: ${pick.recipe.warnings.join(". ")}` : ""}`}
      style={{
        width: PICK_CARD_WIDTH,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: isDark ? c.surface : c.canvas,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 10,
          },
          android: { elevation: 3 },
        }),
      }}
    >
      <View style={{ position: "relative" }}>
        {isMeal ? (
          <RecipeThumb recipe={pick.recipe} height={134} />
        ) : (
          <ExerciseThumb exercise={pick.exercise} height={134} />
        )}
        {/* Floating pill badge on top left */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.94)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
          }}
        >
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              color: isDark ? c.ink : c.charcoal,
              letterSpacing: -0.1,
            }}
          >
            {isMeal ? "Meal" : "Exercise"}
          </Text>
        </View>
      </View>

      <View style={{ padding: 14, gap: 6, flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: 4 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 16,
              fontWeight: "700",
              lineHeight: 21,
              color: c.ink,
              letterSpacing: -0.2,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ fontSize: 13, lineHeight: 18.5, color: c.slate }}
            numberOfLines={2}
          >
            {reason}
          </Text>
        </View>
        <View style={{ paddingTop: 4 }}>
          {isMeal && pick.recipe.warnings.length ? (
            <FoodWarning warnings={pick.recipe.warnings} compact />
          ) : (
            <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />
          )}
        </View>
      </View>
    </AnimatedButton>
  );
}

type Pick = { kind: "recipe"; recipe: ExploreRecipe } | { kind: "exercise"; exercise: ExploreExercise };

/** One meal in a list. `right` replaces the sodium number (e.g. a remove button on Saved). */
export function RecipeRow({ recipe, onPress, right }: { recipe: ExploreRecipe; onPress: () => void; right?: React.ReactNode }) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        borderRadius: 16,
        backgroundColor: isDark ? c.surface : c.canvas,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${recipe.title}. ${recipe.category}, ${recipe.prepMinutes} minutes, ${recipe.sodiumMg} milligrams of sodium${recipe.warnings.length ? `. Warning: ${recipe.warnings.join(". ")}` : ""}`}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <RecipeThumb recipe={recipe} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={2}
            style={{ fontSize: 15.5, fontWeight: "600", color: c.ink, letterSpacing: -0.2 }}
          >
            {recipe.title}
          </Text>
          <Text style={{ fontSize: 12.5, color: c.slate }}>
            {recipe.category} • {recipe.prepMinutes} min • {recipe.calories} kcal
          </Text>
          {recipe.warnings.length ? (
            <FoodWarning warnings={recipe.warnings} compact />
          ) : (
            <ApprovedBy who="Dietitian" />
          )}
        </View>
        {right ? null : (
          <View style={{ alignItems: "flex-end", paddingLeft: 4 }}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={{ fontSize: 17, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}
            >
              {recipe.sodiumMg}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 11, fontWeight: "500", color: c.steel }}>
              mg sodium
            </Text>
          </View>
        )}
      </AnimatedButton>
      {right}
    </View>
  );
}

/** One exercise in a list. */
export function ExerciseRow({ exercise, onPress, right }: { exercise: ExploreExercise; onPress: () => void; right?: React.ReactNode }) {
  const { c, isDark } = useDs();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 74,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        borderRadius: 16,
        backgroundColor: isDark ? c.surface : c.canvas,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.title}. ${exerciseLine(exercise)}. PT approved`}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <ExerciseThumb exercise={exercise} size={64} borderRadius={12} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={2}
            style={{ fontSize: 15.5, fontWeight: "600", color: c.ink, letterSpacing: -0.2 }}
          >
            {exercise.title}
          </Text>
          <Text style={{ fontSize: 12.5, color: c.slate }}>{exerciseLine(exercise)}</Text>
          <ApprovedBy who="PT" />
        </View>
      </AnimatedButton>
      {right}
    </View>
  );
}

/** A "Browse by need" tile. Food is peach, movement mint, breathing sky (HEARTLINK.md topic colours). */
export function NeedTile({
  title,
  blurb,
  icon,
  tone,
  iconColor,
  onPress,
}: {
  title: string;
  blurb: string;
  icon: keyof typeof Feather.glyphMap;
  tone: string;
  iconColor?: string;
  onPress: () => void;
}) {
  const { c, isDark } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      style={{
        flex: 1,
        minHeight: 110,
        padding: 14,
        borderRadius: 16,
        backgroundColor: isDark ? c.surface : c.canvas,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        justifyContent: "space-between",
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 6,
          },
          android: { elevation: 2 },
        }),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: tone,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={icon} size={18} color={iconColor ?? c.charcoal} />
        </View>
        <Feather name="arrow-up-right" size={16} color={c.steel} />
      </View>
      <View style={{ gap: 2 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={{ fontSize: 14.5, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}
        >
          {title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={{ fontSize: 12.5, fontWeight: "500", color: c.slate }}
        >
          {blurb}
        </Text>
      </View>
    </AnimatedButton>
  );
}

/** Bookmark button that saves or removes an item. */
export function SaveButton({ saved, label, onPress }: { saved: boolean; label: string; onPress: () => void }) {
  const { c, isDark } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${label} from saved` : `Save ${label}`}
      accessibilityState={{ selected: saved }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: saved
          ? isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF"
          : isDark ? c.surfaceAlt : "#F8FAFC",
        borderWidth: 1,
        borderColor: saved
          ? isDark ? "rgba(59, 130, 246, 0.35)" : "#BFDBFE"
          : isDark ? c.hairline : "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons
        name={saved ? "bookmark" : "bookmark-outline"}
        size={22}
        color={saved ? c.primary : c.steel}
      />
    </AnimatedButton>
  );
}
