import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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
  nutrition: {
    sodium: number;
    fiber: number;
    potassium: number;
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
    nutrition: { sodium: 95, fiber: 2, potassium: 420, calories: 280 },
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
    nutrition: { sodium: 65, fiber: 6, potassium: 380, calories: 120 },
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
    nutrition: { sodium: 15, fiber: 8, potassium: 340, calories: 310 },
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
    nutrition: { sodium: 110, fiber: 3, potassium: 510, calories: 220 },
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
    nutrition: { sodium: 45, fiber: 7, potassium: 290, calories: 90 },
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
    nutrition: { sodium: 75, fiber: 1, potassium: 530, calories: 350 },
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
    // All conditional color via inline style — no dynamic className
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
      <Text className="text-[7px] text-slate-400 uppercase tracking-wide mt-0.5">
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
      className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden mb-10"
    >
      {/* Image */}
      <View className="h-[148px] bg-slate-100 relative">
        <Image
          source={{ uri: recipe.image }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Save Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => { e.stopPropagation(); onSave(); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full items-center justify-center shadow-sm"
        >
          <Feather name="heart" size={15} color={isSaved ? "#ef4444" : "#64748b"} style={isSaved ? { fill: "#ef4444" } : {}} />
        </TouchableOpacity>

        {/* Prep time */}
        <View className="absolute bottom-3 left-3 flex-row items-center gap-1 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Feather name="clock" size={11} color="rgba(255,255,255,0.9)" />
          <Text className="text-white text-[11px]">{recipe.prepTime} min</Text>
        </View>
        {/* Difficulty — dynamic bg/text via inline style */}
        <View
          className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: diffCfg.bg }}
        >
          <Text className="text-[10px] font-medium uppercase tracking-wide" style={{ color: diffCfg.text }}>
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
                className="text-[9px] uppercase tracking-wide"
                style={{ color: tag === "Low Sodium" ? "#3b6d11" : "#94a3b8" }}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-[15px] font-medium text-slate-900 mb-0.5 leading-snug">
          {recipe.title}
        </Text>
        <Text className="text-[13px] text-slate-400 mb-3">
          {recipe.subtitle}
        </Text>

        {/* Nutrition row */}
        <View className="flex-row gap-2">
          <NutritionPill label="Sodium" value={recipe.nutrition.sodium} unit="mg" highlight={isSodiumSafe} />
          <NutritionPill label="Fiber" value={recipe.nutrition.fiber} unit="g" />
          <NutritionPill label="Potassium" value={recipe.nutrition.potassium} unit="mg" />
          <NutritionPill label="Calories" value={recipe.nutrition.calories} unit="cal" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
// Dynamic bg/border/text via inline style — avoids css-interop crash

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
        className="text-[12px] font-medium"
        style={{ color: active ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recipes Screen ───────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);
  const [timeMessage, setTimeMessage] = useState<string | null>(null);

  const filters = ["All", "Tailored For You", "Saved", "Low Sodium", "High Fiber", "Filipino", "Breakfast"];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
      setActiveFilter("Breakfast");
      setTimeMessage("Good morning! Here are some heart-healthy breakfast ideas.");
    } else if (hour >= 17 && hour <= 21) {
      // Just showing a general evening message, keeping current filter or defaulting to all
      setTimeMessage("Good evening! Time for a light, heart-healthy dinner.");
    }
  }, []);

  const toggleSave = (id: string) => {
    setSavedRecipes(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };

  const filteredRecipes = useMemo(() => {
    let results = RECIPES;

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
  }, [activeFilter, searchQuery, savedRecipes]);

  const tailoredCount = useMemo(() => {
    return RECIPES.filter((r) => {
      if (USER_CONDITIONS.includes("Hypertension") && r.nutrition.sodium >= 140) return false;
      if (USER_CONDITIONS.includes("High Cholesterol") && r.nutrition.fiber < 5) return false;
      return true;
    }).length;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-start justify-between px-5 pt-4 pb-1">
        <View>
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Recipes
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">
            Heart-healthy meals for you
          </Text>
        </View>
        <View className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 items-center justify-center">
          <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#3b6d11" />
        </View>
      </View>

      {/* Search bar */}
      <View className="px-5 pt-3 pb-1">
        <View className="flex-row items-center bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200/70 gap-2.5">
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            placeholder="Search recipes, ingredients…"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-[14px] text-slate-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View className="mt-2 mb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 gap-2 py-1"
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
      >
        {/* Tailored banner */}
        {activeFilter === "Tailored For You" && (
          <View className="mx-5 mt-3 mb-1 bg-white rounded-2xl border border-slate-200/70 p-4 flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/70 items-center justify-center flex-shrink-0">
              <Feather name="shield" size={15} color="#185fa5" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-medium text-slate-900 mb-0.5">
                Filtered for your conditions
              </Text>
              <Text className="text-[12px] text-slate-400 leading-[17px]">
                {USER_CONDITIONS.includes("Hypertension") && "Showing recipes with < 140 mg sodium. "}
                {USER_CONDITIONS.includes("High Cholesterol") && "Prioritising high-fiber recipes (≥ 5 g). "}
                Based on your health baseline.
              </Text>
            </View>
          </View>
        )}

        {/* Time Message Banner */}
        {timeMessage && activeFilter !== "Tailored For You" && activeFilter !== "Saved" && (
          <View className="mx-5 mt-3 mb-1 bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex-row items-center gap-3">
            <Feather name="sun" size={18} color="#4338ca" />
            <Text className="flex-1 text-[13px] font-medium text-indigo-900">{timeMessage}</Text>
          </View>
        )}

        {/* Recipe list */}
        <View className="px-5 mt-3">
          {filteredRecipes.length === 0 ? (
            <View className="items-center pt-16">
              <View className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/70 items-center justify-center mb-4">
                <Feather name="search" size={26} color="#cbd5e1" />
              </View>
              <Text className="text-[16px] font-medium text-slate-900 mb-1">
                No recipes found
              </Text>
              <Text className="text-[13px] text-slate-400 text-center">
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
                    pathname: "/(home)/recipe-details",
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