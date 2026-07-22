import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function SearchMealScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchMeals() {
      setIsLoading(true);
      try {
        const response = await fetch(`${base_url}/api/meals/search?q=${searchQuery}`);
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error("Search meal fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    const timeoutId = setTimeout(() => fetchMeals(), 300);
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
          <Text className="text-[12px] text-slate-400">
            Find food, recipes, and brands
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 flex-row items-center px-4 py-3 mb-4">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search food, recipes, or brands..."
            placeholderTextColor="#cbd5e1"
            className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
            autoCapitalize="none"
          />
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/barcode-scan")}
          activeOpacity={0.8}
          className="bg-[#e6f1fb] rounded-2xl py-3.5 px-4 mb-6 flex-row items-center justify-center border border-[#cce3f7]"
        >
          <MaterialCommunityIcons name="barcode-scan" size={18} color="#185fa5" />
          <Text className="text-[14px] font-medium text-[#185fa5] ml-2">
            Scan Barcode
          </Text>
        </TouchableOpacity>

        {/* List Header */}
        <Text className="text-[14px] font-semibold text-slate-900 dark:text-white mb-3 ml-1">
          Recent & Popular
        </Text>

        {/* Items List */}
        <View className="gap-3">
          {isLoading ? (
            <Text className="text-center text-slate-400 my-4">Searching...</Text>
          ) : items.length === 0 ? (
            <Text className="text-center text-slate-400 my-4">No results found.</Text>
          ) : items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: "/(home)/(meals)/meal-detail", params: { id: item.id } })}
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
          className="bg-slate-900 w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
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
