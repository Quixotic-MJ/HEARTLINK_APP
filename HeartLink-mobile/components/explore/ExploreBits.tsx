import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { ExploreExercise, ExploreRecipe, exerciseLine } from "../../services/explore";

// Pieces shared by Explore, its browse-by-need lists and Saved.

const EXERCISE_ICON = (e: ExploreExercise): keyof typeof Feather.glyphMap =>
  e.type === "Breathing" ? "wind" : e.type === "Light Cardio" ? "activity" : "user";

/** Green tick + who approved it (HL-026 / HL-037). */
export function ApprovedBy({ who }: { who: "Dietitian" | "PT" }) {
  const { c } = useDs();
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <Feather name="check" size={13} color={c.success} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>{who} approved</Text>
    </View>
  );
}

/**
 * What in a recipe clashes with the patient's allergies or diet, in red. `compact` is a small tag with the first
 * warning (lists); otherwise a full-width banner with every warning (a recipe's page).
 */
export function FoodWarning({ warnings, compact }: { warnings: string[]; compact?: boolean }) {
  const { c } = useDs();
  if (!warnings.length) return null;
  if (!compact) {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLabel={`Check before you eat this. ${warnings.join(". ")}`}
        style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.danger, backgroundColor: c.rose }}
      >
        <Feather name="alert-triangle" size={18} color={c.danger} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Check before you eat this</Text>
          {warnings.map((w) => (
            <Text key={w} style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{w}</Text>
          ))}
        </View>
      </View>
    );
  }
  const shown = warnings.slice(0, 1);
  return (
    <View
      accessibilityLabel={`Warning: ${warnings.join(". ")}`}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.rose }}
    >
      <Feather name="alert-triangle" size={13} color={c.danger} style={{ marginTop: 2 }} />
      <View style={{ flexShrink: 1, gap: 2 }}>
        {shown.map((w) => (
          <Text key={w} maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 12, lineHeight: 17, fontWeight: "600", color: c.ink }}>
            {w}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** A meal's picture, or a plain tile while it loads or when it has none. */
export function RecipeThumb({ recipe, size, height }: { recipe: ExploreRecipe; size?: number; height?: number }) {
  const { c } = useDs();
  return (
    <View style={{ width: size ?? "100%", height: height ?? size, borderRadius: size ? 8 : 0, overflow: "hidden", backgroundColor: c.peach, alignItems: "center", justifyContent: "center" }}>
      <Feather name="coffee" size={size ? 18 : 26} color={c.charcoal} style={{ position: "absolute" }} />
      {recipe.image ? <Image source={{ uri: recipe.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} /> : null}
    </View>
  );
}

export const PICK_CARD_WIDTH = 232;

/** One card in the swipeable "Picked for your score" row: a meal or an exercise, and why it suits. */
export function PickCard({ pick, reason, onPress }: { pick: Pick; reason: string; onPress: () => void }) {
  const { c } = useDs();
  const isMeal = pick.kind === "recipe";
  const title = isMeal ? pick.recipe.title : pick.exercise.title;
  const tint = isMeal ? c.peach : pick.exercise.type === "Breathing" ? c.sky : c.mint;
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isMeal ? "Meal" : "Exercise"}: ${title}. ${reason} ${isMeal ? "Dietitian" : "PT"} approved${isMeal && pick.recipe.warnings.length ? `. Warning: ${pick.recipe.warnings.join(". ")}` : ""}`}
      style={{ width: PICK_CARD_WIDTH, borderWidth: 1, borderColor: c.hairline, borderRadius: 14, overflow: "hidden", backgroundColor: c.canvas }}
    >
      {isMeal ? (
        <RecipeThumb recipe={pick.recipe} height={128} />
      ) : (
        <View style={{ height: 128, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
          <Feather name={EXERCISE_ICON(pick.exercise)} size={34} color={c.charcoal} />
        </View>
      )}
      <View style={{ padding: 14, gap: 6 }}>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tint }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>{isMeal ? "Meal" : "Exercise"}</Text>
        </View>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: "600", lineHeight: 22, color: c.ink }} numberOfLines={2}>{title}</Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }} numberOfLines={3}>{reason}</Text>
        <View style={{ marginTop: 2 }}>
          {isMeal && pick.recipe.warnings.length ? <FoodWarning warnings={pick.recipe.warnings} compact /> : <ApprovedBy who={isMeal ? "Dietitian" : "PT"} />}
        </View>
      </View>
    </AnimatedButton>
  );
}

type Pick = { kind: "recipe"; recipe: ExploreRecipe } | { kind: "exercise"; exercise: ExploreExercise };

/** One meal in a list. `right` replaces the sodium number (e.g. a remove button on Saved). */
export function RecipeRow({ recipe, onPress, right }: { recipe: ExploreRecipe; onPress: () => void; right?: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View className="flex-row items-center" style={{ gap: 12, padding: 12, borderWidth: 1, borderColor: c.hairline, borderRadius: 12, backgroundColor: c.canvas }}>
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${recipe.title}. ${recipe.category}, ${recipe.prepMinutes} minutes, ${recipe.sodiumMg} milligrams of sodium${recipe.warnings.length ? `. Warning: ${recipe.warnings.join(". ")}` : ""}`}
        className="flex-row items-center"
        style={{ flex: 1, gap: 12 }}
      >
        <RecipeThumb recipe={recipe} size={60} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }} numberOfLines={2}>{recipe.title}</Text>
          <Text style={{ fontSize: 13, color: c.slate }}>
            {recipe.category}, {recipe.prepMinutes} min, {recipe.calories} kcal
          </Text>
          {recipe.warnings.length ? <FoodWarning warnings={recipe.warnings} compact /> : <ApprovedBy who="Dietitian" />}
        </View>
        {right ? null : (
          <View style={{ alignItems: "flex-end" }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>{recipe.sodiumMg}</Text>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, color: c.slate }}>mg sodium</Text>
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
  const tone = exercise.type === "Breathing" ? c.sky : c.mint;
  return (
    <View className="flex-row items-center" style={{ gap: 12, minHeight: 72, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.hairline, borderRadius: 12, backgroundColor: c.canvas }}>
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${exercise.title}. ${exerciseLine(exercise)}. PT approved`}
        className="flex-row items-center"
        style={{ flex: 1, gap: 12 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: tone, alignItems: "center", justifyContent: "center" }}>
          <Feather name={EXERCISE_ICON(exercise)} size={20} color={c.charcoal} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }} numberOfLines={2}>{exercise.title}</Text>
          <Text style={{ fontSize: 13, color: c.slate }}>{exerciseLine(exercise)}</Text>
          <ApprovedBy who="PT" />
        </View>
      </AnimatedButton>
      {right}
    </View>
  );
}

/** A "Browse by need" tile. Food is peach, movement mint, breathing sky (HEARTLINK.md topic colours). */
export function NeedTile({ title, blurb, icon, tone, onPress }: { title: string; blurb: string; icon: keyof typeof Feather.glyphMap; tone: string; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${blurb}`}
      style={{ flex: 1, minHeight: 104, padding: 14, borderRadius: 12, backgroundColor: tone, justifyContent: "space-between", gap: 10 }}
    >
      <Feather name={icon} size={22} color={c.charcoal} />
      <View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.charcoal }}>{title}</Text>
        <Text style={{ fontSize: 13, color: c.charcoal }}>{blurb}</Text>
      </View>
    </AnimatedButton>
  );
}

/** Bookmark button that saves or removes an item. */
export function SaveButton({ saved, label, onPress }: { saved: boolean; label: string; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${label} from saved` : `Save ${label}`}
      accessibilityState={{ selected: saved }}
      style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
    >
      <MaterialCommunityIcons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={c.ink} />
    </AnimatedButton>
  );
}
