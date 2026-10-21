import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ExerciseRow, RecipeRow } from "../../../components/explore/ExploreBits";
import { useDs } from "../../../components/onboarding/useDs";
import { useExploreExercises, useExploreRecipes, useExploreScore } from "../../../hooks/useExploreData";
import { NEEDS, NeedId, exercisesForNeed, recipesForNeed } from "../../../services/explore";

// One "Browse by need" list from Explore, e.g. low-sodium meals, lowest first.

const MEAL_FILTERS = ["All", "Breakfast", "Lunch", "Dinner"] as const;

export default function BrowseByNeedScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const params = useLocalSearchParams<{ need?: string }>();
  const need: NeedId = params.need && params.need in NEEDS ? (params.need as NeedId) : "low-sodium";
  const info = NEEDS[need];
  const [meal, setMeal] = useState<(typeof MEAL_FILTERS)[number]>("All");

  const recipesQuery = useExploreRecipes();
  const exercisesQuery = useExploreExercises();
  const tier = useExploreScore().data?.tier ?? null;

  const recipes = useMemo(() => {
    const list = recipesForNeed(need, recipesQuery.data ?? [], tier);
    return meal === "All" ? list : list.filter((r) => r.category === meal);
  }, [need, recipesQuery.data, tier, meal]);
  const exercises = useMemo(() => exercisesForNeed(need, exercisesQuery.data ?? [], tier), [need, exercisesQuery.data, tier]);
  const isRecipes = info.kind === "recipe";
  const loading = isRecipes ? recipesQuery.isLoading : exercisesQuery.isLoading;
  const count = isRecipes ? recipes.length : exercises.length;

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
        <SquareIconButton icon="arrow-left" label="Back to Explore" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }}>{info.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 }}>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{info.intro}</Text>

        {isRecipes ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }}>
            {MEAL_FILTERS.map((f) => {
              const on = f === meal;
              return (
                <AnimatedButton
                  key={f}
                  onPress={() => setMeal(f)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={f}
                  style={{ height: 40, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, justifyContent: "center", backgroundColor: on ? c.ink : c.canvas, borderColor: on ? c.ink : c.hairline }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{f}</Text>
                </AnimatedButton>
              );
            })}
          </ScrollView>
        ) : null}

        {loading ? (
          [0, 1, 2].map((k) => <Skeleton key={k} style={{ height: 84, borderRadius: 12 }} />)
        ) : count === 0 ? (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
              Nothing here yet. Your care team adds more as they approve meals and exercises.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {isRecipes
              ? recipes.map((r) => <RecipeRow key={r.id} recipe={r} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${r.id}` as never)} />)
              : exercises.map((e) => (
                  <ExerciseRow key={e.id} exercise={e} onPress={() => router.push({ pathname: "/(home)/(health)/exercise-session", params: { id: e.id } })} />
                ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
