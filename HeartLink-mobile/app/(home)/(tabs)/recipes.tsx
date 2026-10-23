import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { useExploreScore } from "../../../hooks/useExploreData";
import { suitsTier } from "../../../services/explore";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

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
  /** Which score level it's for (HL-037 Explore: marks the ones that suit the patient). */
  tier?: string;
}

function RecipeCard({
  recipe,
  onPress,
  isSaved,
  onSave,
  suits = false,
}: {
  recipe: Recipe;
  onPress: () => void;
  isSaved: boolean;
  onSave: () => void;
  suits?: boolean;
}) {
  const { c } = useDs();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="overflow-hidden mb-4 relative"
      style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
    >
      <View className="h-[105px] w-full items-center justify-center" style={{ backgroundColor: c.surface }}>
        <Feather name="image" size={24} color={c.muted} style={{ position: "absolute" }} />
        <Image
          source={{ uri: recipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" }}
          style={{ width: "100%", height: "100%", position: 'absolute' }}
          contentFit="cover"
          transition={200}
        />
      </View>
      <TouchableOpacity
        onPress={onSave}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? `Remove ${recipe.title} from saved` : `Save ${recipe.title}`}
        accessibilityState={{ selected: isSaved }}
        className="absolute top-2 right-2 items-center justify-center rounded-full"
        style={{ width: 32, height: 32, backgroundColor: c.canvas }}
      >
        <Feather name="heart" size={15} color={isSaved ? c.danger : c.ink} />
      </TouchableOpacity>
      <View className="p-3 pb-4">
        <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 2 }} numberOfLines={1}>{recipe.title}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{recipe.nutrition?.calories || 0} cal - {recipe.prepTime || 0} min</Text>
        {suits ? (
          <View style={{ alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: c.mint }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>Suits your score</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function RecipesScreen({
  isEmbedded = false,
}: {
  isEmbedded?: boolean;
} = {}) {
  const { c, isDark } = useDs();
  const router = useRouter();
  // Opened from Explore's "All meals": back returns there, not to the first tab.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { userId, token } = useUser();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");
  // Every approved meal shows here; the ones for the patient's score level get a tag.
  const patientTier = useExploreScore().data?.tier ?? null;
  const knowsTier = !!patientTier && patientTier !== "Unknown";

  const savedRecipesKey = userId ? `@saved_recipes_${userId}` : "@saved_recipes";
  const recipesCacheKey = userId ? `@recipes_cache_${userId}` : "@recipes_cache";

  const cachedRecipes = queryClient.getQueryData<Recipe[]>(["recipes"]);
  const { data: recipesList = [], refetch: refetchRecipes } = useQuery({
    queryKey: ["recipes"],
    initialData: cachedRecipes,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/`);
      if (!response.ok) throw new Error("Failed to fetch recipes");
      const data = await response.json();
      const mapped: Recipe[] = data.map((r: any) => ({
        id: r.id,
        title: r.name,
        subtitle: r.subtitle || "",
        prepTime: r.prep_time_minutes || 0,
        servings: r.servings || 1,
        difficulty: r.difficulty || "Easy",
        image: r.image_url || "",
        tags: r.tags || [],
        heartBenefit: r.heart_benefit || "",
        tier: r.hss_tier || "",
        nutrition: {
          sodium: r.sodium_mg || 0,
          fiber: r.fiber_g || 0,
          saturatedFat: r.saturated_fat_g || 0,
          calories: r.calories || 0,
        },
        ingredients: [],
        steps: r.steps || [],
      }));
      AsyncStorage.setItem(recipesCacheKey, JSON.stringify(mapped)).catch(() => {});
      return mapped;
    }
  });

  const { data: savedRecipes = [], refetch: refetchSaved } = useQuery({
    queryKey: ["saved_recipes", userId],
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/saved/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch saved recipes");
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      const remoteIds = data.map((item: any) => item.recipe_id || item.id || String(item));
      AsyncStorage.setItem(savedRecipesKey, JSON.stringify(remoteIds)).catch(() => {});
      return remoteIds;
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  // A recipe a Dietitian approves shows when the patient comes back to this tab (HL-037).
  useRefetchOnFocus(refetchRecipes);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecipes(), refetchSaved()]);
    setRefreshing(false);
  }, [refetchRecipes, refetchSaved]);

  const filters = ["All", "Breakfast", "Lunch", "Dinner"];

  const saveMutation = useMutation({
    mutationFn: async ({ id, isSaved }: { id: string; isSaved: boolean }) => {
      if (!userId || !token) return;
      const response = await apiFetch(`/api/recipes/${id}/save/${userId}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to sync save");
    },
    onMutate: async ({ id, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: ["saved_recipes", userId] });
      const previous = queryClient.getQueryData<string[]>(["saved_recipes", userId]);
      const updated = isSaved ? (previous || []).filter(rId => rId !== id) : [...(previous || []), id];
      queryClient.setQueryData(["saved_recipes", userId], updated);
      AsyncStorage.setItem(savedRecipesKey, JSON.stringify(updated)).catch(() => {});
      return { previous };
    },
  });

  const toggleSave = (id: string) => {
    const isSaved = savedRecipes.includes(id);
    saveMutation.mutate({ id, isSaved });
  };

  const filteredRecipes = useMemo(() => {
    let results = recipesList;
    if (activeFilter !== "All") {
      results = results.filter((r) => (r.tags || []).includes(activeFilter));
    }
    return results;
  }, [activeFilter, recipesList]);

  const Container = isEmbedded ? View : ScreenWrapper;
  const containerProps: any = isEmbedded
    ? { className: "flex-1" }
    : { edges: ["top"], withScrollView: false, safeAreaClassName: "flex-1 bg-ds-canvas" };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style={isDark ? "light" : "dark"} />}
      
      {/* Top Bar matching the "See All" design */}
      {!isEmbedded && (
        <View className="flex-row items-center px-5 pt-3 pb-3" style={{ gap: 10 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => (from === "explore" ? router.navigate("/(home)/(tabs)/explore") : router.back())} />
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }}>
            Recipes
          </Text>
          <View className="items-center justify-center" style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline }}>
            <Feather name="sliders" size={18} color={c.ink} />
          </View>
        </View>
      )}

      {/* Filters */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 max-h-[40px]" contentContainerStyle={{ paddingRight: 40 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                className="mr-2 justify-center"
                style={{ height: 40, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, backgroundColor: isActive ? c.ink : c.canvas, borderColor: isActive ? c.ink : c.hairline }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: isActive ? c.canvas : c.charcoal }}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
        ListHeaderComponent={
          <View className="mb-4">
            <Text style={{ fontSize: 13, color: c.steel }}>
              {filteredRecipes.length} recipes
              {knowsTier ? `, ${filteredRecipes.filter((r) => r.tier && suitsTier(r.tier, patientTier)).length} suit your score` : ""}
            </Text>
          </View>
        }
        renderItem={({ item: recipe }) => (
          <View style={{ width: "48%" }}>
            <RecipeCard
              recipe={recipe}
              isSaved={savedRecipes.includes(recipe.id)}
              onSave={() => toggleSave(recipe.id)}
              onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)}
              suits={knowsTier && !!recipe.tier && suitsTier(recipe.tier, patientTier)}
            />
          </View>
        )}
      />
    </Container>
  );
}
