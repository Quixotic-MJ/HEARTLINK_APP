import { bandName } from "../../../constants/theme";
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  Platform,
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
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { useExploreScore } from "../../../hooks/useExploreData";
import { foodWarnings, suitsTier } from "../../../services/explore";
import { FoodWarning } from "../../../components/explore/ExploreBits";
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
  /** What clashes with the patient's allergies or diet (from the server). */
  warnings?: string[];
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
  const { c, isDark } = useDs();
  const warnings = recipe.warnings ?? [];

  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}${warnings.length ? `. Warning: ${warnings.join(". ")}` : ""}`}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        backgroundColor: isDark ? c.surface : c.canvas,
        marginBottom: 14,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDark ? 0.3 : 0.06,
            shadowRadius: 8,
          },
          android: { elevation: 2 },
        }),
      }}
    >
      <View
        style={{
          height: 116,
          width: "100%",
          backgroundColor: isDark ? c.surfaceAlt : c.peach,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather
          name="coffee"
          size={24}
          color={isDark ? "#FBBF24" : c.charcoal}
          style={{ position: "absolute" }}
        />
        <Image
          source={{ uri: recipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
          transition={200}
        />
        {/* Heart Save button overlay */}
        <TouchableOpacity
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? `Remove ${recipe.title} from saved` : `Save ${recipe.title}`}
          accessibilityState={{ selected: isSaved }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.82)" : "rgba(255, 255, 255, 0.92)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather
            name="heart"
            size={14}
            color={isSaved ? c.danger : c.steel}
            style={{ marginTop: 1 }}
          />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 12, gap: 5 }}>
        <Text
          style={{ fontSize: 14.5, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}
          numberOfLines={1}
        >
          {recipe.title}
        </Text>
        <Text style={{ fontSize: 12, color: c.slate }}>
          {recipe.nutrition?.calories || 0} cal • {recipe.prepTime || 0} min • {recipe.nutrition?.sodium || 0} mg
        </Text>
        {warnings.length ? (
          <View style={{ marginTop: 2 }}>
            <FoodWarning warnings={warnings} compact />
          </View>
        ) : suits ? (
          <View
            style={{
              alignSelf: "flex-start",
              marginTop: 2,
              paddingHorizontal: 7,
              paddingVertical: 2.5,
              borderRadius: 6,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
              borderWidth: 1,
              borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: isDark ? "#34D399" : "#059669",
              }}
            >
              Suits your score
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedButton>
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
        warnings: foodWarnings(r.warnings),
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
    },
  });

  const { data: savedRecipes = [], refetch: refetchSaved } = useQuery({
    queryKey: ["saved_recipes", userId],
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/saved/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch saved recipes");
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      const remoteIds = data.map((item: any) => item.recipe_id || item.id || String(item));
      AsyncStorage.setItem(savedRecipesKey, JSON.stringify(remoteIds)).catch(() => {});
      return remoteIds;
    },
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
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to sync save");
    },
    onMutate: async ({ id, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: ["saved_recipes", userId] });
      const previous = queryClient.getQueryData<string[]>(["saved_recipes", userId]);
      const updated = isSaved ? (previous || []).filter((rId) => rId !== id) : [...(previous || []), id];
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

      {/* Top Bar matching latest design system */}
      {!isEmbedded && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 10,
            gap: 12,
          }}
        >
          <SquareIconButton
            icon="arrow-left"
            label="Go back"
            onPress={() => (from === "explore" ? router.navigate("/(home)/(tabs)/explore") : router.back())}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: "700", color: c.ink, letterSpacing: -0.4 }}
            >
              Recipes
            </Text>
            <Text style={{ fontSize: 12.5, color: c.slate }}>
              Heart-healthy, dietitian-approved meals
            </Text>
          </View>
        </View>
      )}

      {/* Modern Filter Pills */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <AnimatedButton
                key={filter}
                onPress={() => setActiveFilter(filter)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={{
                  height: 38,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: isActive
                    ? c.primary
                    : isDark
                    ? c.surfaceAlt
                    : "#F1F5F9",
                  borderColor: isActive
                    ? c.primary
                    : isDark
                    ? c.hairline
                    : "#E2E8F0",
                  ...(isActive
                    ? Platform.select({
                        ios: {
                          shadowColor: c.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                        },
                        android: { elevation: 2 },
                      })
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : c.charcoal,
                  }}
                >
                  {filter}
                </Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
        ListHeaderComponent={
          <View
            style={{
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>
              {filteredRecipes.length} recipes
              {knowsTier
                ? ` • ${
                    filteredRecipes.filter(
                      (r) => r.tier && suitsTier(r.tier, patientTier) && !r.warnings?.length
                    ).length
                  } suit your score`
                : ""}
            </Text>
            {knowsTier ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(16, 185, 129, 0.28)" : "#A7F3D0",
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: "600", color: isDark ? "#34D399" : "#059669" }}>
                  {bandName(patientTier)}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              padding: 24,
              borderRadius: 16,
              backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#E2E8F0",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
            }}
          >
            <Feather name="coffee" size={28} color={c.steel} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
              No recipes found
            </Text>
            <Text style={{ fontSize: 13, color: c.slate, textAlign: "center" }}>
              No meals match the &quot;{activeFilter}&quot; tag yet. Try selecting &quot;All&quot;.
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
              suits={knowsTier && !!recipe.tier && suitsTier(recipe.tier, patientTier) && !recipe.warnings?.length}
            />
          </View>
        )}
      />
    </Container>
  );
}
