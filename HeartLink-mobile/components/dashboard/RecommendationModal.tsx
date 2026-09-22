import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useLogMeal } from "../../hooks/useLogMeal";

/**
 * RecommendationModal — pure React Native port of the ExpandableProfileCard
 * web blueprint for the dashboard recommendation cards.
 *
 * Blueprint mechanics preserved:
 * - Card tap -> modal (backdrop fade + panel springing up, stiffness 300
 *   / damping 30); layoutId morph has no RN equivalent without extra deps,
 *   so the panel springs from the bottom instead.
 * - Close button, hero image, subtitle + title block, staggered content
 *   fade (delay 0.2), CTA button pinned at the end.
 * - div -> View, text -> Text (+numberOfLines), onClick -> TouchableOpacity,
 *   img -> Image. No motion/* modules.
 */

export interface ActiveRec {
  id: string;
  type: "recipe" | "exercise";
  tag: string;
  title: string;
  subtitle: string;
}

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

function resolveMediaUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = base_url?.endsWith("/") ? base_url.slice(0, -1) : base_url;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase || "http://localhost:8000"}${cleanPath}`;
}

const FALLBACK_RECIPE_IMG =
  "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80";

export function RecommendationModal({
  visible,
  rec,
  budgetLimit,
  currentSodium,
  onClose,
  onLogged,
  onOpenFull,
}: {
  visible: boolean;
  rec: ActiveRec | null;
  budgetLimit?: number;
  currentSodium?: number;
  onClose: () => void;
  onLogged: () => void;
  onOpenFull: (rec: ActiveRec) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [servings, setServings] = useState(1);
  const [fetchError, setFetchError] = useState(false);
  const lastRecIdRef = useRef<string | null>(null);

  const logMealMutation = useLogMeal(userId, token);

  // Panel motion uses RN Animated (Reanimated entering animations swallow
  // touches inside RN Modals on Android, which deadened the X button).
  // Blueprint spring (stiffness 300, damping 30) drives the panel rise.
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    contentAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        stiffness: 300,
        damping: 30,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 260,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim, contentAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get("window").height,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [slideAnim, backdropAnim]
  );

  const contentStyle = {
    opacity: contentAnim,
    transform: [
      {
        translateY: contentAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  // Fetch the same detail endpoints as the full screens.
  const fetchDetail = useCallback(async (targetRec: ActiveRec) => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const storedToken = await AsyncStorage.getItem("access_token");
      const effectiveToken = token || storedToken || "";
      const headers: Record<string, string> = {};
      if (effectiveToken) headers["Authorization"] = `Bearer ${effectiveToken}`;

      if (targetRec.type === "recipe") {
        const res = await fetch(`${base_url}/api/recipes/${targetRec.id}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch recipe");
        const data = await res.json();
        setDetail({
          image: data.image_url || FALLBACK_RECIPE_IMG,
          sodium: data.sodium_mg || 0,
          calories: data.calories || 0,
          heartBenefit: data.heart_benefit || "",
          servings: data.servings || 1,
          ingredients: Array.isArray(data.ingredients)
            ? data.ingredients.map((ing: any) =>
                typeof ing === "string" ? ing : ing.name || ""
              )
            : [],
          stepsCount: Array.isArray(data.steps) ? data.steps.length : 0,
        });
      } else {
        const res = await fetch(`${base_url}/api/exercises/${targetRec.id}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch routine");
        const data = await res.json();
        setDetail({
          image: resolveMediaUrl(data.media_url || ""),
          duration: data.duration_minutes || 0,
          type: data.type || "Light Cardio",
          intensity: data.intensity || "Low",
          goal: data.goal || data.description || "",
          stepsCount: Array.isArray(data.steps) ? data.steps.length : 0,
        });
      }
    } catch {
      setFetchError(true);
      showToast({ title: "Couldn't load details", message: "Check your connection and try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (!visible || !rec) return;

    // Only clear detail + servings if this is a different card than before
    if (lastRecIdRef.current !== rec.id) {
      setDetail(null);
      setServings(1);
      lastRecIdRef.current = rec.id;
    }

    fetchDetail(rec);
  }, [visible, rec, fetchDetail]);

  const handleLogRecipe = () => {
    if (!rec || !detail) return;
    if (!userId) {
      showToast({ title: "Not signed in", message: "Please sign in to log meals.", type: "error" });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    logMealMutation.mutate({
      recipe_id: rec.id,
      meal_name: rec.title,
      portion: servings,
      calories: Math.round((detail.calories || 0) * servings),
      sodium_mg: Math.round((detail.sodium || 0) * servings),
      saturated_fat_g: 0,
      fiber_g: 0,
      image_url: detail.image || null,
      source: "recommendation",
    });

    // Close immediately for optimistic UI
    animateOut(onLogged);
  };

  if (!rec) return null;
  const isRecipe = rec.type === "recipe";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={() => animateOut(onClose)}
    >
      {/* Backdrop */}
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.6)", opacity: backdropAnim, justifyContent: "center", alignItems: "center", padding: 20 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Panel (blueprint spring: stiffness 300, damping 30) */}
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 420,
            maxHeight: "82%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8E5",
            transform: [{ translateY: slideAnim }],
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.3,
                shadowRadius: 24,
              },
              android: { elevation: 16 },
            }),
          }}
        >
          {/* Close */}
          <TouchableOpacity
            onPress={() => animateOut(onClose)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close details"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(15,23,42,0.55)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="x" size={16} color="#fff" />
          </TouchableOpacity>

          {/* Hero image */}
          <View style={{ height: 170, backgroundColor: isDark ? "#0f172a" : "#EDF1EF" }}>
            {detail?.image ? (
              <Image
                source={{ uri: detail.image }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {isLoading ? (
                  <ActivityIndicator size="large" color="#E8532E" />
                ) : (
                  <Feather
                    name={isRecipe ? "coffee" : "activity"}
                    size={40}
                    color={isDark ? "#334155" : "#CBD5E1"}
                  />
                )}
              </View>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          >
            <Animated.View style={contentStyle}>
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  backgroundColor: isRecipe ? "rgba(27,110,99,0.12)" : "rgba(37,99,235,0.12)",
                  marginBottom: 8,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    color: isRecipe ? "#1B6E63" : "#4A6080",
                  }}
                >
                  {rec.tag.toUpperCase()}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                  color: isDark ? "#FFFFFF" : "#152131",
                }}
              >
                {rec.title}
              </Text>
              {!!rec.subtitle && (
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: isDark ? "#94A3B8" : "#5C6B66",
                  }}
                >
                  {rec.subtitle}
                </Text>
              )}

              {isLoading && !detail ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#E8532E" />
                </View>
              ) : fetchError && !detail ? (
                <View style={{ paddingVertical: 24, alignItems: "center", gap: 12 }}>
                  <Feather name="wifi-off" size={28} color={isDark ? "#64748b" : "#94a3b8"} />
                  <Text style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", textAlign: "center" }}>
                    Couldn't load details.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => rec && fetchDetail(rec)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: isDark ? "#1E293B" : "#EDF1EF",
                    }}
                  >
                    <Feather name="refresh-cw" size={13} color={isDark ? "#cbd5e1" : "#475569"} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#cbd5e1" : "#475569" }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : detail ? (
                <View style={{ marginTop: 14, gap: 10 }}>
                  {isRecipe ? (
                    <>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {[
                          { v: `${Math.round(detail.sodium * servings)} mg`, l: "Sodium" },
                          { v: `${Math.round(detail.calories * servings)}`, l: "Calories" },
                          { v: `${detail.stepsCount}`, l: "Steps" },
                        ].map((f) => (
                          <View
                            key={f.l}
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              padding: 10,
                              alignItems: "center",
                              backgroundColor: isDark ? "#0f172a" : "#F4F7F5",
                              borderWidth: 1,
                              borderColor: isDark ? "#1E293B" : "#E2E8E5",
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 15, fontWeight: "800", color: isDark ? "#fff" : "#152131", fontVariant: ["tabular-nums"] }}
                            >
                              {f.v}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: isDark ? "#64748b" : "#8D9B96", marginTop: 2 }}>
                              {f.l}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {!!detail.heartBenefit && (
                        <Text style={{ fontSize: 12.5, lineHeight: 18, color: isDark ? "#cbd5e1" : "#3f4a44" }}>
                          {detail.heartBenefit}
                        </Text>
                      )}

                      {/* Budget Warning UI */}
                      {budgetLimit !== undefined && currentSodium !== undefined && (
                        (() => {
                          const projectedSodium = Math.round(detail.sodium * servings) + currentSodium;
                          const isOver = projectedSodium > budgetLimit;
                          const overAmount = projectedSodium - budgetLimit;
                          
                          if (isOver) {
                            return (
                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#450a0a" : "#FEF2F2", padding: 10, borderRadius: 8, marginTop: 4 }}>
                                <Feather name="alert-triangle" size={16} color="#DC2626" />
                                <Text style={{ marginLeft: 8, fontSize: 13, color: isDark ? "#fca5a5" : "#991B1B", fontWeight: "500", flex: 1 }}>
                                  Logging this meal will put you {overAmount}mg over your daily sodium limit.
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()
                      )}

                      {detail.ingredients?.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#fff" : "#152131", marginBottom: 6 }}>
                            Key ingredients
                          </Text>
                          {detail.ingredients.slice(0, 4).map((ing: string, i: number) => (
                            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 }}>
                              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#1B6E63" }} />
                              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: isDark ? "#cbd5e1" : "#3f4a44" }}>
                                {ing}
                              </Text>
                            </View>
                          ))}
                          {servings > 1 && (
                            <Text style={{ fontSize: 11, fontStyle: "italic", color: isDark ? "#64748b" : "#94a3b8", marginTop: 4 }}>
                              Ingredients shown for 1 serving
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Servings stepper */}
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: "600", color: isDark ? "#cbd5e1" : "#3f4a44" }}>
                          Servings
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <TouchableOpacity
                            hitSlop={8}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setServings(Math.max(1, servings - 1));
                            }}
                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? "#0f172a" : "#EDF1EF", alignItems: "center", justifyContent: "center" }}
                          >
                            <Feather name="minus" size={14} color={isDark ? "#cbd5e1" : "#475569"} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: isDark ? "#fff" : "#152131", minWidth: 20, textAlign: "center" }}>
                            {servings}
                          </Text>
                          <TouchableOpacity
                            hitSlop={8}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setServings(Math.min(6, servings + 1));
                            }}
                            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? "#0f172a" : "#EDF1EF", alignItems: "center", justifyContent: "center" }}
                          >
                            <Feather name="plus" size={14} color={isDark ? "#cbd5e1" : "#475569"} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[
                          { icon: "clock", label: `${detail.duration} min` },
                          { icon: "activity", label: detail.type },
                          { icon: "zap", label: `${detail.intensity} intensity` },
                          { icon: "list", label: `${detail.stepsCount} steps` },
                        ].map((chip) => (
                          <View
                            key={chip.icon}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 999,
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              backgroundColor: isDark ? "#0f172a" : "#EFF6FF",
                              borderWidth: 1,
                              borderColor: isDark ? "#1E293B" : "#DBEAFE",
                            }}
                          >
                            <Feather name={chip.icon as any} size={12} color="#4A6080" />
                            <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "600", color: isDark ? "#cbd5e1" : "#1e40af" }}>
                              {chip.label}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {!!detail.goal && (
                        <Text style={{ fontSize: 12.5, lineHeight: 18, color: isDark ? "#cbd5e1" : "#3f4a44" }}>
                          {detail.goal}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              ) : null}

              {/* CTA row */}
              <View style={{ marginTop: 18, gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={logMealMutation.isPending || (isRecipe && !detail)}
                  onPress={() => {
                    if (isRecipe) {
                      handleLogRecipe();
                    } else {
                      Haptics.selectionAsync();
                      animateOut(() => onOpenFull(rec));
                    }
                  }}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: isRecipe ? "#1B6E63" : "#4A6080",
                    opacity: logMealMutation.isPending || (isRecipe && !detail) ? 0.7 : 1,
                  }}
                >
                  <Feather name={isRecipe ? "check" : "play"} size={15} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                    {logMealMutation.isPending ? "Saving…" : isRecipe ? "Log This Recipe" : "Do This Exercise"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => animateOut(() => onOpenFull(rec))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: isDark ? "#94A3B8" : "#5C6B66" }}>
                    Open full details
                  </Text>
                  <Feather name="arrow-right" size={13} color={isDark ? "#94A3B8" : "#5C6B66"} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
