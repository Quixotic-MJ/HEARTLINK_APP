import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  AccessibilityInfo,
} from "react-native";
import { useColorScheme } from "nativewind";
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  FadeInDown,
  Easing as ReEasing,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Rect, ClipPath, Stop, G, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

/**
 * ScoreRing (living heart) — the dashboard hero gauge.
 * A heart that fills from the bottom to the score, beats at the user's
 * heart rate, and cycles score → BP → pulse → streak on tap.
 *
 * - Fill: UI-thread animated SVG rect clipped to the heart path.
 * - Beat: lub-dub loop paced by logged BPM (resting default when unknown).
 * - Tap: cycles the center readout with a flip + haptic.
 * - Celebration ripple fires when celebrateTrigger rises past a baseline.
 */

const HEART_PATH =
  "M100 172 C58 132 20 102 20 62 C20 37 40 22 62 22 C78 22 94 32 100 46 " +
  "C106 32 122 22 138 22 C160 22 180 37 180 62 C180 102 142 132 100 172 Z";
const HEART_TOP = 22;
const HEART_BOTTOM = 172;
const HEART_H = HEART_BOTTOM - HEART_TOP;

const AnimatedRect = Reanimated.createAnimatedComponent(Rect);
const AnimatedG = Reanimated.createAnimatedComponent(G);
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/* Wave strip: 400 wide, sine crest (period 100) around local y=0, body below.
   Scrolling it by exactly one period loops seamlessly. */
const WAVE_D =
  "M-100,4 Q-75,-3 -50,4 T0,4 T50,4 T100,4 T150,4 T200,4 T250,4 T300,4 " +
  "L300,220 L-100,220 Z";

const BUBBLES = [
  { x: 72,  r: 2.5, travel: 60, phase: 0,    duration: 2800 },
  { x: 85,  r: 3.5, travel: 78, phase: 0.15, duration: 3400 },
  { x: 100, r: 4,   travel: 90, phase: 0.3,  duration: 2600 },
  { x: 115, r: 3,   travel: 68, phase: 0.45, duration: 3100 },
  { x: 128, r: 2.5, travel: 72, phase: 0.6,  duration: 2900 },
  { x: 92,  r: 2,   travel: 55, phase: 0.72, duration: 3300 },
  { x: 140, r: 3.5, travel: 82, phase: 0.85, duration: 2700 },
  { x: 78,  r: 4,   travel: 95, phase: 0.92, duration: 3600 },
  { x: 60,  r: 2,   travel: 50, phase: 0.05, duration: 3000 },
  { x: 120, r: 2.5, travel: 65, phase: 0.38, duration: 2500 },
];
const BUBBLE_START_Y = 168;

/**
 * One fizz bubble — owns its own looping animation.
 * Starts at `phase` and animates to `phase + 1` on repeat. Because
 * `t % 1` is the same at both ends the loop is perfectly seamless with
 * no teleport jump.
 */
function Bubble({
  x,
  r,
  travel,
  phase,
  duration,
}: {
  x: number;
  r: number;
  travel: number;
  phase: number;
  duration: number;
}) {
  const t = useSharedValue(phase);

  useEffect(() => {
    t.value = phase;
    t.value = withRepeat(
      withTiming(phase + 1, { duration, easing: ReEasing.linear }),
      -1,
      false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props = useAnimatedProps(() => {
    const local = t.value % 1;
    return {
      cy: BUBBLE_START_Y - local * travel,
      opacity: Math.sin(local * Math.PI) * 0.55,
    };
  });

  return <AnimatedCircle cx={x} r={r} fill="#FFFFFF" animatedProps={props} />;
}

function getHeartTokens(score: number, isDark: boolean) {
  if (!score || score <= 0) {
    return {
      arcColor: isDark ? "#64748B" : "#94A3B8",
      deepColor: isDark ? "#334155" : "#9AA5B1",
      trackColor: isDark ? "#1E293B" : "#E2E8E5",
      label: "Score unavailable",
    };
  }
  if (score >= 80) {
    return {
      arcColor: isDark ? "#4FA79A" : "#1B6E63",
      deepColor: isDark ? "#0C2E29" : "#0E3B33",
      trackColor: isDark ? "#163B36" : "#E3EFEC",
      label: "Stable",
    };
  }
  if (score >= 60) {
    return {
      arcColor: isDark ? "#C99A3E" : "#A9741B",
      deepColor: "#5f430f",
      trackColor: isDark ? "#3A2D12" : "#F6EDDD",
      label: "Moderate",
    };
  }
  if (score >= 50) {
    return {
      arcColor: isDark ? "#D0714E" : "#C0502E",
      deepColor: "#7c2d12",
      trackColor: isDark ? "#3D211A" : "#FBEAE6",
      label: "Elevated Risk",
    };
  }
  return {
    arcColor: isDark ? "#D15C4E" : "#8A1F1A",
    deepColor: "#4a100d",
    trackColor: isDark ? "#3A1A16" : "#FBEAE9",
    label: "Critical",
  };
}

interface ScoreRingProps {
  score: number;
  size?: number;
  color?: string;
  refreshTrigger?: any;
  /** Rising count (e.g. completed missions) that fires a celebration burst. */
  celebrateTrigger?: number;
  systolic?: number | null;
  diastolic?: number | null;
  bpm?: number | null;
  streakDays?: number;
}

export function ScoreRing({
  score,
  size = 180,
  color,
  refreshTrigger,
  celebrateTrigger,
  systolic,
  diastolic,
  bpm,
  streakDays = 0,
}: ScoreRingProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [reduceMotion, setReduceMotion] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);

  const hasScore = typeof score === "number" && score > 0;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, score)) : 0;
  const fillTarget = clampedScore / 100;
  const tokens = getHeartTokens(score, isDark);
  const heartColor = color || tokens.arcColor;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
  }, []);

  /* ── Fill + wave (all UI thread, zero re-renders) ── */
  const fillP = useSharedValue(0);
  const waveX = useSharedValue(0);
  // bubT removed — each Bubble owns its own shared value for seamless looping.

  useEffect(() => {
    fillP.value = reduceMotion
      ? fillTarget
      : withTiming(fillTarget, { duration: 1400, easing: ReEasing.out(ReEasing.cubic) });
  }, [fillTarget, reduceMotion, refreshTrigger, fillP]);

  useEffect(() => {
    if (reduceMotion || !hasScore) return;
    // One period (100 units) per loop = seamless wrap.
    waveX.value = withRepeat(
      withTiming(-100, { duration: 2200, easing: ReEasing.linear }),
      -1,
      false
    );
  }, [hasScore, reduceMotion, waveX]);

  const rectProps = useAnimatedProps(() => {
    const h = HEART_H * fillP.value;
    return { y: HEART_BOTTOM - h, height: Math.max(0, h) };
  });

  // Wave crest tracks the fill surface while scrolling sideways.
  const waveProps = useAnimatedProps(() => ({
    x: -100 + waveX.value,
    y: HEART_BOTTOM - HEART_H * fillP.value,
  }));

  /* ── Beat (lub-dub paced by logged BPM, resting default) ── */
  const period =
    typeof bpm === "number" && bpm >= 30 && bpm <= 250
      ? Math.max(400, Math.min(1500, Math.round(60000 / bpm)))
      : 940;
  const beatAnim = useRef(new Animated.Value(0)).current;

  // Beat animation intentionally disabled — heart stays still.
  useEffect(() => {
    beatAnim.setValue(0);
  }, [beatAnim]);

  const beatScale = beatAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1.035, 1.07],
  });

  /* ── Celebration burst (mount + first load + resets never fire) ── */
  const burstAnim = useRef(new Animated.Value(0)).current;
  const prevCelebrate = useRef<number | undefined>(undefined);
  const burstMounted = useRef(false);

  useEffect(() => {
    if (!burstMounted.current) {
      burstMounted.current = true;
      prevCelebrate.current = celebrateTrigger;
      return;
    }
    const prev = prevCelebrate.current;
    prevCelebrate.current = celebrateTrigger;
    if (
      reduceMotion ||
      celebrateTrigger === undefined ||
      prev === undefined ||
      prev <= 0 ||
      celebrateTrigger <= prev
    ) {
      return;
    }
    burstAnim.setValue(0);
    Animated.timing(burstAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [celebrateTrigger, reduceMotion, burstAnim]);

  const burstScale = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const burstFade = burstAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
  });

  /* ── Tap-to-cycle readout ── */
  const bpValue = systolic != null && diastolic != null ? `${systolic}/${diastolic}` : "--/--";
  const states = [
    {
      label: "SCORE",
      value: hasScore ? String(Math.round(clampedScore)) : "--",
      unit: tokens.label,
    },
    { label: "BP", value: bpValue, unit: "mmHg" },
    { label: "PULSE", value: bpm != null ? String(bpm) : "--", unit: "BPM" },
    { label: "STREAK", value: `${streakDays} day${streakDays === 1 ? "" : "s"}`, unit: "keep going" },
  ];
  const current = states[cycleIdx % states.length];
  const lowFill = fillTarget < 0.35 && !isDark;
  const inkColor = lowFill ? "#152131" : "#FFFFFF";
  const subColor = lowFill ? "#5C6B66" : "rgba(255,255,255,0.9)";

  const glowSize = Math.round(size * 1.22);
  const glowOffset = -Math.round(size * 0.11);
  // Layered hearts breathe as one soft glow (crisp circles read as "disc", not heart).
  const haloBreath = beatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Heart score ${hasScore ? Math.round(clampedScore) : "unavailable"} of 100, ${tokens.label}. Showing ${current.label}. Tap to cycle views.`}
      onPress={() => {
        Haptics.selectionAsync();
        setCycleIdx((i) => (i + 1) % states.length);
      }}
      style={{ width: size, height: size }}
    >
      <Animated.View style={{ width: size, height: size, transform: [{ scale: beatScale }] }}>
        {/* Heart-shaped halo (layered silhouettes breathe with the beat) */}
        {hasScore && !reduceMotion && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: glowOffset,
              left: glowOffset,
              width: glowSize,
              height: glowSize,
              opacity: haloBreath,
            }}
          >
            <Svg viewBox="-25 -25 250 250" style={{ width: glowSize, height: glowSize }}>
              <G transform="translate(100,100) scale(1.14) translate(-100,-100)">
                <Path d={HEART_PATH} fill={heartColor} opacity={0.1} />
              </G>
              <Path d={HEART_PATH} fill={heartColor} opacity={0.16} />
            </Svg>
          </Animated.View>
        )}

        {/* Heart gauge */}
        <Svg viewBox="0 0 200 200" style={{ width: size, height: size }}>
          <Defs>
            <LinearGradient id="heartFill" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={tokens.deepColor} />
              <Stop offset="1" stopColor={heartColor} />
            </LinearGradient>
            <ClipPath id="heartClip">
              <Path d={HEART_PATH} />
            </ClipPath>
          </Defs>
          <Path d={HEART_PATH} fill={tokens.trackColor} />
          {/* Softened liquid body: base fill + scrolling crest + fizz, clipped to the heart */}
          <G clipPath="url(#heartClip)" opacity={0.92}>
            <AnimatedRect x="0" width="200" fill="url(#heartFill)" animatedProps={rectProps} />
            {!reduceMotion && hasScore && (
              <AnimatedG animatedProps={waveProps}>
                <Path d={WAVE_D} fill="url(#heartFill)" />
              </AnimatedG>
            )}
            {!reduceMotion &&
              hasScore &&
              BUBBLES.map((b, i) => (
                <Bubble key={i} x={b.x} r={b.r} travel={b.travel} phase={b.phase} duration={b.duration} />
              ))}
          </G>
          <Path d={HEART_PATH} fill="none" stroke={heartColor} strokeWidth={4} />
        </Svg>

        {/* Center readout (scaled to stage; anchored upper-center where the heart is widest) */}
        <Reanimated.View
          key={`${cycleIdx}-${current.value}`}
          entering={reduceMotion ? undefined : FadeInDown.duration(220)}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: Math.round(size * 0.12),
          }}
        >
          {/* Label */}
          <Text
            numberOfLines={1}
            style={{
              fontSize: Math.max(8, Math.round(size * 0.042)),
              fontWeight: "700",
              letterSpacing: 1.8,
              color: lowFill ? "#152131" : "rgba(255,255,255,0.95)",
              textShadowColor: lowFill ? "transparent" : "rgba(0,0,0,0.55)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            {current.label}
          </Text>
          {/* Main value */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.65}
            maxFontSizeMultiplier={1}
            style={{
              fontSize: Math.round(size * 0.13),
              fontWeight: "800",
              color: lowFill ? "#152131" : "#FFFFFF",
              fontVariant: ["tabular-nums"],
              textShadowColor: lowFill ? "transparent" : "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 10,
            }}
          >
            {current.value}
          </Text>
          {/* Unit / sublabel */}
          <Text
            numberOfLines={1}
            style={{
              fontSize: Math.max(8, Math.round(size * 0.046)),
              fontWeight: "600",
              color: lowFill ? "#5C6B66" : "rgba(255,255,255,0.9)",
              textShadowColor: lowFill ? "transparent" : "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 5,
            }}
          >
            {current.unit}
          </Text>
        </Reanimated.View>

        {/* Celebration ripple */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: heartColor,
            opacity: burstFade,
            transform: [{ scale: burstScale }],
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
