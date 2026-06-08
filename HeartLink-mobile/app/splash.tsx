import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import "../global.css";

// ─── Animated SVG Path ────────────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ECG waveform path drawn on a 320×80 viewBox.
// Flat line → small bump → sharp spike up → deep dip → recovery → flat
const ECG_PATH =
  "M0,40 L60,40 L72,40 L80,28 L88,40 L96,40 L104,8 L112,72 L118,40 L130,40 L138,32 L146,40 L260,40 L320,40";

// Total approximate stroke length for this path
const PATH_LENGTH = 380;

export default function SplashScreen() {
  // Entrance animations
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.9)).current;

  // ECG line draw progress (0 → 1)
  const drawAnim   = useRef(new Animated.Value(0)).current;

  // Glow pulse after draw completes
  const glowAnim   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // 1. Fade + scale the whole screen in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Draw the ECG line left to right
      Animated.timing(drawAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, // strokeDashoffset can't use native driver
      }).start(() => {
        // 3. Repeating glow pulse after draw
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.4,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
  }, []);

  // strokeDashoffset goes from PATH_LENGTH (hidden) → 0 (fully drawn)
  const strokeDashoffset = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PATH_LENGTH, 0],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      edges={["top", "bottom"]}
    >
      <StatusBar style="light" />

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
      >
        {/* ── Center ── */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>

          {/* App name */}
          <Text
            style={{
              color: "#fff",
              fontSize: 36,
              fontWeight: "300",
              letterSpacing: -1,
              marginBottom: 4,
            }}
          >
            Heart
            <Text style={{ fontWeight: "600" }}>Link</Text>
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 48,
            }}
          >
            Cardiovascular well-being
          </Text>

          {/* ── ECG pulse line ── */}
          <Animated.View style={{ opacity: glowAnim }}>
            <Svg
              width={320}
              height={80}
              viewBox="0 0 320 80"
            >
              <Defs>
                {/* Gradient: fades in from left, bright in middle, fades right */}
                <LinearGradient id="ecgGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#1e4ed8" stopOpacity="0.2" />
                  <Stop offset="0.3" stopColor="#60a5fa" stopOpacity="1" />
                  <Stop offset="0.6" stopColor="#fff" stopOpacity="1" />
                  <Stop offset="1" stopColor="#60a5fa" stopOpacity="0.3" />
                </LinearGradient>
              </Defs>

              {/* Dim track line */}
              <Path
                d={ECG_PATH}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1.5}
                fill="none"
              />

              {/* Animated draw line */}
              <AnimatedPath
                d={ECG_PATH}
                stroke="url(#ecgGrad)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={PATH_LENGTH}
                strokeDashoffset={strokeDashoffset}
              />
            </Svg>
          </Animated.View>

          {/* Dot that rides at the peak */}
          <Animated.View
            style={{
              opacity: glowAnim,
              marginTop: -56, // position dot near the spike
              marginLeft: 96, // approx x position of the spike
              alignSelf: "flex-start",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#fff",
                shadowColor: "#60a5fa",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 8,
              }}
            />
          </Animated.View>

        </View>

        {/* ── Footer ── */}
        <View style={{ paddingBottom: 32, alignItems: "center" }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 9,
              letterSpacing: 2.5,
              textTransform: "uppercase",
            }}
          >
            CTU — Main Campus · Capstone 2026
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}