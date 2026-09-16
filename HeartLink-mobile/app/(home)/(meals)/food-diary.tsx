import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import Svg, { Path } from "react-native-svg";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useUser } from "../../../contexts/UserContext";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
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

const FOOD_LOG_OPTIONS = [
  {
    icon: "camera" as const,
    iconType: "feather" as const,
    label: "Scan food barcode",
    subtitle: "Use camera to scan product barcodes",
    route: "/(home)/(meals)/barcode-scan",
  },
  {
    icon: "search" as const,
    iconType: "feather" as const,
    label: "Search food database",
    subtitle: "Search verified meals & nutritional facts",
    route: "/(home)/(meals)/search-meal",
  },
  {
    icon: "silverware-fork-knife" as const,
    iconType: "material" as const,
    label: "Log manually / Estimate",
    subtitle: "Enter custom food details & nutrients",
    route: "/(home)/(meals)/estimate-meal",
  },
];

const SODIUM_BUDGET = 2000;

function SemiCircleProgress({ progress, remaining, isDark }: { progress: number; remaining: number; isDark: boolean }) {
  const radius = 65;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(progress, 1));
  
  const activeColor = remaining < 0 ? "#ef4444" : "#2dd4bf"; // red if over budget, teal otherwise
  const bgColor = isDark ? "#1e293b" : "#f1f5f9";

  return (
    <View className="items-center justify-center relative" style={{ width: 150, height: 85 }}>
      <Svg width={150} height={85} viewBox="0 0 150 85">
        <Path
          d="M 10 75 A 65 65 0 0 1 140 75"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 10 75 A 65 65 0 0 1 140 75"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View className="absolute" style={{ top: 28, alignItems: "center" }}>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          {Math.max(remaining, 0)}
        </Text>
        <Text className="text-[11px] text-slate-500 font-medium">Remaining</Text>
      </View>
    </View>
  );
}

const MacroBar = ({ label, current, total, color, isDark }: { label: string, current: number, total: number, color: string, isDark: boolean }) => {
  const percent = Math.min((current / total) * 100, 100) || 0;
  return (
    <View className="flex-1 px-2 items-center">
      <Text className="text-[11px] text-slate-500 font-medium mb-1.5">{label}</Text>
      <View className="w-full h-1.5 rounded-full mb-1.5" style={{ backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }}>
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
      <Text className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
        {Math.round(current)} / {total} g
      </Text>
    </View>
  );
};

export default function DailyDiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<{ id: string; name: string } | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);

  // Bottom Sheet animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openLogModal = () => {
    setLogModalVisible(true);
  };

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 24,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setLogModalVisible(false));
  }, [slideAnim, backdropAnim]);

  const handleSelectOption = (route: string) => {
    animateOut();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  const fetchMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token || ""}`,
        },
      });
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
  }, [userId, token]);

  useFocusEffect(
    useCallback(() => {
      fetchMeals();
    }, [fetchMeals])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeals();
  };

  const confirmDeleteMeal = async () => {
    if (!mealToDelete) return;
    try {
      const res = await fetch(`${base_url}/api/meals/${userId}/${mealToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token || ""}`,
        },
      });
      if (res.ok) {
        setMeals((prev) => prev.filter((item) => item.id !== mealToDelete.id));
        showToast({ title: "Deleted", message: "Meal removed from diary.", type: "success" });
      } else {
        showToast({ title: "Error", message: "Could not delete the meal log.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to delete meal log:", err);
      showToast({ title: "Error", message: "Network error when deleting meal.", type: "error" });
    } finally {
      setMealToDelete(null);
    }
  };

  const handleDeleteMeal = (mealId: string, mealName: string) => {
    setMealToDelete({ id: mealId, name: mealName });
  };

  // Summaries
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalSodium = meals.reduce((sum, m) => sum + (m.sodium_mg || 0), 0);
  const totalSatFat = meals.reduce((sum, m) => sum + (m.saturated_fat_g || 0), 0);
  const totalFiber = meals.reduce((sum, m) => sum + (m.fiber_g || 0), 0);
  
  // Categorize meals by time of day
  const mealGroups = [
    { name: "Breakfast", icon: "coffee", iconType: "feather", color: "#38bdf8", bg: "#e0f2fe", items: [] as MealLog[], cals: 0 },
    { name: "Lunch", icon: "hamburger", iconType: "material", color: "#fb923c", bg: "#ffedd5", items: [] as MealLog[], cals: 0 },
    { name: "Dinner", icon: "food-steak", iconType: "material", color: "#818cf8", bg: "#e0e7ff", items: [] as MealLog[], cals: 0 },
    { name: "Snacks", icon: "apple", iconType: "material", color: "#fb7185", bg: "#ffe4e6", items: [] as MealLog[], cals: 0 },
  ];

  meals.forEach(meal => {
    const hr = new Date(meal.logged_at).getHours();
    let index = 3; // snacks
    if (hr >= 4 && hr < 11) index = 0; // breakfast
    else if (hr >= 11 && hr < 16) index = 1; // lunch
    else if (hr >= 16 && hr < 22) index = 2; // dinner
    
    mealGroups[index].items.push(meal);
    mealGroups[index].cals += meal.calories || 0;
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0b1120]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Header Bar ── */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(home)/(tabs)/dashboard" as any);
            }
          }}
          className="w-9 h-9 rounded-full bg-slate-200/50 dark:bg-slate-800 items-center justify-center z-10"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[22px] font-bold text-slate-900 dark:text-white absolute left-0 right-0 text-center pointer-events-none">
          Today
        </Text>
        <View className="w-9" />
      </View>

      <FlatList
        data={mealGroups}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#f8fafc" : "#0f172a"} />
        }
        ListHeaderComponent={
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 mt-2">
            
            {/* Top Row: Calories - Remaining Sodium - Total Sodium */}
            <View className="flex-row items-end justify-between mb-6">
              <View className="items-center pb-2">
                <Text className="text-xl font-bold text-slate-800 dark:text-white mb-0.5">{totalCalories}</Text>
                <Text className="text-[12px] text-slate-500">Calories</Text>
              </View>
              
              <SemiCircleProgress 
                progress={totalSodium / SODIUM_BUDGET} 
                remaining={SODIUM_BUDGET - totalSodium}
                isDark={isDark} 
              />
              
              <View className="items-center pb-2">
                <Text className="text-xl font-bold text-slate-800 dark:text-white mb-0.5">{totalSodium}</Text>
                <Text className="text-[12px] text-slate-500">Total Sod.</Text>
              </View>
            </View>

            {/* Bottom Row: Macro Bars */}
            <View className="flex-row justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
              <MacroBar label="Sat Fat" current={totalSatFat} total={20} color="#38bdf8" isDark={isDark} />
              <MacroBar label="Fiber" current={totalFiber} total={30} color="#60a5fa" isDark={isDark} />
              <MacroBar label="Sodium" current={totalSodium} total={SODIUM_BUDGET} color="#2dd4bf" isDark={isDark} />
            </View>
          </View>
        }
        renderItem={({ item: group }) => (
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
            {/* Category Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-4">
                {/* Custom Circular Icon */}
                <View className="relative">
                  {/* Progress Ring behind icon (simulated) */}
                  <View className="absolute inset-0 rounded-full border-4 opacity-20" style={{ borderColor: group.color }} />
                  <View className="w-12 h-12 rounded-full items-center justify-center bg-slate-50 dark:bg-slate-800 border-2 border-transparent">
                    {group.iconType === "feather" ? (
                      <Feather name={group.icon as any} size={20} color={isDark ? "#cbd5e1" : "#475569"} />
                    ) : (
                      <MaterialCommunityIcons name={group.icon as any} size={22} color={isDark ? "#cbd5e1" : "#475569"} />
                    )}
                  </View>
                </View>
                <View>
                  <Text className="text-[16px] font-bold text-slate-800 dark:text-white mb-0.5">
                    {group.name}
                  </Text>
                  <Text className="text-[13px] text-slate-500">
                    {group.cals} Cal
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={openLogModal}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: group.color }}
              >
                <Feather name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Meals under category */}
            {group.items.length > 0 && (
              <View className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
                {group.items.map((meal, index) => (
                  <Swipeable 
                    key={meal.id} 
                    renderRightActions={() => (
                      <TouchableOpacity
                        onPress={() => handleDeleteMeal(meal.id, meal.meal_name)}
                        className="bg-red-500 justify-center items-center px-4 rounded-xl ml-2 mb-2"
                      >
                        <Feather name="trash-2" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  >
                    <View className="flex-row items-center justify-between py-2 mb-1 bg-white dark:bg-slate-900 rounded-xl px-2">
                      <View className="flex-row items-center flex-1 gap-3">
                        <View className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center overflow-hidden">
                          <MaterialCommunityIcons name="silverware-fork-knife" size={16} className="text-slate-300 dark:text-slate-700 absolute" />
                          {!!meal.image_url && (
                            <Image source={{ uri: meal.image_url }} className="w-full h-full absolute" resizeMode="cover" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-[14px] font-medium text-slate-800 dark:text-slate-200" numberOfLines={1}>
                            {meal.meal_name}
                          </Text>
                          <Text className="text-[11px] text-slate-400 mt-0.5">
                            {meal.portion || 1} Serving
                          </Text>
                        </View>
                      </View>
                      <View className="items-end pl-2">
                        <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-300">
                          {meal.calories} <Text className="text-[10px] font-normal text-slate-400">kcal</Text>
                        </Text>
                        <Text className="text-[11px] font-medium text-rose-500 mt-0.5">
                          {meal.sodium_mg} mg
                        </Text>
                      </View>
                    </View>
                  </Swipeable>
                ))}
              </View>
            )}
          </View>
        )}
      />

      {/* ── Food Log Options Bottom Sheet Modal ── */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onShow={animateIn}
        onRequestClose={animateOut}
      >
        <Animated.View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", opacity: backdropAnim }}>
          <Pressable style={{ flex: 1 }} onPress={animateOut} />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#0f172a" : "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 40 : 28 + insets.bottom,
            paddingHorizontal: 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 4, backgroundColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 2, marginBottom: 16 }} />
          <Text style={{ fontSize: 17, fontWeight: "600", color: isDark ? "#f8fafc" : "#0f172a", marginBottom: 3 }}>Log Food</Text>
          <Text style={{ fontSize: 13, color: isDark ? "#cbd5e1" : "#64748b", marginBottom: 18 }}>Choose how you want to record your meal</Text>

          {FOOD_LOG_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.label}
              activeOpacity={0.75}
              onPress={() => handleSelectOption(option.route)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderRadius: 20,
                padding: 16,
                marginBottom: index < FOOD_LOG_OPTIONS.length - 1 ? 12 : 0,
                borderWidth: 1.5,
                borderColor: isDark ? "#334155" : "#f1f5f9",
                shadowColor: isDark ? "#000" : "#64748b",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderWidth: 1, borderColor: isDark ? "#334155" : "#e2e8f0", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                {option.iconType === "feather" ? (
                  <Feather name={option.icon as any} size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
                ) : (
                  <MaterialCommunityIcons name={option.icon as any} size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: 3 }}>{option.label}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: "500", color: isDark ? "#94a3b8" : "#64748b", lineHeight: 18 }}>{option.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={isDark ? "#475569" : "#cbd5e1"} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={animateOut}
            style={{ marginTop: 14, alignItems: "center", paddingVertical: 13, backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderRadius: 14, borderWidth: 0.5, borderColor: isDark ? "#334155" : "#e2e8f0" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      <ConfirmDialog
        visible={!!mealToDelete}
        onCancel={() => setMealToDelete(null)}
        onConfirm={confirmDeleteMeal}
        title="Delete Meal?"
        message={`Are you sure you want to remove "${mealToDelete?.name}" from your daily log?`}
        confirmLabel="Delete"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />
    </SafeAreaView>
  );
}
