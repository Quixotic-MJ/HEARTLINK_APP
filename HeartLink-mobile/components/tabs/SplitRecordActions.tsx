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
import { BadgeTint, tintColor } from "../onboarding/QuestionLayout";

// ─── Action config (mirrors the RecordBottomSheet options) ───────────────────

export interface SplitAction {
  icon: string;
  iconType: "feather" | "material";
  shortLabel: string;
  route: string;
  /** Topic badge colour: food = peach, movement = mint, habits = lavender, vitals = sky. */
  tint: BadgeTint;
  id?: string;
}

export const SPLIT_ACTIONS: SplitAction[] = [
  {
    icon: "silverware-fork-knife",
    iconType: "material",
    shortLabel: "Meal",
    id: "meal",
    route: "",
    tint: "peach",
  },
  {
    icon: "activity",
    iconType: "feather",
    shortLabel: "Exercise",
    id: "exercise",
    route: "",
    tint: "mint",
  },
  {
    icon: "moon",
    iconType: "feather",
    shortLabel: "Sleep",
    id: "sleep",
    route: "",
    tint: "lavender",
  },
  {
    icon: "heart",
    iconType: "feather",
    shortLabel: "Vitals",
    route: "/(home)/(health)/log-symptoms",
    tint: "sky",
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
  onPress,
}: {
  action: SplitAction;
  index: number;
  dir: -1 | 0 | 1;
  open: boolean;
  onPress: () => void;
}) {
  const { c } = useDs();
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
          gap: 10,
          minHeight: 48,
          backgroundColor: c.canvas,
          borderRadius: 12,
          paddingVertical: 8,
          paddingLeft: 8,
          paddingRight: 16,
          borderWidth: 1,
          borderColor: c.hairline,
          // Design-system modal shadow (level 4) so the choices stand off the dimmed screen.
          ...Platform.select({
            ios: {
              shadowColor: "#0f0f0f",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.16,
              shadowRadius: 24,
            },
            android: { elevation: 6 },
          }),
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: tintColor(c, action.tint),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {action.iconType === "feather" ? (
            <Feather name={action.icon as any} size={16} color={c.charcoal} />
          ) : (
            <MaterialCommunityIcons
              name={action.icon as any}
              size={16}
              color={c.charcoal}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: c.ink,
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
  const bottomDirs: (-1 | 0 | 1)[] = [-1, 1];

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
            { flex: 1, backgroundColor: "#0f0f0f" },
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
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          {bottomRow.map((action, i) => (
            <SplitPill
              key={action.shortLabel}
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
