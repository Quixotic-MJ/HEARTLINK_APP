import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import { WORKOUT, WorkoutRing, useLinearProgress } from "./ExerciseBits";
import type { SetupStep } from "../../services/exerciseSession";

// Screen 2, on the workout view. If the exercise has set-up instructions ("Sit near the front of
// the chair…"), they come first, read out loud, with no timer: the patient taps "I'm in position"
// when ready. Then a 3-second count before the timer starts; the ring fills smoothly over the
// 3 seconds and each number pops in with a light tap.

export interface ExerciseReadyProps {
  setup: SetupStep[];
  firstStep: string;
  onComplete: () => void;
  /** Spoken instructions. */
  say: (text: string) => void;
}

function GetIntoPosition({ setup, onReady, say }: { setup: SetupStep[]; onReady: () => void; say: (text: string) => void }) {
  const insets = useSafeAreaInsets();
  const picture = setup.find((s) => s.image)?.image;
  const readOut = useRef({ say, setup });
  useEffect(() => {
    const { say: speak, setup: steps } = readOut.current;
    speak(`Get into position. ${steps.map((s) => [s.text, s.details].filter(Boolean).join(". ")).join(". ")}. Tap I'm in position when you're ready.`);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: WORKOUT.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 12, gap: 18, justifyContent: "center" }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "600", color: WORKOUT.ink }}>
          Get into position
        </Text>
        {picture ? (
          <View style={{ height: 200, borderRadius: 16, overflow: "hidden", backgroundColor: WORKOUT.raised }}>
            <Image source={{ uri: picture }} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityIgnoresInvertColors />
          </View>
        ) : null}
        <View style={{ gap: 14 }}>
          {setup.map((s, i) => (
            <View key={i} className="flex-row" style={{ gap: 14 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: WORKOUT.raised, borderWidth: 1, borderColor: WORKOUT.track, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: WORKOUT.ink }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: "500", color: WORKOUT.ink }}>{s.text}</Text>
                {s.details ? <Text style={{ fontSize: 16, lineHeight: 23, color: WORKOUT.soft }}>{s.details}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="px-5" style={{ paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <AnimatedButton
          onPress={onReady}
          accessibilityRole="button"
          accessibilityLabel="I'm in position"
          style={{ height: 56, borderRadius: 8, backgroundColor: WORKOUT.ink, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: WORKOUT.bg }}>{"I'm in position"}</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

function Countdown({ firstStep, onComplete, say }: Omit<ExerciseReadyProps, "setup">) {
  const [count, setCount] = useState(3);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  }, [onComplete]);
  const ring = useLinearProgress(0, 3000, true, "ready");
  // Said once; the first step is read out when the exercise starts.
  const greet = useRef(say);
  useEffect(() => {
    greet.current("Get ready.");
  }, []);

  useEffect(() => {
    if (count <= 0) {
      done.current();
      return;
    }
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility(String(count));
    const t = setTimeout(() => setCount((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <View style={{ flex: 1, backgroundColor: WORKOUT.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 36 }}>
      <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: WORKOUT.soft }}>
        Get ready
      </Text>
      <WorkoutRing size={220} progress={ring}>
        <Animated.Text key={count} entering={ZoomIn.duration(220)} maxFontSizeMultiplier={1} style={{ fontSize: 96, lineHeight: 112, fontWeight: "600", color: WORKOUT.ink, fontVariant: ["tabular-nums"] }}>
          {Math.max(count, 1)}
        </Animated.Text>
      </WorkoutRing>
      {firstStep ? (
        <View style={{ alignItems: "center", gap: 6, maxWidth: 320 }}>
          <Text style={{ fontSize: 14, color: WORKOUT.muted }}>First</Text>
          <Text style={{ fontSize: 19, lineHeight: 27, fontWeight: "500", color: WORKOUT.ink, textAlign: "center" }}>{firstStep}</Text>
        </View>
      ) : null}
      <AnimatedButton onPress={() => done.current()} accessibilityRole="button" accessibilityLabel="Start now" style={{ height: 44, paddingHorizontal: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: WORKOUT.line }}>Start now</Text>
      </AnimatedButton>
    </View>
  );
}

export function ExerciseReady({ setup, firstStep, onComplete, say }: ExerciseReadyProps) {
  const [inPosition, setInPosition] = useState(setup.length === 0);
  if (!inPosition) return <GetIntoPosition setup={setup} onReady={() => setInPosition(true)} say={say} />;
  return <Countdown firstStep={firstStep} onComplete={onComplete} say={say} />;
}
