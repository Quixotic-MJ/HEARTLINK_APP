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

// ─── Food Log Options ─────────────────────────────────────────────────────────

const FOOD_LOG_OPTIONS = [
  {
    icon: "camera" as const,
    iconType: "feather" as const,
    label: "Scan food barcode",
    subtitle: "Use camera to scan product barcodes",
    iconColor: "#185fa5",
    iconBg: "#e6f1fb",
    route: "/(home)/(meals)/barcode-scan",
  },
  {
    icon: "search" as const,
    iconType: "feather" as const,
    label: "Search food database",
    subtitle: "Search verified meals & nutritional facts",
    iconColor: "#16a34a",
    iconBg: "#eaf3de",
    route: "/(home)/(meals)/search-meal",
  },
  {
    icon: "silverware-fork-knife" as const,
    iconType: "material" as const,
    label: "Log manually / Estimate",
    subtitle: "Enter custom food details & nutrients",
    iconColor: "#d97706",
    iconBg: "#fef3c7",
    route: "/(home)/(meals)/estimate-meal",
  },
];

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
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Header Bar ── */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <Text className="text-[17px] font-semibold text-slate-900 dark:text-white">
          Daily Food Diary
        </Text>

        <TouchableOpacity
          onPress={openLogModal}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add meal options"
          className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center"
        >
          <Feather name="plus" size={18} color={isDark ? "#60a5fa" : "#2563eb"} />
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
          <ActivityIndicator size="large" color={isDark ? "#60a5fa" : "#0f172a"} />
        </View>
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<MaterialCommunityIcons name="food-fork-drink" size={32} color="#94a3b8" />}
          title="No Meals Logged Today"
          subtitle="Tap the + icon above or choose an option to log your food."
          actionLabel="Log Food"
          onAction={openLogModal}
          actionIcon={<Feather name="plus" size={15} color="#fff" />}
        />
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#f8fafc" : "#0f172a"} />
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

      {/* ── Food Log Options Bottom Sheet Modal ── */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onShow={animateIn}
        onRequestClose={animateOut}
      >
        {/* Backdrop */}
        <Animated.View
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", opacity: backdropAnim }}
        >
          <Pressable style={{ flex: 1 }} onPress={animateOut} />
        </Animated.View>

        {/* Sheet */}
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
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
              },
              android: { elevation: 20 },
            }),
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              backgroundColor: isDark ? "#334155" : "#e2e8f0",
              borderRadius: 2,
              marginBottom: 16,
            }}
          />

          {/* Title */}
          <Text style={{ fontSize: 17, fontWeight: "600", color: isDark ? "#f8fafc" : "#0f172a", marginBottom: 3 }}>
            Log Food
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? "#cbd5e1" : "#64748b", marginBottom: 18 }}>
            Choose how you want to record your meal
          </Text>

          {/* Options */}
          {FOOD_LOG_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.label}
              activeOpacity={0.7}
              onPress={() => handleSelectOption(option.route)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#1e293b" : "#fff",
                borderRadius: 16,
                padding: 14,
                marginBottom: index < FOOD_LOG_OPTIONS.length - 1 ? 10 : 0,
                borderWidth: 0.5,
                borderColor: isDark ? "#334155" : "#e2e8f0",
              }}
            >
              {/* Icon */}
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: option.iconBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                {option.iconType === "feather" ? (
                  <Feather name={option.icon as any} size={18} color={option.iconColor} />
                ) : (
                  <MaterialCommunityIcons name={option.icon as any} size={18} color={option.iconColor} />
                )}
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#f8fafc" : "#0f172a", marginBottom: 2 }}>
                  {option.label}
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#64748b", lineHeight: 16 }}>
                  {option.subtitle}
                </Text>
              </View>

              <Feather name="chevron-right" size={16} color={isDark ? "#64748b" : "#cbd5e1"} />
            </TouchableOpacity>
          ))}

          {/* Cancel */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={animateOut}
            style={{
              marginTop: 14,
              alignItems: "center",
              paddingVertical: 13,
              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>
              Cancel
            </Text>
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
