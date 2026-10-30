import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";

/**
 * First-visit tour of the dashboard, drawn inside the page itself: the section being explained
 * gets a thin blue ring and a tip card sits just above it. Nothing is laid over the screen, so the
 * ring stays on its section on every phone. Next scrolls the page to the next section.
 *
 * Keep this in step with the dashboard: when a section is added, removed, renamed or redesigned,
 * update TOUR_STEPS here and the <TourSpot> wrappers in app/(home)/(tabs)/dashboard.tsx.
 */

export type TourTarget = "score" | "note" | "missions" | "vitals" | "summary" | "care";
export type TourStep = { target: TourTarget; title: string; body: string };

export const TOUR_STEPS: TourStep[] = [
  {
    target: "score",
    title: "Your heart score",
    body: "Built from your readings and habits; its colour shows the band. Swipe this card (or tap the dots) to see today's habits and your latest reading. Tap the i to see how the score is worked out. It isn't a diagnosis.",
  },
  {
    target: "missions",
    title: "Today's check-ins",
    body: "Blood pressure (with your medicine answer), meals, movement and sleep. Each tile shows where it stands today; tap one to log it.",
  },
  {
    target: "note",
    title: "Today's note",
    body: "One line on what just changed your score, with a step to take when there is one. After an emergency-level reading it turns red with Call 911. Tap Hide to fold it away.",
  },
  {
    target: "vitals",
    title: "Blood pressure this week",
    body: "Your last 7 days, top and bottom number, with lines at 120 and 80. Tap + to log a reading, or the card to open Trends.",
  },
  {
    target: "summary",
    title: "Picked for you",
    body: "Dietitian-approved meals and PT-approved exercises that suit your score and what's left of today. Tap one to log it or start it.",
  },
  {
    target: "care",
    title: "Care tools",
    body: "Get a summary of your readings ready for a doctor's visit, or find clinics near you.",
  },
];

/** What each section needs to know about the running tour. */
export type TourState = {
  steps: TourStep[];
  index: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  /** Called once the current section and its tip are laid out, so the page can scroll to it. */
  onShown: (spot: View) => void;
};

/**
 * Runs the tour. `shown` says which sections are on the dashboard right now; the others are
 * skipped (e.g. no recommendations yet). `tour` is null when the tour isn't running.
 */
export function useDashboardTour({
  shown,
  onFinish,
  onShown,
}: {
  shown: Record<TourTarget, boolean>;
  onFinish: () => void;
  onShown: (spot: View) => void;
}) {
  const [current, setCurrent] = useState<number | null>(null);
  const start = useCallback(() => setCurrent(0), []);

  const steps = TOUR_STEPS.filter((s) => shown[s.target]);
  if (current === null || steps.length === 0) return { tour: null, start };
  const index = Math.min(current, steps.length - 1);

  const goTo = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrent(next);
  };
  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrent(null);
    onFinish();
  };
  const isLast = index >= steps.length - 1;

  const tour: TourState = {
    steps,
    index,
    onBack: () => goTo(Math.max(0, index - 1)),
    onNext: isLast ? finish : () => goTo(index + 1),
    onSkip: finish,
    onShown,
  };
  return { tour, start };
}

/** Wraps one dashboard section. While the tour is on this section it shows the tip and the ring. */
export function TourSpot({ target, tour, children }: { target: TourTarget; tour: TourState | null; children: React.ReactNode }) {
  const { c } = useDs();
  const spotRef = useRef<View>(null);
  const reportedRef = useRef(false);
  const step = tour ? tour.steps[tour.index] : undefined;
  const active = step?.target === target;

  useEffect(() => {
    if (!active) {
      reportedRef.current = false;
      return;
    }
    if (step && tour) AccessibilityInfo.announceForAccessibility(`${step.title}. Step ${tour.index + 1} of ${tour.steps.length}.`);
  }, [active, step, tour]);

  // The tip changes this section's size, so its layout event means "tip is in place".
  const handleLayout = () => {
    if (!active || reportedRef.current || !spotRef.current) return;
    reportedRef.current = true;
    tour?.onShown(spotRef.current);
  };

  return (
    <View ref={spotRef} onLayout={handleLayout}>
      {active && tour && step ? <TourTip tour={tour} step={step} /> : null}
      <View>
        {children}
        {active ? (
          <View
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: 28,
              borderWidth: 2,
              borderColor: c.line,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

function TourTip({ tour, step }: { tour: TourState; step: TourStep }) {
  const { c } = useDs();
  const { steps, index } = tour;
  const isLast = index >= steps.length - 1;

  return (
    <Reanimated.View key={step.target} entering={FadeIn.duration(220)} style={{ marginBottom: 18 }}>
      <View style={{ backgroundColor: c.tint, borderRadius: 12, padding: 16, gap: 12 }}>
        {/* Where you are in the tour: same four-part bar as the set-up screens */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View
              className="flex-row"
              style={{ gap: 4, width: 88 }}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Tour step ${index + 1} of ${steps.length}`}
            >
              {steps.map((s, i) => (
                <View key={s.target} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? c.primary : c.canvas }} />
              ))}
            </View>
            <Text style={{ fontSize: 13, color: c.slate }}>
              {index + 1} of {steps.length}
            </Text>
          </View>
          <AnimatedButton
            onPress={tour.onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip the tour"
            style={{ height: 44, paddingHorizontal: 4, marginVertical: -12, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "500", color: c.slate }}>Skip tour</Text>
          </AnimatedButton>
        </View>

        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", lineHeight: 22, color: c.onTint }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{step.body}</Text>
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          {index > 0 ? (
            <DsButton label="Back" variant="secondary" block={false} onPress={tour.onBack} style={{ flex: 1, backgroundColor: c.canvas }} />
          ) : null}
          <DsButton label={isLast ? "Finish tour" : "Next"} onPress={tour.onNext} style={{ flex: index > 0 ? 2 : 1 }} />
        </View>
      </View>
      {/* Small pointer from the tip down to the ringed section */}
      <View
        style={{
          position: "absolute",
          left: 28,
          bottom: -6,
          width: 12,
          height: 12,
          backgroundColor: c.tint,
          transform: [{ rotate: "45deg" }],
          pointerEvents: "none",
        }}
      />
    </Reanimated.View>
  );
}
