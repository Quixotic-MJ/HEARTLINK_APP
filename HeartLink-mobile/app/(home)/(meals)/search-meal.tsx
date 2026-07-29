import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function SearchMealScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const { userId } = useUser();

  // Fetch past meal logs once on mount
  useEffect(() => {
    async function loadRecentLogs() {
      if (!userId) return;
      try {
        const res = await fetch(`${base_url}/api/meals/${userId}`);
        if (res.ok) {
          const data = await res.json();
          const uniqueMap = new Map();
          data.forEach((log: any) => {
            if (!uniqueMap.has(log.meal_name)) {
              uniqueMap.set(log.meal_name, {
                id: log.id,
                type: 'food',
                name: log.meal_name,
                calories: log.calories,
                sodium_mg: log.sodium_mg,
                saturated_fat_g: log.saturated_fat_g || 0,
                fiber_g: log.fiber_g || 0,
                image_url: log.image_url,
                css_tier: log.sodium_mg < 400 ? 'Stable' : (log.sodium_mg > 800 ? 'At Risk' : 'Caution')
              });
            }
          });
          setRecentLogs(Array.from(uniqueMap.values()).slice(0, 5)); // Keep top 5 unique recent meals
        }
      } catch (err) {
        console.error("Failed to load recent logs", err);
      }
    }
    loadRecentLogs();
  }, [userId]);

  useEffect(() => {
    async function fetchMeals() {
      setIsLoading(true);
      try {
        const query = searchQuery.trim();
        let combined: any[] = [];
        
        if (query.length === 0) {
          // 0. Include recent logs and tailored recommendations
          combined = [...recentLogs];
          
          const res = await fetch(`${base_url}/api/dashboard/me`, {
            headers: { Authorization: `Bearer ${userId}` }
          }).catch(() => null);
          
          if (res && res.ok) {
            const data = await res.json();
            const recommendations = data.recommendations || [];
            const formatted = recommendations
              .filter((item: any) => item.type === 'recipe')
              .map((item: any) => ({ ...item, type: 'recipe' }));
            combined = [...combined, ...formatted];
          }
        } else {
          // 0. Add filtered recent logs immediately
          const filteredRecents = recentLogs.filter(log => log.name.toLowerCase().includes(query.toLowerCase()));
          combined = [...filteredRecents];

          // 1. Fetch backend recipes matching query
          const backendRes = await fetch(`${base_url}/api/meals/search?q=${query}`).catch(() => null);
          if (backendRes && backendRes.ok) {
            const data = await backendRes.json();
            const formatted = data.map((item: any) => ({ ...item, type: 'recipe' }));
            combined = [...combined, ...formatted];
          }
        }

        if (query.length > 0) {
          // 2. Fetch Filipino Foods DB
          const filipinoRes = await fetch(`${base_url}/api/meals/filipino-foods?q=${query}`).catch(() => null);
          if (filipinoRes && filipinoRes.ok) {
            const data = await filipinoRes.json();
            const formatted = data.map((item: any) => ({
              ...item,
              type: 'food',
              css_tier: item.sodium_mg < 400 ? "Stable" : (item.sodium_mg > 800 ? "At Risk" : "Caution")
            }));
            combined = [...combined, ...formatted];
          }

          // 3. Fetch OpenFoodFacts API
          const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=15`).catch(() => null);
          if (offRes && offRes.ok) {
            const offData = await offRes.json();
            const offItems = (offData.products || [])
              .filter((p: any) => {
                const name = p.product_name || "";
                const isOnlyNumbers = /^\d+$/.test(name);
                const hasCalories = p.nutriments && "energy-kcal" in p.nutriments;
                const hasSodium = p.nutriments && "sodium" in p.nutriments;
                return name.trim().length > 0 && !isOnlyNumbers && hasCalories && hasSodium;
              })
              .map((p: any) => {
                const sodium = (p.nutriments?.sodium || 0) * 1000;
                return {
                  id: p.id || p.code || Math.random().toString(),
                  type: 'food',
                  name: p.product_name,
                  image_url: p.image_front_url || p.image_url,
                  calories: Math.round(p.nutriments?.["energy-kcal"] || 0),
                  sodium_mg: Math.round(sodium),
                  saturated_fat_g: p.nutriments?.["saturated-fat"] || 0,
                  fiber_g: p.nutriments?.fiber || 0,
                  css_tier: sodium < 400 ? "Stable" : (sodium > 800 ? "At Risk" : "Caution")
                };
              }); 
            combined = [...combined, ...offItems];
          }
        }
        
        // Remove duplicates
        const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setItems(uniqueItems);
      } catch (error) {
        console.error("Search meal fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    const timeoutId = setTimeout(() => fetchMeals(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View>
          <Text className="text-[17px] font-medium text-slate-900 dark:text-white">
            Search & Log Meal
          </Text>
          <Text className="text-[12px] text-slate-500">
            Find food, recipes, and brands
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Search Bar */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 flex-row items-center px-4 py-3 mb-4">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search food, recipes, or brands..."
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
            autoCapitalize="none"
          />
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/barcode-scan")}
          activeOpacity={0.8}
          className="bg-primary/10 rounded-2xl py-3.5 px-4 mb-6 flex-row items-center justify-center border border-primary/20"
        >
          <MaterialCommunityIcons name="barcode-scan" size={18} color="#2563eb" />
          <Text className="text-[14px] font-medium text-primary ml-2">
            Scan Barcode
          </Text>
        </TouchableOpacity>

        {/* List Header */}
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white mb-3 ml-1">
          {searchQuery.trim().length === 0 ? "Recently Logged & Recommended" : "Search Results"}
        </Text>

        {/* Items List */}
        <View className="gap-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/70 flex-row items-center justify-between">
                  <Skeleton className="w-16 h-16 rounded-xl mr-3" />
                  <View className="flex-1 mr-3">
                    <Skeleton className="w-2/3 h-5 mb-1.5" />
                    <Skeleton className="w-1/2 h-3.5 mb-2.5" />
                    <Skeleton className="w-16 h-4 rounded-md" />
                  </View>
                  <Skeleton className="w-5 h-5 rounded-full" />
                </View>
              ))}
            </>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Feather name="search" size={32} color="#94a3b8" />}
              title="No results found"
              subtitle="Try a different search term or use the 'Estimate a Meal' feature."
              className="py-6"
            />
          ) : items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => {
                if (item.type === 'recipe') {
                  router.push({ pathname: "/(home)/(meals)/meal-detail", params: { id: item.id } });
                } else {
                  // Forward basic food data to scan-result.tsx
                  const productData = {
                    product_name: item.name,
                    image_url: item.image_url,
                    energy_kcal: item.calories,
                    sodium_mg: item.sodium_mg,
                    saturated_fat_g: item.saturated_fat_g || 0,
                    fiber_g: item.fiber_g || 0,
                  };
                  router.push({
                    pathname: "/(home)/(meals)/scan-result",
                    params: { product: JSON.stringify(productData) }
                  });
                }
              }}
              className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/70 flex-row items-center justify-between"
            >
              <Image 
                source={{ uri: item.image_url || "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=200&q=80" }} 
                className="w-16 h-16 rounded-xl mr-3 bg-slate-100 dark:bg-slate-800" 
              />
              <View className="flex-1 mr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">
                  {item.name}
                </Text>
                <Text className="text-[13px] text-slate-500 dark:text-slate-400 mb-2">
                  1 serving · {item.calories || 0} kcal · {item.sodium_mg || 0}mg Sodium
                </Text>
                
                {/* Tag */}
                <View className="self-start px-2 py-1 rounded-md" style={{ backgroundColor: item.css_tier === "Stable" ? "#eaf3de" : "#fcebeb" }}>
                  <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.css_tier === "Stable" ? "#3b6d11" : "#a32d2d" }}>
                    {item.css_tier || "Unknown"}
                  </Text>
                </View>
              </View>
              <Feather name="plus-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Fallback Button */}
      <View 
        className="px-5 pt-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/estimate-meal")}
          className="bg-primary w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
          activeOpacity={0.85}
        >
          <Feather name="edit-3" size={16} color="#fff" />
          <Text className="text-white text-[14px] font-medium">
            Can't find it? Estimate local food
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
