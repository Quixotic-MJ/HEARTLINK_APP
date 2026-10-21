import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getToken } from "../../lib/secureTokenStore";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { useLogMeal } from "../../hooks/useLogMeal";
import { apiFetch, apiUrl } from "../../lib/api";
import { DsColors } from "../../constants/theme";
import { useDs } from "../onboarding/useDs";
import DsButton from "../onboarding/DsButton";
import { Skeleton } from "../ui/Skeleton";

/**
 * Bottom sheet for a dashboard recommendation. A meal shows what it adds to today's sodium,
 * calories and cholesterol (bars against the patient's own limits) and logs in one tap; an
 * exercise shows what it adds to today's movement and opens the session.
 *
 * Motion uses RN Animated (Reanimated entering animations swallow touches inside RN Modals on
 * Android). Drag the top of the sheet down, tap outside or press back to close.
 */

export interface ActiveRec {
  id: string;
  type: "recipe" | "exercise";
  tag: string;
  title: string;
  subtitle: string;
}

/** Today's totals from the dashboard, so the sheet can show what an item adds to them. */
export interface TodayTotals {
  sodiumMg: number;
  sodiumLimitMg: number;
  caloriesEaten: number;
  cholesterolMg: number;
  cholesterolLimitMg: number;
  movementMins: number;
  movementGoal: number;
}

type RecipeDetail = {
  kind: "recipe";
  image: string;
  sodium: number;
  calories: number;
  cholesterol: number;
  satFat: number;
  heartBenefit: string;
};

type ExerciseDetail = {
  kind: "exercise";
  image: string;
  duration: number;
  intensity: string;
  position: string;
  calories: number;
  goal: string;
};

const MAX_SERVINGS = 6;

function resolveMediaUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return apiUrl(url);
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export function RecommendationModal({
  visible,
  rec,
  today,
  onClose,
  onLogged,
  onOpenFull,
}: {
  visible: boolean;
  rec: ActiveRec | null;
  today?: TodayTotals;
  onClose: () => void;
  onLogged: () => void;
  onOpenFull: (rec: ActiveRec) => void;
}) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<RecipeDetail | ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [servings, setServings] = useState(1);
  const [fetchError, setFetchError] = useState(false);
  const lastRecIdRef = useRef<string | null>(null);

  const logMealMutation = useLogMeal(userId, token);

  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
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

  const fetchDetail = useCallback(async (targetRec: ActiveRec) => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const storedToken = await getToken();
      const effectiveToken = token || storedToken || "";
      const headers: Record<string, string> = {};
      if (effectiveToken) headers["Authorization"] = `Bearer ${effectiveToken}`;

      if (targetRec.type === "recipe") {
        const res = await apiFetch(`/api/recipes/${targetRec.id}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch recipe");
        const data = await res.json();
        setDetail({
          kind: "recipe",
          image: data.image_url || "",
          sodium: Number(data.sodium_mg) || 0,
          calories: Number(data.calories) || 0,
          cholesterol: Number(data.cholesterol_mg) || 0,
          satFat: Number(data.saturated_fat_g) || 0,
          heartBenefit: data.heart_benefit || "",
        });
      } else {
        const res = await apiFetch(`/api/exercises/${targetRec.id}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch routine");
        const data = await res.json();
        setDetail({
          kind: "exercise",
          image: resolveMediaUrl(data.media_url || ""),
          duration: Number(data.duration_minutes) || 0,
          intensity: data.intensity || "Low",
          position: data.position || data.type || "",
          calories: Number(data.calories) || 0,
          goal: data.goal || data.description || "",
        });
      }
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!visible || !rec) return;
    // Keep what's shown (and the servings picked) when the same card is opened again.
    if (lastRecIdRef.current !== rec.id) {
      setDetail(null);
      setServings(1);
      lastRecIdRef.current = rec.id;
    }
    fetchDetail(rec);
  }, [visible, rec, fetchDetail]);

  const handleLogRecipe = () => {
    if (!rec || detail?.kind !== "recipe") return;
    if (!userId) {
      showToast({ title: "Not signed in", message: "Please sign in to log meals.", type: "error" });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    logMealMutation.mutate({
      recipe_id: rec.id,
      meal_name: rec.title,
      portion: servings,
      calories: Math.round(detail.calories * servings),
      sodium_mg: Math.round(detail.sodium * servings),
      saturated_fat_g: Math.round(detail.satFat * servings * 10) / 10,
      cholesterol_mg: Math.round(detail.cholesterol * servings),
      fiber_g: 0,
      image_url: detail.image || null,
      source: "recommendation",
    });

    // Close straight away; the log hook updates the dashboard and shows the toast.
    animateOut(onLogged);
  };

  if (!rec) return null;
  const isRecipe = rec.type === "recipe";
  const recipe = detail?.kind === "recipe" ? detail : null;
  const exercise = detail?.kind === "exercise" ? detail : null;
  const close = () => animateOut(onClose);
  const changeServings = (n: number) => {
    Haptics.selectionAsync();
    setServings(Math.min(MAX_SERVINGS, Math.max(1, n)));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={close}
    >
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(10,21,48,0.45)", opacity: backdropAnim }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={close}
          accessibilityLabel="Close"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "88%",
          backgroundColor: c.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Grabber + title: also the drag handle */}
        <View {...dragResponder.panHandlers} style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong }} />
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", marginTop: 18 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: isRecipe ? c.peach : c.sky,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={isRecipe ? "coffee" : "activity"} size={22} color={c.charcoal} style={{ position: "absolute" }} />
              {detail?.image ? (
                <Image source={{ uri: detail.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 25, fontWeight: "600", color: c.ink }}>
                {rec.title}
              </Text>
              {!!rec.tag && (
                <View
                  style={{
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderRadius: 999,
                    backgroundColor: c.mint,
                  }}
                >
                  <Feather name="check" size={12} color={c.success} />
                  <Text style={{ fontSize: 12, fontWeight: "500", color: c.charcoal }}>{rec.tag}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ width: 44, height: 44, marginTop: -8, marginRight: -10, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={20} color={c.slate} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 + insets.bottom, gap: 18 }}
        >
          {isLoading && !detail ? (
            <View style={{ gap: 14 }}>
              <Skeleton style={{ height: 56, borderRadius: 12 }} />
              <Skeleton style={{ height: 18, width: "60%", borderRadius: 6 }} />
              <Skeleton style={{ height: 10, borderRadius: 5 }} />
              <Skeleton style={{ height: 10, borderRadius: 5 }} />
            </View>
          ) : fetchError && !detail ? (
            <View style={{ paddingVertical: 16, alignItems: "center", gap: 10 }}>
              <Feather name="wifi-off" size={26} color={c.steel} />
              <Text style={{ fontSize: 14, color: c.slate, textAlign: "center" }}>
                {"Couldn't load the details. Check your connection and try again."}
              </Text>
              <DsButton label="Try again" variant="secondary" block={false} onPress={() => fetchDetail(rec)} />
            </View>
          ) : recipe ? (
            <>
              <ServingsStepper c={c} servings={servings} onChange={changeServings} />
              <MealImpact c={c} recipe={recipe} servings={servings} today={today} />
              {!!recipe.heartBenefit && (
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{recipe.heartBenefit}</Text>
              )}
            </>
          ) : exercise ? (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Fact c={c} value={`${exercise.duration} min`} label="Time" />
                <Fact c={c} value={exercise.intensity} label="Effort" />
                {!!exercise.position && <Fact c={c} value={exercise.position} label="Position" />}
              </View>
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>What this adds to today</Text>
                {today ? (
                  <ImpactRow c={c} label="Movement" before={today.movementMins} add={exercise.duration} limit={today.movementGoal} unit="min" isGoal />
                ) : null}
                {exercise.calories > 0 ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ fontSize: 14, color: c.charcoal }}>Calories burned</Text>
                    <Text style={{ fontSize: 14, color: c.slate, flexShrink: 1, textAlign: "right" }}>
                      about <Text style={{ fontWeight: "600", color: c.ink }}>{fmt(exercise.calories)}</Text>, taken off net calories
                    </Text>
                  </View>
                ) : null}
              </View>
              {!!exercise.goal && <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{exercise.goal}</Text>}
            </>
          ) : null}

          <View style={{ gap: 4 }}>
            {isRecipe ? (
              <DsButton
                label={`Log ${servings} serving${servings === 1 ? "" : "s"}`}
                loading={logMealMutation.isPending}
                disabled={!recipe}
                onPress={handleLogRecipe}
                style={{ height: 52 }}
              />
            ) : (
              <DsButton
                label="Start exercise"
                onPress={() => {
                  Haptics.selectionAsync();
                  animateOut(() => onOpenFull(rec));
                }}
                style={{ height: 52 }}
              />
            )}
            {isRecipe ? (
              <DsButton label="See full recipe" variant="link" block onPress={() => animateOut(() => onOpenFull(rec))} />
            ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function ServingsStepper({ c, servings, onChange }: { c: DsColors; servings: number; onChange: (n: number) => void }) {
  const stepButton = (icon: "minus" | "plus", label: string, next: number, enabled: boolean) => (
    <TouchableOpacity
      onPress={() => onChange(next)}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.hairline,
        backgroundColor: c.canvas,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={icon} size={18} color={enabled ? c.charcoal : c.muted} />
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
        paddingRight: 6,
        paddingLeft: 14,
        borderRadius: 12,
        backgroundColor: c.surface,
      }}
    >
      <View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Servings</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>Numbers below are for {servings === 1 ? "1 serving" : `${servings} servings`}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {stepButton("minus", "Fewer servings", servings - 1, servings > 1)}
        <Text
          accessibilityLabel={`${servings} servings`}
          style={{ minWidth: 36, textAlign: "center", fontSize: 20, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}
        >
          {servings}
        </Text>
        {stepButton("plus", "More servings", servings + 1, servings < MAX_SERVINGS)}
      </View>
    </View>
  );
}

/** Sodium, calories and cholesterol this meal adds, plus a warning when it goes past a limit. */
function MealImpact({ c, recipe, servings, today }: { c: DsColors; recipe: RecipeDetail; servings: number; today?: TodayTotals }) {
  const sodium = recipe.sodium * servings;
  const calories = recipe.calories * servings;
  const cholesterol = recipe.cholesterol * servings;

  const warnings: string[] = [];
  if (today) {
    const limited = [
      { name: "sodium", unit: "mg", before: today.sodiumMg, perServing: recipe.sodium, limit: today.sodiumLimitMg },
      { name: "cholesterol", unit: "mg", before: today.cholesterolMg, perServing: recipe.cholesterol, limit: today.cholesterolLimitMg },
    ];
    for (const n of limited) {
      const after = n.before + n.perServing * servings;
      if (!n.limit || after <= n.limit || n.perServing <= 0) continue;
      if (n.before >= n.limit) {
        warnings.push(`You're already past your ${n.name} limit for today.`);
        continue;
      }
      const amount = servings === 1 ? "This meal" : `${servings} servings`;
      const fits = Math.floor((n.limit - n.before) / n.perServing);
      const tip = fits >= 1 && fits < servings ? ` ${fits === 1 ? "1 serving keeps" : `${fits} servings keep`} you under.` : "";
      warnings.push(`${amount} puts you ${fmt(after - n.limit)} ${n.unit} over your ${n.name} limit for today.${tip}`);
    }
  }

  return (
    <>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>What this adds to today</Text>
        {today ? (
          <>
            <ImpactRow c={c} label="Sodium" before={today.sodiumMg} add={sodium} limit={today.sodiumLimitMg} unit="mg" />
            <ImpactRow c={c} label="Calories" before={today.caloriesEaten} add={calories} unit="" />
            <ImpactRow c={c} label="Cholesterol" before={today.cholesterolMg} add={cholesterol} limit={today.cholesterolLimitMg} unit="mg" />
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Legend c={c} color={c.steel} label="Already today" />
              <Legend c={c} color={c.primary} label="This meal" />
            </View>
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Fact c={c} value={`${fmt(sodium)} mg`} label="Sodium" />
            <Fact c={c} value={fmt(calories)} label="Calories" />
            <Fact c={c} value={`${fmt(cholesterol)} mg`} label="Cholesterol" />
          </View>
        )}
      </View>

      {warnings.length > 0 ? (
        <View
          accessibilityRole="alert"
          style={{ flexDirection: "row", gap: 10, padding: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.peach }}
        >
          <Feather name="alert-triangle" size={18} color={c.warmText} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.warmText }}>{warnings.join(" ")}</Text>
        </View>
      ) : null}
    </>
  );
}

/**
 * One "today so far + this item" row. With a limit it draws a bar: grey for today so far, blue for
 * what this adds, and warm for any part past the limit. A goal (movement) is never "over".
 */
function ImpactRow({
  c,
  label,
  before,
  add,
  limit,
  unit,
  isGoal = false,
}: {
  c: DsColors;
  label: string;
  before: number;
  add: number;
  limit?: number;
  unit: string;
  isGoal?: boolean;
}) {
  const after = before + add;
  const unitText = unit ? ` ${unit}` : "";
  const over = !isGoal && !!limit && after > limit;

  const scale = limit ? Math.max(limit, after) : 0;
  const beforePct = scale ? (before / scale) * 100 : 0;
  const overStart = limit ? Math.max(limit, before) : after;
  const overPct = over && scale ? ((after - overStart) / scale) * 100 : 0;
  const addPct = scale ? Math.max(0, (add / scale) * 100 - overPct) : 0;
  const limitPct = limit && scale ? (limit / scale) * 100 : 100;

  const summary = limit
    ? `${fmt(after)} of ${fmt(limit)}`
    : `${fmt(after)} today`;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: adds ${fmt(add)}${unitText}, ${summary}${unitText}${over ? ", over your limit" : ""}`}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Text style={{ fontSize: 14, color: over ? c.warmText : c.charcoal, fontWeight: over ? "600" : "400" }}>{label}</Text>
        <Text style={{ fontSize: 14, color: over ? c.warmText : c.slate, fontVariant: ["tabular-nums"] }}>
          <Text style={{ fontWeight: "600", color: over ? c.warmText : c.ink }}>+{fmt(add)}{unitText}</Text> · {summary}
        </Text>
      </View>
      {limit ? (
        <>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: c.hairlineSoft, flexDirection: "row", overflow: "hidden" }}>
            <View style={{ width: `${beforePct}%`, backgroundColor: c.steel }} />
            {addPct > 0 ? <View style={{ width: `${addPct}%`, backgroundColor: c.primary, borderLeftWidth: 2, borderLeftColor: c.canvas }} /> : null}
            {overPct > 0 ? <View style={{ width: `${overPct}%`, backgroundColor: c.warmText, borderLeftWidth: 2, borderLeftColor: c.canvas }} /> : null}
          </View>
          {over ? (
            <View style={{ height: 14 }}>
              <Text style={{ position: "absolute", left: `${limitPct}%`, transform: [{ translateX: -14 }], fontSize: 11, color: c.slate }}>
                Limit
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Legend({ c, color, label }: { c: DsColors; color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: c.slate }}>{label}</Text>
    </View>
  );
}

function Fact({ c, value, label }: { c: DsColors; value: string; label: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surface, gap: 2 }}>
      <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: c.slate }}>{label}</Text>
    </View>
  );
}
