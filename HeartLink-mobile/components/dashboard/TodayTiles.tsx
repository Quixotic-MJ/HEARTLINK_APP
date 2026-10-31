import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { light, dark, type DsColors } from "../../constants/theme";
import type { MissionId } from "./MissionList";
import { playSound } from "../../services/sounds";

/** What the backend says about today's medicine; older servers send only medication_taken. */
export type MedicineStatus = "taken" | "not_yet" | "none";

export type CheckinTile = {
  id: MissionId;
  title: string;
  /** The main value, e.g. "118/76", "1,240 mg" or "Not yet" */
  value: string;
  /** One short line under it, e.g. "Medicine taken" */
  sub: string;
  done: boolean;
  /** 0 to 1 for a progress bar (meals against the sodium limit, movement against the goal); none for the others */
  progress?: number;
};

const ICON: Record<MissionId, keyof typeof Feather.glyphMap> = {
  vitals: "heart",
  meals: "coffee",
  exercise: "activity",
  sleep: "moon",
};

// Each check-in keeps its topic tint from the design system: warnings/vitals rose, food peach,
// movement mint, sleep lavender.
function tint(id: MissionId, c: DsColors): string {
  return id === "vitals" ? c.rose : id === "meals" ? c.peach : id === "exercise" ? c.mint : c.lavender;
}

/** Today's four check-ins as a 2 by 2 grid: each tile shows where it stands and opens its own log. */
export function CheckinGrid({ tiles, onPress }: { tiles: CheckinTile[]; onPress: (id: MissionId) => void }) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const done = tiles.filter((x) => x.done).length;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: c.ink }}>
          Today&apos;s check-ins
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: done === tiles.length ? t.successText : c.slate }}>
          {done === tiles.length ? "All done" : `${done} of ${tiles.length} done`}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {tiles.map((tile) => (
          <AnimatedButton
            key={tile.id}
            onPress={() => {
              playSound("press");
              onPress(tile.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tile.title}: ${tile.value}, ${tile.sub}. ${tile.done ? "Logged today." : "Tap to log."}`}
            style={{
              flexBasis: "47%",
              flexGrow: 1,
              borderWidth: 1,
              borderColor: c.hairline,
              borderRadius: 14,
              backgroundColor: c.canvas,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tint(tile.id, c), alignItems: "center", justifyContent: "center" }}>
                <Feather name={ICON[tile.id]} size={17} color={c.charcoal} />
              </View>
              {tile.done ? (
                <Feather name="check-circle" size={20} color={t.successText} accessibilityElementsHidden />
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="plus" size={16} color={c.onTint} />
                </View>
              )}
            </View>
            <View style={{ gap: 2 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, color: c.slate }}>{tile.title}</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{ fontSize: 22, fontWeight: "700", color: tile.done ? c.ink : c.steel, fontVariant: ["tabular-nums"] }}
              >
                {tile.value}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>{tile.sub}</Text>
            </View>
            {tile.progress !== undefined ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, tile.progress)) * 100)}%`,
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: tile.id === "meals" && tile.progress > 1 ? t.dangerText : c.primary,
                  }}
                />
              </View>
            ) : null}
          </AnimatedButton>
        ))}
      </View>
    </View>
  );
}
