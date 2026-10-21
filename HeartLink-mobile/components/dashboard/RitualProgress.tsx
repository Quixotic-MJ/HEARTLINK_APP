import React from "react";
import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";

// HL-027: everything eaten and done today in one labelled card. A tile with nothing
// logged says so instead of showing a bare 0. HL-028: cholesterol counts against the patient's daily limit.
// HL-029: calories show as net (eaten - burned by exercise), with the sum written underneath.
export function RitualProgress({
  calories,
  caloriesBurned = 0,
  exercisesNotCounted = 0,
  cholesterol = 0,
  cholesterolLimit = 200,
  totalSod,
  sodiumLimit,
  satFat,
  movementMins,
  movementGoal,
  mealsLogged,
  exerciseLogged,
}: {
  calories: number;
  caloriesBurned?: number;
  exercisesNotCounted?: number;
  cholesterol?: number;
  cholesterolLimit?: number;
  totalSod: number;
  sodiumLimit: number;
  satFat: number;
  movementMins: number;
  movementGoal: number;
  mealsLogged: boolean;
  exerciseLogged: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="mb-0">
      <Text className="text-[16px] font-semibold text-text mb-2.5 mx-1" accessibilityRole="header">
        Today so far
      </Text>
      <View
        className="bg-surface rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none gap-5"
      >
        <View className="flex-row justify-between gap-4">
          <MiniTracker
            label="Net calories"
            current={Math.round(calories - caloriesBurned)}
            unit="kcal"
            isDark={isDark}
            iconName="zap"
            isMaxLimit={false}
            emptyText={mealsLogged || caloriesBurned > 0 ? undefined : "No meals yet"}
            note={
              mealsLogged || caloriesBurned > 0
                ? `${Math.round(calories).toLocaleString()} eaten − ${Math.round(caloriesBurned).toLocaleString()} burned` +
                  (exercisesNotCounted > 0 ? `. ${exercisesNotCounted} exercise${exercisesNotCounted === 1 ? "" : "s"} without an estimate not counted` : "")
                : undefined
            }
          />
          <MiniTracker
            label="Sodium"
            current={Math.round(totalSod)}
            target={sodiumLimit}
            unit="mg"
            isDark={isDark}
            iconName="box"
            isMaxLimit={true}
            emptyText={mealsLogged ? undefined : "No meals yet"}
          />
        </View>
        <View className="flex-row justify-between gap-4">
          <MiniTracker
            label="Sat fat"
            current={Math.round(satFat * 10) / 10}
            target={20}
            unit="g"
            isDark={isDark}
            iconName="droplet"
            isMaxLimit={true}
            emptyText={mealsLogged ? undefined : "No meals yet"}
          />
          <MiniTracker
            label="Movement"
            current={movementMins}
            target={movementGoal}
            unit="min"
            isDark={isDark}
            iconName="activity"
            isMaxLimit={false}
            emptyText={exerciseLogged ? undefined : "No exercise yet"}
          />
        </View>
        <View className="flex-row justify-between gap-4">
          <MiniTracker
            label="Cholesterol"
            current={Math.round(cholesterol)}
            target={cholesterolLimit}
            unit="mg"
            isDark={isDark}
            iconName="heart"
            isMaxLimit={true}
            emptyText={mealsLogged ? undefined : "No meals yet"}
            note={mealsLogged && cholesterol > cholesterolLimit ? `Over your ${cholesterolLimit} mg daily limit` : undefined}
            warn={mealsLogged && cholesterol > cholesterolLimit}
          />
          <View className="flex-1" />
        </View>
      </View>
    </View>
  );
}

function MiniTracker({
  label,
  current,
  target,
  unit,
  isDark,
  iconName,
  isMaxLimit,
  emptyText,
  note,
  warn = false,
}: {
  label: string;
  current: number;
  /** Daily goal or limit; leave out for values without one (calories). */
  target?: number;
  unit: string;
  isDark: boolean;
  iconName: keyof typeof Feather.glyphMap;
  isMaxLimit: boolean;
  /** Shown instead of the number when nothing has been logged yet. */
  emptyText?: string;
  /** A small line under the value, e.g. how net calories were worked out. */
  note?: string;
  /** Shows the note as a warning (over a daily limit). */
  warn?: boolean;
}) {
  const percent = target ? Math.min(Math.max((current / target) * 100, 0), 100) : 0;

  let barColor = "#10B981"; // Emerald 500 (Green)

  if (isMaxLimit) {
    if (percent >= 85) {
      barColor = "#D97706"; // Amber 600 (Orange)
    } else {
      barColor = "#10B981"; // Green
    }
  } else {
    barColor = "#10B981"; // Green
  }

  const labelColor = isDark ? "#94a3b8" : "#64748b";
  const valueColor = isDark ? "#f8fafc" : "#0f172a";

  return (
    <View
      className="flex-1"
      accessible
      accessibilityLabel={emptyText ? `${label}: ${emptyText}` : `${label}: ${current}${target ? ` of ${target}` : ""} ${unit}${note ? `. ${note}` : ""}`}
    >
      <View className="flex-row items-center gap-1.5 mb-2">
        <Feather name={iconName} size={12} color={labelColor} />
        <Text className="text-[12px] font-medium text-text-soft">
          {label}
        </Text>
      </View>
      {target ? (
        <View style={{ height: 6, width: '100%', borderRadius: 9999, overflow: 'hidden', backgroundColor: isDark ? '#334155' : '#e2e8f0', marginBottom: 8 }}>
          <View style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, borderRadius: 9999 }} />
        </View>
      ) : null}
      {emptyText ? (
        <Text className="text-[13px] font-medium" style={{ color: labelColor }}>
          {emptyText}
        </Text>
      ) : (
        <Text className="text-[13px] font-bold" style={{ color: valueColor }}>
          {current.toLocaleString()}
          <Text style={{ fontSize: 11, fontWeight: "500", color: labelColor }}>
            {target ? `/${target.toLocaleString()}` : " "}{unit}
          </Text>
        </Text>
      )}
      {note && !emptyText ? (
        <Text className="text-[11px] mt-1" style={{ color: warn ? (isDark ? "#FBBF24" : "#B45309") : labelColor, fontWeight: warn ? "600" : "400" }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
