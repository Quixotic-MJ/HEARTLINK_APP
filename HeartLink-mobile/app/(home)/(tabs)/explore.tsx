import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../../components/Header";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";

const TOKENS = {
  indigo: "#6F6FD1",
};

export default function ExploreTabScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId, token } = useUser();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filters = ["All", "Recipes", "Exercise", "Saved"];

  const base_url = process.env.EXPO_PUBLIC_API_URL;

  const { data: recipes = [] } = useQuery({
    queryKey: ["explore_recipes"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`${base_url}/api/recipes/`);
      if (!response.ok) throw new Error("Failed to fetch recipes");
      const data = await response.json();
      return data.map((r: any) => ({
        id: r.id,
        title: r.name || "",
        subtitle: `${r.calories || 0} cal - ${r.prep_time_minutes || 0} min`,
        image: r.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
      }));
    }
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["explore_exercises"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${base_url}/api/exercises/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const data = await res.json();
      return data.map((r: any) => {
        const type = (r.type || "Cardio").toLowerCase();
        let color = "#DDD6FE";
        let icon = "user";
        let iconColor = "#6D28D9";
        
        if (type.includes("cardio") || type.includes("run") || type.includes("cycle")) {
          color = "#BED9FA"; icon = "activity"; iconColor = "#1D4ED8";
        } else if (type.includes("strength") || type.includes("leg")) {
          color = "#FBCFE8"; icon = "target"; iconColor = "#BE185D";
        }

        const cal = r.calories || Math.floor((r.duration_minutes || 0) * 7.5);
        return {
          id: r.id,
          title: r.name || "",
          subtitle: `${r.type || "Cardio"} - ${r.duration_minutes || 0} min - ${cal} cal`,
          color,
          icon,
          iconColor
        };
      });
    }
  });

  const { data: savedRecipeIds = [] } = useQuery({
    queryKey: ["saved_recipes", userId],
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`${base_url}/api/recipes/saved/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch saved recipes");
      const data = await response.json();
      return data.map((item: any) => item.recipe_id || item.id || String(item));
    }
  });

  const savedRecipes = recipes.filter((r: any) => savedRecipeIds.includes(r.id));

  // Search logic
  const filteredSearchRecipes = recipes.filter((r: any) => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSearchExercises = exercises.filter((e: any) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalResults = (activeFilter === "All" || activeFilter === "Recipes" ? filteredSearchRecipes.length : 0) +
                       (activeFilter === "All" || activeFilter === "Exercise" ? filteredSearchExercises.length : 0);

  const HighlightText = ({ text, query }: { text: string, query: string }) => {
    if (!query) return <Text>{text}</Text>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <Text>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={i} style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.15)', color: isDark ? '#fcd34d' : '#b45309' }}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        
        {/* Search Bar */}
        <View className="flex-row items-center px-4 py-3 mx-5 mt-4 rounded-xl" style={{ backgroundColor: isDark ? "#162232" : "#F1F5F9" }}>
          <Feather name="search" size={18} color={isDark ? "#94A3B8" : "#64748B"} />
          <TextInput
            placeholder="Search recipes, workouts..."
            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
            className="flex-1 ml-3 text-[14px]"
            style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
              <Feather name="x" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5 pl-5 mb-2" contentContainerStyle={{ paddingRight: 40 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter(filter); }}
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

        {searchQuery.length > 0 ? (
          <View className="px-5 mt-6">
            <Text className="text-[14px] font-bold mb-4" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
              {totalResults} results for "{searchQuery}"
            </Text>

            {/* SEARCH: RECIPES */}
            {(activeFilter === "All" || activeFilter === "Recipes") && (
              <View className="mb-6">
                <Text className="text-[12px] font-bold tracking-widest mb-3 uppercase" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>Recipes</Text>
                {filteredSearchRecipes.length > 0 ? (
                  filteredSearchRecipes.map((recipe: any) => (
                    <TouchableOpacity key={recipe.id} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                      <View style={{ width: 48, height: 48, borderRadius: 12, marginRight: 14, backgroundColor: isDark ? "#1E293B" : "#F1F5F9", overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="image" size={20} color={isDark ? "#475569" : "#CBD5E1"} style={{ position: 'absolute' }} />
                        <Image source={{ uri: recipe.image }} style={{ width: 48, height: 48, position: 'absolute' }} />
                      </View>
                      <View className="flex-1 justify-center">
                        <Text className="text-[15px] font-bold mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                          <HighlightText text={recipe.title} query={searchQuery} />
                        </Text>
                        <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{recipe.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                      <Feather name="slash" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                    </View>
                    <Text className="text-[14px] font-semibold" style={{ color: isDark ? "#64748B" : "#94A3B8" }}>No recipes match "{searchQuery}"</Text>
                  </View>
                )}
              </View>
            )}

            {/* SEARCH: EXERCISES */}
            {(activeFilter === "All" || activeFilter === "Exercise") && (
              <View className="mb-6">
                <Text className="text-[12px] font-bold tracking-widest mb-3 uppercase" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>Exercise</Text>
                {filteredSearchExercises.length > 0 ? (
                  filteredSearchExercises.map((exercise: any) => (
                    <TouchableOpacity key={exercise.id} onPress={() => router.push(`/(home)/(health)/exercise-details?id=${exercise.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: exercise.color }}>
                        <Feather name={exercise.icon as any} size={20} color={exercise.iconColor} />
                      </View>
                      <View className="flex-1 justify-center">
                        <Text className="text-[15px] font-bold mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                          <HighlightText text={exercise.title} query={searchQuery} />
                        </Text>
                        <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{exercise.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                      <Feather name="slash" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                    </View>
                    <Text className="text-[14px] font-semibold" style={{ color: isDark ? "#64748B" : "#94A3B8" }}>No exercises match "{searchQuery}"</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : activeFilter === "All" ? (
          <>
            {/* Recipes Section */}
            <View className="mt-6">
              <View className="flex-row justify-between items-end px-5 mb-4">
                <Text className="text-[18px] font-bold" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>Recipes for you</Text>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(home)/(tabs)/recipes"); }}>
                  <Text className="text-[13px] font-semibold" style={{ color: TOKENS.indigo }}>See all</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                {recipes.slice(0, 5).map((recipe: any) => (
                  <TouchableOpacity key={recipe.id} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="w-[145px] mr-4 rounded-2xl overflow-hidden border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                    <View style={{ width: "100%", height: 95, backgroundColor: isDark ? "#1E293B" : "#F1F5F9", alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="image" size={24} color={isDark ? "#475569" : "#CBD5E1"} style={{ position: 'absolute' }} />
                      <Image
                        source={{ uri: recipe.image }}
                        style={{ width: "100%", height: "100%", position: 'absolute' }}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                    <View className="p-3 pb-4">
                      <Text className="text-[14px] font-bold leading-tight mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} numberOfLines={1}>{recipe.title}</Text>
                      <Text className="text-[11px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{recipe.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Exercises Section */}
            <View className="mt-8">
              <View className="flex-row justify-between items-end px-5 mb-4">
                <Text className="text-[18px] font-bold" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>Exercises for you</Text>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(home)/(tabs)/exercises"); }}>
                  <Text className="text-[13px] font-semibold" style={{ color: TOKENS.indigo }}>See all</Text>
                </TouchableOpacity>
              </View>

              <View className="px-5">
                {exercises.slice(0, 3).map((exercise: any) => (
                  <TouchableOpacity key={exercise.id} onPress={() => router.push(`/(home)/(health)/exercise-details?id=${exercise.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                    <View className="w-14 h-14 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: exercise.color }}>
                      <Feather name={exercise.icon as any} size={22} color={exercise.iconColor} />
                    </View>
                    <View className="flex-1 justify-center">
                      <Text className="text-[15px] font-bold mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>{exercise.title}</Text>
                      <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{exercise.subtitle}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : activeFilter === "Recipes" ? (
          <View className="px-5 mt-6">
            <Text className="text-[14px] font-bold mb-4" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
              {recipes.length} recipes
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {recipes.map((recipe: any) => (
                <TouchableOpacity key={recipe.id} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="w-[48%] mb-4 rounded-2xl overflow-hidden border relative" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                  <View className="h-[105px] w-full bg-slate-200 dark:bg-slate-800 items-center justify-center">
                    <Feather name="image" size={24} color={isDark ? "#475569" : "#CBD5E1"} className="absolute" />
                    <Image source={{ uri: recipe.image }} style={{ width: "100%", height: "100%", position: 'absolute' }} contentFit="cover" transition={200} />
                    <View className="absolute inset-0 bg-black/10" />
                  </View>
                  <TouchableOpacity className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm">
                    <Feather name="heart" size={15} color={isDark ? "#FFFFFF" : "#152131"} />
                  </TouchableOpacity>
                  <View className="p-3 pb-4">
                    <Text className="text-[14px] font-bold leading-tight mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} numberOfLines={1}>{recipe.title}</Text>
                    <Text className="text-[11px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{recipe.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : activeFilter === "Exercise" ? (
          <View className="px-5 mt-6">
            <Text className="text-[14px] font-bold mb-4" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
              {exercises.length} exercises
            </Text>
            {exercises.map((exercise: any) => (
              <TouchableOpacity key={exercise.id} onPress={() => router.push(`/(home)/(health)/exercise-details?id=${exercise.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                <View className="w-14 h-14 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: exercise.color }}>
                  <Feather name={exercise.icon as any} size={22} color={exercise.iconColor} />
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[15px] font-bold mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>{exercise.title}</Text>
                  <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{exercise.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
              </TouchableOpacity>
            ))}
          </View>
        ) : activeFilter === "Saved" ? (
          <View className="px-5 mt-6">
            <Text className="text-[14px] font-bold mb-4" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
              {savedRecipes.length} saved
            </Text>

            {savedRecipes.map((recipe: any) => (
              <TouchableOpacity key={recipe.id} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-3 rounded-2xl border" style={{ backgroundColor: isDark ? "#162232" : "#FFFFFF", borderColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                <View className="w-14 h-14 rounded-xl items-center justify-center mr-4 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <Feather name="image" size={20} color={isDark ? "#475569" : "#CBD5E1"} className="absolute" />
                  <Image source={{ uri: recipe.image }} style={{ width: "100%", height: "100%", position: 'absolute' }} contentFit="cover" transition={200} />
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[10px] font-bold tracking-widest mb-1 uppercase" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>Recipe</Text>
                  <Text className="text-[15px] font-bold mb-0.5" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }} numberOfLines={1}>{recipe.title}</Text>
                  <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{recipe.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

      </ScrollView>
    </ScreenWrapper>
  );
}
