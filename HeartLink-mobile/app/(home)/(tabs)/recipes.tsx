import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import Reanimated, { FadeInDown } from "react-native-reanimated";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  prepTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  image: string;
  tags: string[];
  heartBenefit: string;
  nutrition: {
    sodium: number;
    fiber: number;
    saturatedFat?: number;
    calories: number;
  };
  ingredients: { qty: string; item: string }[];
  steps: string[];
}

// ─── Difficulty config (no dynamic className) ─────────────────────────────────

const DIFFICULTY_CONFIG = {
  Easy:   { bg: "#eaf3de", text: "#3b6d11" },
  Medium: { bg: "#faeeda", text: "#854f0b" },
  Hard:   { bg: "#fcebeb", text: "#a32d2d" },
} as const;

// ─── Nutrition Pill ───────────────────────────────────────────────────────────

function NutritionPill({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <View
      className="flex-1 rounded-xl px-2.5 py-2 border"
      style={{
        backgroundColor: highlight ? "#eaf3de" : "#f8fafc",
        borderColor: highlight ? "#c0dd97" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[13px] font-medium"
        style={{ color: highlight ? "#3b6d11" : "#0f172a" }}
      >
        {value}
        <Text className="text-[11px] font-normal text-slate-400 dark:text-slate-500"> {unit}</Text>
      </Text>
      <Text 
        className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onPress, isSaved, onSave }: { recipe: Recipe; onPress: () => void; isSaved: boolean; onSave: () => void }) {
  const isSodiumSafe = recipe.nutrition.sodium < 140;
  const diffCfg = DIFFICULTY_CONFIG[recipe.difficulty];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-5"
    >
      {/* Image */}
      <View className="h-[160px] bg-slate-100 dark:bg-slate-800 relative items-center justify-center">
        {/* Fallback Icon */}
        <MaterialCommunityIcons name="silverware-fork-knife" size={32} className="text-slate-300 dark:text-slate-700 absolute" />
        {!!recipe.image && (
          <Image
            source={{ uri: recipe.image }}
            className="w-full h-full absolute"
            resizeMode="cover"
          />
        )}
        {/* Save Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => { e.stopPropagation(); onSave(); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm"
        >
          <Feather name="heart" size={15} color={isSaved ? "#ef4444" : "#64748b"} />
        </TouchableOpacity>

        {/* Prep time */}
        <View className="absolute bottom-3 left-3 flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
          <Feather name="clock" size={12} color="rgba(255,255,255,0.9)" />
          <Text className="text-white text-[11px] font-medium">{recipe.prepTime} min</Text>
        </View>
        {/* Difficulty */}
        <View
          className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg"
          style={{ backgroundColor: diffCfg.bg }}
        >
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: diffCfg.text }}>
            {recipe.difficulty}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        {/* Tags */}
        <View className="flex-row flex-wrap gap-1.5 mb-2.5">
          {recipe.tags.map((tag) => (
            <View
              key={tag}
              className="px-2 py-0.5 rounded-md border"
              style={{
                backgroundColor: tag === "Low Sodium" ? "#eaf3de" : "#f8fafc",
                borderColor: tag === "Low Sodium" ? "#c0dd97" : "#e2e8f0",
              }}
            >
              <Text
                className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: tag === "Low Sodium" ? "#3b6d11" : "#94a3b8" }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-0.5 leading-snug">
          {recipe.title}
        </Text>
        <Text className="text-[13px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-4">
          {recipe.subtitle}
        </Text>

        {/* Nutrition row */}
        <View className="flex-row gap-2">
          <NutritionPill label="Sodium" value={recipe.nutrition.sodium} unit="mg" highlight={isSodiumSafe} />
          <NutritionPill label="Fiber" value={recipe.nutrition.fiber} unit="g" />
          <NutritionPill label="Sat. Fat" value={recipe.nutrition.saturatedFat || 0} unit="g" />
          <NutritionPill label="Calories" value={recipe.nutrition.calories} unit="cal" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`px-4 py-3 min-h-[44px] rounded-full border flex-row items-center justify-center ${active ? "bg-primary border-primary" : "bg-card border-border"}`}
    >
      <Text
        className={`text-[13px] font-medium ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recipes Screen ───────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);
  const [timeMessage, setTimeMessage] = useState<string | null>(null);
  
  const [recipesList, setRecipesList] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Dynamically resolve patient conditions from profile and clinical baselines
  const userConditions = useMemo(() => {
    const list: string[] = [];
    if (user?.conditions && Array.isArray(user.conditions)) {
      list.push(...user.conditions);
    }
    const goals = user?.health_goals || [];
    if (goals.includes("bp") && !list.includes("Hypertension")) {
      list.push("Hypertension");
    }
    if (goals.includes("cholesterol") && !list.includes("High Cholesterol") && !list.includes("Hyperlipidemia")) {
      list.push("High Cholesterol");
    }
    return list;
  }, [user]);

  const hasHypertension = userConditions.includes("Hypertension");
  const hasHighCholesterol = userConditions.includes("High Cholesterol") || userConditions.includes("Hyperlipidemia");

  const fetchRecipes = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${base_url}/api/recipes/`);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((r: any) => ({
          id: r.id,
          title: r.name,
          subtitle: r.subtitle || "",
          prepTime: r.prep_time_minutes || 0,
          servings: r.servings || 1,
          difficulty: r.difficulty || "Easy",
          image: r.image_url || "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=200&q=80",
          tags: r.tags || [],
          heartBenefit: r.heart_benefit || "",
          nutrition: {
            sodium: r.sodium_mg || 0,
            fiber: r.fiber_g || 0,
            saturatedFat: r.saturated_fat_g || 0,
            calories: r.calories || 0,
          },
          ingredients: Array.isArray(r.ingredients)
            ? r.ingredients.map((ing: any) => ({ qty: `${ing.amount} ${ing.unit}`.trim(), item: ing.name }))
            : r.ingredients 
              ? Object.keys(r.ingredients).map(k => ({ qty: r.ingredients[k], item: k })) 
              : [],
          steps: r.steps || [],
        }));
        setRecipesList(mapped);
        setIsOffline(false);
        await AsyncStorage.setItem("@recipes_cache", JSON.stringify(mapped));
      } else {
        throw new Error("Failed to fetch recipes from API");
      }
    } catch (error) {
      console.log("Network request failed, falling back to local AsyncStorage cache...", error);
      setIsOffline(true);
      try {
        const cached = await AsyncStorage.getItem("@recipes_cache");
        if (cached) {
          setRecipesList(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.error("Failed to read recipes cache:", cacheErr);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Read local cache first for immediate offline rendering
    AsyncStorage.getItem("@recipes_cache").then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecipesList(parsed);
          }
        } catch {}
      }
    });
    fetchRecipes();
  }, [fetchRecipes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecipes(true);
  }, [fetchRecipes]);

  const filters = ["All", "Tailored For You", "Saved", "Low Sodium", "High Fiber", "Filipino", "Breakfast"];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
      setActiveFilter("Breakfast");
      setTimeMessage("Good morning! Here are some heart-healthy breakfast ideas.");
    } else if (hour >= 17 && hour <= 21) {
      setTimeMessage("Good evening! Time for a light, heart-healthy dinner.");
    }
  }, []);

  const toggleSave = (id: string) => {
    setSavedRecipes(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };

  const filteredRecipes = useMemo(() => {
    let results = recipesList;

    if (activeFilter === "Saved") {
      results = results.filter((r) => savedRecipes.includes(r.id));
    } else if (activeFilter === "Tailored For You") {
      results = results.filter((r) => {
        if (hasHypertension && r.nutrition.sodium >= 140) return false;
        if (hasHighCholesterol && r.nutrition.fiber < 5) return false;
        if (!hasHypertension && !hasHighCholesterol && r.nutrition.sodium > 400) return false;
        return true;
      });
    } else if (activeFilter !== "All") {
      results = results.filter((r) => r.tags.includes(activeFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return results;
  }, [activeFilter, searchQuery, savedRecipes, recipesList, hasHypertension, hasHighCholesterol]);

  const tailoredCount = useMemo(() => {
    return recipesList.filter((r) => {
      if (hasHypertension && r.nutrition.sodium >= 140) return false;
      if (hasHighCholesterol && r.nutrition.fiber < 5) return false;
      if (!hasHypertension && !hasHighCholesterol && r.nutrition.sodium > 400) return false;
      return true;
    }).length;
  }, [recipesList, hasHypertension, hasHighCholesterol]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Top bar ── */}
      <Header />

      <View className="flex-row items-center justify-between px-5 pt-4">
        <View className="flex-1 pr-2">
          <Text className="text-[26px] font-medium text-slate-900 dark:text-white tracking-tight">
            Recipes
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1} adjustsFontSizeToFit>
            Heart-healthy meals for you
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/daily-diary")}
          className="flex-row items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 px-3 py-3 min-h-[44px] rounded-xl mt-2"
        >
          <Feather name="list" size={14} color="#64748b" />
          <Text className="text-[12px] font-medium text-slate-600 dark:text-slate-300">History</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 gap-2.5">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search recipes, ingredients…"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-[15px] text-slate-900 dark:text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Banner */}
        {isOffline && (
          <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-4 py-2 rounded-xl mt-3">
            <Feather name="wifi-off" size={14} color="#d97706" />
            <Text className="text-[12px] font-medium text-amber-800 dark:text-amber-300 flex-1">
              Offline Mode — Showing saved recipes
            </Text>
          </View>
        )}
      </View>

      {/* Filter chips */}
      <View className="mt-2 mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2.5 py-1"
        >
          {filters.map((f) => (
            <FilterChip
              key={f}
              label={f === "Tailored For You" ? `Tailored (${tailoredCount})` : f}
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerClassName="pb-28 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
        }
      >
        {/* Tailored banner */}
        {activeFilter === "Tailored For You" && (
          <Reanimated.View entering={FadeInDown.delay(100).springify()} className="mx-5 mt-4 mb-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center flex-shrink-0">
              <Feather name="shield" size={18} color="#185fa5" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-0.5">
                Filtered for your conditions
              </Text>
              <Text className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {hasHypertension && "Showing recipes with < 140 mg sodium for blood pressure. "}
                {hasHighCholesterol && "Prioritising high-fiber recipes (≥ 5 g) for cholesterol. "}
                {!hasHypertension && !hasHighCholesterol && "Curated heart-healthy meals optimized for cardiac stability. "}
                Based on your health baseline.
              </Text>
            </View>
          </Reanimated.View>
        )}

        {/* Time Message Banner */}
        {timeMessage && activeFilter !== "Tailored For You" && activeFilter !== "Saved" && (
          <Reanimated.View entering={FadeInDown.delay(100).springify()} className="mx-5 mt-4 mb-2 bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/60 items-center justify-center">
              <Feather name="sun" size={18} color="#4338ca" />
            </View>
            <Text className="flex-1 text-[14px] font-medium text-indigo-900 leading-snug">{timeMessage}</Text>
          </Reanimated.View>
        )}

        {/* Recipe list */}
        <View className="px-5 mt-4">
          {isLoading && !refreshing ? (
            <View className="gap-4">
              {[1, 2, 3].map((key) => (
                <View key={key} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800/70 flex-row">
                  <Skeleton className="w-24 h-24 rounded-2xl mr-4" />
                  <View className="flex-1 justify-center">
                    <Skeleton className="w-3/4 h-5 mb-2.5" />
                    <Skeleton className="w-full h-4 mb-3" />
                    <View className="flex-row gap-2">
                      <Skeleton className="w-16 h-5 rounded-md" />
                      <Skeleton className="w-16 h-5 rounded-md" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : filteredRecipes.length === 0 ? (
            <EmptyState
              icon={<Feather name="search" size={26} color="#cbd5e1" />}
              title="No recipes found"
              subtitle="Try a different search or filter."
              className="pt-16"
            />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredRecipes.map((recipe, index) => (
                <Reanimated.View key={recipe.id} entering={FadeInDown.delay(200 + index * 100).springify()} className="w-full md:w-[48%] lg:w-[31%] mb-4">
                  <RecipeCard
                    recipe={recipe}
                  isSaved={savedRecipes.includes(recipe.id)}
                  onSave={() => toggleSave(recipe.id)}
                  onPress={() =>
                    router.push({
                      pathname: "/(home)/(meals)/recipe-details",
                      params: { id: recipe.id },
                    })
                  }
                  />
                </Reanimated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
