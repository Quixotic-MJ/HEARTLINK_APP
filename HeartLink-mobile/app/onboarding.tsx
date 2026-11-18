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

// ─── Welcome ──────────────────────────────────────────────────────────────────
// 2026-11-18: a plain welcome (logo, name, one line) instead of the list of features, which promised things not
// every user gets (the 10-year heart risk is for ages 30 to 79 only). What the app does is shown later, in setup.

// Below this height the logo is smaller so nothing needs scrolling.
const COMPACT_HEIGHT = 700;

// ─── The logo, beating slowly ─────────────────────────────────────────────────

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
          withTiming(1.12, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 160 }),
          withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
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

// ─── Welcome Screen ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_HEIGHT;
  const { c, isDark } = useDs();
  const logoSize = compact ? 64 : 84;

  // No server pre-check here: registration reports connection errors on submit,
  // so a slow or sleeping server never blocks a new user at the first tap.
  const handleGetStarted = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Logo, name and one line, in the middle of the screen ── */}
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View
          entering={ZoomIn.duration(500).springify().damping(14).stiffness(140)}
          style={{
            width: logoSize + 44,
            height: logoSize + 44,
            borderRadius: (logoSize + 44) / 2,
            backgroundColor: c.tint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: compact ? 24 : 32,
          }}
        >
          <BeatingHeart size={logoSize} delay={900} />
        </Animated.View>

        {/* The animation sits on a wrapper, not on the Text: on Android an animated Text that wraps is measured as
            one line, so the second line ("HeartLink") was cut off. The title is two set lines for the same reason. */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500).easing(Easing.out(Easing.cubic))}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Welcome to HeartLink"
        >
          {["Welcome to", "HeartLink"].map((line) => (
            <Text
              key={line}
              style={{
                fontSize: compact ? 28 : 32,
                lineHeight: compact ? 34 : 38,
                fontWeight: "700",
                letterSpacing: -0.8,
                color: c.ink,
                textAlign: "center",
              }}
            >
              {line}
            </Text>
          ))}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(350).duration(500)} style={{ marginTop: 10, maxWidth: 300 }}>
          <Text
            style={{
              fontSize: compact ? 15 : 16,
              lineHeight: compact ? 22 : 24,
              color: c.slate,
              textAlign: "center",
            }}
          >
            Small daily habits for a healthier heart.
          </Text>
        </Animated.View>
      </View>

      {/* ── Actions (Fixed Footer) ── */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500).easing(Easing.out(Easing.cubic))}
        style={{
          paddingHorizontal: 24,
          paddingTop: compact ? 12 : 16,
          paddingBottom: compact ? 12 : 20,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.steel, textAlign: "center", marginBottom: 8 }}>
          For tracking and prevention. Not a diagnosis.
        </Text>
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
