import React, { useState, useMemo } from "react";
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

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── User Baseline (simulated — will come from backend) ─────────────────────
const USER_CONDITIONS = ["Hypertension"];

// ─── Recipe Data ────────────────────────────────────────────────────────────
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
    title: "Tinolang Manok (Ginger Chicken Soup)",
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
    title: "Ensaladang Talong (Eggplant Salad)",
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

// ─── Nutrition Pill ─────────────────────────────────────────────────────────
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
      className={`rounded-xl px-3 py-2 border ${
        highlight
          ? "bg-emerald-50 border-emerald-100"
          : "bg-slate-50 border-slate-100"
      }`}
    >
      <Text
        className={`text-[13px] font-extrabold ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
        <Text className="text-[11px] font-medium text-slate-400">
          {" "}
          {unit}
        </Text>
      </Text>
      <Text className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
        {label}
      </Text>
    </View>
  );
}

// ─── Recipe Card ────────────────────────────────────────────────────────────
function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) {
  const isSodiumSafe = recipe.nutrition.sodium < 140;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-white rounded-[22px] border border-slate-100 overflow-hidden mb-4 shadow-sm shadow-slate-900/5"
    >
      {/* Image */}
      <View className="h-[160px] bg-slate-200 relative">
        <Image
          source={{ uri: recipe.image }}
          className="w-full h-full"
          resizeMode="cover"
        />
        {/* Prep time badge */}
        <View className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded-full flex-row items-center">
          <Feather name="clock" size={12} color="white" />
          <Text className="text-white text-[11px] font-bold ml-1.5">
            {recipe.prepTime} min
          </Text>
        </View>
        {/* Difficulty badge */}
        <View className="absolute top-3 right-3 bg-white/90 px-3 py-1.5 rounded-full">
          <Text className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
            {recipe.difficulty}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-5">
        {/* Tags */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {recipe.tags.map((tag) => (
            <View
              key={tag}
              className={`px-2.5 py-1 rounded-lg ${
                tag === "Low Sodium"
                  ? "bg-emerald-50 border border-emerald-100"
                  : "bg-slate-50 border border-slate-100"
              }`}
            >
              <Text
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  tag === "Low Sodium" ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-[17px] font-black text-slate-900 tracking-tight mb-1">
          {recipe.title}
        </Text>
        <Text className="text-[13px] font-medium text-slate-400 mb-4">
          {recipe.subtitle}
        </Text>

        {/* Nutrition Row */}
        <View className="flex-row gap-2">
          <NutritionPill
            label="Sodium"
            value={recipe.nutrition.sodium}
            unit="mg"
            highlight={isSodiumSafe}
          />
          <NutritionPill
            label="Fiber"
            value={recipe.nutrition.fiber}
            unit="g"
          />
          <NutritionPill
            label="Potassium"
            value={recipe.nutrition.potassium}
            unit="mg"
          />
          <NutritionPill
            label="Calories"
            value={recipe.nutrition.calories}
            unit="cal"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Filter Chip ───────────────────────────────────────────────────
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
      className={`px-5 py-2.5 rounded-full ${
        active ? "bg-[#1e4ed8]" : "bg-white border border-slate-200"
      }`}
    >
      <Text
        className={`text-[13px] font-bold ${
          active ? "text-white" : "text-slate-500"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recipes Screen ─────────────────────────────────────────────────────────
export default function RecipesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = [
    "All",
    "Tailored For You",
    "Low Sodium",
    "High Fiber",
    "Filipino",
    "Breakfast",
  ];

  // ─── Filtering Logic ────────────────────────────────────────────────
  const filteredRecipes = useMemo(() => {
    let results = RECIPES;

    // "Tailored For You" — rule-based filter using user conditions
    if (activeFilter === "Tailored For You") {
      results = results.filter((r) => {
        if (USER_CONDITIONS.includes("Hypertension")) {
          // Only show recipes < 140mg sodium
          if (r.nutrition.sodium >= 140) return false;
        }
        if (USER_CONDITIONS.includes("High Cholesterol")) {
          // Prioritize high-fiber (>= 5g)
          if (r.nutrition.fiber < 5) return false;
        }
        return true;
      });
    } else if (activeFilter !== "All") {
      results = results.filter((r) => r.tags.includes(activeFilter));
    }

    // Search
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
  }, [activeFilter, searchQuery]);

  const tailoredCount = useMemo(() => {
    return RECIPES.filter((r) => {
      if (USER_CONDITIONS.includes("Hypertension") && r.nutrition.sodium >= 140)
        return false;
      if (USER_CONDITIONS.includes("High Cholesterol") && r.nutrition.fiber < 5)
        return false;
      return true;
    }).length;
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-[26px] font-black text-slate-900 tracking-tight">
              Recipes
            </Text>
            <Text className="text-[13px] font-medium text-slate-400 mt-0.5">
              Heart-healthy meals for you
            </Text>
          </View>
          <View className="w-10 h-10 rounded-[14px] bg-emerald-50 items-center justify-center border border-emerald-100">
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={20}
              color="#059669"
            />
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm shadow-slate-900/5">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search recipes, ingredients..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-[14px] font-medium text-slate-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View className="mt-3 mb-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {filters.map((f) => (
            <FilterChip
              key={f}
              label={
                f === "Tailored For You" ? `⚡ Tailored (${tailoredCount})` : f
              }
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tailored Banner (shown when filter is active) */}
        {activeFilter === "Tailored For You" && (
          <View className="mx-5 mt-4 mb-2 bg-blue-50 rounded-[18px] p-4 border border-blue-100 flex-row items-start">
            <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3 border border-blue-100">
              <Feather name="shield" size={16} color="#1e4ed8" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-extrabold text-slate-900 mb-0.5">
                Filtered for your conditions
              </Text>
              <Text className="text-[12px] font-medium text-slate-500 leading-[17px]">
                {USER_CONDITIONS.includes("Hypertension") &&
                  "Showing recipes with < 140mg sodium per serving. "}
                {USER_CONDITIONS.includes("High Cholesterol") &&
                  "Prioritizing high-fiber recipes (≥ 5g). "}
                Based on your health baseline.
              </Text>
            </View>
          </View>
        )}

        {/* Recipe List */}
        <View className="px-5 mt-4">
          {filteredRecipes.length === 0 ? (
            <View className="items-center pt-16">
              <View className="w-20 h-20 rounded-[24px] bg-slate-50 items-center justify-center mb-5 border border-slate-100">
                <Feather name="search" size={32} color="#cbd5e1" />
              </View>
              <Text className="text-[18px] font-extrabold text-slate-900 tracking-tight mb-2">
                No recipes found
              </Text>
              <Text className="text-[14px] font-medium text-slate-400 text-center">
                Try a different search or filter.
              </Text>
            </View>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() =>
                  router.push({
                    pathname: "/(home)/recipe-detail",
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

// Export recipes data for use in detail screen
export { RECIPES };
