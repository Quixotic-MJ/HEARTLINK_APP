import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { PictureViewer, StepsSheet, VideoSheet } from "./ExerciseMedia";
import AnimatedButton from "../ui/AnimatedButton";
import { BigClock, SessionControls, SessionScreenProps, SessionTopBar, StepBar, UnwellButton, WORKOUT, useLinearProgress } from "./ExerciseBits";
import { useFinishWhen } from "../../hooks/useSessionClock";
import { nextName, useSegmentVoice, useTimelinePlayback } from "../../hooks/useExerciseTimeline";
import { SECTION_NAME, Segment, describePart } from "../../services/exerciseSession";

// Screen 3c, Stationary exercises and stretches: one move at a time with its picture. A move
// lasts a time or a number of repeats (counted out loud), sometimes on both sides; the main part
// can repeat in rounds with a rest between. Back and Next skip without changing the time saved.

/** "Main part, round 2 of 5" / "Warm-up" / "Rest" */
function whereLabel(seg: Segment | undefined) {
  if (!seg) return "";
  if (seg.kind === "rest") return `Rest before round ${seg.round + 1}`;
  const round = seg.section === "main" && seg.rounds > 1 ? `, round ${seg.round} of ${seg.rounds}` : "";
  return `${SECTION_NAME[seg.section]}${round}`;
}

export function StretchingExerciseActive({ routine, elapsedMs, paused, onTogglePause, onFinish, onClose, onUnwell, voice }: SessionScreenProps) {
  const insets = useSafeAreaInsets();
  // Skipping forward or back moves through the moves without changing the time spent.
  const [skip, setSkip] = useState(0);
  const play = useTimelinePlayback(routine, elapsedMs, skip);
  const { timeline, total, position, index, segment: seg, elapsed, next, remaining } = play;
  const step = seg?.kind === "part" ? seg.step : undefined;
  const isLast = index >= timeline.length - 1;
  const picture = step?.image || (index === 0 ? routine.image : "");
  const [pictureOpen, setPictureOpen] = useState(false);

  // The video and the list of steps pause the exercise while open and carry on when closed.
  const [sheet, setSheet] = useState<"video" | "steps" | null>(null);
  const [resumeAfterSheet, setResumeAfterSheet] = useState(false);
  const openSheet = (which: "video" | "steps") => {
    setResumeAfterSheet(!paused);
    if (!paused) onTogglePause();
    voice.stop();
    setSheet(which);
  };
  const closeSheet = () => {
    setSheet(null);
    if (resumeAfterSheet) onTogglePause();
  };

  const overall = useLinearProgress(position / Math.max(1, total), total * 1000, !paused, `all:${skip}`);
  const { rep, getReady } = useSegmentVoice({ timeline, index, elapsed, voice });
  useFinishWhen(total > 0 && position >= total, onFinish);

  const goNext = () => (isLast ? onFinish() : setSkip((s) => s + remaining));
  const goBack = () => {
    if (elapsed > 2 || index === 0) setSkip((s) => s - elapsed);
    else setSkip((s) => s - elapsed - timeline[index - 1].seconds);
  };

  return (
    <View style={{ flex: 1, backgroundColor: WORKOUT.bg, paddingTop: insets.top }}>
      <SessionTopBar title={routine.title} subtitle={paused ? "Paused" : whereLabel(seg)} onClose={onClose} voice={voice}>
        <StepBar count={1} index={0} progress={overall} label={`${Math.round((position / Math.max(1, total)) * 100)}% done`} />
      </SessionTopBar>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, gap: 18 }} showsVerticalScrollIndicator={false}>
        {seg?.kind === "rest" ? (
          <Animated.View key={`rest-${index}`} entering={FadeIn.duration(260)} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Feather name="coffee" size={36} color={WORKOUT.soft} />
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 28, fontWeight: "600", color: WORKOUT.ink }}>
              Rest
            </Text>
            <BigClock seconds={Math.ceil(remaining)} size={72} maxWidth={300} dim={paused} label={`${Math.ceil(remaining)} seconds of rest left`} />
            <Text style={{ fontSize: 16, color: WORKOUT.soft, textAlign: "center" }}>Breathe easy. Have a sip of water if you need it.</Text>
            {next ? <Text style={{ fontSize: 14, color: WORKOUT.muted, marginTop: 6 }}>Next: round {seg.round + 1}, {nextName(next)}</Text> : null}
          </Animated.View>
        ) : (
          <>
            <Animated.View
              key={`pic-${seg?.partIndex}`}
              entering={FadeIn.duration(260)}
              style={{ height: 210, borderRadius: 16, backgroundColor: WORKOUT.raised, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
            >
              <Feather name="user" size={44} color={WORKOUT.soft} />
              {picture ? (
                <Pressable
                  onPress={() => setPictureOpen(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Picture of this move. Opens full screen"
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <Image source={{ uri: picture }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
                </Pressable>
              ) : null}
              {routine.videoUrl ? (
                <AnimatedButton
                  onPress={() => openSheet("video")}
                  accessibilityRole="button"
                  accessibilityLabel="Watch the video. Pauses the exercise"
                  style={{ position: "absolute", right: 10, bottom: 10, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: WORKOUT.ink, flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="play" size={16} color={WORKOUT.bg} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: WORKOUT.bg }}>Video</Text>
                </AnimatedButton>
              ) : null}
              <AnimatedButton
                onPress={() => openSheet("steps")}
                accessibilityRole="button"
                accessibilityLabel="See all the steps with their pictures. Pauses the exercise"
                style={{ position: "absolute", left: 10, bottom: 10, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: WORKOUT.ink, flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Feather name="list" size={16} color={WORKOUT.bg} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: WORKOUT.bg }}>Steps</Text>
              </AnimatedButton>
              {seg?.side ? (
                <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: WORKOUT.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: WORKOUT.ink }}>{seg.side === 1 ? "First side" : "Other side"}</Text>
                </View>
              ) : null}
            </Animated.View>

            <Animated.View key={`text-${index}`} entering={FadeIn.duration(260)} style={{ alignItems: "center", gap: 8 }}>
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 24, lineHeight: 30, fontWeight: "600", color: WORKOUT.ink, textAlign: "center" }}>
                {step?.text}
              </Text>
              {step?.details ? <Text style={{ fontSize: 16, lineHeight: 23, color: WORKOUT.soft, textAlign: "center" }}>{step.details}</Text> : null}
            </Animated.View>

            <View style={{ alignItems: "center", gap: 2, marginTop: "auto" }}>
              {step?.mode === "count" && getReady > 0 ? (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: WORKOUT.line }}>Get ready</Text>
                  <Text maxFontSizeMultiplier={1} accessibilityLabel={`Starting in ${getReady}`} style={{ fontSize: 72, lineHeight: 86, fontWeight: "600", color: WORKOUT.soft, fontVariant: ["tabular-nums"] }}>
                    {getReady}
                  </Text>
                  <Text style={{ fontSize: 15, color: WORKOUT.soft }}>
                    then {step.reps} times{seg?.side === 2 ? " on this side" : ""}
                  </Text>
                </>
              ) : step?.mode === "count" ? (
                <>
                  <Text maxFontSizeMultiplier={1} accessibilityLabel={`Repeat ${rep} of ${step.reps}`} style={{ fontSize: 72, lineHeight: 86, fontWeight: "600", color: WORKOUT.ink, fontVariant: ["tabular-nums"], opacity: paused ? 0.55 : 1 }}>
                    {rep}
                  </Text>
                  <Text style={{ fontSize: 15, color: WORKOUT.soft }}>of {step.reps} times</Text>
                </>
              ) : (
                <>
                  <BigClock seconds={Math.ceil(remaining)} size={64} maxWidth={300} dim={paused} label={`${Math.ceil(remaining)} seconds left in this move`} />
                  <Text style={{ fontSize: 14, color: WORKOUT.soft }}>left in this move</Text>
                </>
              )}
              {next ? (
                <Text style={{ fontSize: 14, color: WORKOUT.muted, marginTop: 10, textAlign: "center" }}>
                  Next: {nextName(next, seg)}
                  {next.kind === "part" && next.side !== 2 && next.step ? `, ${describePart(next.step)}` : ""}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <View className="px-5" style={{ paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 16 }}>
        <SessionControls paused={paused} onTogglePause={onTogglePause} onFinish={onFinish} onPrev={goBack} onNext={goNext} nextIsFinish={isLast} />
        <UnwellButton onPress={onUnwell} />
      </View>

      <PictureViewer uri={pictureOpen ? picture || null : null} onClose={() => setPictureOpen(false)} />
      {routine.videoUrl ? <VideoSheet url={routine.videoUrl} visible={sheet === "video"} onClose={closeSheet} /> : null}
      <StepsSheet routine={routine} current={seg?.kind === "part" ? seg.partIndex : -1} visible={sheet === "steps"} onClose={closeSheet} />
    </View>
  );
}
