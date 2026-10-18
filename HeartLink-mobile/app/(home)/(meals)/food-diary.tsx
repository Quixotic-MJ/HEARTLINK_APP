import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
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
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { FoodHeader } from "../../../components/food/FoodBits";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { useSodiumBudget } from "../../../hooks/useSodiumBudget";
import { formatMg } from "../../../services/foodLogging";
import { apiFetch } from "../../../lib/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");type MealLog = {
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
    label: "Scan a barcode",
    subtitle: "Point the camera at a packaged food",
    route: "/(home)/(meals)/barcode-scan",
  },
  {
    icon: "search" as const,
    label: "Search food",
    subtitle: "HeartLink recipes, recent meals and packaged foods",
    route: "/(home)/(meals)/search-meal",
  },
  {
    icon: "edit-3" as const,
    label: "Estimate a meal",
    subtitle: "Type in your own food and its nutrition",
    route: "/(home)/(meals)/estimate-meal",
  },
];

// Daily guides shown next to the diary totals (unchanged from the earlier design).
const SAT_FAT_GUIDE_G = 20;
const FIBRE_GUIDE_G = 30;

/** "1 serving", "1.5 servings"; packaged food already says its grams in the name. */
function portionText(meal: MealLog): string | null {
  if (/\(\d+(\.\d+)?\s?g\)$/.test(meal.meal_name)) return null;
  const p = Number(meal.portion) || 1;
  return `${p} ${p === 1 ? "serving" : "servings"}`;
}

export default function DailyDiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useDs();
  const { userId, token } = useUser();
  // The patient's own daily sodium limit (Goals & thresholds), 2,000 mg if not set
  const { limitMg: sodiumLimit } = useSodiumBudget();
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
      const response = await apiFetch(`/api/meals/${userId}?page=1&page_size=50`, {
        headers: {
          "Authorization": `Bearer ${token || ""}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        const data: MealLog[] = result.data ?? result;

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
      const res = await apiFetch(`/api/meals/${userId}/${mealToDelete.id}`, {
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
  const sodiumLeft = sodiumLimit - totalSodium;
  const sodiumOver = sodiumLeft < 0;
  const sodiumShare = Math.min(1, totalSodium / sodiumLimit);

  // Categorize meals by time of day
  const mealGroups = [
    { name: "Breakfast", icon: "coffee", items: [] as MealLog[], cals: 0 },
    { name: "Lunch", icon: "sun", items: [] as MealLog[], cals: 0 },
    { name: "Dinner", icon: "moon", items: [] as MealLog[], cals: 0 },
    { name: "Snacks", icon: "package", items: [] as MealLog[], cals: 0 },
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

  const smallStats = [
    { label: "Calories", value: `${formatMg(totalCalories)} kcal` },
    { label: "Saturated fat", value: `${Math.round(totalSatFat * 10) / 10} of ${SAT_FAT_GUIDE_G} g` },
    { label: "Fibre", value: `${Math.round(totalFiber * 10) / 10} of ${FIBRE_GUIDE_G} g` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <FoodHeader
        title="Today"
        backLabel="Back"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.push("/(home)/(tabs)/dashboard" as any);
          }
        }}
      />

      <FlatList
        data={loading ? [] : mealGroups}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.steel} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {/* Sodium today against the patient's own limit */}
            <View style={{ padding: 16, borderRadius: 12, backgroundColor: sodiumOver ? c.peach : c.surface, gap: 10 }}>
              <View className="flex-row items-baseline justify-between" style={{ gap: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Sodium today</Text>
                <Text style={{ fontSize: 13, color: c.slate }}>
                  {formatMg(totalSodium)} of {formatMg(sodiumLimit)} mg
                </Text>
              </View>
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Sodium today ${formatMg(totalSodium)} of ${formatMg(sodiumLimit)} milligrams`}
                style={{ height: 10, borderRadius: 9999, backgroundColor: c.hairlineSoft, overflow: "hidden" }}
              >
                <View style={{ width: `${sodiumShare * 100}%`, height: "100%", backgroundColor: sodiumOver ? c.warmText : c.line }} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 21, color: sodiumOver ? c.warmText : c.ink }}>
                {sodiumOver
                  ? `${formatMg(-sodiumLeft)} mg over your daily limit. Pick low-salt food for the rest of today.`
                  : `${formatMg(sodiumLeft)} mg left for today.`}
              </Text>
            </View>

            <View className="flex-row" style={{ gap: 8 }}>
              {smallStats.map((s) => (
                <View key={s.label} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, gap: 2 }}>
                  <Text style={{ fontSize: 13, color: c.slate }}>{s.label}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{s.value}</Text>
                </View>
              ))}
            </View>

            {loading ? (
              <View style={{ gap: 12 }}>
                {[0, 1, 2].map((k) => (
                  <Skeleton key={k} style={{ height: 88, borderRadius: 12 }} />
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16 }}>
            <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
              <View className="flex-row items-center" style={{ gap: 12, flex: 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.peach, alignItems: "center", justifyContent: "center" }}>
                  <Feather name={group.icon as any} size={18} color={c.charcoal} />
                </View>
                <View>
                  <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                    {group.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.slate }}>{formatMg(group.cals)} kcal</Text>
                </View>
              </View>
              <AnimatedButton
                onPress={openLogModal}
                accessibilityRole="button"
                accessibilityLabel={`Add food to ${group.name.toLowerCase()}`}
                style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}
              >
                <Feather name="plus" size={18} color={c.ink} />
              </AnimatedButton>
            </View>

            {group.items.length > 0 ? (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}>
                {group.items.map((meal) => {
                  const portion = portionText(meal);
                  return (
                    <Swipeable
                      key={meal.id}
                      renderRightActions={() => (
                        <AnimatedButton
                          onPress={() => handleDeleteMeal(meal.id, meal.meal_name)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${meal.meal_name}`}
                          style={{ backgroundColor: c.danger, justifyContent: "center", alignItems: "center", width: 64, borderRadius: 8, marginVertical: 6, marginLeft: 8 }}
                        >
                          <Feather name="trash-2" size={18} color="#ffffff" />
                        </AnimatedButton>
                      )}
                    >
                      <View className="flex-row items-center" style={{ minHeight: 60, gap: 12, paddingVertical: 8, backgroundColor: c.canvas }}>
                        <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={c.steel} />
                          {!!meal.image_url && (
                            <Image source={{ uri: meal.image_url }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }} numberOfLines={2}>
                            {meal.meal_name}
                          </Text>
                          {portion ? <Text style={{ fontSize: 13, color: c.slate }}>{portion}</Text> : null}
                        </View>
                        <View className="items-end">
                          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{formatMg(meal.sodium_mg)} mg</Text>
                          <Text style={{ fontSize: 13, color: c.slate }}>{formatMg(meal.calories)} kcal</Text>
                        </View>
                      </View>
                    </Swipeable>
                  );
                })}
              </View>
            ) : (
              <Text style={{ marginTop: 10, fontSize: 13, color: c.slate }}>Nothing logged yet.</Text>
            )}
          </View>
        )}
        ListFooterComponent={
          !loading && meals.length > 0 ? (
            <Text style={{ textAlign: "center", fontSize: 13, color: c.slate, marginTop: 4 }}>Swipe a meal left to delete it.</Text>
          ) : null
        }
      />

      <View className="px-5 pt-3 pb-5" style={{ borderTopWidth: 1, borderTopColor: c.hairlineSoft, backgroundColor: c.canvas }}>
        <DsButton label="Log food" onPress={openLogModal} />
      </View>

      {/* ── Food Log Options Bottom Sheet Modal ── */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onShow={animateIn}
        onRequestClose={animateOut}
      >
        <Animated.View style={{ flex: 1, backgroundColor: "rgba(15,15,15,0.45)", opacity: backdropAnim }}>
          <Pressable style={{ flex: 1 }} onPress={animateOut} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: c.canvas,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 40 : 28 + insets.bottom,
            paddingHorizontal: 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 4, backgroundColor: c.hairlineStrong, borderRadius: 2, marginBottom: 16 }} />
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink, marginBottom: 4 }}>Log food</Text>
          <Text style={{ fontSize: 14, color: c.slate, marginBottom: 16 }}>How do you want to add it?</Text>

          <View style={{ gap: 8 }}>
            {FOOD_LOG_OPTIONS.map((option) => (
              <AnimatedButton
                key={option.label}
                onPress={() => handleSelectOption(option.route)}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}. ${option.subtitle}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.peach, alignItems: "center", justifyContent: "center" }}>
                  <Feather name={option.icon} size={18} color={c.charcoal} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }}>{option.label}</Text>
                  <Text style={{ fontSize: 13, color: c.slate, lineHeight: 18 }}>{option.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={c.steel} />
              </AnimatedButton>
            ))}
          </View>

          <DsButton label="Cancel" variant="secondary" block onPress={animateOut} style={{ marginTop: 12 }} />
        </Animated.View>
      </Modal>

      <ConfirmDialog
        visible={!!mealToDelete}
        onCancel={() => setMealToDelete(null)}
        onConfirm={confirmDeleteMeal}
        title="Delete meal?"
        message={`Remove "${mealToDelete?.name}" from today's diary?`}
        confirmLabel="Delete"
        variant="destructive"
        mode="bottom-sheet"
        icon="trash-2"
      />
    </SafeAreaView>
  );
}
