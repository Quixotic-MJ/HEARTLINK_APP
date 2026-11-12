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
import { PremiumRequiredError } from "../../../hooks/useHealthReport";
import { useMealPlan, usePlanNumber } from "../../../hooks/useMealPlan";
import { PlannedMeal, dayLong, dayShort, daySodiumLine, mg } from "../../../services/mealPlan";

// HL-155: the week's meals (Premium): breakfast, lunch and dinner for 7 days from Dietitian-approved recipes that fit the
// patient's sodium limit and allergies. Tapping a meal opens the recipe, where it can be logged. It's a plan to help, not
// a diet prescription.

function MealRow({ item, onOpen, last }: { item: PlannedMeal; onOpen: (id: string) => void; last: boolean }) {
  const { c } = useDs();
  const r = item.recipe;
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
      {r?.image_url ? (
        <Image source={{ uri: r.image_url }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: c.surface }} contentFit="cover" />
      ) : (
        <IconBadge icon={r ? "silverware-fork-knife" : "food-apple-outline"} tint={r ? "peach" : "mint"} size={52} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: c.steel }}>{item.meal}</Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 1 }}>{r ? r.name : "Your choice"}</Text>
        <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>
          {r ? `${mg(r.sodium_mg)} sodium for 1 serving` : `Keep it under ${mg(item.choice_limit_mg ?? 0)} sodium`}
        </Text>
      </View>
      {r ? <Feather name="chevron-right" size={18} color={c.steel} /> : null}
    </View>
  );
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}>
      {r ? (
        <AnimatedButton onPress={() => onOpen(r.id)} accessibilityRole="button" accessibilityLabel={`${item.meal}: ${r.name}. Open the recipe`}>
          {body}
        </AnimatedButton>
      ) : (
        body
      )}
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
  const { week, shuffle, next } = usePlanNumber();
  const plan = useMealPlan(week, shuffle);
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
              />
            ))}
          </View>

          <InfoNote icon="info" text={p.note} />
        </View>
      )}
    </DsScreen>
  );
}
