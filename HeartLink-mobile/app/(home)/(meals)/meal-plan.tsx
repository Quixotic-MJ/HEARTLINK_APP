import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../contexts/ToastContext";
import { PremiumRequiredError } from "../../../hooks/useHealthReport";
import { useMealPlan, usePlanNumber, useUndoPlanChanges } from "../../../hooks/useMealPlan";
import { PlannedMeal, dayLong, dayShort, daySodiumLine, mg } from "../../../services/mealPlan";

// HL-155: the week's meals (Premium): breakfast, lunch and dinner for 7 days from Dietitian-approved recipes that fit the
// patient's sodium limit and allergies. Tapping a meal opens the recipe, where it can be logged. It's a plan to help, not
// a diet prescription.
// HL-159: each meal can be changed (another approved recipe, or "My own meal", the patient's estimate); changes stay put
// when the plan is reshuffled, and "Undo my changes" clears the week's.

function MealRow({
  item,
  onOpen,
  onChange,
  last,
}: {
  item: PlannedMeal;
  onOpen: (id: string) => void;
  onChange: () => void;
  last: boolean;
}) {
  const { c } = useDs();
  const r = item.recipe;
  const own = item.own;
  const title = own ? own.name : r ? r.name : "Your choice";
  const line = own
    ? `${mg(own.sodium_mg)} sodium`
    : r
      ? `${mg(r.sodium_mg)} sodium for 1 serving`
      : `Keep it under ${mg(item.choice_limit_mg ?? 0)} sodium`;
  // Your estimate is never shown as approved; a swap is "Your pick"; a bookmarked recipe "Saved"
  const tag = own ? { label: "Your estimate", tone: "warm" as const } : item.kind === "swap" ? { label: "Your pick", tone: "tint" as const } : item.saved ? { label: "Saved", tone: "neutral" as const } : null;

  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
      {r?.image_url ? (
        <Image source={{ uri: r.image_url }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: c.surface }} contentFit="cover" />
      ) : (
        <IconBadge icon={own ? "pencil-outline" : r ? "silverware-fork-knife" : "food-apple-outline"} tint={own ? "yellow" : r ? "peach" : "mint"} size={52} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: c.steel }}>{item.meal}</Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 1 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>{line}</Text>
        {tag ? (
          <View style={{ marginTop: 6 }}>
            <Tag label={tag.label} tone={tag.tone} />
          </View>
        ) : null}
      </View>
    </View>
  );
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14 }}>
        {r ? (
          <AnimatedButton
            onPress={() => onOpen(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.meal}: ${r.name}. Open the recipe`}
            style={{ flex: 1 }}
          >
            {body}
          </AnimatedButton>
        ) : (
          <View style={{ flex: 1 }} accessible accessibilityLabel={`${item.meal}: ${title}. ${line}`}>
            {body}
          </View>
        )}
        <AnimatedButton
          onPress={onChange}
          accessibilityRole="button"
          accessibilityLabel={`Change ${item.meal.toLowerCase()}`}
          style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}
        >
          <Feather name="repeat" size={18} color={c.ink} />
        </AnimatedButton>
      </View>
      {item.swap_gone ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, paddingHorizontal: 14, paddingBottom: 12, marginTop: -4 }}>
          {"Your pick isn't available any more, so this is the plan's pick again."}
        </Text>
      ) : null}
    </View>
  );
}

function PremiumPrompt() {
  const { c } = useDs();
  const router = useRouter();
  return (
    <View style={{ marginTop: 22, padding: 18, borderRadius: 12, backgroundColor: c.surface, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconBadge icon="calendar-check-outline" tint="yellow" size={40} />
        <View style={{ flex: 1 }}>
          <Tag label="Premium" tone="warm" />
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 6 }}>A week of meals, planned for you</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
        Breakfast, lunch and dinner for 7 days from Dietitian-approved recipes that fit your sodium limit and allergies,
        with a shopping list.
      </Text>
      <DsButton label="See HeartLink Premium" onPress={() => router.push("/(home)/(settings)/premium")} />
    </View>
  );
}

export default function MealPlanScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const { week, shuffle, next } = usePlanNumber();
  const plan = useMealPlan(week, shuffle);
  const undo = useUndoPlanChanges();
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [dayIndex, setDayIndex] = useState(() => (new Date().getDay() + 6) % 7);
  const premiumRequired = plan.error instanceof PremiumRequiredError;
  const p = plan.data;
  const day = p?.days[dayIndex];

  const footer = p ? (
    <>
      <DsButton
        label="Shopping list"
        onPress={() => router.push({ pathname: "/(home)/(meals)/shopping-list", params: { shuffle: String(p.shuffle) } })}
        block
      />
      <DsButton
        label="Make a new plan"
        variant="quiet"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          next();
        }}
        block
      />
      {p.changes ? <DsButton label="Undo my changes" variant="quiet" onPress={() => setConfirmUndo(true)} block /> : null}
    </>
  ) : null;

  return (
    <DsScreen header={<PageHeader title="Your week's meals" onBack={() => router.back()} />} footer={footer}>
      {premiumRequired ? (
        <PremiumPrompt />
      ) : plan.isPending || shuffle === null ? (
        <View style={{ gap: 12 }}>
          <Skeleton style={{ height: 44, borderRadius: 10 }} />
          <Skeleton style={{ height: 260, borderRadius: 12 }} />
        </View>
      ) : plan.isError || !p || !day ? (
        <View style={{ gap: 12 }}>
          <InfoNote icon="wifi-off" title="Your meal plan couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => plan.refetch()} block />
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          {/* Day picker */}
          <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 10, backgroundColor: c.surface }}>
            {p.days.map((d, i) => {
              const on = i === dayIndex;
              return (
                <AnimatedButton
                  key={d.date}
                  onPress={() => setDayIndex(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={dayLong(d.date)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: on ? 1 : 0,
                    borderColor: c.hairline,
                    backgroundColor: on ? c.canvas : "transparent",
                  }}
                >
                  <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: on ? c.ink : c.slate }}>
                    {dayShort(d.date)}
                  </Text>
                </AnimatedButton>
              );
            })}
          </View>

          <View>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
              {dayLong(day.date)}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 4 }}>{daySodiumLine(day, p.sodium_limit_mg)}</Text>
          </View>

          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
            {day.meals.map((m, i) => (
              <MealRow
                key={m.meal}
                item={m}
                last={i === day.meals.length - 1}
                onOpen={(id) => router.push(`/(home)/(meals)/recipe-details?id=${id}` as never)}
                onChange={() =>
                  router.push({ pathname: "/(home)/(meals)/meal-plan-change", params: { date: day.date, meal: m.meal, shuffle: String(p.shuffle) } })
                }
              />
            ))}
          </View>

          <InfoNote icon="info" text={p.note} />
        </View>
      )}

      <ConfirmDialog
        visible={confirmUndo}
        variant="warning"
        icon="rotate-ccw"
        title="Undo your changes?"
        message={`The ${p?.changes === 1 ? "meal you changed goes" : `${p?.changes ?? 0} meals you changed go`} back to the plan's picks for this week.`}
        cancelLabel="Keep them"
        confirmLabel="Undo"
        onCancel={() => setConfirmUndo(false)}
        onConfirm={() => {
          setConfirmUndo(false);
          undo.mutate(week, {
            onError: (e) => showToast({ title: "Couldn't undo", message: e.message, type: "error" }),
          });
        }}
      />
    </DsScreen>
  );
}
