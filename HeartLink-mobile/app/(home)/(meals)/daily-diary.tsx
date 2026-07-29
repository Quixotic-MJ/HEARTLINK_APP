import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useUser } from "../../../contexts/UserContext";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

type MealLog = {
  id: string;
  user_id: string;
  meal_name: string;
  portion: string;
  calories: number;
  sodium_mg: number;
  saturated_fat_g?: number;
  fiber_g?: number;
  image_url?: string;
  logged_at: string;
};

export default function DailyDiaryScreen() {
  const router = useRouter();
  const { userId } = useUser();
  const { showToast } = useToast();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${base_url}/api/meals/${userId}`);
      if (response.ok) {
        const data: MealLog[] = await response.json();
        
        // Filter meals to only include today's logs
        const today = new Date();
        const todaysMeals = data.filter((meal) => {
          if (!meal.logged_at) return false;
          const mealDate = new Date(meal.logged_at);
          return (
            mealDate.getFullYear() === today.getFullYear() &&
            mealDate.getMonth() === today.getMonth() &&
            mealDate.getDate() === today.getDate()
          );
        });
        
        setMeals(todaysMeals);
      }
    } catch (error) {
      console.error("Error fetching daily meals:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchMeals();
    }, [fetchMeals])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeals();
  };

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    Alert.alert(
      "Delete Meal?",
      `Are you sure you want to remove "${mealName}" from your daily log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${base_url}/api/meals/${userId}/${mealId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                setMeals((prev) => prev.filter((item) => item.id !== mealId));
                showToast({ title: "Deleted", message: "Meal removed from diary.", type: "success" });
              } else {
                showToast({ title: "Error", message: "Could not delete the meal log.", type: "error" });
              }
            } catch (err) {
              console.error("Failed to delete meal log:", err);
              showToast({ title: "Error", message: "Network error when deleting meal.", type: "error" });
            }
          },
        },
      ]
    );
  };

  // Right action for Swipeable row
  const renderRightActions = (meal: MealLog) => {
    return (
      <TouchableOpacity
        onPress={() => handleDeleteMeal(meal.id, meal.meal_name)}
        activeOpacity={0.8}
        className="bg-red-500 justify-center items-center px-6 rounded-2xl mb-3 ml-2"
      >
        <Feather name="trash-2" size={20} color="#fff" />
        <Text className="text-white text-[11px] font-medium mt-1">Delete</Text>
      </TouchableOpacity>
    );
  };

  // Summaries
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalSodium = meals.reduce((sum, m) => sum + (m.sodium_mg || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header Bar ── */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>

        <Text className="text-[17px] font-semibold text-slate-900 dark:text-white">
          Daily Food Diary
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(home)/(meals)/search-meal")}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <Feather name="plus" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── Summary Banner ── */}
      <View className="mx-5 mt-4 mb-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-between">
        <View className="items-center flex-1 px-1">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide" numberOfLines={1} adjustsFontSizeToFit>
            Logged Items
          </Text>
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
            {meals.length}
          </Text>
        </View>
        <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800" />
        <View className="items-center flex-1 px-1">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide" numberOfLines={1} adjustsFontSizeToFit>
            Total Calories
          </Text>
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white">
            {totalCalories} <Text className="text-[12px] font-normal text-slate-400">kcal</Text>
          </Text>
        </View>
        <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800" />
        <View className="items-center flex-1 px-1">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide" numberOfLines={1} adjustsFontSizeToFit>
            Total Sodium
          </Text>
          <Text className="text-[20px] font-bold text-rose-600">
            {totalSodium} <Text className="text-[12px] font-normal text-slate-400">mg</Text>
          </Text>
        </View>
      </View>

      {/* ── Instructions Tip ── */}
      <View className="px-5 mb-2 flex-row items-center">
        <Feather name="info" size={12} color="#94a3b8" />
        <Text className="text-[12px] text-slate-400 ml-1.5">
          Swipe left on any meal to delete it.
        </Text>
      </View>

      {/* ── Content / List ── */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<MaterialCommunityIcons name="food-fork-drink" size={32} color="#94a3b8" />}
          title="No Meals Logged Today"
          subtitle="Tap the + icon above or scan a barcode to add your first meal."
          actionLabel="Scan Barcode Now"
          onAction={() => router.push("/(home)/(meals)/barcode-scan")}
          actionIcon={<Feather name="camera" size={15} color="#fff" />}
        />
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
          }
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 gap-3 pr-2">
                  <View className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 relative items-center justify-center overflow-hidden">
                    <MaterialCommunityIcons name="silverware-fork-knife" size={24} className="text-slate-300 dark:text-slate-700 absolute" />
                    {!!item.image_url && (
                      <Image
                        source={{ uri: item.image_url }}
                        className="w-full h-full absolute"
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug">
                      {item.meal_name}
                    </Text>
                    <View className="self-start mt-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                      <Text className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        {item.portion || 1} SERVING
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-[15px] font-bold text-slate-900 dark:text-white">
                    {item.calories} <Text className="text-[11px] font-normal text-slate-400">kcal</Text>
                  </Text>
                  <Text className="text-[12px] font-medium text-rose-600 mt-0.5">
                    {item.sodium_mg} mg sodium
                  </Text>
                </View>
              </View>
            </Swipeable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
