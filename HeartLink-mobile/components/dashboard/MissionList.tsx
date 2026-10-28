import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";

export type MissionId = "vitals" | "meals" | "exercise" | "sleep";

export interface MissionItem {
  id: MissionId;
  title: string;
  /** One short value: "118/76", "280 mg sodium", "0/30 min", "Not yet". */
  subtitle: string;
  done: boolean;
}

const ICONS: Record<MissionId, keyof typeof Feather.glyphMap> = {
  vitals: "heart",
  meals: "coffee",
  exercise: "activity",
  sleep: "moon",
};

function MissionTile({
  item,
  isNext,
  onPress,
}: {
  item: MissionItem;
  /** The first mission not done yet gets the one blue button on the screen. */
  isNext: boolean;
  onPress: (id: MissionId) => void;
}) {
  const { c } = useDs();

  return (
    <AnimatedButton
      onPress={() => {
        Haptics.selectionAsync();
        onPress(item.id);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle}. ${item.done ? "Done. Tap to log more." : "Tap to log."}`}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: isNext ? c.line : c.hairline,
        borderRadius: 12,
        padding: 14,
        gap: 8,
        backgroundColor: isNext ? c.sky : c.canvas,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={item.done ? "check" : ICONS[item.id]} size={15} color={item.done ? c.success : c.slate} />
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, color: c.slate }}>{item.title}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
          {item.subtitle}
        </Text>
        {item.done ? null : (
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 6,
              backgroundColor: isNext ? c.primary : "transparent",
              borderWidth: isNext ? 0 : 1,
              borderColor: c.hairlineStrong,
            }}
          >
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "500", color: isNext ? c.onPrimary : c.ink }}>Log</Text>
          </View>
        )}
      </View>
    </AnimatedButton>
  );
}

/** Today's four missions: a header with how many are done and a 2×2 grid of tiles. */
export function MissionList({
  missions,
  onPress,
}: {
  missions: MissionItem[];
  onPress: (id: MissionId) => void;
}) {
  const { c } = useDs();
  const doneCount = missions.filter((m) => m.done).length;
  const allDone = missions.length > 0 && doneCount === missions.length;
  const nextId = missions.find((m) => !m.done)?.id;
  const rows = [missions.slice(0, 2), missions.slice(2, 4)].filter((r) => r.length > 0);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
          Today
        </Text>
        {allDone ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="check" size={14} color={c.success} />
            <Text style={{ fontSize: 14, color: c.charcoal }}>All done today</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 14, color: c.slate }}>
            {doneCount} of {missions.length} done
          </Text>
        )}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 12 }}>
          {row.map((item) => (
            <MissionTile key={item.id} item={item} isNext={item.id === nextId} onPress={onPress} />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
