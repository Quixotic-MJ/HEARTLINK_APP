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
import { useUser } from "../../../contexts/UserContext";

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

// ─── User Baseline ────────────────────────────────────────────────────────────

const USER_CONDITIONS = ["Hypertension"];

// ─── Recipe Data ──────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  {
    id: "1",
    title: "Grilled Bangus with Citrus & Garlic",
    subtitle: "Classic Filipino milkfish, heart-healthy style",
    prepTime: 35,
    servings: 2,
    difficulty: "Medium",
    image: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Protein", "Filipino"],
    heartBenefit: "Calamansi and garlic provide robust flavor without the need for excess salt, making it ideal for blood pressure management.",
    nutrition: { sodium: 95, fiber: 2, saturatedFat: 2, calories: 280 },
    ingredients: [
      { qty: "1 whole", item: "Bangus (milkfish), butterflied" },
      { qty: "4 cloves", item: "Garlic, minced" },
      { qty: "2 tbsp", item: "Fresh calamansi juice" },
      { qty: "1 tbsp", item: "Olive oil" },
      { qty: "1/2 tsp", item: "Black pepper" },
      { qty: "1/4 tsp", item: "Sea salt" },
      { qty: "1 cup", item: "Tomato and onion salsa" },
    ],
    steps: [
      "Butterfly the bangus and remove the bones. Rinse and pat dry with paper towels.",
      "Combine garlic, calamansi juice, olive oil, salt, and pepper in a bowl. Marinate bangus for 15 minutes.",
      "Preheat grill to medium-high heat. Brush grates with a light coat of oil.",
      "Grill bangus skin-side down for 5 minutes, then flip and cook for another 4 minutes until flaky.",
      "Serve with fresh tomato-onion salsa and a squeeze of calamansi on top.",
    ],
  },
  {
    id: "2",
    title: "Malunggay & Corn Soup",
    subtitle: "Nutrient-packed Filipino moringa soup",
    prepTime: 20,
    servings: 4,
    difficulty: "Easy",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Fiber", "Filipino"],
    heartBenefit: "Malunggay is packed with antioxidants and essential nutrients that help reduce inflammation and lower blood pressure.",
    nutrition: { sodium: 65, fiber: 6, saturatedFat: 1, calories: 120 },
    ingredients: [
      { qty: "2 cups", item: "Malunggay (moringa) leaves, stripped" },
      { qty: "2 ears", item: "Sweet corn, cut into rounds" },
      { qty: "4 cups", item: "Low-sodium chicken broth" },
      { qty: "1 thumb", item: "Ginger, sliced" },
      { qty: "1 medium", item: "Onion, quartered" },
      { qty: "1 tbsp", item: "Fish sauce (low-sodium)" },
    ],
    steps: [
      "Bring low-sodium chicken broth to a boil in a pot. Add ginger and onion.",
      "Add corn rounds and simmer for 8 minutes until tender.",
      "Season with low-sodium fish sauce. Taste and adjust.",
      "Add malunggay leaves in the last 2 minutes of cooking — don't overcook.",
      "Serve hot as a light main course or hearty side dish.",
    ],
  },
  {
    id: "3",
    title: "Oatmeal with Fresh Mango",
    subtitle: "Fiber-rich breakfast with tropical fruit",
    prepTime: 10,
    servings: 1,
    difficulty: "Easy",
    image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Fiber", "Breakfast"],
    heartBenefit: "Oats are rich in soluble fiber which binds to cholesterol and helps clear it from your bloodstream.",
    nutrition: { sodium: 15, fiber: 8, saturatedFat: 3, calories: 310 },
    ingredients: [
      { qty: "1/2 cup", item: "Rolled oats" },
      { qty: "1 cup", item: "Water or unsweetened almond milk" },
      { qty: "1/2 cup", item: "Fresh ripe mango, diced" },
      { qty: "1 tbsp", item: "Chia seeds" },
      { qty: "1 tsp", item: "Raw honey" },
      { qty: "Pinch", item: "Cinnamon" },
    ],
    steps: [
      "Combine oats and water (or almond milk) in a pot. Bring to a gentle boil.",
      "Reduce heat and stir for 3–4 minutes until creamy.",
      "Transfer to a bowl. Top with diced mango and chia seeds.",
      "Drizzle with honey and dust with cinnamon. Serve immediately.",
    ],
  },
  {
    id: "4",
    title: "Tinolang Manok",
    subtitle: "Filipino classic with green papaya & chili leaves",
    prepTime: 40,
    servings: 4,
    difficulty: "Easy",
    image: "https://images.unsplash.com/photo-1604152135912-04a022e23696?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Potassium", "Filipino"],
    heartBenefit: "Green papaya and ginger support digestion and provide anti-inflammatory benefits without relying on saturated fats.",
    nutrition: { sodium: 110, fiber: 3, saturatedFat: 4, calories: 220 },
    ingredients: [
      { qty: "500g", item: "Chicken thigh, cut into pieces" },
      { qty: "1 thumb", item: "Ginger, sliced into strips" },
      { qty: "1 medium", item: "Green papaya, cubed" },
      { qty: "1 cup", item: "Chili pepper leaves (dahon ng sili)" },
      { qty: "1 medium", item: "Onion, quartered" },
      { qty: "1 tbsp", item: "Fish sauce (low-sodium)" },
      { qty: "6 cups", item: "Water" },
    ],
    steps: [
      "Sauté ginger and onion in a pot with a little oil until fragrant, about 2 minutes.",
      "Add chicken pieces and cook until lightly browned on all sides.",
      "Pour in water and bring to a boil. Skim off any foam.",
      "Add green papaya and simmer for 10 minutes until fork-tender.",
      "Season with low-sodium fish sauce. Add chili leaves, cook 1 more minute, then serve.",
    ],
  },
  {
    id: "5",
    title: "Ensaladang Talong",
    subtitle: "Smoky grilled eggplant with tomato vinaigrette",
    prepTime: 15,
    servings: 2,
    difficulty: "Easy",
    image: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Fiber", "Filipino"],
    heartBenefit: "Eggplants contain flavonoids like anthocyanins, which are proven to improve heart health and lower the risk of heart disease.",
    nutrition: { sodium: 45, fiber: 7, saturatedFat: 0, calories: 90 },
    ingredients: [
      { qty: "2 large", item: "Eggplants" },
      { qty: "2 medium", item: "Tomatoes, diced" },
      { qty: "1 small", item: "Red onion, sliced thin" },
      { qty: "2 tbsp", item: "Cane vinegar" },
      { qty: "1 tsp", item: "Olive oil" },
      { qty: "Pinch", item: "Salt and pepper" },
    ],
    steps: [
      "Grill whole eggplants over open flame or broiler until charred and soft, about 8 minutes, turning occasionally.",
      "Peel off the skin under running water. Flatten on a plate with a fork.",
      "Combine diced tomatoes, red onion, vinegar, and olive oil.",
      "Spoon the tomato mixture over the eggplant. Season lightly with salt and pepper.",
      "Serve at room temperature as a side dish.",
    ],
  },
  {
    id: "6",
    title: "Baked Salmon with Herbs",
    subtitle: "Omega-3 rich fillet with lemon-dill topping",
    prepTime: 25,
    servings: 2,
    difficulty: "Easy",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    tags: ["Low Sodium", "High Protein", "Omega-3"],
    heartBenefit: "Rich in Omega-3 fatty acids, salmon helps decrease triglycerides, lowers blood pressure, and reduces the risk of arrhythmias.",
    nutrition: { sodium: 75, fiber: 1, saturatedFat: 2, calories: 350 },
    ingredients: [
      { qty: "2 fillets", item: "Salmon (about 150g each)" },
      { qty: "1 tbsp", item: "Olive oil" },
      { qty: "1 tbsp", item: "Fresh dill, chopped" },
      { qty: "1", item: "Lemon, sliced" },
      { qty: "2 cloves", item: "Garlic, minced" },
      { qty: "Pinch", item: "Salt and pepper" },
    ],
    steps: [
      "Preheat oven to 200°C (400°F). Line a baking sheet with parchment paper.",
      "Place salmon fillets on the sheet. Drizzle with olive oil, season with salt and pepper.",
      "Top with minced garlic, fresh dill, and lemon slices.",
      "Bake for 12–15 minutes until salmon is opaque and flakes easily.",
      "Serve with steamed vegetables or brown rice.",
    ],
  },
];

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
      <Text className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">
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
      <View className="h-[160px] bg-slate-100 dark:bg-slate-800 relative">
        <Image
          source={{ uri: recipe.image }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Save Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => { e.stopPropagation(); onSave(); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm"
        >
          <Feather name="heart" size={15} color={isSaved ? "#ef4444" : "#64748b"} style={isSaved ? { fill: "#ef4444" } : {}} />
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
      className="px-4 py-2 rounded-full border"
      style={{
        backgroundColor: active ? "#0f172a" : "#fff",
        borderColor: active ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[13px] font-medium"
        style={{ color: active ? "#fff" : "#64748b" }}
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
  
  const [recipesList, setRecipesList] = useState<Recipe[]>(RECIPES);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
          ingredients: r.ingredients ? Object.keys(r.ingredients).map(k => ({ qty: r.ingredients[k], item: k })) : [],
          steps: r.steps || [],
        }));
        setRecipesList(mapped);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
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
        if (USER_CONDITIONS.includes("Hypertension") && r.nutrition.sodium >= 140) return false;
        if (USER_CONDITIONS.includes("High Cholesterol") && r.nutrition.fiber < 5) return false;
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
  }, [activeFilter, searchQuery, savedRecipes, recipesList]);

  const tailoredCount = useMemo(() => {
    return recipesList.filter((r) => {
      if (USER_CONDITIONS.includes("Hypertension") && r.nutrition.sodium >= 140) return false;
      if (USER_CONDITIONS.includes("High Cholesterol") && r.nutrition.fiber < 5) return false;
      return true;
    }).length;
  }, [recipesList]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather name="heart" size={13} color={colorScheme === "dark" ? "#fff" : "#0f172a"} />
          </View>
          <Text className="text-[16px] text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: "300" }}>Heart<Text style={{ fontWeight: "600" }}>Link.</Text></Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/(profile)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 items-center justify-center">
            <Feather name="bell" size={17} color={colorScheme === "dark" ? "#94a3b8" : "#64748b"} />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/(settings)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 items-center justify-center">
            <Feather name="settings" size={17} color={colorScheme === "dark" ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/(profile)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <Image source={{ uri: user?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.first_name || "U") + "&background=e2e8f0&color=475569&bold=true" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50 dark:border-slate-800" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between px-5 pt-4">
        <View>
          <Text className="text-[26px] font-medium text-slate-900 dark:text-white tracking-tight">
            Recipes
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
            Heart-healthy meals for you
          </Text>
        </View>
        <View className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 items-center justify-center mt-2">
          <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#3b6d11" />
        </View>
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
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
        }
      >
        {/* Tailored banner */}
        {activeFilter === "Tailored For You" && (
          <View className="mx-5 mt-4 mb-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center flex-shrink-0">
              <Feather name="shield" size={18} color="#185fa5" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-0.5">
                Filtered for your conditions
              </Text>
              <Text className="text-[13px] text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">
                {USER_CONDITIONS.includes("Hypertension") && "Showing recipes with < 140 mg sodium. "}
                {USER_CONDITIONS.includes("High Cholesterol") && "Prioritising high-fiber recipes (≥ 5 g). "}
                Based on your health baseline.
              </Text>
            </View>
          </View>
        )}

        {/* Time Message Banner */}
        {timeMessage && activeFilter !== "Tailored For You" && activeFilter !== "Saved" && (
          <View className="mx-5 mt-4 mb-2 bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/60 items-center justify-center">
              <Feather name="sun" size={18} color="#4338ca" />
            </View>
            <Text className="flex-1 text-[14px] font-medium text-indigo-900 leading-snug">{timeMessage}</Text>
          </View>
        )}

        {/* Recipe list */}
        <View className="px-5 mt-4">
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color={colorScheme === "dark" ? "#fff" : "#0f172a"} style={{ marginTop: 40 }} />
          ) : filteredRecipes.length === 0 ? (
            <View className="items-center pt-16">
              <View className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 items-center justify-center mb-4">
                <Feather name="search" size={26} color="#cbd5e1" />
              </View>
              <Text className="text-[16px] font-medium text-slate-900 dark:text-white mb-1">
                No recipes found
              </Text>
              <Text className="text-[13px] text-slate-400 dark:text-slate-500 text-center">
                Try a different search or filter.
              </Text>
            </View>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
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
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export { RECIPES };
