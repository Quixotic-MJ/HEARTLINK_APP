import React, { useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
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
import HeartLogo from "../components/ui/HeartLogo";
import DsButton from "../components/onboarding/DsButton";
import { useDs } from "../components/onboarding/useDs";

// ─── A day with HeartLink ─────────────────────────────────────────────────────
// The features are told as one example day, ending at the heart (the score).
// The whole screen fits without scrolling: the timeline stretches to fill spare height.

type Dot = "sky" | "teal" | "green";

const DAY: { when: string; title: string; body: string; dot: Dot }[] = [
  { when: "Morning", title: "Log your blood pressure", body: "Unusual readings are flagged right away.", dot: "sky" },
  { when: "Midday", title: "Pick a heart-friendly lunch", body: "Every recipe shows its sodium.", dot: "teal" },
  { when: "Evening", title: "Move at your own pace", body: "Workouts match your current stamina.", dot: "green" },
];

const DOT_COLOR: Record<Dot, string> = { sky: "#4FB6E6", teal: "#2a9d99", green: "#1aae39" };

// One orchestrated sequence: headline, then each moment of the day in turn,
// the line growing between them, ending with the heart starting to beat.
const START_MS = 450;
const STEP_MS = 420;
const FINAL_MS = START_MS + DAY.length * STEP_MS;

// Below this height the supporting lines are dropped so nothing needs scrolling.
const COMPACT_HEIGHT = 700;

// ─── Line segment (grows downward once) ───────────────────────────────────────

function Segment({ color, delay }: { color: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(delay, withTiming(1, { duration: STEP_MS, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
  }));

  return <Animated.View style={[{ flex: 1, width: 1, marginTop: 6, backgroundColor: color, transformOrigin: "top" }, animatedStyle]} />;
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
  const { c, isDark } = useDs();
  const headline = { fontSize: compact ? 32 : 34, lineHeight: compact ? 36 : 38, fontWeight: "600" as const, letterSpacing: -1, color: c.ink };

  // No server pre-check here: registration reports connection errors on submit,
  // so a slow or sleeping server never blocks a new user at the first tap.
  const handleGetStarted = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-1 px-6">
        {/* ── Logo bar ── */}
        <Animated.View entering={FadeIn.duration(400)} className={compact ? "flex-row items-center pt-3 mb-4" : "flex-row items-center pt-4 mb-7"}>
          <HeartLogo size={24} />
          <Text style={{ marginLeft: 10, fontSize: 17, fontWeight: "600", letterSpacing: -0.2, color: c.ink }}>HeartLink</Text>
        </Animated.View>

        {/* ── Headline (two lines arrive one after the other) ── */}
        <View accessible={true} accessibilityRole="header" accessibilityLabel="Your heart, one day at a time." className="mb-2">
          <Animated.Text entering={FadeInDown.delay(80).duration(500).easing(Easing.out(Easing.cubic))} style={headline}>
            Your heart,
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(220).duration(500).easing(Easing.out(Easing.cubic))} style={headline}>
            one day at a time.
          </Animated.Text>
        </View>
        <Animated.Text
          entering={FadeIn.delay(360).duration(500)}
          style={{ fontSize: compact ? 15 : 16, lineHeight: compact ? 22 : 25, color: c.slate, marginBottom: compact ? 20 : 28 }}
        >
          Small daily check-ins, one clear picture of your heart.
        </Animated.Text>

        {/* ── Example day: stretches to fill the remaining height ── */}
        <View className="flex-1">
          {DAY.map((moment, i) => {
            const at = START_MS + i * STEP_MS;
            return (
              <View key={moment.when} className="flex-row flex-grow">
                <View className="w-6 items-center">
                  <Animated.View
                    entering={ZoomIn.delay(at).springify().damping(10).stiffness(160)}
                    style={{ width: 12, height: 12, borderRadius: 3, marginTop: 3, backgroundColor: DOT_COLOR[moment.dot] }}
                  />
                  <Segment color={c.hairlineStrong} delay={at + 120} />
                </View>

                <Animated.View
                  entering={FadeInLeft.delay(at).duration(380).easing(Easing.out(Easing.cubic))}
                  className="flex-1 pl-3.5 pb-4"
                  accessible={true}
                  accessibilityLabel={`${moment.when}. ${moment.title}. ${moment.body}`}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>{moment.when}</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 2 }}>{moment.title}</Text>
                  {!compact && <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate, marginTop: 2 }}>{moment.body}</Text>}
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
            <Animated.View entering={ZoomIn.delay(FINAL_MS).springify().damping(9).stiffness(140)} className="w-6 items-center" style={{ marginTop: -4 }}>
              <BeatingHeart size={24} delay={FINAL_MS + 500} />
            </Animated.View>
            <Animated.View entering={FadeInLeft.delay(FINAL_MS).duration(380).easing(Easing.out(Easing.cubic))} className="flex-1 pl-3.5">
              <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>By tonight</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 2 }}>Your Heart Health Stability Score</Text>
              {!compact && <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate, marginTop: 2 }}>One clear number, updated as you log.</Text>}
            </Animated.View>
          </View>
        </View>
      </View>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500).easing(Easing.out(Easing.cubic))}
        style={{ paddingHorizontal: 24, paddingTop: compact ? 12 : 16, paddingBottom: compact ? 12 : 20, gap: 4 }}
      >
        <DsButton label="Create an account" onPress={handleGetStarted} accessibilityHint="Opens the registration screen" />
        <View className="flex-row justify-center items-center">
          <Text style={{ fontSize: 14, color: c.slate }}>Already have an account?</Text>
          <DsButton label="Log in" variant="link" block={false} onPress={() => router.push("/login")} accessibilityHint="Opens the login screen" />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
