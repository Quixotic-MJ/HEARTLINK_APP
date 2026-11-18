import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "./useDs";

interface SetupHeaderProps {
  /** 1 to 4. Omit to show only the back button and title. */
  part?: number;
  partName?: string;
  /** How far through the current part, 0 to 1. */
  progress?: number;
  /** Where the bar starts when the screen opens, so it fills forward from the last screen. */
  fromProgress?: number;
  title?: string;
  /** After the four parts (the exercise safety check): the bar stays, full, with `title` as the label. */
  allPartsDone?: boolean;
  onBack?: () => void;
  onFinishLater?: () => void;
}

export const SETUP_PARTS = 4;

/** The filled part of one progress segment; slides from its start value to the target. */
function SegmentFill({ from, to, color }: { from: number; to: number; color: string }) {
  const w = useSharedValue(from);
  useEffect(() => {
    w.value = withTiming(to, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [to, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return <Animated.View style={[{ height: "100%", backgroundColor: color }, style]} />;
}

// Top of every set-up screen: back, "Part N of 4 · Name", Finish later, and one
// progress bar that runs across all four parts.
export default function SetupHeader({ part, partName, progress = 0, fromProgress, title, allPartsDone, onBack, onFinishLater }: SetupHeaderProps) {
  const { c } = useDs();
  const label = part && !allPartsDone ? `Part ${part} of ${SETUP_PARTS} · ${partName ?? ""}` : title ?? "";
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const clamped = allPartsDone ? 1 : clamp(progress);
  const start = allPartsDone ? 1 : clamp(fromProgress ?? progress);
  // With every part done, the bar shows all four parts full
  const barPart = allPartsDone ? SETUP_PARTS : part;

  return (
    <View className="px-6 pt-3">
      <View className="flex-row items-center justify-between mb-2.5">
        {onBack ? (
          <AnimatedButton
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}
          >
            <Feather name="arrow-left" size={20} color={c.ink} />
          </AnimatedButton>
        ) : (
          <View style={{ width: 42, height: 42 }} />
        )}
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }} numberOfLines={1}>
          {label}
        </Text>
        {onFinishLater ? (
          <AnimatedButton
            onPress={onFinishLater}
            accessibilityRole="button"
            accessibilityLabel="Finish later"
            style={{ height: 38, paddingHorizontal: 12, justifyContent: "center", borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>Finish later</Text>
          </AnimatedButton>
        ) : (
          <View style={{ width: 42, height: 42 }} />
        )}
      </View>

      {barPart ? (
        <View
          className="flex-row"
          style={{ gap: 4 }}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={allPartsDone ? "Set-up progress: all parts done" : `Set-up progress: part ${part} of ${SETUP_PARTS}`}
        >
          {Array.from({ length: SETUP_PARTS }, (_, i) => {
            const n = i + 1;
            const fill = n < barPart ? 1 : n === barPart ? clamped : 0;
            const from = n === barPart ? start : fill;
            return (
              <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.hairlineSoft, overflow: "hidden" }}>
                <SegmentFill from={from} to={fill} color={c.line} />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
