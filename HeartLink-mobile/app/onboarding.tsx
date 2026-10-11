import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import "../global.css";
import { Colors } from "../constants/theme";
import HeartLogo from "../components/ui/HeartLogo";

// ─── A day with HeartLink ─────────────────────────────────────────────────────
// The features are told as one example day. A single line in the logo's
// gradient runs through the day and ends at the heart (the score). The whole
// screen fits without scrolling: the timeline stretches to fill spare height.

type Hue = "blue" | "teal" | "success" | "lime";

const DAY: { when: string; title: string; body: string; hue: Hue; next: Hue }[] = [
  {
    when: "Morning",
    title: "Log your blood pressure",
    body: "Unusual readings are flagged right away.",
    hue: "blue",
    next: "teal",
  },
  {
    when: "Midday",
    title: "Pick a heart-friendly lunch",
    body: "Every recipe shows its sodium.",
    hue: "teal",
    next: "success",
  },
  {
    when: "Evening",
    title: "Move at your own pace",
    body: "Workouts match your current stamina.",
    hue: "success",
    next: "lime",
  },
];

// One orchestrated sequence: headline, then each moment of the day in turn,
// the line growing between them, ending with the heart starting to beat.
const START_MS = 450;
const STEP_MS = 420;
const FINAL_MS = START_MS + DAY.length * STEP_MS;

// Below this height the supporting lines are dropped so nothing needs scrolling.
const COMPACT_HEIGHT = 700;

// ─── Line segment (grows downward once) ───────────────────────────────────────

function Segment({ from, to, delay }: { from: string; to: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: STEP_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
  }));

  return (
    <Animated.View
      style={[{ flex: 1, width: 2, marginTop: 4, transformOrigin: "top" }, animatedStyle]}
    >
      <LinearGradient colors={[from, to]} style={{ flex: 1, borderRadius: 1 }} />
    </Animated.View>
  );
}

// ─── Heart at the end of the line (beats once the day is complete) ────────────

function BeatingHeart({ size, delay }: { size: number; delay: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    // "Lub-dub", then rest, repeated: a slow resting heartbeat.
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.18, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160 }),
          withTiming(1.1, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 220 }),
          withTiming(1, { duration: 1300 })
        ),
        -1
      )
    );
  }, [delay, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <HeartLogo size={size} />
    </Animated.View>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === "dark" ? Colors.dark : Colors.light;

  const mid = (hue: Hue) => palette[`${hue}Mid`];
  const label = (hue: Hue) => palette[`${hue}Text`];

  // No server pre-check here: registration reports connection errors on submit,
  // so a slow or sleeping server never blocks a new user at the first tap.
  const handleGetStarted = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      <View className="flex-1 px-6">
        {/* ── Logo bar ── */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className={compact ? "flex-row items-center pt-3 mb-4" : "flex-row items-center pt-4 mb-7"}
        >
          <HeartLogo size={24} />
          <Text className="ml-2.5 text-lg text-text font-bold tracking-tight">
            HeartLink
          </Text>
        </Animated.View>

        {/* ── Headline (two lines arrive one after the other) ── */}
        <View
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Your heart, one day at a time."
          className="mb-2"
        >
          <Animated.Text
            entering={FadeInDown.delay(80).duration(500).easing(Easing.out(Easing.cubic))}
            className={
              compact
                ? "text-[32px] leading-[36px] font-extrabold text-text tracking-tight"
                : "text-[34px] leading-[38px] font-extrabold text-text tracking-tight"
            }
          >
            Your heart,
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(220).duration(500).easing(Easing.out(Easing.cubic))}
            className={
              compact
                ? "text-[32px] leading-[36px] font-extrabold text-text tracking-tight"
                : "text-[34px] leading-[38px] font-extrabold text-text tracking-tight"
            }
          >
            one day at a time.
          </Animated.Text>
        </View>
        <Animated.Text
          entering={FadeIn.delay(360).duration(500)}
          className={compact ? "text-sm text-text-soft leading-5 mb-5" : "text-base text-text-soft leading-6 mb-7"}
        >
          Small daily check-ins, one clear picture of your heart.
        </Animated.Text>

        {/* ── Example day: stretches to fill the remaining height ── */}
        <View className="flex-1">
          {DAY.map((moment, i) => {
            const at = START_MS + i * STEP_MS;
            return (
              <View key={moment.when} className="flex-row flex-grow">
                <View className="w-7 items-center">
                  <Animated.View
                    entering={ZoomIn.delay(at).springify().damping(10).stiffness(160)}
                    className="w-3 h-3 rounded-full mt-0.5"
                    style={{ backgroundColor: mid(moment.hue) }}
                  />
                  <Segment from={mid(moment.hue)} to={mid(moment.next)} delay={at + 120} />
                </View>

                <Animated.View
                  entering={FadeInLeft.delay(at).duration(380).easing(Easing.out(Easing.cubic))}
                  className="flex-1 pl-3 pb-4"
                  accessible={true}
                  accessibilityLabel={`${moment.when}. ${moment.title}. ${moment.body}`}
                >
                  <Text
                    className="text-xs font-semibold leading-4 mb-0.5"
                    style={{ color: label(moment.hue) }}
                  >
                    {moment.when}
                  </Text>
                  <Text className="text-base font-bold text-text tracking-tight">
                    {moment.title}
                  </Text>
                  {!compact && (
                    <Text className="text-sm text-text-soft leading-5 mt-0.5">
                      {moment.body}
                    </Text>
                  )}
                </Animated.View>
              </View>
            );
          })}

          {/* ── End of the day: the score ── */}
          <View
            className="flex-row pb-4"
            accessible={true}
            accessibilityLabel="By tonight. Your Heart Health Stability Score. One clear number, updated as you log."
          >
            <Animated.View
              entering={ZoomIn.delay(FINAL_MS).springify().damping(9).stiffness(140)}
              className="w-7 items-center"
              style={{ marginTop: -6 }}
            >
              <BeatingHeart size={28} delay={FINAL_MS + 500} />
            </Animated.View>
            <Animated.View
              entering={FadeInLeft.delay(FINAL_MS).duration(380).easing(Easing.out(Easing.cubic))}
              className="flex-1 pl-3"
            >
              <Text
                className="text-xs font-semibold leading-4 mb-0.5"
                style={{ color: label("lime") }}
              >
                By tonight
              </Text>
              <Text className="text-base font-bold text-text tracking-tight">
                Your Heart Health Stability Score
              </Text>
              {!compact && (
                <Text className="text-sm text-text-soft leading-5 mt-0.5">
                  One clear number, updated as you log.
                </Text>
              )}
            </Animated.View>
          </View>
        </View>
      </View>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500).easing(Easing.out(Easing.cubic))}
        className={compact ? "px-6 pt-3 pb-3" : "px-6 pt-4 pb-5"}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          className="w-full bg-primary rounded-2xl py-4 items-center mb-2"
          onPress={handleGetStarted}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Create an account"
          accessibilityHint="Opens the registration screen"
        >
          <Text className="text-on-primary text-base font-bold">Create an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.65}
          className="py-2 flex-row justify-center items-center gap-1.5"
          onPress={() => router.push("/login")}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Log in to existing account"
          accessibilityHint="Opens the login screen"
        >
          <Text className="text-sm font-medium text-text-soft">
            Already have an account?
          </Text>
          <Text className="text-sm font-bold text-text">Log in</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
