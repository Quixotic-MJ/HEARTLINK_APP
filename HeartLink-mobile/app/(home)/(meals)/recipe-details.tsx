import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "../../../lib/secureTokenStore";
import { useUser } from "../../../contexts/UserContext";
import { queueMealForSync } from "../../../services/SyncService";
import { useToast } from "../../../contexts/ToastContext";
import { unitForAmount } from "../../../utils/units";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { AmountStepper } from "../../../components/food/FoodBits";
import { FoodWarning } from "../../../components/explore/ExploreBits";
import { foodWarnings } from "../../../services/explore";
import { apiFetch } from "../../../lib/api";
import { formatMg } from "../../../services/foodLogging";
type Tab = "Ingredients" | "Instructions";

export default function RecipeDetailsScreen() {
  const { c, isDark } = useDs();
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
  const [activeTab, setActiveTab] = useState<Tab>("Ingredients");
  const [isSaved, setIsSaved] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const storedToken = await getToken();
        const effectiveToken = token || storedToken || "";
        const headers: Record<string, string> = {};
        if (effectiveToken) {
          headers["Authorization"] = `Bearer ${effectiveToken}`;
        }
        const response = await apiFetch(`/api/recipes/${id}`, { headers });
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
          image: data.image_url || "",
          tags: data.tags || [],
          heartBenefit: data.heart_benefit || "",
          expertValidated: !!data.expert_validated,
          warnings: foodWarnings(data.warnings),
          nutrition: {
            sodium: data.sodium_mg || 0,
            fiber: data.fiber_g || 0,
            saturatedFat: data.saturated_fat_g || 0,
            calories: data.calories || 0,
          },
          ingredients: Array.isArray(data.ingredients)
            ? data.ingredients.map((ing: any) => {
                const hasAmount = ing.amount !== null && ing.amount !== undefined && ing.amount !== 0;
                const qtyStr = hasAmount ? `${ing.amount} ${unitForAmount(ing.unit, ing.amount)}`.trim() : "";
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

        const storedToken = await getToken();
        const effectiveToken = token || storedToken || "";
        if (userId && effectiveToken) {
          const res = await apiFetch(`/api/recipes/saved/${userId}`, {
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
      const storedToken = await getToken();
      const effectiveToken = token || storedToken || "";
      if (userId && effectiveToken) {
        await apiFetch(`/api/recipes/${id}/save/${userId}`, {
          method: nextSavedState ? "POST" : "DELETE",
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      showToast({
        title: nextSavedState ? "Recipe saved" : "Recipe removed",
        message: nextSavedState
          ? "Added to your saved recipes."
          : "Removed from your saved recipes.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to toggle recipe bookmark:", err);
    }
  };

  const roundButton = {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: c.canvas,
    borderWidth: 1,
    borderColor: c.hairline,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  if (isLoading || !recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: Math.max(insets.top, 16) + 60, paddingHorizontal: 20, gap: 12 }}>
        <Skeleton style={{ height: 220, borderRadius: 12 }} />
        <Skeleton style={{ height: 32, width: "70%", borderRadius: 8 }} />
        <Skeleton style={{ height: 18, width: "50%", borderRadius: 8 }} />
        <Skeleton style={{ height: 96, borderRadius: 12 }} />
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
      const response = await apiFetch(`/api/meals/${userId}`, {
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

  const meta = [
    { icon: "clock" as const, text: `${recipe.prepTime} min` },
    { icon: "bar-chart-2" as const, text: recipe.difficulty },
    { icon: "users" as const, text: `Makes ${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}` },
  ];
  const cells = [
    { label: "Sodium", value: formatMg(currentSodium), unit: "mg" },
    { label: "Calories", value: formatMg(currentCalories), unit: "kcal" },
    { label: "Saturated fat", value: String(Math.round(currentSatFat * 10) / 10), unit: "g" },
    { label: "Fibre", value: String(Math.round(currentFiber * 10) / 10), unit: "g" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Back and save sit over the photo */}
      <View
        style={{ paddingTop: Math.max(insets.top, 16), position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 }}
      >
        <AnimatedButton onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={roundButton}>
          <Feather name="arrow-left" size={20} color={c.ink} />
        </AnimatedButton>
        <AnimatedButton
          onPress={handleToggleSave}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          accessibilityLabel={isSaved ? "Remove from saved recipes" : "Save recipe"}
          style={roundButton}
        >
          <MaterialCommunityIcons name={isSaved ? "heart" : "heart-outline"} size={20} color={isSaved ? c.danger : c.ink} />
        </AnimatedButton>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={{ width: "100%", height: 260, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={44} color={c.muted} />
          {!!recipe.image && (
            <Image source={{ uri: recipe.image }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 20 }}>
          {/* Title */}
          <View style={{ gap: 10 }}>
            {recipe.expertValidated && (
              <View className="flex-row items-center self-start" style={{ gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.sky }}>
                <MaterialCommunityIcons name="check-decagram-outline" size={14} color={c.onTint} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.onTint }}>Dietitian approved</Text>
              </View>
            )}
            <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "600", lineHeight: 35, color: c.ink }}>
              {recipe.title}
            </Text>
            {recipe.subtitle ? <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate }}>{recipe.subtitle}</Text> : null}
            <View className="flex-row flex-wrap" style={{ gap: 6 }}>
              {meta.map((m) => (
                <View key={m.text} className="flex-row items-center" style={{ gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.surfaceAlt }}>
                  <Feather name={m.icon} size={13} color={c.charcoal} />
                  <Text style={{ fontSize: 13, fontWeight: "500", color: c.charcoal }}>{m.text}</Text>
                </View>
              ))}
              {recipe.tags.map((tag: string) => (
                <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.surfaceAlt }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: c.charcoal }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* What clashes with the patient's allergies or diet */}
          <FoodWarning warnings={foodWarnings(recipe.warnings)} />

          {/* Why it's good */}
          {recipe.heartBenefit ? (
            <View className="flex-row" style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.mint }}>
              <Feather name="heart" size={18} color={c.charcoal} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.charcoal }}>{"Why it's good"}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{recipe.heartBenefit}</Text>
              </View>
            </View>
          ) : null}

          {/* Servings and nutrition */}
          <View style={{ gap: 12 }}>
            <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, flexShrink: 1 }}>Servings you ate</Text>
              <AmountStepper
                label="servings"
                value={`${servingsMultiplier} ${servingsMultiplier === 1 ? "serving" : "servings"}`}
                onLess={() => setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))}
                onMore={() => setServingsMultiplier(servingsMultiplier + 0.5)}
              />
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {cells.map((cell) => (
                <View key={cell.label} style={{ flexBasis: "47%", flexGrow: 1, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: c.surface, gap: 2 }}>
                  <Text style={{ fontSize: 13, color: c.slate }}>{cell.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                    {cell.value} <Text style={{ fontSize: 13, fontWeight: "400", color: c.slate }}>{cell.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>

            {isHighSodium && (
              <View className="flex-row" style={{ gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.rose }}>
                <Feather name="alert-triangle" size={18} color={c.danger} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: c.charcoal }}>Exceeds your per-meal sodium limit</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                    Based on your baseline, this portion exceeds your recommended per-meal sodium limit.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Ingredients / instructions */}
          <View>
            <View accessibilityRole="tablist" className="flex-row" style={{ borderBottomWidth: 1, borderBottomColor: c.hairline, marginBottom: 8 }}>
              {(["Ingredients", "Instructions"] as Tab[]).map((tab) => {
                const on = activeTab === tab;
                return (
                  <AnimatedButton
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={{ minHeight: 44, paddingHorizontal: 4, marginRight: 20, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: on ? c.ink : "transparent", marginBottom: -1 }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "500", color: on ? c.ink : c.steel }}>{tab}</Text>
                  </AnimatedButton>
                );
              })}
            </View>

            {activeTab === "Ingredients" ? (
              <View>
                {recipe.ingredients.map((ing: any, i: number) => (
                  <View
                    key={i}
                    className="flex-row"
                    style={{ paddingVertical: 12, gap: 12, borderBottomWidth: i !== recipe.ingredients.length - 1 ? 1 : 0, borderBottomColor: c.hairlineSoft }}
                  >
                    <Text style={{ width: 96, fontSize: 15, fontWeight: "600", color: c.ink }}>{ing.qty}</Text>
                    <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: c.charcoal }}>{ing.item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingTop: 8, gap: 16 }}>
                {recipe.steps.map((step: any, i: number) => (
                  <View key={i} className="flex-row" style={{ gap: 12 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: c.onTint }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, lineHeight: 23, color: c.ink, paddingTop: 3 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20), borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton
          label={isLogged ? "Logged today" : "Log this meal"}
          onPress={handleLogMeal}
          loading={isSubmitting}
          disabled={isLogged}
        />
      </View>
    </View>
  );
}
