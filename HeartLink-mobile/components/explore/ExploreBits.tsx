import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { IconBadge } from "../onboarding/QuestionLayout";
import { ExploreExercise, ExploreRecipe, exerciseLine } from "../../services/explore";

// Pieces shared by Explore, its browse-by-need lists and Saved.

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

/** Green tick + who approved it (HL-026 / HL-037): a mint tag with dark text (HEARTLINK.md). */
export function ApprovedBy({ who }: { who: "Dietitian" | "PT" }) {
  const { c } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: c.mint,
      }}
    >
      <Feather name="check" size={12} color={c.charcoal} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>
        {who} approved
      </Text>
    </View>
  );
}

/**
 * What in a recipe clashes with the patient's allergies or diet. `compact` is a small tag with the first warning
 * (lists); otherwise a full-width card with every warning (a recipe's page). Rose tint, red icon, dark text: never red
 * text on pink (HEARTLINK.md).
 */
export function FoodWarning({ warnings, compact }: { warnings: string[]; compact?: boolean }) {
  const { c } = useDs();
  if (!warnings.length) return null;
  if (!compact) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLabel={`Check before you eat this. ${warnings.join(". ")}`}
        style={{ padding: 14, borderRadius: 12, backgroundColor: c.rose, gap: 6 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="alert-triangle" size={16} color={c.danger} />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>
            Check before you eat this
          </Text>
        </View>
        <View style={{ gap: 3, paddingLeft: 24 }}>
          {warnings.map((w) => (
            <Text key={w} maxFontSizeMultiplier={1.3} style={{ fontSize: 13, lineHeight: 19, color: c.charcoal }}>
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
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: c.rose,
        maxWidth: "100%",
      }}
    >
      <Feather name="alert-circle" size={12} color={c.danger} />
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, fontWeight: "600", color: c.charcoal }}>
        {warnings[0]}
      </Text>
    </View>
  );
}

/** Warning banner at the top of a recipe page (HL-037). */
export function RecipeBannerWarning({ warnings }: { warnings: string[] }) {
  const { c } = useDs();
  if (!warnings.length) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Allergy notice. ${warnings.join(". ")}`}
      style={{ padding: 12, borderRadius: 12, backgroundColor: c.rose, flexDirection: "row", gap: 10, alignItems: "flex-start" }}
    >
      <Feather name="alert-triangle" size={16} color={c.danger} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {warnings.map((w) => (
          <Text key={w} maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.charcoal }}>
            {w}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A meal's picture, or a peach tile (food) while it loads or when it has none. */
export function RecipeThumb({ recipe, size, height }: { recipe: ExploreRecipe; size?: number; height?: number }) {
  const { c } = useDs();
  return (
    <View
      style={{
        width: size ?? "100%",
        height: height ?? size,
        borderRadius: size ? 8 : 0,
        overflow: "hidden",
        backgroundColor: c.peach,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name="coffee" size={size ? 20 : 28} color={c.charcoal} style={{ position: "absolute" }} />
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
      ) : null}
    </View>
  );
}

/** An exercise's picture, or a tinted tile (sky breathing, mint cardio, lavender the rest) while it loads. */
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
  const { c } = useDs();
  const isBreathing = (exercise.type || "").toLowerCase().includes("breath");
  const isCardio =
    (exercise.type || "").toLowerCase().includes("cardio") || (exercise.title || "").toLowerCase().includes("walk");
  const tint = isBreathing ? c.sky : isCardio ? c.mint : c.lavender;
  const iconName: keyof typeof Feather.glyphMap = isBreathing ? "wind" : isCardio ? "activity" : "user";
  const radius = borderRadius !== undefined ? borderRadius : size ? 8 : 0;
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
      <Feather name={iconName} size={size ? Math.round(size * 0.36) : 32} color={c.charcoal} style={{ position: "absolute" }} />
      {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} /> : null}
    </View>
  );
}

export const PICK_CARD_WIDTH = 236;

/** One card in the swipeable "Picked for you" row: a meal or an exercise, and why it suits. A flat card (DESIGN.md). */
export function PickCard({ pick, reason, onPress }: { pick: Pick; reason: string; onPress: () => void }) {
  const { c } = useDs();
  const isMeal = pick.kind === "recipe";
  const title = isMeal ? pick.recipe.title : pick.exercise.title;

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${title}. ${reason} ${isMeal ? "Dietitian" : "PT"} approved${isMeal && pick.recipe.warnings.length ? `. Warning: ${pick.recipe.warnings.join(". ")}` : ""}`}
      style={{
        width: PICK_CARD_WIDTH,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: c.canvas,
        borderWidth: 1,
        borderColor: c.hairline,
      }}
    >
      <View>
        {isMeal ? <RecipeThumb recipe={pick.recipe} height={128} /> : <ExerciseThumb exercise={pick.exercise} height={128} />}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: c.canvas,
          }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.ink }}>
            {isMeal ? "Meal" : "Exercise"}
          </Text>
        </View>
      </View>

      <View style={{ padding: 14, gap: 10, flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: 4 }}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 16, fontWeight: "600", lineHeight: 22, color: c.ink }}>
            {title}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 19, color: c.slate }}>
            {reason}
          </Text>
        </View>
        {isMeal && pick.recipe.warnings.length ? (
          <FoodWarning warnings={pick.recipe.warnings} compact />
        ) : (
          <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />
        )}
      </View>
    </AnimatedButton>
  );
}

type Pick = { kind: "recipe"; recipe: ExploreRecipe } | { kind: "exercise"; exercise: ExploreExercise };

/** One meal in a list. `right` replaces the sodium number (e.g. a remove button on Saved). */
export function RecipeRow({ recipe, onPress, right }: { recipe: ExploreRecipe; onPress: () => void; right?: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: c.hairline,
        borderRadius: 12,
        backgroundColor: c.canvas,
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
            style={{ fontSize: 15.5, fontWeight: "600", lineHeight: 21, color: c.ink }}
          >
            {recipe.title}
          </Text>
          <Text style={{ fontSize: 13, color: c.slate }}>
            {[recipe.category, `${recipe.prepMinutes} min`, `${recipe.calories} kcal`].filter(Boolean).join(", ")}
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
              style={{ fontSize: 17, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}
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
  const { c } = useDs();

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
        borderColor: c.hairline,
        borderRadius: 12,
        backgroundColor: c.canvas,
      }}
    >
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.title}. ${exerciseLine(exercise)}. PT approved`}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <ExerciseThumb exercise={exercise} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={2}
            style={{ fontSize: 15.5, fontWeight: "600", lineHeight: 21, color: c.ink }}
          >
            {exercise.title}
          </Text>
          <Text style={{ fontSize: 13, color: c.slate }}>{exerciseLine(exercise)}</Text>
          <ApprovedBy who="PT" />
        </View>
      </AnimatedButton>
      {right}
    </View>
  );
}

/** A "Browse by need" tile: a flat card with a pastel icon badge (food peach and yellow, movement mint, breathing sky). */
export function NeedTile({
  title,
  blurb,
  icon,
  tint,
  onPress,
}: {
  title: string;
  blurb: string;
  icon: React.ComponentProps<typeof IconBadge>["icon"];
  tint: React.ComponentProps<typeof IconBadge>["tint"];
  onPress: () => void;
}) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      style={{
        flex: 1,
        minHeight: 112,
        padding: 14,
        borderRadius: 12,
        backgroundColor: c.canvas,
        borderWidth: 1,
        borderColor: c.hairline,
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <IconBadge icon={icon} tint={tint} size={40} />
        <Feather name="chevron-right" size={18} color={c.steel} />
      </View>
      <View style={{ gap: 2 }}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>
          {blurb}
        </Text>
      </View>
    </AnimatedButton>
  );
}

/** Bookmark button that saves or removes an item: outlined, or a sky tint once saved. */
export function SaveButton({ saved, label, onPress }: { saved: boolean; label: string; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${label} from saved` : `Save ${label}`}
      accessibilityState={{ selected: saved }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: saved ? c.tint : c.canvas,
        borderWidth: 1,
        borderColor: saved ? c.line : c.hairlineStrong,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? c.onTint : c.slate} />
    </AnimatedButton>
  );
}
