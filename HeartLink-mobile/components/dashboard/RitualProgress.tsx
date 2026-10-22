import React from "react";
import { View, Text } from "react-native";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";

// HL-027: everything eaten and done today in one labelled card. HL-028: cholesterol counts against the
// patient's daily limit. HL-029: calories show as net (eaten - burned by exercise), with the sum underneath.
// The three daily limits come first and say how much is left; net calories and movement sit below.
export function RitualProgress({
  calories,
  caloriesBurned = 0,
  exercisesNotCounted = 0,
  cholesterol = 0,
  cholesterolLimit = 200,
  totalSod,
  sodiumLimit,
  satFat,
  satFatLimit = 13,
  movementMins,
  movementGoal,
  mealsLogged,
  exerciseLogged,
  onLogMeal,
}: {
  calories: number;
  caloriesBurned?: number;
  exercisesNotCounted?: number;
  cholesterol?: number;
  cholesterolLimit?: number;
  totalSod: number;
  sodiumLimit: number;
  satFat: number;
  /** HL-016: 6% of the patient's calorie target, from the backend (13 g on 2,000 kcal). */
  satFatLimit?: number;
  movementMins: number;
  movementGoal: number;
  mealsLogged: boolean;
  exerciseLogged: boolean;
  onLogMeal: () => void;
}) {
  const { c } = useDs();

  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
        Today so far
      </Text>
      <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, backgroundColor: c.canvas }}>
        {!mealsLogged && !exerciseLogged ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
              Nothing logged yet today. Your limits are {sodiumLimit.toLocaleString()} mg sodium, {satFatLimit} g saturated fat
              and {cholesterolLimit.toLocaleString()} mg cholesterol, and your movement goal is {movementGoal} minutes.
            </Text>
            <DsButton label="Log a meal" variant="secondary" block={false} onPress={onLogMeal} style={{ alignSelf: "flex-start", height: 44 }} />
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <Text style={{ fontSize: 13, color: c.slate }}>Your daily limits</Text>
            <LimitRow c={c} label="Sodium" current={totalSod} limit={sodiumLimit} unit="mg" overTip="Low-sodium meals for the rest of today help." />
            <LimitRow c={c} label="Saturated fat" current={Math.round(satFat * 10) / 10} limit={satFatLimit} unit="g" />
            <LimitRow c={c} label="Cholesterol" current={cholesterol} limit={cholesterolLimit} unit="mg" />

            <View style={{ height: 1, backgroundColor: c.hairlineSoft }} />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{ flex: 1, gap: 4 }}
                accessible
                accessibilityLabel={`Net calories: ${Math.round(calories - caloriesBurned)}. ${Math.round(calories)} eaten, ${Math.round(caloriesBurned)} burned`}
              >
                <Text style={{ fontSize: 13, color: c.slate }}>Net calories</Text>
                <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                  {Math.round(calories - caloriesBurned).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: c.steel }}>
                  {Math.round(calories).toLocaleString()} eaten − {Math.round(caloriesBurned).toLocaleString()} burned
                  {exercisesNotCounted > 0
                    ? `. ${exercisesNotCounted} exercise${exercisesNotCounted === 1 ? "" : "s"} without an estimate not counted`
                    : ""}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }} accessible accessibilityLabel={`Movement: ${movementMins} of ${movementGoal} minutes`}>
                <Text style={{ fontSize: 13, color: c.slate }}>Movement</Text>
                <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                  {movementMins} <Text style={{ fontSize: 14, fontWeight: "400", color: c.slate }}>of {movementGoal} min</Text>
                </Text>
                <Bar c={c} percent={movementGoal ? (movementMins / movementGoal) * 100 : 0} color={c.success} height={6} />
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/** A daily limit: how much is left (or how far over), a bar, and the plain sum underneath. */
function LimitRow({
  c,
  label,
  current,
  limit,
  unit,
  overTip,
}: {
  c: DsColors;
  label: string;
  current: number;
  limit: number;
  unit: string;
  overTip?: string;
}) {
  const over = current > limit;
  const left = Math.abs(limit - current);
  const amount = `${(unit === "g" ? Math.round(left * 10) / 10 : Math.round(left)).toLocaleString()} ${unit}`;
  const status = over ? `${amount} over` : `${amount} left`;
  const sum = `${(unit === "g" ? current : Math.round(current)).toLocaleString()} of ${limit.toLocaleString()} ${unit}`;

  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${label}: ${status}. ${sum}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontSize: 15, fontWeight: over ? "600" : "500", color: over ? c.warmText : c.ink }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: over ? c.warmText : c.ink, fontVariant: ["tabular-nums"] }}>{status}</Text>
      </View>
      <Bar c={c} percent={limit ? (current / limit) * 100 : 0} color={over ? c.warmText : c.line} height={8} />
      <Text style={{ fontSize: 13, color: c.slate, fontVariant: ["tabular-nums"] }}>
        {sum}
        {over && overTip ? `. ${overTip}` : ""}
      </Text>
    </View>
  );
}

function Bar({ c, percent, color, height }: { c: DsColors; percent: number; color: string; height: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.hairlineSoft, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}
