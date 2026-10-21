import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Header } from "../../../components/Header";
import { useDs } from "../../../components/onboarding/useDs";
import { ExerciseRow, NeedTile, PICK_CARD_WIDTH, PickCard, RecipeRow } from "../../../components/explore/ExploreBits";
import { useExploreExercises, useExploreRecipes, useExploreScore, useSavedExercises, useSavedRecipes } from "../../../hooks/useExploreData";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { NEEDS, NeedId, interleavePicks, pickReason, picksForScore } from "../../../services/explore";

// Explore: picks for the patient's score, browse by need, and saved items (redesign, 2026-10-21).

const PICK_GAP = 12;

const NEED_STYLE: Record<NeedId, { icon: React.ComponentProps<typeof Feather>["name"]; tone: "peach" | "mint" | "sky" }> = {
  "low-sodium": { icon: "droplet", tone: "peach" },
  quick: { icon: "clock", tone: "peach" },
  seated: { icon: "user", tone: "mint" },
  breathing: { icon: "wind", tone: "sky" },
};

export default function ExploreTabScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const [searchQuery, setSearchQuery] = useState("");

  const recipesQuery = useExploreRecipes();
  const exercisesQuery = useExploreExercises();
  const scoreQuery = useExploreScore();
  const savedRecipes = useSavedRecipes();
  const savedExercises = useSavedExercises();
  const recipes = useMemo(() => recipesQuery.data ?? [], [recipesQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data ?? [], [exercisesQuery.data]);
  const tier = scoreQuery.data?.tier ?? null;
  const score = scoreQuery.data?.score ?? null;

  // Approvals made in the portal show when the patient comes back to this tab (HL-026 / HL-037).
  useRefetchOnFocus(recipesQuery.refetch);
  useRefetchOnFocus(exercisesQuery.refetch);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([recipesQuery.refetch(), exercisesQuery.refetch(), scoreQuery.refetch(), savedRecipes.refetch(), savedExercises.refetch()]);
    setRefreshing(false);
  }, [recipesQuery, exercisesQuery, scoreQuery, savedRecipes, savedExercises]);

  // Picks in one swipeable row (meal, exercise, meal, exercise), with dots for where you are.
  const pickRow = useMemo(
    () => interleavePicks(picksForScore(scoreQuery.data?.recommendations, recipes, exercises, tier)),
    [scoreQuery.data, recipes, exercises, tier]
  );
  const [pickIndex, setPickIndex] = useState(0);
  const savedItems = useMemo(
    () => [
      ...recipes.filter((r) => savedRecipes.ids.includes(r.id)).map((r) => ({ kind: "recipe" as const, recipe: r })),
      ...exercises.filter((e) => savedExercises.ids.includes(e.id)).map((e) => ({ kind: "exercise" as const, exercise: e })),
    ],
    [recipes, exercises, savedRecipes.ids, savedExercises.ids]
  );

  const q = searchQuery.trim().toLowerCase();
  const foundRecipes = q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : [];
  const foundExercises = q ? exercises.filter((e) => e.title.toLowerCase().includes(q)) : [];

  const openRecipe = (id: string) => router.push(`/(home)/(meals)/recipe-details?id=${id}` as never);
  const openExercise = (id: string) => router.push({ pathname: "/(home)/(health)/exercise-session", params: { id } });

  const band = bandStyle(tier, c);
  const loading = recipesQuery.isLoading || exercisesQuery.isLoading;

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, gap: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "600", color: c.ink }}>Explore</Text>
          <View className="flex-row items-center" style={{ height: 48, paddingHorizontal: 14, gap: 10, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}>
            <Feather name="search" size={18} color={c.steel} />
            <TextInput
              placeholder="Search meals and exercises"
              placeholderTextColor={c.steel}
              accessibilityLabel="Search meals and exercises"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 16, color: c.ink, paddingVertical: 0 }}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={16} color={c.steel} />
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Everything approved, whatever the score; the full lists mark what suits it. */}
          <View className="flex-row" style={{ gap: 8 }}>
            {[
              { label: "All meals", icon: "coffee" as const, count: recipes.length, href: "/(home)/(tabs)/recipes" as const },
              { label: "All exercises", icon: "activity" as const, count: exercises.length, href: "/(home)/(tabs)/exercises" as const },
            ].map((b) => (
              <AnimatedButton
                key={b.label}
                onPress={() => router.push({ pathname: b.href, params: { from: "explore" } })}
                accessibilityRole="button"
                accessibilityLabel={`${b.label}, ${b.count}`}
                className="flex-row items-center justify-center"
                style={{ flex: 1, height: 48, gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, backgroundColor: c.canvas }}
              >
                <Feather name={b.icon} size={17} color={c.ink} />
                <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{b.label}</Text>
                <Text style={{ fontSize: 15, color: c.slate }}>{b.count}</Text>
              </AnimatedButton>
            ))}
          </View>
        </View>

        {q ? (
          <View style={{ paddingHorizontal: 20, gap: 8 }}>
            <Text style={{ fontSize: 13, color: c.slate }}>
              {foundRecipes.length + foundExercises.length} results for &quot;{searchQuery.trim()}&quot;
            </Text>
            {foundRecipes.map((r) => <RecipeRow key={`r-${r.id}`} recipe={r} onPress={() => openRecipe(r.id)} />)}
            {foundExercises.map((e) => <ExerciseRow key={`e-${e.id}`} exercise={e} onPress={() => openExercise(e.id)} />)}
            {foundRecipes.length + foundExercises.length === 0 ? (
              <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface }}>
                <Text style={{ fontSize: 15, color: c.charcoal }}>No approved meals or exercises match. Try another word.</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 20, gap: 8 }}>
                <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>Picked for your score</Text>
                {tier && tier !== "Unknown" ? (
                  <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: band.bg, borderWidth: band.border ? 1 : 0, borderColor: band.border }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: band.fg }}>{score !== null ? `${tier}, ${Math.round(score)}` : tier}</Text>
                    </View>
                    {pickRow.length > 1 ? <Text style={{ fontSize: 13, color: c.slate }}>Swipe for all {pickRow.length}</Text> : null}
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: c.slate }}>Log a check-in to get picks for your score.</Text>
                )}
              </View>

              {loading ? (
                <View style={{ paddingHorizontal: 20, gap: 8 }}>
                  <Skeleton style={{ height: 200, borderRadius: 12 }} />
                </View>
              ) : pickRow.length === 0 ? (
                <View style={{ marginHorizontal: 20, padding: 16, borderRadius: 12, backgroundColor: c.surface }}>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>No picks yet. Your care team is still approving meals and exercises.</Text>
                </View>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={PICK_CARD_WIDTH + PICK_GAP}
                    decelerationRate="fast"
                    onScroll={(e) => setPickIndex(Math.round(e.nativeEvent.contentOffset.x / (PICK_CARD_WIDTH + PICK_GAP)))}
                    scrollEventThrottle={32}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: PICK_GAP }}
                  >
                    {pickRow.map((p) => (
                      <PickCard
                        key={p.kind === "recipe" ? `r-${p.recipe.id}` : `e-${p.exercise.id}`}
                        pick={p}
                        reason={pickReason(p)}
                        onPress={() => (p.kind === "recipe" ? openRecipe(p.recipe.id) : openExercise(p.exercise.id))}
                      />
                    ))}
                  </ScrollView>
                  {pickRow.length > 1 ? (
                    <View className="flex-row justify-center" style={{ gap: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                      {pickRow.map((p, i) => (
                        <View key={i} style={{ width: i === pickIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === pickIndex ? c.ink : c.hairlineStrong }} />
                      ))}
                    </View>
                  ) : null}
                  <Text style={{ paddingHorizontal: 20, fontSize: 12, lineHeight: 17, color: c.slate }}>Picks support healthy habits. They are not a diagnosis.</Text>
                </>
              )}
            </View>

            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>Browse by need</Text>
              {[["low-sodium", "quick"], ["seated", "breathing"]].map((row) => (
                <View key={row.join()} className="flex-row" style={{ gap: 10 }}>
                  {(row as NeedId[]).map((id) => (
                    <NeedTile
                      key={id}
                      title={NEEDS[id].title}
                      blurb={NEEDS[id].blurb}
                      icon={NEED_STYLE[id].icon}
                      tone={c[NEED_STYLE[id].tone]}
                      onPress={() => router.push({ pathname: "/(home)/(meals)/browse", params: { need: id } })}
                    />
                  ))}
                </View>
              ))}
            </View>

            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <View className="flex-row items-center justify-between">
                <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>Saved</Text>
                {savedItems.length ? (
                  <TouchableOpacity onPress={() => router.push("/(home)/(meals)/saved")} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>See all {savedItems.length}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {savedItems.length ? (
                savedItems.slice(0, 2).map((item) =>
                  item.kind === "recipe" ? (
                    <RecipeRow key={`r-${item.recipe.id}`} recipe={item.recipe} onPress={() => openRecipe(item.recipe.id)} />
                  ) : (
                    <ExerciseRow key={`e-${item.exercise.id}`} exercise={item.exercise} onPress={() => openExercise(item.exercise.id)} />
                  )
                )
              ) : (
                <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.surface }}>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>Tap the bookmark on a meal or exercise to keep it here.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

/** The score band as a tinted tag (HEARTLINK.md), using the server's level names. */
function bandStyle(tier: string | null, c: ReturnType<typeof useDs>["c"]) {
  if (tier === "Stable") return { bg: c.mint, fg: c.charcoal, border: undefined };
  if (tier === "Moderate") return { bg: c.yellow, fg: c.warmText, border: c.yellowBold };
  if (tier === "Elevated Risk") return { bg: c.peach, fg: c.warmText, border: undefined };
  return { bg: c.rose, fg: c.ink, border: undefined };
}
