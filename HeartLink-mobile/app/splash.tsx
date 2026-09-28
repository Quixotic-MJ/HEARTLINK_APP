import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Animated, Easing, useColorScheme, AccessibilityInfo, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "../components/ui/HeartLogo";
import Svg, { Path } from "react-native-svg";
import "../global.css";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import { Colors } from "../constants/theme";

const THEME = {
  light: {
    ink: Colors.light.ink,
    inkSoft: Colors.light.textSoft,
    paper: Colors.light.background,
    coral: Colors.light.primary,
    accent: Colors.light.blue,
    accentSoft: "rgba(43, 132, 255, 0.08)",
    ring1: "rgba(43, 132, 255, 0.12)",
    ring2: "rgba(43, 132, 255, 0.07)",
    ring3: "rgba(43, 132, 255, 0.04)",
    ecgLine: Colors.light.blue,
    ecgGlow: "rgba(43, 132, 255, 0.3)",
    loadingDot: Colors.light.blue,
    statusBar: "dark" as const,
  },
  dark: {
    ink: Colors.dark.ink,
    inkSoft: Colors.dark.textSoft,
    paper: Colors.dark.background,
    coral: Colors.dark.primary,
    accent: Colors.dark.blue,
    accentSoft: "rgba(43, 132, 255, 0.06)",
    ring1: "rgba(43, 132, 255, 0.10)",
    ring2: "rgba(43, 132, 255, 0.06)",
    ring3: "rgba(43, 132, 255, 0.03)",
    ecgLine: Colors.dark.blue,
    ecgGlow: "rgba(43, 132, 255, 0.25)",
    loadingDot: Colors.dark.blue,
    statusBar: "light" as const,
  },
};

const MAX_LOAD_WAIT_MS = 4000;

// ─── Animated SVG path ────────────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Ambient glow blob ────────────────────────────────────────────────────────
function GlowBlob({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.06 }} />
      <View style={{ position: "absolute", width: size * 0.7, height: size * 0.7, borderRadius: (size * 0.7) / 2, backgroundColor: color, opacity: 0.09 }} />
      <View style={{ position: "absolute", width: size * 0.42, height: size * 0.42, borderRadius: (size * 0.42) / 2, backgroundColor: color, opacity: 0.14 }} />
    </View>
  );
}

// ─── Expanding ring ───────────────────────────────────────────────────────────
function PulseRing({
  color,
  size,
  scale,
  opacity,
}: {
  color: string;
  size: number;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Splash Screen ───────────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();
  const { userId, user, isLoading } = useUser();
  const scheme = useColorScheme();
  const colors = THEME[scheme === "dark" ? "dark" : "light"];

  // ── Entrance animations ──
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [iconFade] = useState(() => new Animated.Value(0));
  const [iconScale] = useState(() => new Animated.Value(0.5));
  const [wordmarkFade] = useState(() => new Animated.Value(0));
  const [wordmarkSlide] = useState(() => new Animated.Value(20));
  const [tagFade] = useState(() => new Animated.Value(0));
  const [ecgProgress] = useState(() => new Animated.Value(0));
  const [ecgFade] = useState(() => new Animated.Value(0));
  const [bottomFade] = useState(() => new Animated.Value(0));

  // ── Idle heartbeat pulse ──
  const [pulse] = useState(() => new Animated.Value(0));
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Ripple rings ──
  const [ring1] = useState(() => new Animated.Value(0));
  const [ring2] = useState(() => new Animated.Value(0));
  const [ring3] = useState(() => new Animated.Value(0));
  const ringLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Loading dots ──
  const [dot1] = useState(() => new Animated.Value(0.3));
  const [dot2] = useState(() => new Animated.Value(0.3));
  const [dot3] = useState(() => new Animated.Value(0.3));
  const dotLoop = useRef<Animated.CompositeAnimation | null>(null);

  const isMounted = useRef(true);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasNavigated = useRef(false);

  const handleProceed = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (userId) {
      if (user && user.onboarding_status === "complete") {
        router.replace("/(home)/(tabs)/dashboard");
      } else {
        router.replace({
          pathname: "/(baseline)/step1_basic_info",
          params: { user_id: userId },
        });
      }
    } else {
      router.replace("/onboarding");
    }
  }, [router, userId, user]);

  // Respect reduced-motion
  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isActive) setReduceMotion(enabled);
    });
    return () => {
      isActive = false;
    };
  }, []);

  // ── Main animation sequence ──
  useEffect(() => {
    isMounted.current = true;

    const fast = reduceMotion;
    const dur = (ms: number) => (fast ? Math.min(ms, 200) : ms);

    Animated.sequence([
      // Stage 1: Background fades in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: dur(600),
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      // Stage 2: ECG line draws itself across the screen
      Animated.parallel([
        Animated.timing(ecgFade, {
          toValue: 1,
          duration: dur(200),
          useNativeDriver: true,
        }),
        Animated.timing(ecgProgress, {
          toValue: 1,
          duration: dur(900),
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // Stage 3: Logo springs in at the center of the ECG
      Animated.parallel([
        fast
          ? Animated.timing(iconScale, { toValue: 1, duration: 150, useNativeDriver: true })
          : Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(iconFade, {
          toValue: 1,
          duration: dur(300),
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // ECG fades out as logo arrives
        Animated.timing(ecgFade, {
          toValue: 0.15,
          duration: dur(400),
          delay: fast ? 0 : 200,
          useNativeDriver: true,
        }),
      ]),

      // Stage 4: Wordmark and tagline slide up
      Animated.parallel([
        Animated.timing(wordmarkFade, {
          toValue: 1,
          duration: dur(350),
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkSlide, {
          toValue: 0,
          duration: dur(350),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tagFade, {
          toValue: 1,
          duration: dur(450),
          delay: fast ? 0 : 120,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bottomFade, {
          toValue: 1,
          duration: dur(500),
          delay: fast ? 0 : 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (!isMounted.current) return;
      setAnimationFinished(true);

      if (reduceMotion) return;

      // Stage 5: Idle heartbeat pulse
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.7, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      // Stage 5b: Ripple rings expand outward
      ringLoop.current = Animated.loop(
        Animated.stagger(400, [
          Animated.sequence([
            Animated.timing(ring1, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring2, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring3, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring3, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      ringLoop.current.start();

      // Stage 5c: Loading dots animation
      dotLoop.current = Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );
      dotLoop.current.start();
    });

    return () => {
      isMounted.current = false;
      pulseLoop.current?.stop();
      ringLoop.current?.stop();
      dotLoop.current?.stop();
    };
  }, [fadeAnim, iconFade, iconScale, wordmarkFade, wordmarkSlide, pulse, tagFade, ecgProgress, ecgFade, bottomFade, reduceMotion, ring1, ring2, ring3, dot1, dot2, dot3]);

  // Failsafe timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setLoadTimedOut(true);
    }, MAX_LOAD_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Navigate once ready
  useEffect(() => {
    if (animationFinished && (!isLoading || loadTimedOut)) {
      handleProceed();
    }
  }, [animationFinished, isLoading, loadTimedOut, handleProceed]);

  // ── Derived values ──
  const beatScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const ringScale = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.5] });
  const ringOpacity = (v: Animated.Value) => v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 0] });

  // ECG dash animation
  const ECG_TOTAL_LENGTH = 520;
  const ecgDashOffset = ecgProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [ECG_TOTAL_LENGTH, 0],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top", "bottom"]}>
      <StatusBar style={colors.statusBar} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>

          {/* ── Ripple Rings ── */}
          {!reduceMotion && (
            <>
              <PulseRing color={colors.ring1} size={180} scale={ringScale(ring1)} opacity={ringOpacity(ring1)} />
              <PulseRing color={colors.ring2} size={180} scale={ringScale(ring2)} opacity={ringOpacity(ring2)} />
              <PulseRing color={colors.ring3} size={180} scale={ringScale(ring3)} opacity={ringOpacity(ring3)} />
            </>
          )}

          {/* ── Ambient glow ── */}
          <Animated.View
            pointerEvents="none"
            style={
              reduceMotion
                ? { position: "absolute", opacity: 0.8 }
                : { position: "absolute", opacity: glowOpacity, transform: [{ scale: glowScale }] }
            }
          >
            <GlowBlob color={colors.accent} size={280} />
          </Animated.View>

          {/* ── ECG heartbeat line ── */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              opacity: ecgFade,
            }}
          >
            <Svg
              width={SCREEN_WIDTH * 0.85}
              height={80}
              viewBox="0 0 400 80"
            >
              <AnimatedPath
                d="M0,40 L80,40 L100,40 L120,15 L140,65 L160,25 L180,55 L200,40 L220,40 L240,40 L260,38 L280,40 L300,40 L320,40 L340,38 L360,40 L400,40"
                fill="none"
                stroke={colors.ecgLine}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={ECG_TOTAL_LENGTH}
                strokeDashoffset={ecgDashOffset}
              />
            </Svg>
          </Animated.View>

          {/* ── Heart logo mark ── */}
          <Animated.View
            style={{
              opacity: iconFade,
              transform: reduceMotion ? undefined : [{ scale: Animated.multiply(iconScale, beatScale) }],
              marginBottom: 24,
            }}
            accessibilityRole="image"
            accessibilityLabel="HeartLink logo"
          >
            <HeartLogo size={80} />
          </Animated.View>

          {/* ── Wordmark ── */}
          <Animated.View
            style={{
              opacity: wordmarkFade,
              transform: [{ translateY: wordmarkSlide }],
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 36,
                letterSpacing: -0.8,
                textAlign: "center",
                fontWeight: "700",
              }}
              accessibilityRole="header"
            >
              HeartLink
              <Text style={{ fontSize: 13, color: colors.inkSoft, fontWeight: "400" }}>™</Text>
            </Text>
          </Animated.View>

          {/* ── Tagline ── */}
          <Animated.View style={{ opacity: tagFade }}>
            <Text
              style={{
                color: colors.inkSoft,
                fontSize: 11.5,
                letterSpacing: 3,
                textTransform: "uppercase",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Cardiovascular well-being
            </Text>
          </Animated.View>
        </View>

        {/* ── Bottom loading indicator ── */}
        <Animated.View
          style={{
            opacity: bottomFade,
            paddingBottom: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {/* Animated dots */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: colors.loadingDot,
                  opacity: dot,
                }}
              />
            ))}
          </View>
          <Text
            style={{
              color: colors.inkSoft,
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            Preparing your dashboard
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}