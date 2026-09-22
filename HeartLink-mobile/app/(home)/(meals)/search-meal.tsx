import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, RefreshControl } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { calcRiskFromValues } from "../../../components/meals/SharedMealComponents";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function SearchMealScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [basket, setBasket] = useState<any[]>([]);
  const { userId, token } = useUser();

  const toggleBasket = (item: any) => {
    setBasket((prev) => {
      if (prev.some((b) => b.id === item.id)) {
        return prev.filter((b) => b.id !== item.id);
      }
      return [...prev, item];
    });
  };

  // Fetch past meal logs once on mount
  useEffect(() => {
    async function loadRecentLogs() {
      if (!userId) return;
      try {
        const res = await fetch(`${base_url}/api/meals/${userId}`, {
          headers: {
            "Authorization": `Bearer ${token || ""}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const uniqueMap = new Map();
          data.forEach((log: any) => {
            if (!uniqueMap.has(log.meal_name)) {
              uniqueMap.set(log.meal_name, {
                id: log.id,
                type: 'food',
                source: 'recent',
                name: log.meal_name,
                calories: log.calories,
                sodium_mg: log.sodium_mg,
                saturated_fat_g: log.saturated_fat_g || 0,
                fiber_g: log.fiber_g || 0,
                image_url: log.image_url,
                hss_tier: calcRiskFromValues(log.sodium_mg || 0, log.calories || 0, log.saturated_fat_g || 0).level
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
  }, [userId, refreshTrigger]);

  useEffect(() => {
    async function fetchMeals() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const query = searchQuery.trim();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let combined: any[] = [];
        
        if (query.length === 0) {
          // 0. Include recent logs
          combined = [...recentLogs];
          
          let recoIds = new Set();
          // 1. Fetch tailored recommendations
          const recoRes = await fetch(`${base_url}/api/meals/recommendations/me`, {
            headers: { Authorization: `Bearer ${token || ""}` },
            signal: controller.signal
          });
          
          if (recoRes.ok) {
            const recommendations = await recoRes.json();
            const formatted = recommendations
              .map((item: any) => {
                recoIds.add(item.id);
                return { ...item, type: 'recipe', isRecommended: true };
              });
            combined = [...combined, ...formatted];
          }

          // 2. Fetch all other internal recipes
          const allRes = await fetch(`${base_url}/api/meals/search?q=`, {
            signal: controller.signal
          });
          
          if (allRes.ok) {
            const allData = await allRes.json();
            const formattedAll = allData
              .filter((item: any) => !recoIds.has(item.id))
              .map((item: any) => ({ ...item, type: 'recipe' }));
            combined = [...combined, ...formattedAll];
          }
        } else {
          // 0. Add filtered recent logs immediately
          const filteredRecents = recentLogs.filter(log => log.name.toLowerCase().includes(query.toLowerCase()));
          combined = [...filteredRecents];

          // 1. Fetch backend recipes matching query
          const backendRes = await fetch(`${base_url}/api/meals/search?q=${query}`, {
            signal: controller.signal
          });
          if (backendRes.ok) {
            const data = await backendRes.json();
            const formatted = data.map((item: any) => ({ ...item, type: 'recipe' }));
            combined = [...combined, ...formatted];
          }
        }

        if (query.length > 0) {
          // 2. Fetch OpenFoodFacts API
          const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=15`, {
            signal: controller.signal
          });
          if (offRes.ok) {
            const offData = await offRes.json();
            const offItems = (offData.products || [])
              .filter((p: any) => {
                const name = (p.product_name || "").trim();
                if (name.length < 3) return false;

                // Require at least a brand or an image to filter out completely barren entries
                const hasBrand = p.brands && p.brands.trim().length > 0;
                const hasImage = !!(p.image_url || p.image_front_url);
                if (!hasBrand && !hasImage) return false;

                const isOnlyNumbers = /^\d+$/.test(name);
                const hasCalories = p.nutriments && typeof p.nutriments["energy-kcal"] === "number";
                
                // Ensure sodium is a strict number and not insanely high (max 10g = 10,000mg)
                const sodiumGrams = p.nutriments?.sodium;
                const hasValidSodium = typeof sodiumGrams === "number" && sodiumGrams >= 0 && sodiumGrams <= 10;
                
                return !isOnlyNumbers && hasCalories && hasValidSodium;
              })
              .map((p: any) => {
                // OpenFoodFacts normalizes 'sodium' to grams per 100g. 
                // We simply multiply by 1000 to convert to milligrams.
                const sodium = (p.nutriments?.sodium || 0) * 1000;
                return {
                  id: p.id || p.code || Math.random().toString(),
                  type: 'food',
                  source: 'search',
                  name: p.product_name,
                  image_url: p.image_front_url || p.image_url,
                  calories: Math.round(p.nutriments?.["energy-kcal"] || 0),
                  sodium_mg: Math.round(sodium),
                  saturated_fat_g: p.nutriments?.["saturated-fat"] || 0,
                  fiber_g: p.nutriments?.fiber || 0,
                  hss_tier: calcRiskFromValues(Math.round(sodium), Math.round(p.nutriments?.["energy-kcal"] || 0), p.nutriments?.["saturated-fat"] || 0).level
                };
              }); 
            combined = [...combined, ...offItems];
          }
        }
        
        clearTimeout(timeoutId);
        // Remove duplicates
        const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setItems(uniqueItems);
      } catch (error: any) {
        console.error("Search meal fetch error:", error);
        // Silent Fallback: swallow the error and fall back to local recent logs
        setErrorMsg("");
        
        const query = searchQuery.trim();
        if (query.length === 0) {
          setItems([...recentLogs]);
        } else {
          const filteredRecents = recentLogs.filter(log => log.name.toLowerCase().includes(query.toLowerCase()));
          setItems([...filteredRecents]);
        }
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
    const timeoutId = setTimeout(() => fetchMeals(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0b1120]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 mb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-200/50 dark:bg-slate-800 items-center justify-center z-10"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[22px] font-bold text-slate-900 dark:text-white absolute left-0 right-0 text-center pointer-events-none">
          Search Food
        </Text>
        <View className="w-9" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#94a3b8" : "#64748b"} />
        }
      >
        {/* Search Bar */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex-row items-center px-4 py-3 mb-4">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes, groceries, or fast food..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            className="flex-1 text-[16px] text-slate-900 dark:text-white ml-2"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/barcode-scan")}
          activeOpacity={0.8}
          className="bg-emerald-500/10 rounded-2xl py-3.5 px-4 mb-6 flex-row items-center justify-center border border-emerald-500/20"
        >
          <MaterialCommunityIcons name="barcode-scan" size={18} color="#10b981" />
          <Text className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400 ml-2">
            Scan Barcode
          </Text>
        </TouchableOpacity>

        {/* Results Container */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="relative">
              <View className="absolute inset-0 rounded-full border-4 opacity-20 border-emerald-500" />
              <View className="w-12 h-12 rounded-full items-center justify-center bg-slate-50 dark:bg-slate-800">
                <Feather 
                  name={searchQuery.trim().length === 0 ? "clock" : "list"} 
                  size={20} 
                  color={isDark ? "#cbd5e1" : "#475569"} 
                />
              </View>
            </View>
            <View>
              <Text className="text-[16px] font-bold text-slate-800 dark:text-white mb-0.5">
                {searchQuery.trim().length === 0 ? "Recently Logged" : "Search Results"}
              </Text>
              <Text className="text-[13px] text-slate-500">
                {isLoading ? "Searching..." : `${items.length} items found`}
              </Text>
            </View>
          </View>
          
          <View className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
          {isLoading ? (
            <View className="gap-2">
              {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} className="flex-row items-center justify-between py-2 mb-1 px-2">
                  <View className="flex-row items-center flex-1 gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg mr-1" />
                    <View className="flex-1">
                      <Skeleton className="w-2/3 h-4 mb-1.5" />
                      <Skeleton className="w-1/3 h-3" />
                    </View>
                  </View>
                  <Skeleton className="w-10 h-8 rounded-md" />
                </View>
              ))}
            </View>
          ) : errorMsg ? (
            <EmptyState
              icon={<Feather name="wifi-off" size={32} color="#ef4444" />}
              title="Network Error"
              subtitle={errorMsg}
              className="py-6"
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Feather name="search" size={32} color="#94a3b8" />}
              title="No results found"
              subtitle="Try a different search term or use the 'Estimate a Meal' feature."
              className="py-6"
            />
          ) : items.map((item) => {
            const inBasket = basket.some(b => b.id === item.id);
            return (
            <View
              key={item.id}
              className="flex-row items-center justify-between py-2 mb-1 rounded-xl px-2 border"
              style={{
                backgroundColor: inBasket ? (isDark ? "rgba(6, 78, 59, 0.2)" : "#ecfdf5") : (isDark ? "#0f172a" : "#ffffff"),
                borderColor: inBasket ? (isDark ? "rgba(6, 78, 59, 0.3)" : "#d1fae5") : "transparent"
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (item.type === 'recipe') {
                    router.push({ pathname: "/(home)/(meals)/meal-detail", params: { id: item.id } });
                  } else {
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
                      params: { product: JSON.stringify(productData), source: item.source || "search" }
                    });
                  }
                }}
                className="flex-row items-center flex-1"
              >
                <View className="flex-row items-center flex-1 gap-3">
                  <View className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center overflow-hidden">
                    <MaterialCommunityIcons name="silverware-fork-knife" size={16} className="text-slate-300 dark:text-slate-700 absolute" />
                    {!!item.image_url && (
                      <Image source={{ uri: item.image_url }} className="w-full h-full absolute" resizeMode="cover" />
                    )}
                  </View>
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <Text className="text-[14px] font-medium text-slate-800 dark:text-slate-200" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {item.name}
                      </Text>
                      {item.isRecommended && (
                        <MaterialCommunityIcons name="star-circle" size={14} color="#f59e0b" />
                      )}
                    </View>
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-[11px] text-slate-400 mt-0.5">
                        1 serving
                      </Text>
                      <View className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-0.5" />
                      <View 
                        className="mt-0.5 px-1.5 py-0.5 rounded" 
                        style={{ 
                          backgroundColor: item.hss_tier === "Stable" ? "#eaf3de" 
                                         : item.hss_tier === "Moderate" ? "#fef3c7" 
                                         : item.hss_tier === "Elevated Risk" ? "#ffedd5" 
                                         : "#fcebeb" 
                        }}
                      >
                        <Text 
                          className="text-[8px] font-bold uppercase tracking-wider" 
                          style={{ 
                            color: item.hss_tier === "Stable" ? "#3b6d11" 
                                 : item.hss_tier === "Moderate" ? "#b45309" 
                                 : item.hss_tier === "Elevated Risk" ? "#c2410c"
                                 : "#a32d2d" 
                          }}
                        >
                          {item.hss_tier || "Unknown"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View className="items-end px-2">
                  <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300">
                    {item.calories || 0} <Text className="text-[10px] font-normal text-slate-400">kcal</Text>
                  </Text>
                  <Text className="text-[11px] font-medium text-rose-500 mt-0.5">
                    {item.sodium_mg || 0} mg
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => toggleBasket(item)} 
                className="pl-2 py-2 border-l border-slate-100 dark:border-slate-800"
                activeOpacity={0.6}
              >
                {inBasket ? (
                  <Feather name="check-circle" size={24} color="#10b981" />
                ) : (
                  <Feather name="plus-circle" size={24} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
          )})}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Fallback Button */}
      <View 
        className="px-5 pt-3 bg-slate-50 dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800/50 gap-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {basket.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(home)/(meals)/multi-log-review", params: { items: JSON.stringify(basket) } })}
            className="bg-emerald-600 w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2 shadow-sm"
            activeOpacity={0.85}
          >
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text className="text-white text-[15px] font-bold">
              Review & Log ({basket.length} {basket.length === 1 ? 'item' : 'items'})
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/estimate-meal")}
          className="bg-emerald-500 w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
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
