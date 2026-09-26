import { useColorScheme } from "nativewind";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { queueMealForSync } from "../../../services/SyncService";
import { useToast } from "../../../contexts/ToastContext";
import { useQueryClient } from "@tanstack/react-query";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const DIFFICULTY_CONFIG = {
  Easy: { bg: "#eaf3de", text: "#3b6d11" },
  Medium: { bg: "#faeeda", text: "#854f0b" },
  Hard: { bg: "#fcebeb", text: "#a32d2d" },
} as const;

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="flex-1 rounded-2xl px-1 py-3 items-center justify-center border"
      style={{
        backgroundColor: isDark ? "#162232" : "#F8FAFC",
        borderColor: isDark ? "#1E293B" : "#E2E8F0",
      }}
    >
      <Text
        className="text-[14px] font-bold mb-1"
        style={{ color: highlight ? "#EF4444" : (isDark ? "#FFFFFF" : "#0F172A") }}
      >
        {value}
      </Text>
      <Text 
        className="text-[9px] font-bold uppercase tracking-widest text-center"
        style={{ color: isDark ? "#94A3B8" : "#64748B" }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label} {unit}
      </Text>
    </View>
  );
}

export default function RecipeDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const savedRecipesKey = userId ? `@saved_recipes_${userId}` : "@saved_recipes";
  const recipesCacheKey = userId ? `@recipes_cache_${userId}` : "@recipes_cache";

  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<"Ingredients" | "Instructions">(
    "Ingredients",
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        const headers: Record<string, string> = {};
        if (effectiveToken) {
          headers["Authorization"] = `Bearer ${effectiveToken}`;
        }
        const response = await fetch(`${base_url}/api/recipes/${id}`, { headers });
        if (!response.ok) throw new Error("Failed to fetch recipe");
        const data = await response.json();
        
        // map backend structure to match existing frontend format expectations
        const mapped = {
          id: data.id,
          title: data.name,
          subtitle: data.subtitle || "",
          prepTime: data.prep_time_minutes || 0,
          servings: data.servings || 1,
          difficulty: data.difficulty || "Easy",
          image: data.image_url || "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=200&q=80",
          tags: data.tags || [],
          heartBenefit: data.heart_benefit || "",
          expertValidated: !!data.expert_validated,
          nutrition: {
            sodium: data.sodium_mg || 0,
            fiber: data.fiber_g || 0,
            saturatedFat: data.saturated_fat_g || 0,
            calories: data.calories || 0,
          },
          ingredients: Array.isArray(data.ingredients)
            ? data.ingredients.map((ing: any) => {
                const hasAmount = ing.amount !== null && ing.amount !== undefined && ing.amount !== 0;
                const qtyStr = hasAmount ? `${ing.amount} ${ing.unit || ""}`.trim() : "";
                return { qty: qtyStr, item: ing.name || "" };
              })
            : data.ingredients 
              ? Object.keys(data.ingredients).map(k => ({ qty: data.ingredients[k], item: k })) 
              : [],
          steps: data.steps || [],
        };
        setRecipe(mapped);
      } catch (error) {
        console.log("Network error in recipe details, attempting to load from cache...");
        try {
          const cached = (await AsyncStorage.getItem(recipesCacheKey)) || (await AsyncStorage.getItem("@recipes_cache"));
          if (cached) {
            const recipesList = JSON.parse(cached);
            const cachedRecipe = recipesList.find((r: any) => String(r.id) === String(id));
            if (cachedRecipe) {
              setRecipe({
                ...cachedRecipe,
                expertValidated: !!cachedRecipe.expert_validated || !!cachedRecipe.expertValidated,
              });
              return;
            }
          }
        } catch (cacheErr) {
          console.error("Cache read failed:", cacheErr);
        }
        
        console.error(error);
        showToast({ title: "Error", message: "Could not load recipe details.", type: "error" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id, token, recipesCacheKey]);

  // Hydrate bookmark state from scoped storage and remote API (HL-ENG-22 / SEC-QA-11)
  useEffect(() => {
    async function hydrateBookmark() {
      try {
        const cached = await AsyncStorage.getItem(savedRecipesKey);
        if (cached) {
          const list: string[] = JSON.parse(cached);
          if (Array.isArray(list) && (list.includes(String(id)) || list.includes(id as string))) {
            setIsSaved(true);
          }
        }

        const storedToken = await AsyncStorage.getItem("access_token");
        const effectiveToken = token || storedToken || "";
        if (userId && effectiveToken) {
          const res = await fetch(`${base_url}/api/recipes/saved/${userId}`, {
            headers: { "Authorization": `Bearer ${effectiveToken}` },
          });
          if (res.ok) {
            const savedData = await res.json();
            if (Array.isArray(savedData)) {
              const remoteIds: string[] = savedData.map((item: any) =>
                String(item.recipe_id || item.id || item)
              );
              setIsSaved(remoteIds.includes(String(id)));
            }
          }
        }
      } catch (err) {
        console.warn("Bookmark hydration failed:", err);
      }
    }
    if (id) hydrateBookmark();
  }, [id, userId, token, savedRecipesKey]);

  // Persist bookmark toggle locally and remotely
  const handleToggleSave = async () => {
    const nextSavedState = !isSaved;
    setIsSaved(nextSavedState);

    try {
      // 1. Scoped local cache update
      const cached = await AsyncStorage.getItem(savedRecipesKey);
      let list: string[] = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(list)) list = [];

      const recipeIdStr = String(id);
      if (nextSavedState) {
        if (!list.includes(recipeIdStr)) list.push(recipeIdStr);
      } else {
        list = list.filter((rId) => String(rId) !== recipeIdStr);
      }
      await AsyncStorage.setItem(savedRecipesKey, JSON.stringify(list));
      
      // Update global React Query state so parent screens reflect this instantly
      if (userId) {
        queryClient.setQueryData(["saved_recipes", userId], list);
      }

      // 2. Synchronize with Backend
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      if (userId && effectiveToken) {
        await fetch(`${base_url}/api/recipes/${id}/save/${userId}`, {
          method: nextSavedState ? "POST" : "DELETE",
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      showToast({
        title: nextSavedState ? "Recipe Saved" : "Recipe Removed",
        message: nextSavedState
          ? "Added to your personal heart-healthy saved recipes collection."
          : "Removed from your saved recipes.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to toggle recipe bookmark:", err);
    }
  };

  if (isLoading || !recipe) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentSodium = recipe.nutrition.sodium * servingsMultiplier;
  const currentCalories = recipe.nutrition.calories * servingsMultiplier;
  const currentFiber = recipe.nutrition.fiber * servingsMultiplier;
  const currentSatFat =
    (recipe.nutrition.saturatedFat ?? 0) * servingsMultiplier;

  const isHighSodium = currentSodium >= 140;

  const handleLogMeal = async () => {
    setIsSubmitting(true);
    const payload = {
      recipe_id: recipe.id,
      meal_name: recipe.title,
      portion: servingsMultiplier,
      calories: currentCalories,
      sodium_mg: currentSodium,
      saturated_fat_g: currentSatFat,
      fiber_g: currentFiber,
      image_url: recipe.image,
    };
    try {
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to log meal");
      
      setIsLogged(true);
      showToast({ 
        title: "Meal logged!", 
        message: "Your daily nutrition budget has been updated.", 
        type: "success",
        duration: 4000
      });
      router.push("/(home)/(tabs)/dashboard");
    } catch (error) {
      console.log("Network error logging meal, queueing offline...", error);
      await queueMealForSync(userId!, payload);
      
      setIsLogged(true);
      showToast({ 
        title: "Saved offline", 
        message: "Your meal was saved locally and will sync when you reconnect.", 
        type: "info",
        duration: 4000
      });
      router.push("/(home)/(tabs)/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <StatusBar style="dark" />

      {/* Header (Absolute position over scrollview) */}
      <View
        style={{ paddingTop: Math.max(insets.top, 16) }}
        className="flex-row items-center px-5 pb-2 z-10 absolute top-0 left-0 right-0 justify-between"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 items-center justify-center shadow-sm"
        >
          <Feather name="arrow-left" size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleToggleSave}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 items-center justify-center shadow-sm"
          accessibilityLabel={isSaved ? "Remove from saved recipes" : "Save recipe"}
        >
          <Feather
            name="heart"
            size={20}
            color={isSaved ? "#ef4444" : (isDark ? "#f8fafc" : "#0f172a")}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View className="w-full h-80 bg-slate-100 dark:bg-slate-800 relative items-center justify-center">
          <MaterialCommunityIcons name="silverware-fork-knife" size={48} className="text-slate-300 dark:text-slate-700 absolute" />
          {!!recipe.image && (
            <Image
              source={{ uri: recipe.image }}
              className="w-full h-full absolute"
              resizeMode="cover"
            />
          )}
          {/* Subtle gradient overlay for top buttons */}
          <View className="absolute top-0 left-0 right-0 h-32 bg-black/10" />
          
          <View
            className="absolute bottom-4 left-5 flex-row items-center gap-1 px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <Feather name="clock" size={11} color="rgba(255,255,255,0.9)" />
            <Text className="text-white text-[11px]">
              {recipe.prepTime} min
            </Text>
          </View>
          <View
            className="absolute bottom-4 right-5 px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: (DIFFICULTY_CONFIG as any)[recipe.difficulty]?.bg || "#eaf3de" }}
          >
            <Text
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{ color: (DIFFICULTY_CONFIG as any)[recipe.difficulty]?.text || "#3b6d11" }}
            >
              {recipe.difficulty}
            </Text>
          </View>
        </View>

        {/* Title & Tags */}
        <View className="px-5 pt-8 pb-6">
          {recipe.expertValidated && (
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full self-start mb-4" style={{ backgroundColor: isDark ? "#0A2411" : "#DCFCE7" }}>
              <MaterialCommunityIcons name="check-decagram-outline" size={14} color="#22C55E" />
              <Text className="text-[11px] font-bold" style={{ color: "#22C55E" }}>
                Clinical nutritionist verified
              </Text>
            </View>
          )}

          <Text className="text-[32px] font-bold text-slate-900 dark:text-white leading-tight mb-3">
            {recipe.title}
          </Text>
          <Text className="text-[16px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {recipe.subtitle}
          </Text>

          <View className="flex-row flex-wrap gap-1.5 mb-6">
            {recipe.tags.map((tag: string) => (
              <View
                key={tag}
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: tag === "Low Sodium" ? (isDark ? "#0A2411" : "#DCFCE7") : (isDark ? "#1E293B" : "#F1F5F9"),
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: tag === "Low Sodium" ? "#22C55E" : (isDark ? "#FFFFFF" : "#0F172A"),
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Servings Multiplier */}
          <View className="flex-row items-center justify-between p-4 rounded-2xl mb-4" style={{ backgroundColor: isDark ? "#162232" : "#F8FAFC" }}>
            <View>
              <Text className="text-[14px] font-bold mb-1" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                Servings
              </Text>
              <Text className="text-[12px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
                Adjust to see exact macros
              </Text>
            </View>
            <View className="flex-row items-center rounded-xl px-2 py-1.5 gap-4" style={{ backgroundColor: isDark ? "#0F172A" : "#F1F5F9" }}>
              <TouchableOpacity
                onPress={() =>
                  setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))
                }
                className="p-2"
              >
                <Feather name="minus" size={16} color={isDark ? "#FFFFFF" : "#0F172A"} />
              </TouchableOpacity>
              <Text className="text-[15px] font-bold w-7 text-center" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                {servingsMultiplier}
              </Text>
              <TouchableOpacity
                onPress={() => setServingsMultiplier(servingsMultiplier + 0.5)}
                className="p-2"
              >
                <Feather name="plus" size={16} color={isDark ? "#FFFFFF" : "#0F172A"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Heart Benefit ── */}
        <View className="px-5 mb-6">
          <View className="rounded-2xl p-4 flex-row items-start gap-3" style={{ backgroundColor: isDark ? "#0A2411" : "#DCFCE7" }}>
            <Feather
              name="heart"
              size={18}
              color="#22C55E"
              className="mt-0.5"
            />
            <View className="flex-1">
              <Text className="text-[14px] font-bold mb-1" style={{ color: "#22C55E" }}>
                Why it's good
              </Text>
              <Text className="text-[13px] leading-tight" style={{ color: "#22C55E" }}>
                {recipe.heartBenefit}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Macros ── */}
        <View className="px-5 mb-6">
          <Text className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">
            Nutrition Breakdown
          </Text>
          <View className="flex-row gap-2">
            <NutritionPill
              label="Sodium"
              value={currentSodium}
              unit="mg"
              highlight={!isHighSodium}
            />
            <NutritionPill label="Fiber" value={currentFiber} unit="g" />
            <NutritionPill label="Sat. Fat" value={currentSatFat} unit="g" />
            <NutritionPill
              label="Calories"
              value={currentCalories}
              unit="cal"
            />
          </View>

          {isHighSodium && (
            <View className="mt-4 p-4 rounded-xl flex-row items-start gap-3" style={{ backgroundColor: isDark ? "#450A0A" : "#FEE2E2" }}>
              <Feather
                name="alert-triangle"
                size={18}
                color="#EF4444"
                className="mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-[14px] font-bold mb-1" style={{ color: isDark ? "#FCA5A5" : "#991B1B" }}>
                  Exceeds your per-meal sodium limit
                </Text>
                <Text className="text-[13px] leading-tight" style={{ color: isDark ? "#FECACA" : "#7F1D1D" }}>
                  Based on your baseline, this portion exceeds your recommended
                  per-meal sodium limit.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Tabs ── */}
        <View className="px-5 mt-2">
          <View className="flex-row p-1 rounded-xl mb-4" style={{ backgroundColor: isDark ? "#162232" : "#F1F5F9" }}>
            <TouchableOpacity
              onPress={() => setActiveTab("Ingredients")}
              className="flex-1 py-2.5 items-center rounded-lg"
              style={
                activeTab === "Ingredients"
                  ? { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }
                  : undefined
              }
            >
              <Text
                className="text-[13px] font-bold"
                style={{
                  color: activeTab === "Ingredients" ? (isDark ? "#FFFFFF" : "#0F172A") : (isDark ? "#94A3B8" : "#64748B"),
                }}
              >
                Ingredients
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("Instructions")}
              className="flex-1 py-2.5 items-center rounded-lg"
              style={
                activeTab === "Instructions"
                  ? { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }
                  : undefined
              }
            >
              <Text
                className="text-[13px] font-bold"
                style={{
                  color: activeTab === "Instructions" ? (isDark ? "#FFFFFF" : "#0F172A") : (isDark ? "#94A3B8" : "#64748B"),
                }}
              >
                Instructions
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "Ingredients" ? (
            <View className="mb-6 mt-2">
              {recipe.ingredients.map((ing: any, i: number) => (
                <View
                  key={i}
                  className="flex-row items-center py-4"
                  style={
                    i !== recipe.ingredients.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: isDark ? "#1E293B" : "#E2E8F0" }
                      : undefined
                  }
                >
                  <View className="flex-1 flex-row">
                    <Text className="text-[14px] font-bold w-24" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                      {ing.qty}
                    </Text>
                    <Text className="text-[14px] flex-1 leading-relaxed" style={{ color: isDark ? "#CBD5E1" : "#475569" }}>
                      {ing.item}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="mb-6 mt-4 px-2">
              {recipe.steps.map((step: any, i: number) => {
                const isLast = i === recipe.steps.length - 1;
                return (
                  <View key={i} className="flex-row mb-6 relative">
                    {/* Timeline Line */}
                    {!isLast && (
                      <View 
                        className="absolute left-[11px] top-8 bottom-[-24px] w-[2px]" 
                        style={{ backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }} 
                      />
                    )}
                    
                    {/* Step Node */}
                    <View className="mr-4 mt-0.5 relative z-10">
                      {isLast ? (
                        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? "#0A2411" : "#DCFCE7" }}>
                          <Feather name="check" size={14} color="#22C55E" />
                        </View>
                      ) : (
                        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? "#FFFFFF" : "#0F172A" }}>
                          <Text className="text-[12px] font-bold" style={{ color: isDark ? "#0F172A" : "#FFFFFF" }}>
                            {i + 1}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Step Text */}
                    <View className="flex-1 pt-1">
                      <Text className="text-[15px] font-bold leading-relaxed" style={{ color: isDark ? "#FFFFFF" : "#0F172A" }}>
                        {step}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Button ── */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-5 pt-4 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         <TouchableOpacity 
           activeOpacity={0.85}
           onPress={handleLogMeal}
           disabled={isLogged || isSubmitting}
           className={`w-full py-4 rounded-xl items-center justify-center flex-row gap-2 ${isLogged ? "bg-slate-100 dark:bg-slate-800" : "bg-[#38BDF8]"}`}
         >
           {isLogged ? (
             <MaterialCommunityIcons name="check-all" size={18} className="text-slate-400 dark:text-slate-500" />
           ) : (
             <Feather name="check" size={18} color="#FFFFFF" />
           )}
           <Text 
             className={`text-[14px] font-semibold ${isLogged ? "text-slate-400 dark:text-slate-500" : "text-white"}`}
           >
             {isLogged ? "Logged Today" : isSubmitting ? "Logging..." : "Log This Meal"}
           </Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
