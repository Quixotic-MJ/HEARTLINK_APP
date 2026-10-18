import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { FoodHeader, OutlineButton, TickBox } from "../../../components/food/FoodBits";
import { FoodItem, FoodSource, SOURCE_ORDER, SOURCE_RULES, formatMg } from "../../../services/foodLogging";
import { fetchRecentMeals, fetchRecipes, searchPackagedFoods } from "../../../services/foodSearch";

// HL-032: one search over the patient's recent meals, HeartLink recipes and packaged
// foods (Open Food Facts). Tapping a row picks it; one button takes the picks to review.

type Results = Record<FoodSource, FoodItem[]>;
const EMPTY: Results = { recent: [], recipe: [], packaged: [] };

function FoodRow({ item, on, onToggle, onViewRecipe }: { item: FoodItem; on: boolean; onToggle: () => void; onViewRecipe?: () => void }) {
  const { c } = useDs();
  const rule = SOURCE_RULES[item.source];
  const meta = `${formatMg(item.base.sodium_mg)} mg sodium, ${Math.round(item.base.calories)} kcal ${rule.per}`;
  return (
    <AnimatedButton
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${item.name}. ${meta}`}
      style={{
        minHeight: 64,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: on ? c.line : c.hairline,
        backgroundColor: on ? c.tint : c.canvas,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text style={{ flexShrink: 1, fontSize: 16, fontWeight: "500", color: c.ink }} numberOfLines={2}>
            {item.name}
          </Text>
          {item.recommended ? <Feather name="star" size={13} color={c.warmText} accessibilityLabel="Recommended for you" /> : null}
        </View>
        <Text style={{ fontSize: 13, color: c.slate }}>{meta}</Text>
        {onViewRecipe ? (
          <AnimatedButton
            onPress={onViewRecipe}
            accessibilityRole="link"
            accessibilityLabel={`View recipe for ${item.name}`}
            hitSlop={8}
            style={{ alignSelf: "flex-start", paddingVertical: 2 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>View recipe</Text>
          </AnimatedButton>
        ) : null}
      </View>
      <TickBox on={on} />
    </AnimatedButton>
  );
}

export default function SearchMealScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token } = useUser();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [recipeError, setRecipeError] = useState(false);
  const [packagedError, setPackagedError] = useState(false);
  const [picked, setPicked] = useState<Record<string, FoodItem>>({});
  const [recent, setRecent] = useState<FoodItem[]>([]);

  // Recent meals load once; the search box filters them.
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetchRecentMeals(userId, token, controller.signal)
      .then(setRecent)
      .catch(() => setRecent([]));
    return () => controller.abort();
  }, [userId, token]);

  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const [recipes, packaged] = await Promise.allSettled([
        fetchRecipes(q, token, controller.signal),
        searchPackagedFoods(q, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setRecipeError(recipes.status === "rejected");
      setPackagedError(packaged.status === "rejected" && q.length > 0);
      const seen = new Set<string>();
      const unique = (list: FoodItem[]) => list.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
      setResults({
        recent: [],
        recipe: recipes.status === "fulfilled" ? unique(recipes.value) : [],
        packaged: packaged.status === "fulfilled" ? unique(packaged.value) : [],
      });
      setLoading(false);
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, token]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const all: Results = {
      ...results,
      recent: q ? recent.filter((f) => f.name.toLowerCase().includes(q)) : recent,
    };
    return SOURCE_ORDER.map((source) => ({ source, items: all[source] })).filter((g) => g.items.length > 0);
  }, [results, recent, q]);

  // A new search shows the loading placeholders until its results arrive.
  const changeQuery = (text: string) => {
    setQuery(text);
    setLoading(true);
  };

  const pickedList = Object.values(picked);
  const count = pickedList.length;
  const toggle = (item: FoodItem) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });

  const GROUP_NOTE: Record<FoodSource, string> = {
    recent: "As you logged them",
    recipe: "Per serving",
    packaged: "From Open Food Facts, per 100 g",
  };
  const groupNote = (source: FoodSource) => GROUP_NOTE[source];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <FoodHeader title="Add food" onBack={() => router.back()} backLabel="Back to food diary" />

      <View className="px-5 pb-3" style={{ gap: 10, borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
        <View className="flex-row items-center" style={{ height: 48, paddingHorizontal: 14, gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline, borderRadius: 8 }}>
          <Feather name="search" size={18} color={c.steel} />
          <TextInput
            value={query}
            onChangeText={changeQuery}
            placeholder="Search food or a recipe"
            placeholderTextColor={c.steel}
            accessibilityLabel="Search food or a recipe"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 16, color: c.ink, paddingVertical: 0 }}
          />
          {query ? (
            <AnimatedButton onPress={() => changeQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <Feather name="x" size={18} color={c.steel} />
            </AnimatedButton>
          ) : null}
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <OutlineButton label="Scan barcode" icon="camera" onPress={() => router.push("/(home)/(meals)/barcode-scan")} />
          <OutlineButton label="Estimate a meal" icon="edit-3" onPress={() => router.push("/(home)/(meals)/estimate-meal")} />
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        {loading && groups.length === 0 ? (
          <View style={{ paddingTop: 20, gap: 8 }}>
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} style={{ height: 64, borderRadius: 12 }} />
            ))}
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.source} style={{ paddingTop: 20 }}>
            <View className="flex-row items-baseline justify-between" style={{ marginBottom: 8, gap: 12 }}>
              <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
                {SOURCE_RULES[group.source].group}
              </Text>
              <Text style={{ fontSize: 13, color: c.slate }}>{groupNote(group.source)}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {group.items.map((item) => (
                <FoodRow
                  key={item.id}
                  item={item}
                  on={!!picked[item.id]}
                  onToggle={() => toggle(item)}
                  onViewRecipe={item.source === "recipe" ? () => router.push({ pathname: "/(home)/(meals)/meal-detail", params: { id: item.id } }) : undefined}
                />
              ))}
            </View>
          </View>
        ))}

        {packagedError ? (
          <Text style={{ marginTop: 16, fontSize: 13, color: c.slate, lineHeight: 19 }}>
            {"Packaged foods couldn't load. Check your connection, or scan the barcode instead."}
          </Text>
        ) : null}

        {!loading && groups.length === 0 ? (
          <View style={{ marginTop: 24, padding: 20, borderRadius: 12, backgroundColor: c.surface, gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
              {recipeError ? "Food search isn't available right now" : q ? `No food matches "${query.trim()}"` : "Search for a food"}
            </Text>
            <Text style={{ fontSize: 14, color: c.slate, lineHeight: 21 }}>
              {recipeError
                ? "Check your connection and try again, or estimate the meal yourself."
                : "Try a shorter word, scan the barcode, or estimate the meal yourself."}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton
          label={count === 0 ? "Pick foods to log" : `Review ${count === 1 ? "1 food" : `${count} foods`}`}
          disabled={count === 0}
          onPress={() => router.push({ pathname: "/(home)/(meals)/multi-log-review", params: { items: JSON.stringify(pickedList) } })}
        />
      </View>
    </SafeAreaView>
  );
}
