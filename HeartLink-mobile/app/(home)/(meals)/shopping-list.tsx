import React, { useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useUser } from "../../../contexts/UserContext";
import { useMealPlan } from "../../../hooks/useMealPlan";
import { MAX_PEOPLE, amountText, shoppingText, thisWeek } from "../../../services/mealPlan";

// HL-155: the shopping list for the week's meal plan: every ingredient added up, for 1 to 6 people. Ticks are kept on
// this phone only.

const ticksKey = (userId: string | null, week: string, shuffle: number) => `shopping_ticks_${userId ?? "anon"}_${week}_${shuffle}`;

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { c } = useDs();
  const button = (icon: "minus" | "plus", to: number, disabled: boolean, label: string) => (
    <AnimatedButton
      onPress={() => onChange(to)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.hairlineStrong,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Feather name={icon} size={18} color={c.ink} />
    </AnimatedButton>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {button("minus", value - 1, value <= 1, "Fewer people")}
      <Text accessibilityLiveRegion="polite" style={{ minWidth: 92, textAlign: "center", fontSize: 16, fontWeight: "600", color: c.ink }}>
        {value === 1 ? "1 person" : `${value} people`}
      </Text>
      {button("plus", value + 1, value >= MAX_PEOPLE, "More people")}
    </View>
  );
}

export default function ShoppingListScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { userId } = useUser();
  const params = useLocalSearchParams<{ shuffle?: string }>();
  const shuffle = Number.parseInt(params.shuffle ?? "0", 10) || 0;
  const week = thisWeek();
  const plan = useMealPlan(week, shuffle);
  const [people, setPeople] = useState(1);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(ticksKey(userId, week, shuffle))
      .then((v) => setTicked(new Set(v ? (JSON.parse(v) as string[]) : [])))
      .catch(() => {});
  }, [userId, week, shuffle]);

  const toggle = (key: string) => {
    Haptics.selectionAsync().catch(() => {});
    setTicked((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      AsyncStorage.setItem(ticksKey(userId, week, shuffle), JSON.stringify([...nextSet])).catch(() => {});
      return nextSet;
    });
  };

  const p = plan.data;
  const footer =
    p && p.shopping_list.length ? (
      <DsButton label="Share list" onPress={() => Share.share({ message: shoppingText(p, people) }).catch(() => {})} block />
    ) : null;

  return (
    <DsScreen header={<PageHeader title="Shopping list" onBack={() => router.back()} />} footer={footer}>
      {plan.isPending ? (
        <View style={{ gap: 12 }}>
          <Skeleton style={{ height: 44, borderRadius: 10 }} />
          <Skeleton style={{ height: 300, borderRadius: 12 }} />
        </View>
      ) : plan.isError || !p ? (
        <View style={{ gap: 12 }}>
          <InfoNote icon="wifi-off" title="Your shopping list couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => plan.refetch()} block />
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
            Everything for this week&apos;s planned meals, one serving each. Change how many people you&apos;re cooking for.
          </Text>
          <Stepper value={people} onChange={setPeople} />

          {p.shopping_list.length ? (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
              {p.shopping_list.map((item, i) => {
                const key = `${item.name}|${item.unit}`;
                const on = ticked.has(key);
                return (
                  <AnimatedButton
                    key={key}
                    onPress={() => toggle(key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${item.name}, ${amountText(item.amount, people)} ${item.unit}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: i === p.shopping_list.length - 1 ? 0 : 1,
                      borderBottomColor: c.hairlineSoft,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 1.5,
                        borderColor: on ? c.line : c.hairlineStrong,
                        backgroundColor: on ? c.line : c.canvas,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {on ? <Feather name="check" size={14} color={c.onPrimary} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, color: on ? c.steel : c.ink, textDecorationLine: on ? "line-through" : "none" }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: c.steel, marginTop: 1 }} numberOfLines={1}>
                        {item.recipes.join(", ")}
                      </Text>
                    </View>
                    {item.amount > 0 ? (
                      <Text style={{ fontSize: 15, fontWeight: "600", color: on ? c.steel : c.ink }}>
                        {`${amountText(item.amount, people)}${item.unit ? ` ${item.unit}` : ""}`}
                      </Text>
                    ) : null}
                  </AnimatedButton>
                );
              })}
            </View>
          ) : (
            <InfoNote icon="shopping-bag" text="Nothing to buy yet: this week's plan has no recipes. More are being added." />
          )}
        </View>
      )}
    </DsScreen>
  );
}
