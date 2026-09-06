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
        <Text className="text-[11px] font-normal text-slate-400"> {unit}</Text>
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

export default function RecipeDetailsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

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
            color={isSaved ? "#ef4444" : "#0f172a"}
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
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 self-start mb-3">
              <Feather name="shield" size={13} color="#059669" />
              <Text className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Clinical Nutritionist Verified • Expert Recipe Database
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
                className="px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: tag === "Low Sodium" ? "#eaf3de" : "#f8fafc",
                  borderColor: tag === "Low Sodium" ? "#c0dd97" : "#e2e8f0",
                }}
              >
                <Text
                  className="text-[9px] uppercase tracking-wide"
                  style={{
                    color: tag === "Low Sodium" ? "#3b6d11" : "#94a3b8",
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* Servings Multiplier */}
          <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
            <View>
              <Text className="text-[14px] font-bold text-slate-900 dark:text-white mb-1">
                Servings
              </Text>
              <Text className="text-[12px] text-slate-500 dark:text-slate-400">
                Adjust to see exact macros
              </Text>
            </View>
            <View className="flex-row items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1">
              <TouchableOpacity
                onPress={() =>
                  setServingsMultiplier(Math.max(1, servingsMultiplier - 1))
                }
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950"
              >
                <Feather name="minus" size={16} color="#0f172a" />
              </TouchableOpacity>
              <Text className="text-[16px] font-bold w-4 text-center">
                {servingsMultiplier}
              </Text>
              <TouchableOpacity
                onPress={() => setServingsMultiplier(servingsMultiplier + 1)}
                className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950"
              >
                <Feather name="plus" size={16} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Heart Benefit ── */}
        <View className="px-5 mb-6">
          <View className="bg-green-50 rounded-2xl p-4 border border-green-100 flex-row items-start gap-3">
            <Feather
              name="heart"
              size={18}
              color="#16a34a"
              className="mt-0.5"
            />
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-green-900 mb-1">
                Why it's good
              </Text>
              <Text className="text-[13px] text-green-800 leading-tight">
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
            <View className="mt-4 bg-red-50 p-4 rounded-xl border border-red-100 flex-row items-start gap-3">
              <Feather
                name="alert-triangle"
                size={18}
                color="#ef4444"
                className="mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-red-900 mb-1">
                  High Sodium Warning
                </Text>
                <Text className="text-[13px] text-red-800 leading-tight">
                  Based on your baseline, this portion exceeds your recommended
                  per-meal sodium limit.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Tabs ── */}
        <View className="px-5 mt-2">
          <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
            <TouchableOpacity
              onPress={() => setActiveTab("Ingredients")}
              className="flex-1 py-2.5 items-center rounded-lg"
              style={
                activeTab === "Ingredients"
                  ? {
                      backgroundColor: "#ffffff",
                      elevation: 1,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                    }
                  : undefined
              }
            >
              <Text
                className="text-[13px] font-bold"
                style={{
                  color: activeTab === "Ingredients" ? "#0f172a" : "#64748b",
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
                  ? {
                      backgroundColor: "#ffffff",
                      elevation: 1,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      shadowOffset: { width: 0, height: 1 },
                    }
                  : undefined
              }
            >
              <Text
                className="text-[13px] font-bold"
                style={{
                  color: activeTab === "Instructions" ? "#0f172a" : "#64748b",
                }}
              >
                Instructions
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "Ingredients" ? (
            <View className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
              {recipe.ingredients.map((ing: any, i: number) => (
                <View
                  key={i}
                  className="flex-row items-center py-4"
                  style={
                    i !== recipe.ingredients.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: "#e2e8f080" }
                      : undefined
                  }
                >
                  <View className="flex-1 flex-row ml-2">
                    <Text className="text-[15px] text-slate-900 dark:text-white font-bold w-24">
                      {ing.qty}
                    </Text>
                    <Text className="text-[15px] text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                      {ing.item}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
              {recipe.steps.map((step: any, i: number) => (
                <View
                  key={i}
                  className="flex-row py-4"
                  style={
                    i !== recipe.steps.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: "#e2e8f080" }
                      : undefined
                  }
                >
                  <View className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center mr-4 mt-0.5">
                    <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                      {i + 1}
                    </Text>
                  </View>
                  <Text className="text-[15px] text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                    {step}
                  </Text>
                </View>
              ))}
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
           className={`w-full py-4 rounded-xl items-center justify-center flex-row gap-2 ${isLogged ? "bg-slate-100 dark:bg-slate-800" : "bg-primary"}`}
         >
           {isLogged ? (
             <MaterialCommunityIcons name="check-all" size={18} className="text-slate-400 dark:text-slate-500" />
           ) : (
             <Feather name="check" size={18} className="text-primary-foreground" />
           )}
           <Text 
             className={`text-[14px] font-semibold ${isLogged ? "text-slate-400 dark:text-slate-500" : "text-primary-foreground"}`}
           >
             {isLogged ? "Logged Today" : isSubmitting ? "Logging..." : "Log This Meal"}
           </Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
