import React from "react";
import { View, Text } from "react-native";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";

// HL-027: everything eaten and done today in one labelled card. HL-028: cholesterol counts against the
// patient's daily limit. HL-029: calories show as net (eaten - burned by exercise), with the sum underneath.
// Shorter dashboard: each limit is one line (amount / limit, or how far over) with a bar; net calories in one line.
// Movement is a mission tile, so it isn't repeated here.
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
        Daily limits
      </Text>
      <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, backgroundColor: c.canvas }}>
        {!mealsLogged && !exerciseLogged ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
              Nothing eaten logged yet. Sodium limit: {sodiumLimit.toLocaleString()} mg.
            </Text>
            <DsButton label="Log a meal" variant="secondary" block={false} onPress={onLogMeal} style={{ alignSelf: "flex-start", height: 44 }} />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <LimitRow c={c} label="Sodium" current={totalSod} limit={sodiumLimit} unit="mg" overTip="Low-sodium meals for the rest of today help." />
            <LimitRow c={c} label="Saturated fat" current={Math.round(satFat * 10) / 10} limit={satFatLimit} unit="g" />
            <LimitRow c={c} label="Cholesterol" current={cholesterol} limit={cholesterolLimit} unit="mg" />

            <View
              style={{ flexDirection: "row", alignItems: "baseline", paddingTop: 14, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}
              accessible
              accessibilityLabel={`Net calories: ${Math.round(calories - caloriesBurned)}. ${Math.round(calories)} eaten, ${Math.round(caloriesBurned)} burned${
                exercisesNotCounted > 0 ? `. ${exercisesNotCounted} exercise${exercisesNotCounted === 1 ? "" : "s"} without an estimate not counted` : ""
              }`}
            >
              <Text style={{ flex: 1, fontSize: 15, color: c.ink }}>Net calories</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                {Math.round(calories - caloriesBurned).toLocaleString()} kcal
              </Text>
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
  const shown = over ? status : `${(unit === "g" ? current : Math.round(current)).toLocaleString()} / ${limit.toLocaleString()} ${unit}`;

  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${label}: ${status}. ${sum}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontSize: 15, fontWeight: over ? "600" : "500", color: over ? c.warmText : c.ink }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: over ? c.warmText : c.ink, fontVariant: ["tabular-nums"] }}>{shown}</Text>
      </View>
      <Bar c={c} percent={limit ? (current / limit) * 100 : 0} color={over ? c.warmText : c.line} height={6} />
      {over && overTip ? <Text style={{ fontSize: 13, color: c.warmText }}>{overTip}</Text> : null}
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
