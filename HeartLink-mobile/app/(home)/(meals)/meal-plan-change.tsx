import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../contexts/ToastContext";
import { useChangePlanMeal, usePlanOptions } from "../../../hooks/useMealPlan";
import { MealName, PlannedRecipe, mealTitle, mg } from "../../../services/mealPlan";

// HL-159: change one meal of the week's plan (Premium). Another Dietitian-approved recipe that suits the patient and
// keeps the day within its sodium, lowest first; or "My own meal", their own estimate (Estimate a meal in plan mode,
// shown as an estimate, never as approved); or the plan's own pick back.

const MEALS: MealName[] = ["Breakfast", "Lunch", "Dinner"];

function OptionRow({ recipe, onPick, busy }: { recipe: PlannedRecipe & { saved: boolean }; onPick: () => void; busy: boolean }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPick}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}, ${mg(recipe.sodium_mg)} sodium${recipe.saved ? ", saved" : ""}. Use this`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.hairline,
        backgroundColor: c.canvas,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{recipe.name}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{`${mg(recipe.sodium_mg)} sodium for 1 serving`}</Text>
        {recipe.saved ? (
          <View style={{ marginTop: 4 }}>
            <Tag label="Saved" tone="neutral" />
          </View>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={c.steel} />
    </AnimatedButton>
  );
}

export default function MealPlanChangeScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ date?: string; meal?: string; shuffle?: string }>();
  const date = params.date ?? "";
  const meal: MealName = MEALS.includes(params.meal as MealName) ? (params.meal as MealName) : "Lunch";
  const shuffle = Number.parseInt(params.shuffle ?? "0", 10) || 0;
  const title = mealTitle(date, meal);

  const options = usePlanOptions(date, meal, shuffle);
  const change = useChangePlanMeal();
  const current = options.data?.current;
  const changed = current?.kind === "swap" || current?.kind === "own";

  const done = (message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({ title: "Plan updated", message, type: "success" });
    router.back();
  };
  const failed = (e: Error) => showToast({ title: "Couldn't change the meal", message: e.message, type: "error" });

  return (
    <DsScreen header={<PageHeader title={`Change ${title}`} onBack={() => router.back()} />}>
      {options.isPending ? (
        <View style={{ gap: 10 }}>
          <Skeleton style={{ height: 20, width: 200, borderRadius: 6 }} />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} style={{ height: 64, borderRadius: 12 }} />
          ))}
        </View>
      ) : options.isError || !options.data ? (
        <View style={{ gap: 12 }}>
          <InfoNote icon="wifi-off" title="The choices couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => options.refetch()} block />
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          {/* Another approved recipe */}
          <View style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
                {"Fits this day's sodium"}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                {`Dietitian-approved and suited to you. Up to ${mg(options.data.room_mg)} sodium for this meal.`}
              </Text>
            </View>
            {options.data.options.length ? (
              options.data.options.map((r) => (
                <OptionRow
                  key={r.id}
                  recipe={r}
                  busy={change.isPending}
                  onPick={() => change.mutate({ date, meal, recipe_id: r.id }, { onSuccess: () => done(`${r.name} for ${title}.`), onError: failed })}
                />
              ))
            ) : (
              <InfoNote icon="info" text="Nothing else fits this day's sodium. Try My own meal." />
            )}
          </View>

          {/* The patient's own estimate */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconBadge icon="pencil-outline" tint="yellow" size={40} />
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>My own meal</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                  Eating out or cooking your own? Estimate it, and it counts in the day as your estimate.
                </Text>
              </View>
            </View>
            <DsButton
              label="Estimate my own meal"
              variant="secondary"
              block
              onPress={() =>
                router.push({ pathname: "/(home)/(meals)/estimate-meal", params: { plan_date: date, plan_meal: meal } })
              }
            />
          </View>

          {changed ? (
            <DsButton
              label="Put back the plan's pick"
              variant="quiet"
              block
              loading={change.isPending}
              onPress={() => change.mutate({ date, meal, putBack: true }, { onSuccess: () => done(`${title} is the plan's pick again.`), onError: failed })}
            />
          ) : null}
        </View>
      )}
    </DsScreen>
  );
}
