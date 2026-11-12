import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Header } from "../../../components/Header";
import { useDs } from "../../../components/onboarding/useDs";
import { BadgeTint, IconBadge, McIcon } from "../../../components/onboarding/QuestionLayout";
import { bandTag } from "../../../components/dashboard/ScoreCard";
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
import { exerciseOpenNow } from "../../../services/exerciseSession";

// Explore: picks for the patient, browse by need, and saved items. Built on the design system (DESIGN.md with
// HEARTLINK.md): flat white cards with hairline borders and 12px corners, pastel icon badges by topic, ds-* colours.

const PICK_GAP = 12;
const CUBIC_OUT = Easing.out(Easing.cubic);

// Topic colours from HEARTLINK.md: food is peach (quick meals yellow), movement mint, breathing sky.
const NEED_BADGE: Record<NeedId, { icon: McIcon; tint: BadgeTint }> = {
  "low-sodium": { icon: "bowl-mix-outline", tint: "peach" },
  quick: { icon: "timer-outline", tint: "yellow" },
  seated: { icon: "seat-outline", tint: "mint" },
  breathing: { icon: "weather-windy", tint: "sky" },
};

/** A section heading with an optional line under it and something on the right (a count, a link). */
function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: "600", color: c.ink }}>
          {title}
        </Text>
        {sub ? <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** A grey note for an empty list, with an optional icon. */
function EmptyNote({ icon, title, text }: { icon?: keyof typeof Feather.glyphMap; title?: string; text: string }) {
  const { c } = useDs();
  return (
    <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface, gap: 6 }}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Feather name={icon} size={16} color={c.charcoal} /> : null}
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{title}</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>{text}</Text>
    </View>
  );
}

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
          (e) => exerciseOpenNow(scoreQuery.data?.screening, !!scoreQuery.data?.resting, e)
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

  const openRecipe = (id: string) => router.push(`/(home)/(meals)/recipe-details?id=${id}` as never);
  const openExercise = (id: string) => router.push({ pathname: "/(home)/(health)/exercise-session", params: { id } });

  const hasTier = !!tier && tier !== "Unknown";
  // As on Today: under 50 the score is critical and there are no picks; the care team's advice comes first
  const critical = score !== null && score < 50;
  const band = bandTag(tier ?? "", hasTier, c);
  const loading = recipesQuery.isLoading || exercisesQuery.isLoading;

  const shortcuts = [
    {
      label: "All meals",
      sub: "Heart-healthy recipes",
      icon: "food-apple-outline" as McIcon,
      tint: "peach" as BadgeTint,
      count: recipes.length,
      href: "/(home)/(tabs)/recipes" as const,
    },
    {
      label: "All exercises",
      sub: "Gentle movement",
      icon: "walk" as McIcon,
      tint: "mint" as BadgeTint,
      count: exercises.length,
      href: "/(home)/(tabs)/exercises" as const,
    },
  ];

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, gap: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        {/* Title, search and the two ways into everything */}
        <Animated.View entering={FadeInDown.duration(260).easing(CUBIC_OUT)} style={{ paddingHorizontal: 20, paddingTop: 4, gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", color: c.ink }}>
              Explore
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
              Meals and gentle movement, approved by your care team.
            </Text>
          </View>

          {/* Search: the design system's search field */}
          <View
            style={{
              height: 48,
              paddingLeft: 14,
              paddingRight: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.hairline,
              backgroundColor: c.surface,
            }}
          >
            <Feather name="search" size={18} color={c.steel} />
            <TextInput
              placeholder="Search meals and exercises"
              placeholderTextColor={c.steel}
              accessibilityLabel="Search meals and exercises"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 16, color: c.ink, paddingVertical: 0 }}
            />
            {searchQuery.length > 0 ? (
              <AnimatedButton
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={{ width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="x" size={18} color={c.slate} />
              </AnimatedButton>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {shortcuts.map((b) => (
              <AnimatedButton
                key={b.label}
                onPress={() => router.push({ pathname: b.href, params: { from: "explore" } })}
                accessibilityRole="button"
                accessibilityLabel={`${b.label}, ${b.count}`}
                style={{
                  flex: 1,
                  padding: 14,
                  gap: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.hairline,
                  backgroundColor: c.canvas,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <IconBadge icon={b.icon} tint={b.tint} size={40} />
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.surfaceAlt }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate, fontVariant: ["tabular-nums"] }}>{b.count}</Text>
                  </View>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{b.label}</Text>
                  <Text style={{ fontSize: 13, color: c.slate }}>{b.sub}</Text>
                </View>
              </AnimatedButton>
            ))}
          </View>

          {/* HL-155: the week's meal plan (Premium), where people look for food. Hidden while searching. */}
          {!q ? <MealPlanCard /> : null}
        </Animated.View>

        {q ? (
          /* Search results */
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.slate }}>
              {`${foundRecipes.length + foundExercises.length} ${foundRecipes.length + foundExercises.length === 1 ? "result" : "results"} for "${searchQuery.trim()}"`}
            </Text>
            {foundRecipes.map((r) => (
              <RecipeRow key={`r-${r.id}`} recipe={r} onPress={() => openRecipe(r.id)} />
            ))}
            {foundExercises.map((e) => (
              <ExerciseRow key={`e-${e.id}`} exercise={e} onPress={() => openExercise(e.id)} />
            ))}
            {foundRecipes.length + foundExercises.length === 0 ? (
              <EmptyNote
                icon="search"
                title="No matches"
                text={`No approved meals or exercises match "${searchQuery.trim()}". Try another word, or open All meals or All exercises.`}
              />
            ) : null}
          </View>
        ) : (
          <>
            {/* 1. Picked for you: meals for the score level, exercises the safety check allows */}
            <Animated.View entering={FadeInDown.delay(70).duration(260).easing(CUBIC_OUT)} style={{ gap: 14 }}>
              <View style={{ paddingHorizontal: 20, gap: 8 }}>
                <SectionTitle
                  title="Picked for you"
                  right={
                    pickRow.length > 1 && !critical ? (
                      <Text style={{ fontSize: 13, color: c.steel, paddingBottom: 3 }}>{`Swipe for all ${pickRow.length}`}</Text>
                    ) : null
                  }
                />
                {hasTier ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: band.bg }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: band.fg }}>
                        {score !== null ? `${band.text} · ${Math.round(score)}` : band.text}
                      </Text>
                    </View>
                    <Text style={{ flexShrink: 1, fontSize: 13, lineHeight: 18, color: c.slate }}>
                      Meals for your level, exercises your safety check allows
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                    Log a check-in to get meals picked for your score.
                  </Text>
                )}
              </View>

              {critical ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <EmptyNote
                    icon="pause-circle"
                    title="Picks are paused for now"
                    text="Your score is in its lowest band, so there are no picks, as on Today. Follow your care team's advice first. The lists below are still here."
                  />
                </View>
              ) : loading ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <Skeleton style={{ height: 230, width: PICK_CARD_WIDTH, borderRadius: 12 }} />
                </View>
              ) : pickRow.length === 0 ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <EmptyNote text="No picks yet. Your care team is still approving meals and exercises." />
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
                    <View
                      style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                    >
                      {pickRow.map((p, i) => (
                        <View
                          key={i}
                          style={{
                            width: i === pickIndex ? 18 : 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: i === pickIndex ? c.line : c.hairlineStrong,
                          }}
                        />
                      ))}
                    </View>
                  ) : null}

                  <Text style={{ paddingHorizontal: 20, fontSize: 13, lineHeight: 18, color: c.steel }}>
                    Picks support healthy habits. They are not a diagnosis.
                  </Text>
                </>
              )}
            </Animated.View>

            {/* 2. Browse by need */}
            <Animated.View entering={FadeInDown.delay(120).duration(260).easing(CUBIC_OUT)} style={{ paddingHorizontal: 20, gap: 14 }}>
              <SectionTitle title="Browse by need" sub="Meals and movement for one goal at a time" />
              {(
                [
                  ["low-sodium", "quick"],
                  ["seated", "breathing"],
                ] as NeedId[][]
              ).map((row) => (
                <View key={row.join()} style={{ flexDirection: "row", gap: 12 }}>
                  {row.map((id) => (
                    <NeedTile
                      key={id}
                      title={NEEDS[id].title}
                      blurb={NEEDS[id].blurb}
                      icon={NEED_BADGE[id].icon}
                      tint={NEED_BADGE[id].tint}
                      onPress={() => router.push({ pathname: "/(home)/(meals)/browse", params: { need: id } })}
                    />
                  ))}
                </View>
              ))}
            </Animated.View>

            {/* 3. Saved */}
            <Animated.View entering={FadeInDown.delay(160).duration(260).easing(CUBIC_OUT)} style={{ paddingHorizontal: 20, gap: 14 }}>
              <SectionTitle
                title="Saved"
                sub="Meals and exercises you bookmarked"
                right={
                  savedItems.length ? (
                    <AnimatedButton
                      onPress={() => router.push("/(home)/(meals)/saved")}
                      accessibilityRole="button"
                      accessibilityLabel={`See all ${savedItems.length} saved`}
                      style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, paddingLeft: 8 }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{`See all (${savedItems.length})`}</Text>
                      <Feather name="chevron-right" size={16} color={c.ink} />
                    </AnimatedButton>
                  ) : null
                }
              />

              {savedItems.length ? (
                savedItems
                  .slice(0, 2)
                  .map((item) =>
                    item.kind === "recipe" ? (
                      <RecipeRow key={`r-${item.recipe.id}`} recipe={item.recipe} onPress={() => openRecipe(item.recipe.id)} />
                    ) : (
                      <ExerciseRow key={`e-${item.exercise.id}`} exercise={item.exercise} onPress={() => openExercise(item.exercise.id)} />
                    )
                  )
              ) : (
                <EmptyNote icon="bookmark" title="Nothing saved yet" text="Tap the bookmark on a meal or exercise to keep it here." />
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
