import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useDs } from "../onboarding/useDs";

// ─── Action config ────────────────────────────────────────────────────────────

export interface SplitAction {
  id: string;
  icon: string;
  iconType: "feather" | "material";
  shortLabel: string;
  route?: string;
  badgeBg: string;
  badgeFg: string;
  darkBadgeBg: string;
  darkBadgeFg: string;
}

export const SPLIT_ACTIONS: SplitAction[] = [
  {
    id: "meal",
    shortLabel: "Meal",
    icon: "silverware-fork-knife",
    iconType: "material",
    badgeBg: "#FEF3C7",
    badgeFg: "#D97706",
    darkBadgeBg: "rgba(245, 158, 11, 0.18)",
    darkBadgeFg: "#FBBF24",
  },
  {
    id: "exercise",
    shortLabel: "Exercise",
    icon: "activity",
    iconType: "feather",
    badgeBg: "#ECFDF5",
    badgeFg: "#059669",
    darkBadgeBg: "rgba(16, 185, 129, 0.18)",
    darkBadgeFg: "#34D399",
  },
  {
    id: "sleep",
    shortLabel: "Sleep",
    icon: "moon",
    iconType: "feather",
    badgeBg: "#EEF2FF",
    badgeFg: "#4F46E5",
    darkBadgeBg: "rgba(99, 102, 241, 0.18)",
    darkBadgeFg: "#818CF8",
  },
  {
    id: "vitals",
    shortLabel: "Vitals",
    icon: "heart",
    iconType: "feather",
    route: "/(home)/(health)/log-symptoms",
    badgeBg: "#EFF6FF",
    badgeFg: "#2563EB",
    darkBadgeBg: "rgba(59, 130, 246, 0.18)",
    darkBadgeFg: "#60A5FA",
  },
];

// Crisp ease-out — smooth, no bounce
const ENTER_ANIM = { duration: 220, easing: Easing.out(Easing.cubic) };
const EXIT_ANIM = { duration: 160, easing: Easing.out(Easing.cubic) };
const STAGGER_MS = 28;
const CLOSE_MS = 200;

// ─── Single pill: blooms outward from the FAB center ─────────────────────────

function SplitPill({
  action,
  index,
  dir,
  open,
  onPress,
}: {
  action: SplitAction;
  index: number;
  dir: -1 | 0 | 1;
  open: boolean;
  onPress: () => void;
}) {
  const { c, isDark } = useDs();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = open
      ? withDelay(index * STAGGER_MS, withTiming(1, ENTER_ANIM))
      : withTiming(0, EXIT_ANIM);
  }, [open, index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: dir * 32 * (1 - progress.value) },
      { translateY: 10 * (1 - progress.value) },
      { scale: 0.7 + 0.3 * progress.value },
    ],
  }));

  const badgeBg = isDark ? action.darkBadgeBg : action.badgeBg;
  const badgeFg = isDark ? action.darkBadgeFg : action.badgeFg;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={action.shortLabel}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 50,
          width: 144,
          backgroundColor: c.canvas,
          borderRadius: 16,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#E2E8F0",
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.45 : 0.12,
              shadowRadius: 18,
            },
            android: { elevation: 6 },
          }),
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: badgeBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {action.iconType === "feather" ? (
            <Feather name={action.icon as any} size={18} color={badgeFg} />
          ) : (
            <MaterialCommunityIcons
              name={action.icon as any}
              size={18}
              color={badgeFg}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: c.ink,
            letterSpacing: -0.2,
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
  onOpenQuickLog,
  onOpenSleepLog,
  onOpenMealLog,
}: {
  open: boolean;
  onClose: () => void;
  onOpenQuickLog?: () => void;
  onOpenSleepLog?: () => void;
  onOpenMealLog?: () => void;
}) {
  const [visible, setVisible] = useState(open);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backdropOpacity = useSharedValue(0);

  if (open && !visible) setVisible(true);

  useEffect(() => {
    if (open) {
      backdropOpacity.value = withTiming(1, { duration: 180 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      backdropOpacity.value = withTiming(0, { duration: 160 });
      const timer = setTimeout(() => setVisible(false), CLOSE_MS);
      return () => clearTimeout(timer);
    }
  }, [open, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.65,
  }));

  if (!visible) return null;

  // CustomTabBar height: 58 + bottomPad
  const bottomPad =
    Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom : 20) : insets.bottom + 16;
  const tabBarHeight = 58 + bottomPad;

  // Two rows centered on the FAB: top row has Meal & Exercise, bottom has Sleep & Vitals
  const topRow = SPLIT_ACTIONS.slice(0, 2);
  const bottomRow = SPLIT_ACTIONS.slice(2);
  const topDirs: (-1 | 0 | 1)[] = [-1, 1];
  const bottomDirs: (-1 | 0 | 1)[] = [-1, 1];

  return (
    <>
      {/* Backdrop: covers everything above the tab bar; tap to dismiss */}
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
            { flex: 1, backgroundColor: "#0B1120" },
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
          bottom: tabBarHeight + 20,
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
          {topRow.map((action, i) => (
            <SplitPill
              key={action.id}
              action={action}
              index={i}
              dir={topDirs[i]}
              open={open}
              onPress={() => {
                onClose();
                if (action.id === "exercise" && onOpenQuickLog) {
                  onOpenQuickLog();
                } else if (action.id === "sleep" && onOpenSleepLog) {
                  onOpenSleepLog();
                } else if (action.id === "meal" && onOpenMealLog) {
                  onOpenMealLog();
                } else if (action.route) {
                  router.push(action.route as any);
                }
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
          {bottomRow.map((action, i) => (
            <SplitPill
              key={action.id}
              action={action}
              index={topRow.length + i}
              dir={bottomDirs[i]}
              open={open}
              onPress={() => {
                onClose();
                if (action.id === "exercise" && onOpenQuickLog) {
                  onOpenQuickLog();
                } else if (action.id === "sleep" && onOpenSleepLog) {
                  onOpenSleepLog();
                } else if (action.id === "meal" && onOpenMealLog) {
                  onOpenMealLog();
                } else if (action.route) {
                  router.push(action.route as any);
                }
              }}
            />
          ))}
        </View>
      </View>
    </>
  );
}
