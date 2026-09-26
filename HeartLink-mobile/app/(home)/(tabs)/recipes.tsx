import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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

function RecipeCard({
  recipe,
  onPress,
  isSaved,
  onSave,
}: {
  recipe: Recipe;
  onPress: () => void;
  isSaved: boolean;
  onSave: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const colors = ["#C6E1AC", "#F6CA84", "#F2C0B8", "#BED9FA", "#DDD6FE", "#FBCFE8"];
  const charCode = (recipe.title || "").charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];

  const getIcon = (title: string) => {
     const t = title.toLowerCase();
     if (t.includes("bowl")) return "bowl";
     if (t.includes("soup")) return "pot-steam";
     if (t.includes("toast")) return "bread-slice";
     if (t.includes("salmon") || t.includes("fish")) return "fish";
     if (t.includes("pasta")) return "noodles";
     if (t.includes("smoothie")) return "blender";
     return "food-apple";
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress} 
      className="rounded-2xl overflow-hidden mb-4 relative" 
      style={{ width: '48%', backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9", borderWidth: 1 }}
    >
      <View className="h-[105px] w-full bg-slate-200 dark:bg-slate-800 items-center justify-center">
        <Feather name="image" size={24} color={isDark ? "#475569" : "#CBD5E1"} className="absolute" />
        <Image
          source={{ uri: recipe.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" }}
          style={{ width: "100%", height: "100%", position: 'absolute' }}
          contentFit="cover"
          transition={200}
        />
        <View className="absolute inset-0 bg-black/10" />
      </View>
      <TouchableOpacity onPress={onSave} className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm">
        <Feather name="heart" size={15} color={isSaved ? "#EF4444" : (isDark ? "#FFFFFF" : "#152131")} />
      </TouchableOpacity>
      <View className="p-3 pb-4">
        <Text className="text-[14px] font-bold leading-tight mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} numberOfLines={1}>{recipe.title}</Text>
        <Text className="text-[11px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{recipe.nutrition?.calories || 0} cal - {recipe.prepTime || 0} min</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipesScreen({
  isEmbedded = false,
}: {
  isEmbedded?: boolean;
} = {}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token } = useUser();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("All");

  const savedRecipesKey = userId ? `@saved_recipes_${userId}` : "@saved_recipes";
  const recipesCacheKey = userId ? `@recipes_cache_${userId}` : "@recipes_cache";

  const cachedRecipes = queryClient.getQueryData<Recipe[]>(["recipes"]);
  const { data: recipesList = [], refetch: refetchRecipes } = useQuery({
    queryKey: ["recipes"],
    initialData: cachedRecipes,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`${base_url}/api/recipes/`);
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
      const response = await fetch(`${base_url}/api/recipes/saved/${userId}`, {
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
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecipes(), refetchSaved()]);
    setRefreshing(false);
  }, [refetchRecipes, refetchSaved]);

  const filters = ["All", "Breakfast", "Lunch", "Dinner"];

  const saveMutation = useMutation({
    mutationFn: async ({ id, isSaved }: { id: string; isSaved: boolean }) => {
      if (!userId || !token) return;
      const response = await fetch(`${base_url}/api/recipes/${id}/save/${userId}`, {
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
    : { edges: ["top"], withScrollView: false };

  return (
    <Container {...containerProps}>
      {!isEmbedded && <StatusBar style={isDark ? "light" : "dark"} />}
      
      {/* Top Bar matching the "See All" design */}
      {!isEmbedded && (
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full" style={{ backgroundColor: isDark ? "#162232" : "#F1F5F9" }}>
            <Feather name="arrow-left" size={20} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </TouchableOpacity>
          <Text className="text-[18px] font-bold" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
            Recipes
          </Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center -mr-2 rounded-full" style={{ backgroundColor: isDark ? "#162232" : "#F1F5F9" }}>
            <Feather name="sliders" size={18} color={isDark ? "#FFFFFF" : "#0F172A"} />
          </TouchableOpacity>
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
                className="px-5 py-2 rounded-full mr-3 border"
                style={{ 
                  backgroundColor: isActive ? (isDark ? "#F8F9FA" : "#152131") : (isDark ? "#162232" : "#FFFFFF"),
                  borderColor: isActive ? "transparent" : (isDark ? "#1E293B" : "#E2E8F0")
                }}
              >
                <Text className="text-[14px] font-semibold" style={{ color: isActive ? (isDark ? "#152131" : "#FFFFFF") : (isDark ? "#94A3B8" : "#64748B") }}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B6E63" />}
      >
        <View className="px-5 mb-4">
          <Text className="text-[13px] font-semibold" style={{ color: isDark ? "#F6CA84" : "#B45309" }}>
            {filteredRecipes.length} recipes
          </Text>
        </View>

        <View className="px-5 flex-row flex-wrap justify-between">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isSaved={savedRecipes.includes(recipe.id)}
              onSave={() => toggleSave(recipe.id)}
              onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)}
            />
          ))}
        </View>
      </ScrollView>
    </Container>
  );
}
