import { bandName } from "../../../constants/theme";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Header } from "../../../components/Header";
import { useDs } from "../../../components/onboarding/useDs";
import {
  ExerciseRow,
  NeedTile,
  PICK_CARD_WIDTH,
  PickCard,
  RecipeRow,
} from "../../../components/explore/ExploreBits";
import {
  useExploreExercises,
  useExploreRecipes,
  useExploreScore,
  useSavedExercises,
  useSavedRecipes,
} from "../../../hooks/useExploreData";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { MealPlanCard } from "../../../components/meals/MealPlanCard";
import {
  NEEDS,
  NeedId,
  interleavePicks,
  pickReason,
  picksForScore,
} from "../../../services/explore";
import { exerciseAllowed } from "../../../services/exerciseSession";

// Explore: picks for the patient's score, browse by need, and saved items.

const PICK_GAP = 12;

const CUBIC_OUT = Easing.out(Easing.cubic);

const NEED_CONFIG: Record<
  NeedId,
  {
    icon: React.ComponentProps<typeof Feather>["name"];
    badgeBg: (c: any, isDark: boolean) => string;
    iconColor: (c: any, isDark: boolean) => string;
  }
> = {
  "low-sodium": {
    icon: "droplet",
    badgeBg: (c, isDark) => (isDark ? "rgba(245, 158, 11, 0.18)" : c.peach),
    iconColor: (_c, isDark) => (isDark ? "#FBBF24" : "#D97706"),
  },
  quick: {
    icon: "clock",
    badgeBg: (c, isDark) => (isDark ? "rgba(234, 179, 8, 0.18)" : c.yellow),
    iconColor: (_c, isDark) => (isDark ? "#FCD34D" : "#B45309"),
  },
  seated: {
    icon: "user",
    badgeBg: (c, isDark) => (isDark ? "rgba(16, 185, 129, 0.18)" : c.mint),
    iconColor: (_c, isDark) => (isDark ? "#34D399" : "#059669"),
  },
  breathing: {
    icon: "wind",
    badgeBg: (c, isDark) => (isDark ? "rgba(59, 130, 246, 0.18)" : c.sky),
    iconColor: (_c, isDark) => (isDark ? "#60A5FA" : "#2563EB"),
  },
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
    await Promise.allSettled([
      recipesQuery.refetch(),
      exercisesQuery.refetch(),
      scoreQuery.refetch(),
      savedRecipes.refetch(),
      savedExercises.refetch(),
    ]);
    setRefreshing(false);
  }, [recipesQuery, exercisesQuery, scoreQuery, savedRecipes, savedExercises]);

  // Picks in one swipeable row (meal, exercise, meal, exercise), with dots for where you are.
  const pickRow = useMemo(
    () =>
      interleavePicks(
        picksForScore(
          scoreQuery.data?.recommendations,
          recipes,
          exercises,
          tier,
          2,
          scoreQuery.data?.hidden,
          (e) => exerciseAllowed(scoreQuery.data?.screening, e)
        )
      ),
    [scoreQuery.data, recipes, exercises, tier]
  );
  const [pickIndex, setPickIndex] = useState(0);
  const savedItems = useMemo(
    () => [
      ...recipes
        .filter((r) => savedRecipes.ids.includes(r.id))
        .map((r) => ({ kind: "recipe" as const, recipe: r })),
      ...exercises
        .filter((e) => savedExercises.ids.includes(e.id))
        .map((e) => ({ kind: "exercise" as const, exercise: e })),
    ],
    [recipes, exercises, savedRecipes.ids, savedExercises.ids]
  );

  const q = searchQuery.trim().toLowerCase();
  const foundRecipes = q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : [];
  const foundExercises = q ? exercises.filter((e) => e.title.toLowerCase().includes(q)) : [];

  const openRecipe = (id: string) =>
    router.push(`/(home)/(meals)/recipe-details?id=${id}` as never);
  const openExercise = (id: string) =>
    router.push({ pathname: "/(home)/(health)/exercise-session", params: { id } });

  const band = bandStyle(tier, c, isDark);
  const loading = recipesQuery.isLoading || exercisesQuery.isLoading;

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, gap: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />
        }
      >
        {/* Page Header & Search Section */}
        <Animated.View
          entering={FadeInDown.duration(260).easing(CUBIC_OUT)}
          style={{ paddingHorizontal: 20, paddingTop: 6, gap: 14 }}
        >
          <View style={{ gap: 2 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 28, fontWeight: "700", color: c.ink, letterSpacing: -0.5 }}
            >
              Explore
            </Text>
            <Text style={{ fontSize: 13.5, color: c.slate }}>
              Personalized meals and gentle activities for your heart
            </Text>
          </View>

          {/* Search Input */}
          <View
            style={{
              height: 48,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#E2E8F0",
              backgroundColor: isDark ? c.surface : "#F8FAFC",
            }}
          >
            <Feather name="search" size={17} color={c.steel} />
            <TextInput
              placeholder="Search meals and exercises"
              placeholderTextColor={c.steel}
              accessibilityLabel="Search meals and exercises"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 0 }}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: isDark ? c.surfaceAlt : "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={13} color={c.charcoal} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick Discovery Cards: All meals / All exercises */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              {
                label: "All meals",
                sub: "Heart-healthy recipes",
                icon: "coffee" as const,
                count: recipes.length,
                href: "/(home)/(tabs)/recipes" as const,
                badgeBg: isDark ? "rgba(245, 158, 11, 0.18)" : c.peach,
                badgeFg: isDark ? "#FBBF24" : "#D97706",
              },
              {
                label: "All exercises",
                sub: "Gentle movement",
                icon: "activity" as const,
                count: exercises.length,
                href: "/(home)/(tabs)/exercises" as const,
                badgeBg: isDark ? "rgba(16, 185, 129, 0.18)" : c.mint,
                badgeFg: isDark ? "#34D399" : "#059669",
              },
            ].map((b) => (
              <AnimatedButton
                key={b.label}
                onPress={() => router.push({ pathname: b.href, params: { from: "explore" } })}
                accessibilityRole="button"
                accessibilityLabel={`${b.label}, ${b.count}`}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isDark ? c.hairline : "#E2E8F0",
                  backgroundColor: isDark ? c.surface : c.canvas,
                  justifyContent: "space-between",
                  gap: 10,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.25 : 0.05,
                      shadowRadius: 6,
                    },
                    android: { elevation: 2 },
                  }),
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: b.badgeBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={b.icon} size={18} color={b.badgeFg} />
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2.5,
                      borderRadius: 999,
                      backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: c.slate,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {b.count}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: c.ink,
                      letterSpacing: -0.2,
                    }}
                  >
                    {b.label}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: c.slate, marginTop: 1 }}>
                    {b.sub}
                  </Text>
                </View>
              </AnimatedButton>
            ))}
          </View>

          {/* HL-155: the week's meal plan (Premium), where people look for food. Hidden while searching. */}
          {!q ? <MealPlanCard /> : null}
        </Animated.View>

        {/* Search Results Mode */}
        {q ? (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>
              {foundRecipes.length + foundExercises.length} results for &quot;{searchQuery.trim()}&quot;
            </Text>
            {foundRecipes.map((r) => (
              <RecipeRow key={`r-${r.id}`} recipe={r} onPress={() => openRecipe(r.id)} />
            ))}
            {foundExercises.map((e) => (
              <ExerciseRow key={`e-${e.id}`} exercise={e} onPress={() => openExercise(e.id)} />
            ))}
            {foundRecipes.length + foundExercises.length === 0 ? (
              <View
                style={{
                  padding: 24,
                  borderRadius: 16,
                  backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: isDark ? c.hairline : "#E2E8F0",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Feather name="search" size={24} color={c.steel} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: c.ink,
                    textAlign: "center",
                  }}
                >
                  No matches found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 19,
                    color: c.slate,
                    textAlign: "center",
                  }}
                >
                  No approved meals or exercises match &quot;{searchQuery.trim()}&quot;. Try another word or check category lists.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* Normal Discovery View */
          <>
            {/* 1. Picked for your score */}
            <Animated.View
              entering={FadeInDown.delay(70).duration(260).easing(CUBIC_OUT)}
              style={{ gap: 12 }}
            >
              <View style={{ paddingHorizontal: 20, gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    accessibilityRole="header"
                    style={{ fontSize: 20, fontWeight: "700", color: c.ink, letterSpacing: -0.3 }}
                  >
                    Picked for your score
                  </Text>
                  {pickRow.length > 1 ? (
                    <Text style={{ fontSize: 12.5, fontWeight: "500", color: c.slate }}>
                      Swipe for all {pickRow.length}
                    </Text>
                  ) : null}
                </View>

                {tier && tier !== "Unknown" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 3.5,
                        borderRadius: 999,
                        backgroundColor: band.bg,
                        borderWidth: band.border ? 1 : 0,
                        borderColor: band.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: band.fg }}>
                        {score !== null ? `${bandName(tier ?? "")} • ${Math.round(score)}` : bandName(tier ?? "")}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: c.slate }}>
                      Tailored to your latest vitals
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: c.slate }}>
                    Log a check-in to get picks for your score.
                  </Text>
                )}
              </View>

              {loading ? (
                <View style={{ paddingHorizontal: 20, gap: 8 }}>
                  <Skeleton style={{ height: 210, borderRadius: 16 }} />
                </View>
              ) : pickRow.length === 0 ? (
                <View
                  style={{
                    marginHorizontal: 20,
                    padding: 18,
                    borderRadius: 16,
                    backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isDark ? c.hairline : "#E2E8F0",
                  }}
                >
                  <Text style={{ fontSize: 14.5, lineHeight: 21, color: c.charcoal }}>
                    No picks yet. Your care team is still approving meals and exercises.
                  </Text>
                </View>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={PICK_CARD_WIDTH + PICK_GAP}
                    decelerationRate="fast"
                    onScroll={(e) =>
                      setPickIndex(
                        Math.round(e.nativeEvent.contentOffset.x / (PICK_CARD_WIDTH + PICK_GAP))
                      )
                    }
                    scrollEventThrottle={32}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: PICK_GAP }}
                  >
                    {pickRow.map((p) => (
                      <PickCard
                        key={p.kind === "recipe" ? `r-${p.recipe.id}` : `e-${p.exercise.id}`}
                        pick={p}
                        reason={pickReason(p)}
                        onPress={() =>
                          p.kind === "recipe"
                            ? openRecipe(p.recipe.id)
                            : openExercise(p.exercise.id)
                        }
                      />
                    ))}
                  </ScrollView>

                  {pickRow.length > 1 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                    >
                      {pickRow.map((p, i) => (
                        <View
                          key={i}
                          style={{
                            width: i === pickIndex ? 20 : 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor:
                              i === pickIndex
                                ? c.primary
                                : isDark
                                ? c.hairlineStrong
                                : "#CBD5E1",
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  <Text
                    style={{
                      paddingHorizontal: 20,
                      fontSize: 12,
                      lineHeight: 17,
                      color: c.slate,
                    }}
                  >
                    Picks support healthy habits. They are not a diagnosis.
                  </Text>
                </>
              )}
            </Animated.View>

            {/* 2. Browse by need */}
            <Animated.View
              entering={FadeInDown.delay(120).duration(260).easing(CUBIC_OUT)}
              style={{ paddingHorizontal: 20, gap: 12 }}
            >
              <View style={{ gap: 2 }}>
                <Text
                  accessibilityRole="header"
                  style={{ fontSize: 20, fontWeight: "700", color: c.ink, letterSpacing: -0.3 }}
                >
                  Browse by need
                </Text>
                <Text style={{ fontSize: 13, color: c.slate }}>
                  Targeted recipes and movement for specific goals
                </Text>
              </View>

              {[
                ["low-sodium", "quick"],
                ["seated", "breathing"],
              ].map((row) => (
                <View key={row.join()} style={{ flexDirection: "row", gap: 10 }}>
                  {(row as NeedId[]).map((id) => (
                    <NeedTile
                      key={id}
                      title={NEEDS[id].title}
                      blurb={NEEDS[id].blurb}
                      icon={NEED_CONFIG[id].icon}
                      tone={NEED_CONFIG[id].badgeBg(c, isDark)}
                      iconColor={NEED_CONFIG[id].iconColor(c, isDark)}
                      onPress={() =>
                        router.push({
                          pathname: "/(home)/(meals)/browse",
                          params: { need: id },
                        })
                      }
                    />
                  ))}
                </View>
              ))}
            </Animated.View>

            {/* 3. Saved */}
            <Animated.View
              entering={FadeInDown.delay(160).duration(260).easing(CUBIC_OUT)}
              style={{ paddingHorizontal: 20, gap: 12 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: c.ink,
                      letterSpacing: -0.3,
                    }}
                  >
                    Saved
                  </Text>
                  <Text style={{ fontSize: 13, color: c.slate }}>
                    Your bookmarked recipes and routines
                  </Text>
                </View>

                {savedItems.length ? (
                  <TouchableOpacity
                    onPress={() => router.push("/(home)/(meals)/saved")}
                    accessibilityRole="button"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: isDark ? c.surfaceAlt : "#EFF6FF",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>
                      See all ({savedItems.length})
                    </Text>
                    <Feather name="chevron-right" size={14} color={c.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {savedItems.length ? (
                savedItems
                  .slice(0, 2)
                  .map((item) =>
                    item.kind === "recipe" ? (
                      <RecipeRow
                        key={`r-${item.recipe.id}`}
                        recipe={item.recipe}
                        onPress={() => openRecipe(item.recipe.id)}
                      />
                    ) : (
                      <ExerciseRow
                        key={`e-${item.exercise.id}`}
                        exercise={item.exercise}
                        onPress={() => openExercise(item.exercise.id)}
                      />
                    )
                  )
              ) : (
                <View
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isDark ? c.hairline : "#E2E8F0",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isDark ? c.surface : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isDark ? c.hairline : "#E2E8F0",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="bookmark" size={18} color={c.steel} />
                  </View>
                  <Text
                    style={{
                      fontSize: 14.5,
                      fontWeight: "600",
                      color: c.ink,
                      textAlign: "center",
                    }}
                  >
                    No saved items yet
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: c.slate,
                      textAlign: "center",
                    }}
                  >
                    Tap the bookmark on a meal or exercise to keep it here.
                  </Text>
                </View>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

/** The score band as a tinted tag (HEARTLINK.md), using the server's level names. */
function bandStyle(tier: string | null, c: ReturnType<typeof useDs>["c"], isDark: boolean) {
  if (tier === "Stable") {
    return {
      bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
      fg: isDark ? "#34D399" : "#059669",
      border: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
    };
  }
  if (tier === "Moderate") {
    return {
      bg: isDark ? "rgba(234, 179, 8, 0.18)" : "#FEF3C7",
      fg: isDark ? "#FCD34D" : "#B45309",
      border: isDark ? "rgba(234, 179, 8, 0.3)" : "#FDE68A",
    };
  }
  if (tier === "Elevated Risk") {
    return {
      bg: isDark ? "rgba(245, 158, 11, 0.18)" : "#FFF7ED",
      fg: isDark ? "#FB923C" : "#C2410C",
      border: isDark ? "rgba(245, 158, 11, 0.3)" : "#FFEDD5",
    };
  }
  return {
    bg: isDark ? "rgba(239, 68, 68, 0.18)" : "#FEF2F2",
    fg: isDark ? "#F87171" : "#DC2626",
    border: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
  };
}
