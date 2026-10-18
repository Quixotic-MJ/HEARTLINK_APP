import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  BigClock,
  SessionControls,
  SessionScreenProps,
  PartRing,
  SessionTopBar,
  TimelineBar,
  UnwellButton,
  WORKOUT,
  useTimelineSeconds,
} from "./ExerciseBits";
import { useFinishWhen } from "../../hooks/useSessionClock";
import { nextName, useSegmentVoice, useTimelinePlayback } from "../../hooks/useExerciseTimeline";
import { SECTION_NAME, formatClock } from "../../services/exerciseSession";

// Screen 3a, Light Cardio: the big timer counts down the part you're in (warm-up, main,
// cool-down), and its ring fills for that part and starts again at the next. The whole session's
// time is a small line under it. Each part lasts the time set in the portal; the exercise
// finishes by itself when time is up.

export function CardioExerciseActive({ routine, elapsed, elapsedMs, paused, onTogglePause, onFinish, onClose, onUnwell, voice }: SessionScreenProps) {
  const insets = useSafeAreaInsets();
  const { timeline, total, index, segment: seg, elapsed: inPart, next, remaining } = useTimelinePlayback(routine, elapsedMs);
  const step = seg?.kind === "part" ? seg.step : undefined;
  const running = !paused;

  // One smooth timeline drives the ring and the part bar, so a new part never flashes the last one.
  const t = useTimelineSeconds(elapsedMs, total, running, "t");
  const starts = timeline.map((s) => s.start);
  const lengths = timeline.map((s) => s.seconds);
  useSegmentVoice({ timeline, index, elapsed: inPart, voice });
  useFinishWhen(total > 0 && elapsed >= total, onFinish);

  const partLabel = seg?.kind === "rest" ? "Rest" : seg ? `${SECTION_NAME[seg.section]}${seg.section === "main" && seg.rounds > 1 ? `, round ${seg.round} of ${seg.rounds}` : ""}` : "";
  // "left in warm-up" / "left in main part" / "left of rest"
  const leftIn = seg?.kind === "rest" ? "left of rest" : seg ? `left in ${SECTION_NAME[seg.section].toLowerCase()}` : "";
  const partLeft = Math.ceil(remaining);

  return (
    <View style={{ flex: 1, backgroundColor: WORKOUT.bg, paddingTop: insets.top }}>
      <SessionTopBar title={routine.title} subtitle={paused ? "Paused" : partLabel} onClose={onClose} voice={voice}>
        {timeline.length > 1 ? <TimelineBar t={t} starts={starts} lengths={lengths} label={`Part ${index + 1} of ${timeline.length}`} /> : null}
      </SessionTopBar>

      <View className="px-5" style={{ flex: 1, justifyContent: "center", gap: 32 }}>
        <View style={{ alignItems: "center" }}>
          <PartRing size={264} t={t} starts={starts} lengths={lengths}>
            <BigClock seconds={partLeft} maxWidth={196} dim={paused} label={`${formatClock(partLeft)} ${leftIn}`} />
            <Text style={{ fontSize: 15, color: WORKOUT.soft, marginTop: 2, maxWidth: 196, textAlign: "center" }} maxFontSizeMultiplier={1.3} numberOfLines={2}>
              {leftIn}
            </Text>
          </PartRing>
          <Text style={{ fontSize: 14, color: WORKOUT.muted, marginTop: 14, fontVariant: ["tabular-nums"] }}>
            {formatClock(elapsed)} of {formatClock(total)} total
          </Text>
        </View>

        {seg ? (
          <Animated.View key={index} entering={FadeIn.duration(260)} style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: WORKOUT.line }}>{partLabel}</Text>
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 22, lineHeight: 28, fontWeight: "600", color: WORKOUT.ink }}>
              {seg.kind === "rest" ? "Slow down and catch your breath" : step?.text}
            </Text>
            {step?.details ? <Text style={{ fontSize: 16, lineHeight: 23, color: WORKOUT.soft }}>{step.details}</Text> : null}
            {next ? <Text style={{ fontSize: 14, lineHeight: 20, color: WORKOUT.muted, marginTop: 4 }}>Next: {nextName(next, seg)}</Text> : null}
          </Animated.View>
        ) : null}
      </View>

      <View className="px-5" style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 16 }}>
        <SessionControls paused={paused} onTogglePause={onTogglePause} onFinish={onFinish} />
        <UnwellButton onPress={onUnwell} />
      </View>
    </View>
  );
}
