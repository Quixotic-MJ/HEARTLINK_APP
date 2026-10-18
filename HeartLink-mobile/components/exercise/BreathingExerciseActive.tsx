import React, { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SharedValue, runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useReducedMotion } from "react-native-reanimated";
import {
  SessionControls,
  SessionScreenProps,
  SessionTopBar,
  StepBar,
  UnwellButton,
  WORKOUT,
  useLinearProgress,
  useStepCue,
} from "./ExerciseBits";
import { useFinishWhen } from "../../hooks/useSessionClock";
import { BreathCue, ExerciseStep, breathingAt, breathingPlan, formatClock, stepCue } from "../../services/exerciseSession";

// Screen 3b, Breathing: set-up steps once, then the breaths repeat as rounds until the planned
// time is up. The circle grows while breathing in, stays full while holding and shrinks while
// breathing out; the phone gives a light tap at each change. Still with reduced motion.
//
// Everything that moves (circle, pattern bar, the switch to the next breath) is worked out on
// the animation thread from one smooth timeline, so breaths change exactly on time.

const FALLBACK: ExerciseStep[] = [
  { text: "Breathe in", details: "", seconds: 4, section: "main", mode: "time", bothSides: false },
  { text: "Hold", details: "", seconds: 4, section: "main", mode: "time", bothSides: false },
  { text: "Breathe out", details: "", seconds: 6, section: "main", mode: "time", bothSides: false },
];
const SMALL = 0.62;
const CUE_WORD: Record<BreathCue, string> = { in: "Breathe in", hold: "Hold", out: "Breathe out", other: "Get ready" };
const CUE_SHORT: Record<BreathCue, string> = { in: "In", hold: "Hold", out: "Out", other: "Rest" };

type Spot = { occurrence: number; index: number; fraction: number; inPrep: boolean; left: number };

/** One part of the breathing pattern, sized by its seconds; fills in step with the breath. */
function PatternPart({ index, seconds, label, spot, current }: { index: number; seconds: number; label: string; spot: SharedValue<Spot>; current: boolean }) {
  const fill = useAnimatedStyle(() => {
    const s = spot.value;
    const f = s.inPrep || s.index < index ? 0 : s.index > index ? 1 : s.fraction;
    return { width: `${f * 100}%` };
  });
  return (
    <View style={{ flex: seconds, gap: 6 }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: WORKOUT.track, overflow: "hidden" }}>
        <Animated.View style={[{ height: 6, backgroundColor: WORKOUT.line }, fill]} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: 13, color: current ? WORKOUT.ink : WORKOUT.muted, fontWeight: current ? "600" : "400" }}>
        {label}
      </Text>
    </View>
  );
}

export function BreathingExerciseActive({ routine, elapsed, elapsedMs, paused, onTogglePause, onFinish, onClose, onUnwell, voice }: SessionScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const steps = routine.steps.length > 0 ? routine.steps : FALLBACK;
  const total = routine.minutes * 60;
  const { prep, cycle } = breathingPlan(steps);
  const prepSecs = prep.map((s) => s.seconds);
  const cycleSecs = cycle.map((s) => s.seconds);
  const prepTotal = prepSecs.reduce((a, b) => a + b, 0);
  const roundTotal = cycleSecs.reduce((a, b) => a + b, 0) || 5;
  const rounds = Math.max(1, Math.ceil((total - prepTotal) / roundTotal));

  // Circle size at the start and end of each breath. A hold keeps the size the last breath left.
  const cues = cycle.map(stepCue);
  const fromSize = cues.map((cue, i) => (cue === "in" ? SMALL : cue === "out" ? 1 : cue === "hold" ? (cues[(i - 1 + cues.length) % cues.length] === "out" ? SMALL : 1) : SMALL));
  const toSize = cues.map((cue, i) => (cue === "in" ? 1 : cue === "out" ? SMALL : fromSize[i]));

  // Seconds since the start, gliding on the animation thread.
  const overall = useLinearProgress(elapsedMs / (total * 1000), total * 1000, !paused, "overall");
  // No helper functions inside this: the build moves them off the animation thread, which crashes.
  const spot = useDerivedValue<Spot>(() => {
    const t = Math.min(total, overall.value * total);
    const inPrep = t < prepTotal;
    const secs = inPrep ? prepSecs : cycleSecs;
    const round = inPrep ? 0 : Math.floor((t - prepTotal) / roundTotal);
    const at = inPrep ? t : t - prepTotal - round * roundTotal;
    let index = 0;
    let fraction = 0;
    let sec = 5;
    let start = 0;
    for (let i = 0; i < secs.length; i++) {
      if (at < start + secs[i] || i === secs.length - 1) {
        index = i;
        sec = secs[i];
        fraction = Math.min(1, Math.max(0, (at - start) / secs[i]));
        break;
      }
      start += secs[i];
    }
    return {
      occurrence: inPrep ? index : prepSecs.length + round * cycleSecs.length + index,
      index,
      fraction,
      inPrep,
      left: Math.max(1, Math.ceil(sec * (1 - fraction))),
    };
  });

  // The words and the count follow the timeline exactly: the animation thread tells React when
  // the breath or the second changes.
  const start = breathingAt(steps, Math.min(elapsedMs / 1000, total));
  const [shown, setShown] = useState({ occurrence: start.occurrence, left: Math.max(1, Math.ceil(start.stepSeconds - start.stepElapsed)) });
  useAnimatedReaction(
    () => spot.value.occurrence * 1000 + spot.value.left,
    (now, before) => {
      if (now !== before) runOnJS(setShown)({ occurrence: Math.floor(now / 1000), left: now % 1000 });
    },
  );
  useFinishWhen(elapsed >= total, onFinish);

  const inPrep = shown.occurrence < prep.length;
  const index = inPrep ? shown.occurrence : (shown.occurrence - prep.length) % Math.max(1, cycle.length);
  const roundIndex = inPrep ? 0 : Math.floor((shown.occurrence - prep.length) / Math.max(1, cycle.length));
  const step = (inPrep ? prep[index] : cycle[index]) ?? cycle[0];
  const cue: BreathCue = inPrep ? "other" : stepCue(step);
  const showText = step.text.replace(/\.$/, "");
  const sameAsCue = showText.toLowerCase() === CUE_WORD[cue].toLowerCase();
  // Set-up steps are read in full; breaths just get the short cue, so it keeps up with the breath.
  useStepCue(shown.occurrence, voice.say, inPrep ? showText : CUE_WORD[cue]);

  const circle = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 0.85 }] };
    const s = spot.value;
    if (s.inPrep) return { transform: [{ scale: SMALL }] };
    const t = s.fraction;
    const eased = t * t * (3 - 2 * t);
    return { transform: [{ scale: fromSize[s.index] + (toSize[s.index] - fromSize[s.index]) * eased }] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: WORKOUT.bg, paddingTop: insets.top }}>
      <SessionTopBar title={routine.title} subtitle={paused ? "Paused" : `${formatClock(elapsed)} of ${formatClock(total)}`} onClose={onClose} voice={voice}>
        <StepBar count={1} index={0} progress={overall} label={`${formatClock(elapsed)} of ${routine.minutes} minutes`} />
      </SessionTopBar>

      <View className="px-5" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24 }}>
        <View style={{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: WORKOUT.track }} />
          <Animated.View
            style={[{ width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(79,182,230,0.22)", borderWidth: 2, borderColor: WORKOUT.line }, circle]}
          />
          <Text maxFontSizeMultiplier={1} style={{ position: "absolute", fontSize: 64, lineHeight: 76, fontWeight: "600", color: WORKOUT.ink, fontVariant: ["tabular-nums"] }} accessibilityLabel={`${shown.left} seconds`}>
            {shown.left}
          </Text>
        </View>

        <Animated.View key={shown.occurrence} entering={FadeIn.duration(200)} style={{ alignItems: "center", gap: 6 }}>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 28, fontWeight: "600", color: WORKOUT.ink }}>
            {CUE_WORD[cue]}
          </Text>
          {!sameAsCue ? <Text style={{ fontSize: 16, lineHeight: 23, color: WORKOUT.soft, textAlign: "center" }}>{showText}</Text> : null}
        </Animated.View>

        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <View className="flex-row" style={{ gap: 6 }} accessibilityLabel="One round">
            {cycle.map((s, i) => (
              <PatternPart key={i} index={i} seconds={s.seconds} label={`${CUE_SHORT[cues[i]]} ${s.seconds} s`} spot={spot} current={!inPrep && i === index} />
            ))}
          </View>
          <Text style={{ fontSize: 14, color: WORKOUT.soft, textAlign: "center" }}>
            {inPrep ? "Get settled first" : `Round ${Math.min(roundIndex + 1, rounds)} of ${rounds}`}
          </Text>
        </View>
      </View>

      <View className="px-5" style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 16 }}>
        <SessionControls paused={paused} onTogglePause={onTogglePause} onFinish={onFinish} />
        <UnwellButton onPress={onUnwell} />
      </View>
    </View>
  );
}
