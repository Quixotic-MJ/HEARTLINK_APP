import React, { useEffect, useState } from "react";
import { Modal, Text, View, useWindowDimensions } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";

/**
 * First-visit tour of the dashboard. Each step spotlights one section with a thin blue ring
 * that glides to the next section, and explains it in a sheet at the bottom.
 * Steps whose section isn't on screen (e.g. no recommendations yet) are skipped.
 */

export type TourTarget = "score" | "missions" | "vitals" | "summary";
export type TourRect = { x: number; y: number; width: number; height: number };

type TourStep = { target: TourTarget; title: string; body: string };

const TOUR_STEPS: TourStep[] = [
  {
    target: "score",
    title: "Your heart health score",
    body: "A daily snapshot built from your readings and habits. It helps you keep healthy habits; it isn't a diagnosis.",
  },
  {
    target: "missions",
    title: "Today's missions",
    body: "Four small tasks each day: blood pressure, meals, movement and sleep. Tap one to log it.",
  },
  {
    target: "vitals",
    title: "Today so far",
    body: "Calories, sodium, saturated fat and movement add up here as you log. Sodium counts against your own daily limit.",
  },
  {
    target: "summary",
    title: "Recommended for you",
    body: "Recipes and exercises picked for your current score. Tap one to see what's in it.",
  },
];

/** Space between the section and the ring, and the ring's corner radius. */
const PAD = 8;
const RADIUS = 16;

const AnimatedRect = Reanimated.createAnimatedComponent(Rect);

interface DashboardTutorialModalProps {
  visible: boolean;
  onClose: () => void;
  /** Screen positions of the dashboard sections. The tour waits until these are measured. */
  targetLayouts?: Partial<Record<TourTarget, TourRect>>;
  /** Called when a step opens, so the dashboard can scroll that section into view. */
  onStepChange?: (target: TourTarget) => void;
}

export function DashboardTutorialModal({ visible, onClose, targetLayouts, onStepChange }: DashboardTutorialModalProps) {
  const { c } = useDs();
  const reduceMotion = useReducedMotion();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // Only steps whose section is actually on the dashboard right now.
  const [steps] = useState<TourStep[]>(() => TOUR_STEPS.filter((s) => (targetLayouts?.[s.target]?.height ?? 0) > 0));
  const step = steps[Math.min(index, steps.length - 1)];
  const rect = step ? targetLayouts?.[step.target] : undefined;
  const isLast = index >= steps.length - 1;

  // The spotlight glides from one section to the next (instantly with reduced motion).
  const x = useSharedValue(rect ? rect.x - PAD : 0);
  const y = useSharedValue(rect ? rect.y - PAD : 0);
  const w = useSharedValue(rect ? rect.width + PAD * 2 : 0);
  const h = useSharedValue(rect ? rect.height + PAD * 2 : 0);
  useEffect(() => {
    if (!rect) return;
    const to = (v: number) => (reduceMotion ? v : withTiming(v, { duration: 320, easing: Easing.out(Easing.cubic) }));
    x.value = to(Math.max(4, rect.x - PAD));
    y.value = to(rect.y - PAD);
    w.value = to(Math.min(screenWidth - 8, rect.width + PAD * 2));
    h.value = to(rect.height + PAD * 2);
  }, [rect, reduceMotion, screenWidth, x, y, w, h]);
  const holeProps = useAnimatedProps(() => ({ x: x.value, y: y.value, width: w.value, height: h.value }));
  const ringProps = useAnimatedProps(() => ({ x: x.value, y: y.value, width: w.value, height: h.value }));

  if (!visible || !step || !rect) return null;

  const goTo = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIndex(next);
    onStepChange?.(steps[next].target);
  };
  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={finish} statusBarTranslucent>
      <View style={{ flex: 1 }} accessibilityViewIsModal>
        <Svg style={{ position: "absolute", top: 0, left: 0 }} width={screenWidth} height={screenHeight} pointerEvents="none">
          <Defs>
            <Mask id="tourSpotlight">
              <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
              <AnimatedRect animatedProps={holeProps} rx={RADIUS} fill="black" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="rgba(15,15,15,0.62)" mask="url(#tourSpotlight)" />
          <AnimatedRect animatedProps={ringProps} rx={RADIUS} fill="none" stroke={c.line} strokeWidth={2} />
        </Svg>

        <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
          <View style={{ backgroundColor: c.canvas, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 16 }}>
            {/* Where you are in the tour: same four-part bar as the set-up screens */}
            <View className="flex-row items-center justify-between">
              <View
                className="flex-row"
                style={{ gap: 4, width: 120 }}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Tour step ${index + 1} of ${steps.length}`}
              >
                {steps.map((s, i) => (
                  <View key={s.target} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? c.line : c.hairlineSoft }} />
                ))}
              </View>
              <AnimatedButton
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel="Skip the tour"
                style={{ height: 44, paddingHorizontal: 4, justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.slate }}>Skip tour</Text>
              </AnimatedButton>
            </View>

            <Reanimated.View key={step.target} entering={reduceMotion ? undefined : FadeIn.duration(200)} style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, color: c.steel }}>
                {index + 1} of {steps.length}
              </Text>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink, lineHeight: 26 }}>
                {step.title}
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>{step.body}</Text>
            </Reanimated.View>

            <View className="flex-row" style={{ gap: 8 }}>
              {index > 0 ? <DsButton label="Back" variant="secondary" block={false} onPress={() => goTo(index - 1)} style={{ flex: 1 }} /> : null}
              <DsButton label={isLast ? "Start using HeartLink" : "Next"} onPress={isLast ? finish : () => goTo(index + 1)} style={{ flex: index > 0 ? 2 : 1 }} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
