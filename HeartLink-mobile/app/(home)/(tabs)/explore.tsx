import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../../components/Header";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import { IconBadge } from "../../../components/exercise/ExerciseBits";

export default function ExploreTabScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const { userId, token } = useUser();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  // Design-system card: white, thin warm-grey border, 12px corners, no shadow.
  const card = useMemo(() => ({ backgroundColor: c.canvas, borderColor: c.hairline, borderWidth: 1, borderRadius: 12 }), [c]);

  const filters = ["All", "Recipes", "Exercise", "Saved"];
  const { data: recipes = [] } = useQuery({
    queryKey: ["explore_recipes"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/`);
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
      const res = await apiFetch(`/api/exercises/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const data = await res.json();
      return data.map((r: any) => {
        const type = (r.type || "Cardio").toLowerCase();
        let icon = "user";

        if (type.includes("cardio") || type.includes("run") || type.includes("cycle")) {
          icon = "activity";
        } else if (type.includes("strength") || type.includes("leg")) {
          icon = "target";
        }

        const cal = r.calories || Math.floor((r.duration_minutes || 0) * 7.5);
        return {
          id: r.id,
          title: r.name || "",
          subtitle: `${r.type || "Cardio"} - ${r.duration_minutes || 0} min - ${cal} cal`,
          icon,
        };
      });
    }
  });

  const { data: savedRecipeIds = [] } = useQuery({
    queryKey: ["saved_recipes", userId],
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/saved/${userId}`, {
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
            <Text key={i} style={{ backgroundColor: c.yellow, color: c.warmText }}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  // Unified list data for FlatList based on active mode
  const listData = useMemo(() => {
    if (searchQuery.length > 0) {
      // Search mode: merge recipes + exercises based on active filter
      const items: any[] = [];
      if (activeFilter === "All" || activeFilter === "Recipes") {
        items.push(...filteredSearchRecipes.map((r: any) => ({ ...r, _type: 'recipe' })));
      }
      if (activeFilter === "All" || activeFilter === "Exercise") {
        items.push(...filteredSearchExercises.map((e: any) => ({ ...e, _type: 'exercise' })));
      }
      return items;
    }
    if (activeFilter === "Recipes") return recipes.map((r: any) => ({ ...r, _type: 'recipe' }));
    if (activeFilter === "Exercise") return exercises.map((e: any) => ({ ...e, _type: 'exercise' }));
    if (activeFilter === "Saved") return savedRecipes.map((r: any) => ({ ...r, _type: 'saved' }));
    return []; // "All" tab uses ListHeaderComponent
  }, [searchQuery, activeFilter, filteredSearchRecipes, filteredSearchExercises, recipes, exercises, savedRecipes]);

  const renderSearchItem = useCallback(({ item }: { item: any }) => {
    if (item._type === 'recipe') {
      return (
        <TouchableOpacity onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${item.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-2 mx-5" style={card}>
          <View style={{ width: 48, height: 48, borderRadius: 8, marginRight: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
            <Feather name="image" size={20} color={c.muted} style={{ position: 'absolute' }} />
            <Image source={{ uri: item.image }} style={{ width: 48, height: 48, position: 'absolute' }} />
          </View>
          <View className="flex-1 justify-center">
            <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }}>
              <HighlightText text={item.title} query={searchQuery} />
            </Text>
            <Text style={{ fontSize: 13, color: c.slate }}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    // exercise
    return (
      <TouchableOpacity onPress={() => router.push(`/(home)/(health)/exercise-session?id=${item.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-2 mx-5" style={card}>
        <View style={{ marginRight: 14 }}>
          <IconBadge icon={item.icon as any} tone="mint" size={48} />
        </View>
        <View className="flex-1 justify-center">
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }}>
            <HighlightText text={item.title} query={searchQuery} />
          </Text>
          <Text style={{ fontSize: 13, color: c.slate }}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [router, searchQuery, c, card]);

  const renderRecipeGridItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${item.id}` as any)} activeOpacity={0.8} className="mb-4 overflow-hidden relative" style={[card, { width: "48%" }]}>
      <View className="h-[110px] w-full items-center justify-center" style={{ backgroundColor: c.surface }}>
        <Feather name="image" size={24} color={c.muted} style={{ position: 'absolute' }} />
        <Image source={{ uri: item.image }} style={{ width: "100%", height: "100%", position: 'absolute' }} contentFit="cover" transition={200} />
      </View>
      <TouchableOpacity className="absolute top-2 right-2 p-1.5 rounded-full" style={{ backgroundColor: c.canvas }}>
        <Feather name="heart" size={15} color={c.ink} />
      </TouchableOpacity>
      <View className="p-3.5 pb-4">
        <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 2 }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  ), [router, c, card]);

  const renderExerciseItem = useCallback(({ item: exercise }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/(home)/(health)/exercise-session?id=${exercise.id}` as any)} activeOpacity={0.8} className="flex-row items-center mb-2" style={[card, { minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 }]}>
      <View style={{ marginRight: 12 }}>
        <IconBadge icon={exercise.icon as any} tone="mint" size={48} />
      </View>
      <View className="flex-1 justify-center pr-2">
        <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }} numberOfLines={2}>{exercise.title}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{exercise.subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.steel} />
    </TouchableOpacity>
  ), [router, c, card]);

  const renderSavedItem = useCallback(({ item: recipe }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="flex-row items-center p-3 mb-2" style={card}>
      <View className="w-16 h-16 items-center justify-center mr-4 overflow-hidden" style={{ borderRadius: 8, backgroundColor: c.surface }}>
        <Feather name="image" size={20} color={c.muted} style={{ position: 'absolute' }} />
        <Image source={{ uri: recipe.image }} style={{ width: "100%", height: "100%", position: 'absolute' }} contentFit="cover" transition={200} />
      </View>
      <View className="flex-1 justify-center pr-2">
        <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: c.steel, marginBottom: 4 }}>Recipe</Text>
        <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }} numberOfLines={1}>{recipe.title}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{recipe.subtitle}</Text>
      </View>
    </TouchableOpacity>
  ), [router, c, card]);

  // Shared header: search bar + filter pills
  const SharedHeader = (
    <>
      {/* Search Bar */}
      <View className="flex-row items-center px-4 mx-5 mt-4" style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}>
        <Feather name="search" size={18} color={c.steel} />
        <TextInput
          placeholder="Search recipes, workouts..."
          placeholderTextColor={c.steel}
          className="flex-1 ml-3"
          style={{ fontSize: 16, color: c.ink, paddingVertical: 0 }}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" className="items-center justify-center" style={{ width: 36, height: 36 }}>
            <Feather name="x" size={16} color={c.steel} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills: black pill chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 pl-5 mb-2" contentContainerStyle={{ paddingRight: 40 }}>
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => { Haptics.selectionAsync(); setActiveFilter(filter); }}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className="mr-2 justify-center"
              style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: isActive ? c.ink : c.canvas,
                borderColor: isActive ? c.ink : c.hairline,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: isActive ? c.canvas : c.charcoal }}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  // Determine which rendering mode
  const isSearchMode = searchQuery.length > 0;
  const isAllTab = !isSearchMode && activeFilter === "All";
  const isRecipesTab = !isSearchMode && activeFilter === "Recipes";
  const isExerciseTab = !isSearchMode && activeFilter === "Exercise";
  const isSavedTab = !isSearchMode && activeFilter === "Saved";

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      {isAllTab ? (
        /* "All" tab: bounded data (sliced to 5+3), safe to use ScrollView */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          {SharedHeader}

          {/* Recipes Section */}
          <View className="mt-6">
            <View className="flex-row justify-between items-end px-5 mb-4">
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>Recipes for you</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(home)/(tabs)/recipes"); }} style={{ minHeight: 32, justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>See all</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {recipes.slice(0, 5).map((recipe: any) => (
                <TouchableOpacity key={recipe.id} onPress={() => router.push(`/(home)/(meals)/recipe-details?id=${recipe.id}` as any)} activeOpacity={0.8} className="w-[155px] mr-3 overflow-hidden" style={card}>
                  <View style={{ width: "100%", height: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
                    <Feather name="image" size={24} color={c.muted} style={{ position: 'absolute' }} />
                    <Image
                      source={{ uri: recipe.image }}
                      style={{ width: "100%", height: "100%", position: 'absolute' }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                  <View className="p-3.5 pb-4">
                    <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 2 }} numberOfLines={1}>{recipe.title}</Text>
                    <Text style={{ fontSize: 13, color: c.slate }}>{recipe.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercises Section */}
          <View className="mt-8">
            <View className="flex-row justify-between items-end px-5 mb-4">
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>Exercises for you</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(home)/(tabs)/exercises"); }} style={{ minHeight: 32, justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>See all</Text>
              </TouchableOpacity>
            </View>

            <View className="px-5">
              {exercises.slice(0, 3).map((exercise: any) => (
                <React.Fragment key={exercise.id}>{renderExerciseItem({ item: exercise })}</React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : isSearchMode ? (
        /* Search mode: virtualized FlatList */
        <FlatList
          data={listData}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {SharedHeader}
              <View className="px-5 mt-6 mb-4">
                <Text style={{ fontSize: 13, color: c.steel }}>
                  {totalResults} results for &quot;{searchQuery}&quot;
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View className="flex-row items-center p-4 mx-5" style={{ borderRadius: 12, backgroundColor: c.surface }}>
              <View className="w-12 h-12 items-center justify-center mr-3" style={{ borderRadius: 8, backgroundColor: c.surfaceAlt }}>
                <Feather name="slash" size={20} color={c.steel} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.ink }}>No results match &quot;{searchQuery}&quot;</Text>
            </View>
          }
          renderItem={renderSearchItem}
        />
      ) : isRecipesTab ? (
        /* Recipes tab: 2-column grid FlatList */
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {SharedHeader}
              <View className="mt-6 mb-4">
                <Text style={{ fontSize: 13, color: c.steel }}>
                  {recipes.length} recipes
                </Text>
              </View>
            </>
          }
          renderItem={renderRecipeGridItem}
        />
      ) : isExerciseTab ? (
        /* Exercise tab: vertical FlatList */
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {SharedHeader}
              <View className="mt-6 mb-4">
                <Text style={{ fontSize: 13, color: c.steel }}>
                  {exercises.length} exercises
                </Text>
              </View>
            </>
          }
          renderItem={renderExerciseItem}
        />
      ) : isSavedTab ? (
        /* Saved tab: vertical FlatList */
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {SharedHeader}
              <View className="mt-6 mb-4">
                <Text style={{ fontSize: 13, color: c.steel }}>
                  {savedRecipes.length} saved
                </Text>
              </View>
            </>
          }
          renderItem={renderSavedItem}
        />
      ) : null}

    </ScreenWrapper>
  );
}
