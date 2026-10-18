import React, { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import AnimatedButton from "../ui/AnimatedButton";
import { youtubeId } from "./ExerciseMedia";
import {
  SessionControls,
  SessionScreenProps,
  SessionTopBar,
  StepBar,
  UnwellButton,
  WORKOUT,
  useStepCue,
} from "./ExerciseBits";
import {
  SECTION_NAME,
  describePart,
  formatClock,
  spokenStep,
} from "../../services/exerciseSession";

// Screen 3d, General exercises: the expert's video or pictures, and the moves with the current
// one marked. There's no set time, so the clock counts up; Finish ends it.


type Tab = "video" | "pictures";

export function ExerciseActive({
  routine,
  elapsed,
  paused,
  onTogglePause,
  onFinish,
  onClose,
  onUnwell,
  voice,
}: SessionScreenProps) {
  const insets = useSafeAreaInsets();
  const videoId = youtubeId(routine.videoUrl);
  const stepPictures = routine.steps
    .map((s) => s.image)
    .filter((u): u is string => !!u);
  const pictures =
    routine.guideImages.length > 0
      ? routine.guideImages
      : stepPictures.length > 0
        ? stepPictures
        : routine.image
          ? [routine.image]
          : [];
  const showSections = new Set(routine.steps.map((s) => s.section)).size > 1;
  const [videoFailed, setVideoFailed] = useState(false);
  const hasVideo = !!videoId && !videoFailed;
  const [tab, setTab] = useState<Tab>(videoId ? "video" : "pictures");
  const shown: Tab = tab === "video" && !hasVideo ? "pictures" : tab;
  const [mediaWidth, setMediaWidth] = useState(0);
  const [picture, setPicture] = useState(0);
  const [current, setCurrent] = useState(0);
  const steps = routine.steps;
  const isLast = current >= steps.length - 1;
  const full = useSharedValue(1);
  useStepCue(
    current,
    voice.say,
    steps.length > 0
      ? spokenStep(steps[current])
      : `${routine.title}. Follow the video or pictures.`,
  );

  const onPictureScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w > 0) setPicture(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  const tabButton = (value: Tab, label: string) => {
    const on = shown === value;
    return (
      <AnimatedButton
        key={value}
        onPress={() => setTab(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        style={{
          height: 44,
          justifyContent: "center",
          borderBottomWidth: 2,
          borderBottomColor: on ? WORKOUT.ink : "transparent",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: on ? WORKOUT.ink : WORKOUT.muted,
          }}
        >
          {label}
        </Text>
      </AnimatedButton>
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: WORKOUT.bg, paddingTop: insets.top }}
    >
      <SessionTopBar
        title={routine.title}
        subtitle={
          paused
            ? `Paused at ${formatClock(elapsed)}`
            : `Time so far ${formatClock(elapsed)}`
        }
        onClose={onClose}
        voice={voice}
      >
        {steps.length > 1 ? (
          <StepBar
            count={steps.length}
            index={current}
            progress={full}
            label={`Move ${current + 1} of ${steps.length}`}
          />
        ) : null}
      </SessionTopBar>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {hasVideo && pictures.length > 0 ? (
          <View
            className="flex-row"
            style={{
              gap: 24,
              borderBottomWidth: 1,
              borderBottomColor: WORKOUT.track,
            }}
            accessibilityRole="tablist"
          >
            {tabButton("video", "Video")}
            {tabButton("pictures", "Pictures")}
          </View>
        ) : null}

        <View
          onLayout={(e) => setMediaWidth(e.nativeEvent.layout.width)}
          style={{
            aspectRatio: 16 / 9,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: WORKOUT.raised,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {shown === "video" && videoId && mediaWidth > 0 ? (
            <YoutubePlayer
              width={mediaWidth}
              height={(mediaWidth * 9) / 16}
              videoId={videoId}
              play={false}
              onError={() => setVideoFailed(true)}
              initialPlayerParams={{ modestbranding: true, rel: false }}
            />
          ) : pictures.length > 0 && mediaWidth > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPictureScroll}
            >
              {pictures.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: mediaWidth, height: (mediaWidth * 9) / 16 }}
                  contentFit="cover"
                  accessibilityLabel={`Picture ${i + 1} of ${pictures.length}`}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{ alignItems: "center", gap: 6, padding: 16 }}>
              <Feather name="image" size={28} color={WORKOUT.soft} />
              <Text
                style={{
                  fontSize: 14,
                  color: WORKOUT.soft,
                  textAlign: "center",
                }}
              >
                {videoFailed
                  ? "The video couldn't load. Follow the moves below."
                  : "No video or pictures for this exercise. Follow the moves below."}
              </Text>
            </View>
          )}
        </View>
        {shown === "pictures" && pictures.length > 1 ? (
          <Text
            style={{ fontSize: 13, color: WORKOUT.soft, textAlign: "center" }}
          >
            Picture {picture + 1} of {pictures.length}, swipe for more
          </Text>
        ) : null}

        {steps.length > 0 ? (
          <View style={{ gap: 8 }}>
            {steps.map((s, i) => {
              const done = i < current;
              const on = i === current;
              const sectionStart =
                showSections && (i === 0 || steps[i - 1].section !== s.section);
              return (
                <React.Fragment key={i}>
                  {sectionStart ? (
                    <Text
                      accessibilityRole="header"
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: WORKOUT.soft,
                        marginTop: i === 0 ? 0 : 8,
                      }}
                    >
                      {SECTION_NAME[s.section]}
                      {s.section === "main" && routine.rounds > 1
                        ? `, ${routine.rounds} rounds`
                        : ""}
                    </Text>
                  ) : null}
                  <AnimatedButton
                    onPress={() => setCurrent(i)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Move ${i + 1}: ${s.text}${done ? ", done" : ""}`}
                    style={{
                      minHeight: 56,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: on ? 2 : 1,
                      borderColor: on ? WORKOUT.line : WORKOUT.track,
                      backgroundColor: on
                        ? "rgba(79,182,230,0.16)"
                        : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          done || on ? WORKOUT.line : WORKOUT.raised,
                      }}
                    >
                      {done ? (
                        <Feather name="check" size={15} color={WORKOUT.bg} />
                      ) : (
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: on ? WORKOUT.bg : WORKOUT.ink,
                          }}
                        >
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          fontSize: on ? 17 : 15,
                          fontWeight: on ? "600" : "400",
                          color: done ? WORKOUT.muted : WORKOUT.ink,
                        }}
                      >
                        {s.text}
                      </Text>
                      {on && s.details ? (
                        <Text
                          style={{
                            fontSize: 15,
                            lineHeight: 21,
                            color: WORKOUT.soft,
                          }}
                        >
                          {s.details}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: WORKOUT.muted }}>
                      {describePart(s)}
                    </Text>
                  </AnimatedButton>
                </React.Fragment>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View
        className="px-5"
        style={{
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: 16,
        }}
      >
        <SessionControls
          paused={paused}
          onTogglePause={onTogglePause}
          onFinish={onFinish}
          onPrev={
            steps.length > 1 && current > 0
              ? () => setCurrent((i) => i - 1)
              : undefined
          }
          onNext={
            steps.length > 1
              ? isLast
                ? onFinish
                : () => setCurrent((i) => i + 1)
              : onFinish
          }
          nextIsFinish={steps.length <= 1 || isLast}
        />
        <UnwellButton onPress={onUnwell} />
      </View>
    </View>
  );
}
