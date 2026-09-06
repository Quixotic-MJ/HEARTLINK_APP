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
  Platform,
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
import { LinearGradient } from "expo-linear-gradient";

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

// ─── Difficulty config ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  Easy:   { bg: "#E8F5E1", text: "#2D6A10", label: "Easy" },
  Medium: { bg: "#FFF3E0", text: "#A85D00", label: "Medium" },
  Hard:   { bg: "#FFEBEE", text: "#B71C3B", label: "Hard" },
} as const;

// ─── Compact Nutrition Badge ──────────────────────────────────────────────────

function NutritionBadge({
  label,
  value,
  unit,
  highlight = false,
  warning = false,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  warning?: boolean;
}) {
  const badgeBg = highlight ? "#E8F5E1" : warning ? "#FEF3C7" : "#F1F5F3";
  const labelColor = highlight ? "#3F7F24" : warning ? "#B45309" : "#64748B";
  const valueColor = highlight ? "#2D6A10" : warning ? "#92400E" : "#1E293B";
  const unitColor = highlight ? "#4A8A2A" : warning ? "#B45309" : "#94A3B8";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 8,
        backgroundColor: badgeBg,
      }}
    >
      {highlight && (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: "#2D6A10",
            marginRight: 4,
          }}
        />
      )}
      {warning && (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: "#D97706",
            marginRight: 4,
          }}
        />
      )}
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "500",
          color: labelColor,
          marginRight: 2,
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: valueColor,
        }}
      >
        {value}
        <Text style={{ fontSize: 9.5, fontWeight: "500", color: unitColor }}>
          {unit}
        </Text>
      </Text>
    </View>
  );
}

// ─── Recipe Card (Premium Apple Health Style) ─────────────────────────────────

function RecipeCard({
  recipe,
  onPress,
  isSaved,
  onSave,
  hasHypertension = false,
}: {
  recipe: Recipe;
  onPress: () => void;
  isSaved: boolean;
  onSave: () => void;
  hasHypertension?: boolean;
}) {
  const isSodiumSafe = recipe.nutrition.sodium < 140;
  const isSodiumElevated = Boolean(hasHypertension && recipe.nutrition.sodium >= 300);
  const diffCfg = DIFFICULTY_CONFIG[recipe.difficulty];

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="rounded-3xl overflow-hidden mb-5"
      style={{
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "rgba(232,236,234,0.6)",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 16,
            shadowOpacity: 0.08,
          },
          android: {
            elevation: 4,
          },
        }),
      }}
    >
      {/* Image with Gradient Overlay */}
      <View className="h-[180px] bg-[#F1F5F3] relative items-center justify-center">
        {/* Fallback Icon */}
        <MaterialCommunityIcons name="silverware-fork-knife" size={32} color="#D1D9D5" style={{ position: "absolute" }} />
        {!!recipe.image && (
          <Image
            source={{ uri: recipe.image }}
            className="w-full h-full absolute"
            resizeMode="cover"
          />
        )}
        {/* Subtle bottom gradient for badge contrast */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.15)"]}
          locations={[0.4, 1]}
          className="absolute inset-0 w-full h-full"
        />

        {/* Save Button — Frosted Glass */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => { e.stopPropagation(); onSave(); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center"
          style={{
            backgroundColor: isSaved ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.92)",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 4,
                shadowOpacity: 0.1,
              },
              android: { elevation: 2 },
            }),
          }}
        >
          <Feather
            name="heart"
            size={16}
            color={isSaved ? "#EF4444" : "#64748B"}
          />
        </TouchableOpacity>

        {/* Prep time pill */}
        <View
          className="absolute bottom-3 left-3 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <Feather name="clock" size={11} color="rgba(255,255,255,0.9)" />
          <Text className="text-white text-[11px] font-semibold">{recipe.prepTime} min</Text>
        </View>

        {/* Difficulty badge */}
        <View
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: diffCfg.bg }}
        >
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: diffCfg.text }}>
            {recipe.difficulty}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="px-4 pt-3.5 pb-4">
        {/* Tags — Compact with dot indicators */}
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {recipe.tags.map((tag) => {
            const isLowSodium = tag === "Low Sodium";
            return (
              <View
                key={tag}
                className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: isLowSodium ? "#E8F5E1" : "#F4F7F5",
                }}
              >
                {isLowSodium && (
                  <View className="w-1 h-1 rounded-full bg-[#2D6A10]" />
                )}
                <Text
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: isLowSodium ? "#2D6A10" : "#8896A0" }}
                >
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>

        <Text className="text-[16px] font-bold text-[#152131] dark:text-white mb-0.5 leading-snug">
          {recipe.title}
        </Text>
        <Text className="text-[13px] text-[#64748B] dark:text-slate-400 mb-3 leading-relaxed" numberOfLines={2}>
          {recipe.subtitle}
        </Text>

        {/* Compact Nutrition Row */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <NutritionBadge
            label="Sodium"
            value={recipe.nutrition.sodium}
            unit="mg"
            highlight={isSodiumSafe}
            warning={isSodiumElevated}
          />
          <NutritionBadge label="Fiber" value={recipe.nutrition.fiber} unit="g" />
          <NutritionBadge label="Sat. Fat" value={recipe.nutrition.saturatedFat || 0} unit="g" />
          <NutritionBadge label="Calories" value={recipe.nutrition.calories} unit="cal" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Chip (Dark Active / Light Inactive) ──────────────────────────────

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
      className="min-h-[38px] rounded-full flex-row items-center justify-center"
      style={{
        paddingHorizontal: 16,
        paddingVertical: 7,
        backgroundColor: active ? "#152131" : "#F1F5F3",
        ...active ? Platform.select({
          ios: {
            shadowColor: "#152131",
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
            shadowOpacity: 0.2,
          },
          android: { elevation: 3 },
        }) : {},
      }}
    >
      <Text
        numberOfLines={1}
        className="text-[13px] font-semibold"
        style={{ color: active ? "#FFFFFF" : "#5C6B66" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recipes Screen ───────────────────────────────────────────────────────────

export default function RecipesScreen({
  hideHeader = false,
  isEmbedded = false,
}: {
  hideHeader?: boolean;
  isEmbedded?: boolean;
} = {}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user, userId, token } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);
  const [timeMessage, setTimeMessage] = useState<string | null>(null);
  
  const [recipesList, setRecipesList] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Scoped storage keys ensuring multi-user isolation on shared hardware (Role 5 / HL-ENG-03)
  const savedRecipesKey = userId ? `@saved_recipes_${userId}` : "@saved_recipes";
  const recipesCacheKey = userId ? `@recipes_cache_${userId}` : "@recipes_cache";

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

  // Defensive clinical guard (HL-ENG-04): if profile is unhydrated, default to true for hypertension
  // to protect cardiovascular patients from high-sodium exposure (< 140 mg)
  const hasHypertension = user ? userConditions.includes("Hypertension") : true;
  const hasHighCholesterol = user ? (userConditions.includes("High Cholesterol") || userConditions.includes("Hyperlipidemia")) : false;

  const fetchRecipes = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${base_url}/api/recipes/`);
      if (response.ok) {
        const data = await response.json();
        const mapped: Recipe[] = data.map((r: any) => ({
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
        await AsyncStorage.setItem(recipesCacheKey, JSON.stringify(mapped)).catch(() => {});
      } else {
        throw new Error("Failed to fetch recipes from API");
      }
    } catch (error) {
      if (__DEV__) {
        console.log("Network request failed, falling back to local AsyncStorage cache...", error);
      }
      setIsOffline(true);
      try {
        const cached = await AsyncStorage.getItem(recipesCacheKey);
        if (cached) {
          setRecipesList(JSON.parse(cached));
        }
      } catch (cacheErr) {
        if (__DEV__) {
          console.error("Failed to read recipes cache:", cacheErr);
        }
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [recipesCacheKey]);

  useEffect(() => {
    // 1. Read local cache first for immediate offline rendering
    AsyncStorage.getItem(recipesCacheKey).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecipesList(parsed);
          }
        } catch {}
      }
    });

    // 2. Read scoped saved recipes bookmarks
    AsyncStorage.getItem(savedRecipesKey).then((cachedSaved) => {
      if (cachedSaved) {
        try {
          const parsedSaved = JSON.parse(cachedSaved);
          if (Array.isArray(parsedSaved)) {
            setSavedRecipes(parsedSaved);
          }
        } catch {}
      }
    });

    // 3. Fetch remote recipes
    fetchRecipes();

    // 4. Fetch remote saved recipes for authenticated user
    if (userId && token) {
      fetch(`${base_url}/api/recipes/saved/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((savedData) => {
          if (Array.isArray(savedData)) {
            const remoteIds: string[] = savedData.map((item: any) => item.recipe_id || item.id || String(item));
            setSavedRecipes((prev) => {
              const pendingLocalSaves = prev.filter((id) => !remoteIds.includes(id));
              const merged = Array.from(new Set([...prev, ...remoteIds]));
              AsyncStorage.setItem(savedRecipesKey, JSON.stringify(merged)).catch(() => {});

              // Reconcile and push offline bookmarks to backend (HL-ENG-15)
              if (pendingLocalSaves.length > 0) {
                pendingLocalSaves.forEach((id) => {
                  fetch(`${base_url}/api/recipes/${id}/save/${userId}`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }).catch(() => {});
                });
              }
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [fetchRecipes, recipesCacheKey, savedRecipesKey, userId, token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecipes(true);
    if (userId && token) {
      fetch(`${base_url}/api/recipes/saved/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((savedData) => {
          if (Array.isArray(savedData)) {
            const remoteIds: string[] = savedData.map((item: any) => item.recipe_id || item.id || String(item));
            setSavedRecipes((prev) => {
              const pendingLocalSaves = prev.filter((id) => !remoteIds.includes(id));
              const merged = Array.from(new Set([...prev, ...remoteIds]));
              AsyncStorage.setItem(savedRecipesKey, JSON.stringify(merged)).catch(() => {});

              if (pendingLocalSaves.length > 0) {
                pendingLocalSaves.forEach((id) => {
                  fetch(`${base_url}/api/recipes/${id}/save/${userId}`, {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  }).catch(() => {});
                });
              }
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [fetchRecipes, savedRecipesKey, userId, token]);

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

  // Scoped Bookmark Handler with Bi-directional Backend Synchronization (HL-ENG-09)
  const toggleSave = async (id: string) => {
    const isSaved = savedRecipes.includes(id);
    const updated = isSaved ? savedRecipes.filter((rId) => rId !== id) : [...savedRecipes, id];
    setSavedRecipes(updated);
    try {
      await AsyncStorage.setItem(savedRecipesKey, JSON.stringify(updated));
    } catch (err) {
      if (__DEV__) {
        console.warn("Failed to persist saved recipes locally:", err);
      }
    }
    if (userId && token) {
      try {
        await fetch(`${base_url}/api/recipes/${id}/save/${userId}`, {
          method: isSaved ? "DELETE" : "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (syncErr) {
        if (__DEV__) {
          console.warn("Failed to sync saved recipe with backend:", syncErr);
        }
      }
    }
  };

  const filteredRecipes = useMemo(() => {
    let results = recipesList;

    if (activeFilter === "Saved") {
      results = results.filter((r) => savedRecipes.includes(r.id));
    } else if (activeFilter === "Tailored For You") {
      results = results.filter((r) => {
        // Strict boundary: hypertensive or unverified baseline enforces < 140 mg sodium
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

  const Container = isEmbedded ? View : SafeAreaView;
  const containerProps = isEmbedded
    ? { className: "flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]" }
    : { className: "flex-1 bg-[#F8FAF9] dark:bg-[#0B131E]", edges: ["top"] as const };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style="dark" />}

      {/* ── Top bar ── */}
      {!hideHeader && <Header />}

      {/* ── Top bar for Standalone Screen ── */}
      {!hideHeader && (
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
      )}

      {/* ── Unified Search Bar + Diary Action Row ── */}
      <View className="px-5 pt-2 pb-1.5 flex-row items-center gap-2.5">
        <View
          className="flex-1 flex-row items-center rounded-full px-3.5 py-2.5 gap-2.5"
          style={{
            backgroundColor: searchFocused ? "#FFFFFF" : isDark ? "#162232" : "#EEF2F0",
            borderWidth: searchFocused ? 1.5 : 1,
            borderColor: searchFocused ? "#1B6E63" : isDark ? "rgba(255,255,255,0.06)" : "transparent",
            ...searchFocused ? Platform.select({
              ios: {
                shadowColor: "#1B6E63",
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 8,
                shadowOpacity: 0.1,
              },
              android: { elevation: 2 },
            }) : {},
          }}
        >
          <Feather name="search" size={18} color={searchFocused ? "#1B6E63" : "#94A3B8"} />
          <TextInput
            placeholder="Search recipes, ingredients…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1,
              fontSize: 14,
              color: isDark ? "#FFFFFF" : "#152131",
              paddingVertical: Platform.OS === "ios" ? 4 : 2,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {hideHeader && (
          <TouchableOpacity
            onPress={() => router.push("/(home)/(meals)/daily-diary")}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-full"
            style={{
              backgroundColor: isDark ? "#162232" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(232,236,234,0.9)",
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 3,
                  shadowOpacity: 0.06,
                },
                android: { elevation: 1 },
              }),
            }}
          >
            <Feather name="book-open" size={14} color="#1B6E63" />
            <Text className="text-[12px] font-bold text-[#1B6E63] dark:text-[#2DD4BF]">Diary</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View className="mx-5 mb-2 flex-row items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-4 py-2 rounded-xl">
          <Feather name="wifi-off" size={14} color="#D97706" />
          <Text className="text-[12px] font-medium text-amber-800 dark:text-amber-300 flex-1">
            Offline Mode — Showing saved recipes
          </Text>
        </View>
      )}

      {/* ── Dark/Light Filter Chips ── */}
      <View className="mt-1 mb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
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
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B6E63" />
        }
      >
        {/* Tailored banner */}
        {activeFilter === "Tailored For You" && (
          <Reanimated.View
            entering={FadeInDown.delay(100).springify()}
            className="mx-5 mt-3 mb-2 rounded-2xl overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.12)",
              ...Platform.select({
                ios: {
                  shadowColor: "#2563EB",
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 8,
                  shadowOpacity: 0.06,
                },
                android: { elevation: 2 },
              }),
            }}
          >
            <LinearGradient
              colors={["#EFF6FF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 14,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center flex-shrink-0">
                <Feather name="shield" size={18} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#152131] dark:text-white mb-0.5">
                  Filtered for your conditions
                </Text>
                <Text className="text-[13px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {!user && "Showing heart-safe recipes (< 140 mg sodium) while your clinical baseline connects. "}
                  {user && hasHypertension && "Showing recipes with < 140 mg sodium for blood pressure. "}
                  {user && hasHighCholesterol && "Prioritising high-fiber recipes (≥ 5 g) for cholesterol. "}
                  {user && !hasHypertension && !hasHighCholesterol && "Curated heart-healthy meals optimized for cardiac stability. "}
                  Based on your health baseline.
                </Text>
              </View>
            </LinearGradient>
          </Reanimated.View>
        )}

        {/* Time Message Banner */}
        {timeMessage && activeFilter !== "Tailored For You" && activeFilter !== "Saved" && (
          <Reanimated.View
            entering={FadeInDown.delay(100).springify()}
            style={{
              marginHorizontal: 20,
              marginTop: 10,
              marginBottom: 4,
              borderRadius: 16,
              backgroundColor: isDark ? "#142520" : "#F4FAF7",
              borderWidth: 1,
              borderColor: isDark ? "#1B4D42" : "#D2ECE3",
              padding: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              ...Platform.select({
                ios: {
                  shadowColor: "#1B6E63",
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 6,
                  shadowOpacity: 0.05,
                },
                android: { elevation: 2 },
              }),
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Feather name="sun" size={18} color="#D97706" />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 13.5,
                fontWeight: "600",
                color: isDark ? "#A7F3D0" : "#135249",
                lineHeight: 19,
              }}
            >
              {timeMessage}
            </Text>
          </Reanimated.View>
        )}

        {/* Results Info & Count */}
        <View className="flex-row items-center justify-between px-5 mt-3 mb-1">
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#1B6E63]" />
            <Text className="text-[13px] font-semibold text-[#5C6B66] dark:text-slate-400">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? "recipe" : "recipes"} available
            </Text>
          </View>
          {activeFilter !== "All" && (
            <TouchableOpacity onPress={() => setActiveFilter("All")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-[12px] font-semibold text-[#1B6E63] dark:text-[#2DD4BF]">Clear filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recipe list */}
        <View className="px-5 mt-2">
          {isLoading && !refreshing ? (
            <View className="gap-4">
              {[1, 2, 3].map((key) => (
                <View
                  key={key}
                  className="rounded-3xl p-4 flex-row"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "rgba(232,236,234,0.6)",
                  }}
                >
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
                <Reanimated.View key={recipe.id} entering={FadeInDown.delay(150 + index * 80).springify()} className="w-full md:w-[48%] lg:w-[31%] mb-1">
                  <RecipeCard
                    recipe={recipe}
                    isSaved={savedRecipes.includes(recipe.id)}
                    onSave={() => toggleSave(recipe.id)}
                    hasHypertension={hasHypertension}
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
    </Container>
  );
}
