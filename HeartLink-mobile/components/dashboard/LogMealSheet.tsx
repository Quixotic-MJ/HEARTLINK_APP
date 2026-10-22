import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, PanResponder, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import { Skeleton } from "../ui/Skeleton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";
import { useLogMeal } from "../../hooks/useLogMeal";
import { fetchRecentMeals } from "../../services/foodSearch";
import { FoodItem, formatMg, mealTimeForHour, toMealPayload } from "../../services/foodLogging";

const RECENT_SHOWN = 3;

/** "today", "yesterday", or the weekday for the last week, else nothing. */
function whenLogged(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(then)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return then.toLocaleDateString(undefined, { weekday: "long" });
  return "";
}

/**
 * The meal mission's sheet: search first, then scan or enter a meal yourself, then the patient's
 * recent meals to log again in one tap (1 serving, as last time), and the way into the food diary.
 */
export function LogMealSheet({
  visible,
  userId,
  token,
  sodiumLeftMg,
  mealsToday,
  onClose,
  onOpenDiary,
}: {
  visible: boolean;
  userId?: string | null;
  token?: string | null;
  /** Under the patient's sodium limit (negative = over it). */
  sodiumLeftMg: number;
  mealsToday: number;
  onClose: () => void;
  onOpenDiary: () => void;
}) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logMeal = useLogMeal(userId, token ?? null);
  const [loggedIds, setLoggedIds] = useState<string[]>([]);

  const recent = useQuery({
    queryKey: ["recentMeals", userId],
    enabled: visible && !!userId,
    staleTime: 60 * 1000,
    queryFn: ({ signal }) => fetchRecentMeals(String(userId), token ?? null, signal),
  });

  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    setLoggedIds([]);
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, stiffness: 300, damping: 30, mass: 0.9, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
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

  // Dragging the top of the sheet down past 100px closes it; a shorter drag springs back.
  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => slideAnim.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 100 || g.vy > 1.2) animateOut(onClose);
          else Animated.spring(slideAnim, { toValue: 0, stiffness: 300, damping: 30, useNativeDriver: true }).start();
        },
      }),
    [slideAnim, animateOut, onClose]
  );

  if (!visible) return null;
  const close = () => animateOut(onClose);
  const go = (route: string) => animateOut(() => {
    onClose();
    router.push(route as never);
  });
  const over = sodiumLeftMg < 0;

  const logAgain = (item: FoodItem) => {
    if (!userId || loggedIds.includes(item.id)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logMeal.mutate(toMealPayload(item, item.base, 1, mealTimeForHour(new Date().getHours())));
    setLoggedIds((ids) => [...ids, item.id]);
  };

  const meals = (recent.data ?? []).slice(0, RECENT_SHOWN);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onShow={animateIn} onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(10,21,48,0.45)", opacity: backdropAnim }}>
        <TouchableOpacity activeOpacity={1} onPress={close} accessibilityLabel="Close" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "90%",
          backgroundColor: c.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View {...dragResponder.panHandlers} style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 6 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
                Log a meal
              </Text>
              <Text style={{ fontSize: 14, fontWeight: over ? "500" : "400", color: over ? c.warmText : c.slate }}>
                {over
                  ? `${formatMg(-sodiumLeftMg)} mg over your sodium limit today`
                  : `${formatMg(sodiumLeftMg)} mg sodium left today`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ width: 44, height: 44, marginTop: -6, marginRight: -10, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={20} color={c.slate} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 + insets.bottom, gap: 20 }}
        >
          {over ? (
            <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.peach }}>
              <Feather name="alert-triangle" size={18} color={c.warmText} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.warmText }}>
                Still log what you eat. For the rest of today, low-sodium meals help.
              </Text>
            </View>
          ) : null}

          <AnimatedButton
            onPress={() => go("/(home)/(meals)/search-meal")}
            accessibilityRole="search"
            accessibilityLabel="Search foods and recipes"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 10 }}
          >
            <Feather name="search" size={20} color={c.slate} />
            <Text style={{ fontSize: 16, color: c.steel }}>Search foods and recipes</Text>
          </AnimatedButton>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <WayTile c={c} icon="maximize" tint={c.peach} title="Scan a barcode" detail="Packaged food" onPress={() => go("/(home)/(meals)/barcode-scan")} />
            <WayTile c={c} icon="edit-3" tint={c.surfaceAlt} title="Enter it yourself" detail="Home cooking, eating out" onPress={() => go("/(home)/(meals)/estimate-meal")} />
          </View>

          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
              Log again
            </Text>
            {recent.isLoading ? (
              <Skeleton style={{ height: 64, borderRadius: 12 }} />
            ) : meals.length === 0 ? (
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                {recent.isError
                  ? "Your recent meals couldn't load. Search above to log a meal."
                  : "Meals you log will show here, so you can log them again in one tap."}
              </Text>
            ) : (
              <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
                {meals.map((item, i) => {
                  const done = loggedIds.includes(item.id);
                  const when = whenLogged(item.logged_at);
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        paddingLeft: 14,
                        paddingRight: 12,
                        borderBottomWidth: i < meals.length - 1 ? 1 : 0,
                        borderBottomColor: c.hairlineSoft,
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>
                          {item.name}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>
                          1 serving, {formatMg(item.base.sodium_mg)} mg sodium{when ? ` · ${when}` : ""}
                        </Text>
                      </View>
                      <AnimatedButton
                        onPress={() => logAgain(item)}
                        disabled={done}
                        accessibilityRole="button"
                        accessibilityLabel={done ? `${item.name} logged` : `Log ${item.name} again`}
                        accessibilityState={{ disabled: done }}
                        style={{
                          height: 40,
                          minWidth: 64,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          borderWidth: done ? 0 : 1,
                          borderColor: c.hairlineStrong,
                          backgroundColor: done ? c.mint : c.canvas,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        {done ? <Feather name="check" size={14} color={c.success} /> : null}
                        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{done ? "Logged" : "Log"}</Text>
                      </AnimatedButton>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <AnimatedButton
            onPress={() => animateOut(onOpenDiary)}
            accessibilityRole="link"
            accessibilityLabel="Open the food diary"
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 48, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}
          >
            <Text style={{ fontSize: 15, color: c.ink }}>
              {mealsToday === 0 ? "No meals logged today" : `${mealsToday} ${mealsToday === 1 ? "meal" : "meals"} logged today`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.link }}>Food diary</Text>
              <Feather name="chevron-right" size={16} color={c.link} />
            </View>
          </AnimatedButton>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function WayTile({
  c,
  icon,
  tint,
  title,
  detail,
  onPress,
}: {
  c: DsColors;
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      style={{ flex: 1, padding: 14, gap: 4, borderWidth: 1, borderColor: c.hairline, borderRadius: 12, backgroundColor: c.canvas }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: tint, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Feather name={icon} size={18} color={c.charcoal} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{title}</Text>
      <Text style={{ fontSize: 13, color: c.slate }}>{detail}</Text>
    </AnimatedButton>
  );
}
