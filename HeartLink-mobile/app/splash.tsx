import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "../components/ui/HeartLogo";
import "../global.css";

// ─── Design tokens (mirrors the web palette) ─────────────────────────────────
const INK = "#152131";
const INK_SOFT = "#5C6B66";
const PAPER = "#EDF1EF";
const CORAL = "#E8532E";

// ─── Ambient glow ─────────────────────────────────────────────────────────────
// React Native has no CSS blur, so the soft-edge look is faked with a few
// concentric, low-opacity circles instead of a single blurred shape.
function GlowBlob({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.05 }} />
      <View style={{ position: "absolute", width: size * 0.7, height: size * 0.7, borderRadius: (size * 0.7) / 2, backgroundColor: color, opacity: 0.08 }} />
      <View style={{ position: "absolute", width: size * 0.42, height: size * 0.42, borderRadius: (size * 0.42) / 2, backgroundColor: color, opacity: 0.12 }} />
    </View>
  );
}

// ─── Splash Screen ───────────────────────────────────────────────────────────

export default function SplashScreen() {
  const router = useRouter();
  const { userId, isLoading } = useUser();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconFade = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const tagFade = useRef(new Animated.Value(0)).current;

  // Drives the idle heartbeat loop that starts once the entrance finishes.
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const isMounted = useRef(true);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    isMounted.current = true;

    // Stage 1: screen fades in. Stage 2: icon, wordmark, and tagline pop in.
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(iconFade, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tagFade, {
          toValue: 1,
          duration: 500,
          delay: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (!isMounted.current) return;
      setAnimationFinished(true);

      // Stage 3: a quiet lub-dub heartbeat, then a rest — loops until unmount.
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
    });

    return () => {
      isMounted.current = false;
      pulseLoop.current?.stop();
    };
  }, []);

  // Navigate once both the entrance animation and the user data are ready.
  useEffect(() => {
    if (animationFinished && !isLoading) {
      if (userId) {
        router.replace("/(home)/(tabs)/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [animationFinished, isLoading, userId]);

  const beatScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>

          {/* Ambient glow, pulses in sync with the mark */}
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", opacity: glowOpacity, transform: [{ scale: glowScale }] }}
          >
            <GlowBlob color={CORAL} size={260} />
          </Animated.View>

          {/* Heart mark */}
          <Animated.View
            style={{
              opacity: iconFade,
              transform: [{ scale: Animated.multiply(iconScale, beatScale) }],
              marginBottom: 20,
            }}
          >
            <HeartLogo size={72} />
          </Animated.View>

          {/* Wordmark */}
          <Animated.View style={{ opacity: iconFade, transform: [{ scale: iconScale }], marginBottom: 8 }}>
            <Text style={{ color: INK, fontSize: 34, letterSpacing: -0.5, textAlign: "center", fontWeight: "600" }}>
              HeartLink
              <Text style={{ fontSize: 13, color: INK_SOFT, fontWeight: "400" }}>™</Text>
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: tagFade }}>
            <Text style={{ color: INK_SOFT, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>
              Cardiovascular well-being
            </Text>
          </Animated.View>

        </View>
      </Animated.View>
    </SafeAreaView>
  );
}