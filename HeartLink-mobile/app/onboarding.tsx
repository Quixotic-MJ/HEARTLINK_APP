import React, { useEffect } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
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

interface DayMoment {
  when: string;
  title: string;
  body: string;
  icon: "activity" | "sun" | "zap";
  badgeBg: string;
  borderColor: string;
  iconColor: string;
}

const DAY: DayMoment[] = [
  {
    when: "Morning",
    title: "Log your blood pressure",
    body: "Unusual readings are flagged right away.",
    icon: "activity",
    badgeBg: "#EFF6FF", // Primary blue tint
    borderColor: "#BFDBFE",
    iconColor: "#3B82F6", // Primary blue
  },
  {
    when: "Midday",
    title: "Pick a heart-friendly lunch",
    body: "Every recipe shows its sodium and heart impact.",
    icon: "sun",
    badgeBg: "#ECFDF5", // Emerald tint
    borderColor: "#A7F3D0",
    iconColor: "#10B981",
  },
  {
    when: "Evening",
    title: "Move at your own pace",
    body: "Workouts match your current stamina.",
    icon: "zap",
    badgeBg: "#F5F3FF", // Violet tint
    borderColor: "#DDD6FE",
    iconColor: "#8B5CF6",
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

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          width: 1.5,
          marginTop: 6,
          backgroundColor: color,
          transformOrigin: "top",
        },
        animatedStyle,
      ]}
    />
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
  const { c, isDark } = useDs();

  const headline = {
    fontSize: compact ? 29 : 34,
    lineHeight: compact ? 34 : 39,
    fontWeight: "700" as const,
    letterSpacing: -0.8,
    color: c.ink,
  };

  // No server pre-check here: registration reports connection errors on submit,
  // so a slow or sleeping server never blocks a new user at the first tap.
  const handleGetStarted = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-1 px-6">
        {/* ── Brand Logo Bar ── */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className={compact ? "flex-row items-center pt-3 mb-4" : "flex-row items-center pt-4 mb-6"}
        >
          <View className="flex-row items-center">
            <HeartLogo size={26} />
            <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: "700", letterSpacing: -0.3, color: c.ink }}>
              HeartLink
            </Text>
          </View>
          <View
            style={{
              marginLeft: "auto",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 9,
              paddingVertical: 3.5,
              borderRadius: 999,
              backgroundColor: c.tint,
              borderWidth: 1,
              borderColor: "#DBEAFE",
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary, marginRight: 5 }} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: c.primary, letterSpacing: 0.3 }}>
              DAILY CARE
            </Text>
          </View>
        </Animated.View>

        {/* ── Headline ── */}
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
          style={{
            fontSize: compact ? 14.5 : 15.5,
            lineHeight: compact ? 21 : 23,
            color: c.slate,
            marginBottom: compact ? 18 : 26,
          }}
        >
          Small daily check-ins, one clear picture of your heart.
        </Animated.Text>

        {/* ── Example day: stretches to fill the remaining height ── */}
        <View className="flex-1">
          {DAY.map((moment, i) => {
            const at = START_MS + i * STEP_MS;
            return (
              <View key={moment.when} className="flex-row flex-grow">
                {/* Timeline node & vertical track */}
                <View className="w-8 items-center">
                  <Animated.View
                    entering={ZoomIn.delay(at).springify().damping(12).stiffness(160)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: moment.badgeBg,
                      borderWidth: 1,
                      borderColor: moment.borderColor,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Feather name={moment.icon} size={14} color={moment.iconColor} />
                  </Animated.View>
                  <Segment color={c.hairline} delay={at + 120} />
                </View>

                {/* Timeline content */}
                <Animated.View
                  entering={FadeInLeft.delay(at).duration(380).easing(Easing.out(Easing.cubic))}
                  className="flex-1 pl-3.5 pb-4"
                  accessible={true}
                  accessibilityLabel={`${moment.when}. ${moment.title}. ${moment.body}`}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.steel, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {moment.when}
                  </Text>
                  <Text style={{ fontSize: 15.5, fontWeight: "600", color: c.ink, marginTop: 2, letterSpacing: -0.2 }}>
                    {moment.title}
                  </Text>
                  {!compact && (
                    <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.slate, marginTop: 2 }}>
                      {moment.body}
                    </Text>
                  )}
                </Animated.View>
              </View>
            );
          })}

          {/* ── End of the day: the score ── */}
          <View
            className="flex-row pb-3"
            accessible={true}
            accessibilityLabel="By tonight. Your Heart Health Stability Score. One clear number, updated as you log."
          >
            <View className="w-8 items-center">
              <Animated.View
                entering={ZoomIn.delay(FINAL_MS).springify().damping(10).stiffness(140)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  backgroundColor: c.tint,
                  borderWidth: 1,
                  borderColor: "#BFDBFE",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -2,
                }}
              >
                <BeatingHeart size={20} delay={FINAL_MS + 400} />
              </Animated.View>
            </View>
            <Animated.View entering={FadeInLeft.delay(FINAL_MS).duration(380).easing(Easing.out(Easing.cubic))} className="flex-1 pl-3.5">
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>
                By tonight
              </Text>
              <Text style={{ fontSize: 15.5, fontWeight: "600", color: c.ink, marginTop: 2, letterSpacing: -0.2 }}>
                Your Heart Health Stability Score
              </Text>
              {!compact && (
                <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.slate, marginTop: 2 }}>
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
        style={{
          paddingHorizontal: 24,
          paddingTop: compact ? 12 : 16,
          paddingBottom: compact ? 12 : 20,
          borderTopWidth: 1,
          borderTopColor: c.hairlineSoft,
          gap: 6,
        }}
      >
        <DsButton
          label="Get started"
          onPress={handleGetStarted}
          icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
          accessibilityHint="Opens the registration screen"
        />
        <View className="flex-row justify-center items-center pt-1">
          <Text style={{ fontSize: 14, color: c.slate }}>Already have an account? </Text>
          <DsButton
            label="Log in"
            variant="link"
            block={false}
            onPress={() => router.push("/login")}
            accessibilityHint="Opens the login screen"
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
