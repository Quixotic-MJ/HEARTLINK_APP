import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ExerciseRow, RecipeRow, SaveButton } from "../../../components/explore/ExploreBits";
import { useDs } from "../../../components/onboarding/useDs";
import { useExploreExercises, useExploreRecipes, useSavedExercises, useSavedRecipes } from "../../../hooks/useExploreData";

// Saved meals and exercises, from Explore's "See all".

type Filter = "all" | "meals" | "exercises";

export default function SavedScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const [filter, setFilter] = useState<Filter>("all");

  const recipesQuery = useExploreRecipes();
  const exercisesQuery = useExploreExercises();
  const savedRecipes = useSavedRecipes();
  const savedExercises = useSavedExercises();

  const meals = useMemo(() => (recipesQuery.data ?? []).filter((r) => savedRecipes.ids.includes(r.id)), [recipesQuery.data, savedRecipes.ids]);
  const moves = useMemo(() => (exercisesQuery.data ?? []).filter((e) => savedExercises.ids.includes(e.id)), [exercisesQuery.data, savedExercises.ids]);
  const loading = recipesQuery.isLoading || exercisesQuery.isLoading;

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${meals.length + moves.length}` },
    { id: "meals", label: `Meals ${meals.length}` },
    { id: "exercises", label: `Exercises ${moves.length}` },
  ];
  const showMeals = filter !== "exercises";
  const showMoves = filter !== "meals";
  const empty = (showMeals ? meals.length : 0) + (showMoves ? moves.length : 0) === 0;

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
        <SquareIconButton icon="arrow-left" label="Back to Explore" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }}>Saved</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }}>
          {filters.map((f) => {
            const on = f.id === filter;
            return (
              <AnimatedButton
                key={f.id}
                onPress={() => setFilter(f.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={f.label}
                style={{ height: 40, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, justifyContent: "center", backgroundColor: on ? c.ink : c.canvas, borderColor: on ? c.ink : c.hairline }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{f.label}</Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>

        {loading ? (
          [0, 1].map((k) => <Skeleton key={k} style={{ height: 84, borderRadius: 12 }} />)
        ) : empty ? (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>Tap the bookmark on a meal or exercise to keep it here.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {showMeals
              ? meals.map((r) => (
                  <RecipeRow
                    key={`r-${r.id}`}
                    recipe={r}
                    onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${r.id}` as never)}
                    right={<SaveButton saved label={r.title} onPress={() => savedRecipes.toggle(r.id)} />}
                  />
                ))
              : null}
            {showMoves
              ? moves.map((e) => (
                  <ExerciseRow
                    key={`e-${e.id}`}
                    exercise={e}
                    onPress={() => router.push({ pathname: "/(home)/(health)/exercise-session", params: { id: e.id } })}
                    right={<SaveButton saved label={e.title} onPress={() => savedExercises.toggle(e.id)} />}
                  />
                ))
              : null}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
