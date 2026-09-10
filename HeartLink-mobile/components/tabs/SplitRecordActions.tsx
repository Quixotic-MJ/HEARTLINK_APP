import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ─── Action config (mirrors the RecordBottomSheet options) ───────────────────

export interface SplitAction {
  icon: string;
  iconType: "feather" | "material";
  shortLabel: string;
  route: string;
  iconColor: string;
  iconBg: string;
}

export const SPLIT_ACTIONS: SplitAction[] = [
  {
    icon: "camera",
    iconType: "feather",
    shortLabel: "Scan",
    route: "/(home)/(meals)/barcode-scan",
    iconColor: "#185fa5",
    iconBg: "#e6f1fb",
  },
  {
    icon: "silverware-fork-knife",
    iconType: "material",
    shortLabel: "Meal",
    route: "/(home)/(meals)/search-meal",
    iconColor: "#3b6d11",
    iconBg: "#eaf3de",
  },
  {
    icon: "activity",
    iconType: "feather",
    shortLabel: "Exercise",
    route: "/(home)/(health)/exercise-diary",
    iconColor: "#4A6080",
    iconBg: "#eff6ff",
  },
  {
    icon: "moon",
    iconType: "feather",
    shortLabel: "Sleep",
    route: "/(home)/(health)/log-sleep",
    iconColor: "#6366f1",
    iconBg: "#eef2ff",
  },
  {
    icon: "heart",
    iconType: "feather",
    shortLabel: "Vitals",
    route: "/(home)/(health)/log-symptoms",
    iconColor: "#e11d48",
    iconBg: "#ffe4e6",
  },
];

// Fast, crisp ease-out — no bounce, no float.
const ENTER_ANIM = { duration: 240, easing: Easing.out(Easing.cubic) };
const EXIT_ANIM = { duration: 180, easing: Easing.out(Easing.quad) };
const STAGGER_MS = 30;
const CLOSE_MS = 220;

// ─── Single pill: blooms outward from the FAB center ─────────────────────────

function SplitPill({
  action,
  index,
  dir,
  open,
  isDark,
  onPress,
}: {
  action: SplitAction;
  index: number;
  dir: -1 | 0 | 1;
  open: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = open
      ? withDelay(index * STAGGER_MS, withTiming(1, ENTER_ANIM))
      : withTiming(0, EXIT_ANIM);
  }, [open, index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      // Fan out horizontally away from center, rise slightly into place.
      { translateX: dir * 48 * (1 - progress.value) },
      { translateY: 10 * (1 - progress.value) },
      { scale: 0.5 + 0.5 * progress.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action.shortLabel}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderRadius: 999,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 0.5,
          borderColor: isDark ? "#334155" : "#e2e8f0",
          ...Platform.select({
            ios: {
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
            },
            android: { elevation: 6 },
          }),
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: action.iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {action.iconType === "feather" ? (
            <Feather name={action.icon as any} size={15} color={action.iconColor} />
          ) : (
            <MaterialCommunityIcons
              name={action.icon as any}
              size={15}
              color={action.iconColor}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
        >
          {action.shortLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Overlay: backdrop + two centered rows fanning out from the FAB ──────────

export function SplitRecordActions({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(open);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setVisible(true);
      backdropOpacity.value = withTiming(1, { duration: 200 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      const timer = setTimeout(() => setVisible(false), CLOSE_MS);
      return () => clearTimeout(timer);
    }
  }, [open, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.45,
  }));

  if (!visible) return null;

  // Floating pill bar footprint: 66pt bar + bottom margin.
  const bottomPad = Platform.OS === "ios" ? 14 : insets.bottom + 10;
  const tabBarHeight = 66 + bottomPad;

  // Two rows centered on the FAB: top row fans to 2 pills, bottom to 3.
  const topRow = SPLIT_ACTIONS.slice(0, 2);
  const bottomRow = SPLIT_ACTIONS.slice(2);
  const topDirs: (-1 | 0 | 1)[] = [-1, 1];
  const bottomDirs: (-1 | 0 | 1)[] = [-1, 0, 1];

  const handleSelect = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onClose();
    router.push(route as any);
  };

  return (
    <>
      {/* Backdrop: covers everything above the tab bar; tap to dismiss.
          The tab bar itself stays interactive so the FAB can toggle shut. */}
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: tabBarHeight,
        }}
      >
        <Animated.View
          style={[
            { flex: 1, backgroundColor: "#0f172a" },
            backdropStyle,
          ]}
        />
      </Pressable>

      {/* Pills blooming upward from the FAB slot */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: tabBarHeight + 14,
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          {topRow.map((action, i) => (
            <SplitPill
              key={action.shortLabel}
              action={action}
              index={i}
              dir={topDirs[i]}
              open={open}
              isDark={isDark}
              onPress={() => handleSelect(action.route)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          {bottomRow.map((action, i) => (
            <SplitPill
              key={action.shortLabel}
              action={action}
              index={topRow.length + i}
              dir={bottomDirs[i]}
              open={open}
              isDark={isDark}
              onPress={() => handleSelect(action.route)}
            />
          ))}
        </View>
      </View>
    </>
  );
}
