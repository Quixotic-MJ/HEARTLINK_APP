import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { light, dark } from "../../constants/theme";
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
  streak?: number;
};

// Bullet dot accent colors keeping HeartLink's design system topic hues:
// Vitals (rose/red), Meals (amber/orange), Exercise (mint/green), Sleep (lavender/purple)
function dotColor(id: MissionId, isDark: boolean): string {
  switch (id) {
    case "vitals":
      return isDark ? "#FF6B6B" : "#E11D48";
    case "meals":
      return isDark ? "#F59E0B" : "#D97706";
    case "exercise":
      return isDark ? "#10B981" : "#059669";
    case "sleep":
      return isDark ? "#A78BFA" : "#7C3AED";
    default:
      return isDark ? "#94A3B8" : "#64748B";
  }
}

/**
 * Today's check-in habits rendered as a vertical list of rounded habit cards,
 * matching the habit checklist layout with squircle checkmark / plus icon and bullet topic dot.
 */
export function CheckinGrid({
  tiles,
  onPress,
}: {
  tiles: CheckinTile[];
  onPress: (id: MissionId) => void;
}) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const done = tiles.filter((x) => x.done).length;

  return (
    <View style={{ gap: 12 }}>
      {/* ── Section Header: Today's mission ── */}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "700", color: c.ink, letterSpacing: -0.3 }}>
          Today&apos;s mission
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: done === tiles.length ? t.successText : c.slate }}>
          {done === tiles.length ? "All done" : `${done} of ${tiles.length} done`}
        </Text>
      </View>

      {/* ── Habit cards list ── */}
      <View style={{ gap: 10 }}>
        {tiles.map((tile) => {
          const subtitle = tile.done
            ? `${tile.value} · ${tile.sub}`
            : tile.id === "vitals"
            ? "Not logged today"
            : tile.sub;

          return (
            <AnimatedButton
              key={tile.id}
              onPress={() => {
                playSound("press");
                onPress(tile.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${tile.title}: ${tile.done ? "Completed." : "Not completed."} ${tile.value !== "Not yet" ? tile.value : ""}. Tap to log.`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? c.surface : "#FFFFFF",
                borderWidth: 1,
                borderColor: c.hairline,
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 16,
                gap: 14,
              }}
            >
              {/* Left Squircle: Checkmark if done, Plus icon if not done */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: tile.done
                    ? c.primary
                    : (isDark ? c.surfaceAlt : c.tint),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tile.done ? (
                  <Feather name="check" size={22} color={c.onPrimary} />
                ) : (
                  <Feather name="plus" size={20} color={c.primary} />
                )}
              </View>

              {/* Habit Details */}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: dotColor(tile.id, isDark),
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: c.ink,
                      letterSpacing: -0.2,
                    }}
                  >
                    {tile.title}
                  </Text>
                </View>

                {/* Subtitle */}
                <Text numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>
                  {subtitle}
                </Text>
              </View>
            </AnimatedButton>
          );
        })}
      </View>
    </View>
  );
}
