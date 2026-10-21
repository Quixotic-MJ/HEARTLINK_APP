import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";

export type MissionId = "vitals" | "meals" | "exercise" | "sleep";

export interface MissionItem {
  id: MissionId;
  title: string;
  subtitle: string;
  done: boolean;
  /** 0–100, for a mission with a goal (movement minutes). */
  progress?: number;
}

const ICONS: Record<MissionId, keyof typeof Feather.glyphMap> = {
  vitals: "heart",
  meals: "coffee",
  exercise: "activity",
  sleep: "moon",
};

// Pastel badges by topic, as in HEARTLINK.md: readings sky, food peach, movement mint, habits lavender.
function tintFor(id: MissionId, c: DsColors) {
  return id === "vitals" ? c.sky : id === "meals" ? c.peach : id === "exercise" ? c.mint : c.lavender;
}

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
      style={{ flex: 1, borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 14, gap: 10, backgroundColor: c.canvas }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: tintFor(item.id, c), alignItems: "center", justifyContent: "center" }}>
          <Feather name={ICONS[item.id]} size={18} color={c.charcoal} />
        </View>
        {item.done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="check" size={14} color={c.success} />
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.charcoal }}>Done</Text>
          </View>
        ) : (
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
            <Text style={{ fontSize: 13, fontWeight: "500", color: isNext ? c.onPrimary : c.ink }}>Log</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{item.title}</Text>
      <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>{item.subtitle}</Text>
      {item.progress !== undefined ? (
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.hairlineSoft, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.min(Math.max(item.progress, 0), 100)}%`, backgroundColor: c.success }} />
        </View>
      ) : null}
    </AnimatedButton>
  );
}

/** Today's four missions: a header with how many are done, a four-part bar, and a 2×2 grid of tiles. */
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
          {"Today's missions"}
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
      <View
        style={{ flexDirection: "row", gap: 4 }}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${doneCount} of ${missions.length} missions done`}
      >
        {missions.map((m, i) => (
          <View key={m.id} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < doneCount ? c.line : c.hairlineSoft }} />
        ))}
      </View>
      {allDone ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>Nice work. You can still tap a mission to log more.</Text>
      ) : null}
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
