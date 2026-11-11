import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  AccessibilityInfo,
} from "react-native";
import { useColorScheme } from "../../hooks/useAppColorScheme";
import Reanimated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import * as Haptics from "expo-haptics";
import { bandName, theme } from "../../constants/theme";

/**
 * ScoreRing — stroke-drawn beating heart gauge (ported template).
 * Kept in the same component slot/props as the old liquid heart so the
 * dashboard is untouched: score fill arc, BPM-paced heartbeat and a
 * celebration ripple on mission save. HL-144: the centre shows the habits score
 * only (the owner asked to drop the rotating BP, pulse and streak views).
 *
 * Porting notes vs the template:
 * - strokeDashoffset/shimmer run with useNativeDriver:false (SVG attributes
 *   cannot be natively driven; forcing it only warns and janks).
 * - Count-up setState is guarded to integer changes (no per-frame renders).
 * - Tier colors + dark mode replace the hardcoded rose scheme.
 * - Size, BPM, vitals, and streak come from props, not constants.
 */

// ─── theme tokens ─────────────────────────────────────────────────────────────

function getHeartTokens(score: number, isDark: boolean) {
  const cleanTrack = isDark ? "#1E293B" : "#F1F5F9"; // slate-800 or slate-100
  if (!score || score <= 0) {
    return {
      arcColor: isDark ? "#64748B" : "#94A3B8",
      deepColor: isDark ? "#334155" : "#9AA5B1",
      trackColor: cleanTrack,
      label: "Score unavailable",
    };
  }
  if (score >= 80) {
    return {
      arcColor: "#38bdf8", // Sky 400
      deepColor: isDark ? "#0c4a6e" : "#0369a1",
      trackColor: cleanTrack,
      label: "Stable",
    };
  }
  if (score >= 60) {
    return {
      arcColor: "#38bdf8", // Sky 400
      deepColor: "#5f430f",
      trackColor: cleanTrack,
      label: "Moderate",
    };
  }
  if (score >= 50) {
    return {
      arcColor: "#38bdf8", // Sky 400
      deepColor: "#7c2d12",
      trackColor: cleanTrack,
      label: "Elevated Risk",
    };
  }
  return {
    arcColor: "#38bdf8", // Sky 400
    deepColor: "#4a100d",
    trackColor: cleanTrack,
    label: "Critical",
  };
}

// ─── constants ────────────────────────────────────────────────────────────────

const HEART =
  "M120 195 C120 195 30 140 30 82 C30 52 52 32 80 32 C96 32 110 40 120 52 C130 40 144 32 160 32 C188 32 210 52 210 82 C210 140 120 195 120 195 Z";

const VIEWBOX_SIZE = 240;
const PATH_LEN = 460; // approximate heart path length in viewBox units

const PARTICLES: { x: number; y: number; delay: number; size: number }[] = [
  { x: 85, y: 60, delay: 100, size: 5 },
  { x: 155, y: 60, delay: 400, size: 4 },
  { x: 65, y: 100, delay: 700, size: 3 },
  { x: 175, y: 100, delay: 200, size: 4 },
  { x: 120, y: 195, delay: 500, size: 5 },
  { x: 100, y: 170, delay: 900, size: 3 },
  { x: 140, y: 170, delay: 600, size: 3 },
];

// ─── animated path wrapper ────────────────────────────────────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── particle ─────────────────────────────────────────────────────────────────

function Particle({
  x,
  y,
  delay,
  size,
  color,
  stageSize,
}: (typeof PARTICLES)[0] & { color: string; stageSize: number }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 0.4, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const px = (x / VIEWBOX_SIZE) * stageSize;
  const py = (y / VIEWBOX_SIZE) * stageSize;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: px - size / 2,
        top: py - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    />
  );
}

// ─── ping ring ────────────────────────────────────────────────────────────────

function PingRing({ delay, color, stageSize }: { delay: number; color: string; stageSize: number }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0.2, 0] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ scale }], opacity },
      ]}
    >
      <Svg width={stageSize} height={stageSize} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        <Path d={HEART} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  size?: number;
  color?: string;
  refreshTrigger?: any;
  /** Rising count (e.g. completed missions) that fires a celebration burst. */
  celebrateTrigger?: number;
  /** Paces the heartbeat animation only; it isn't shown */
  bpm?: number | null;
  trend?: string | null;
}

// ─── main component ───────────────────────────────────────────────────────────

export function ScoreRing({
  score,
  size = 180,
  color,
  refreshTrigger,
  celebrateTrigger,
  bpm,
  trend,
}: ScoreRingProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [reduceMotion, setReduceMotion] = useState(false);
  const [fillScore, setFillScore] = useState(0);
  const [done, setDone] = useState(false);

  const hasScore = typeof score === "number" && score > 0;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, score)) : 0;
  const targetScore = Math.round(clampedScore);
  const targetDash = PATH_LEN * (1 - targetScore / 100);

  const tokens = getHeartTokens(score, isDark);
  const heartColor = color || tokens.arcColor;

  // Beat period from logged BPM (resting default when unknown).
  const beatPeriod =
    typeof bpm === "number" && bpm >= 30 && bpm <= 250
      ? Math.max(500, Math.min(1500, Math.round((60000 / bpm) * 1.06)))
      : 1060;
  const beatK = beatPeriod / 1060;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
  }, []);

  // stroke dash offsets (SVG attrs: JS driver by necessity)
  const [dashOffset] = useState(() => new Animated.Value(PATH_LEN));
  const [glowOffset] = useState(() => new Animated.Value(PATH_LEN));

  // heartbeat scale
  const [heartbeat] = useState(() => new Animated.Value(1));
  const heartbeatLoop = useRef<Animated.CompositeAnimation | null>(null);

  // shimmer position
  const [shimmer] = useState(() => new Animated.Value(0));
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null);

  // score label entrance
  const [scoreFade] = useState(() => new Animated.Value(0));
  const [scoreSlide] = useState(() => new Animated.Value(8));
  const [labelFade] = useState(() => new Animated.Value(0));

  // celebration ripple (mission saves)
  const [burstAnim] = useState(() => new Animated.Value(0));
  const prevCelebrate = useRef<number | undefined>(undefined);
  const burstMounted = useRef(false);

  const lastShown = useRef(-1);

  // ── fill animation (replays on score change + pull-to-refresh) ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restarting the fill animation resets what it has shown so far
    setDone(false);
    lastShown.current = -1;
    heartbeatLoop.current?.stop();
    shimmerLoop.current?.stop();

    if (reduceMotion || !hasScore) {
      dashOffset.setValue(hasScore ? targetDash : PATH_LEN);
      glowOffset.setValue(hasScore ? targetDash : PATH_LEN);
      setFillScore(hasScore ? targetScore : 0);
      setDone(hasScore);
      scoreFade.setValue(hasScore ? 1 : 0);
      scoreSlide.setValue(0);
      labelFade.setValue(hasScore ? 1 : 0);
      return;
    }

    Animated.parallel([
      Animated.timing(dashOffset, {
        toValue: targetDash,
        duration: 1800,
        easing: Easing.out((t) => 1 - Math.pow(1 - t, 4)),
        useNativeDriver: false,
      }),
      Animated.timing(glowOffset, {
        toValue: targetDash,
        duration: 1800,
        easing: Easing.out((t) => 1 - Math.pow(1 - t, 4)),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setDone(true);

      // score label pop
      Animated.parallel([
        Animated.spring(scoreFade, { toValue: 1, useNativeDriver: true }),
        Animated.spring(scoreSlide, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 200 }),
        Animated.timing(labelFade, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      ]).start();

      // heartbeat loop (BPM-paced)
      heartbeatLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeat, { toValue: 1.07, duration: 100 * beatK, useNativeDriver: true }),
          Animated.timing(heartbeat, { toValue: 1.0, duration: 100 * beatK, useNativeDriver: true }),
          Animated.timing(heartbeat, { toValue: 1.04, duration: 80 * beatK, useNativeDriver: true }),
          Animated.timing(heartbeat, { toValue: 1.0, duration: 100 * beatK, useNativeDriver: true }),
          Animated.delay(680 * beatK),
        ])
      );
      heartbeatLoop.current.start();

      // shimmer loop
      shimmerLoop.current = Animated.loop(
        Animated.timing(shimmer, {
          toValue: -40,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      shimmerLoop.current.start();
    });

    return () => {
      dashOffset.stopAnimation();
      glowOffset.stopAnimation();
      heartbeatLoop.current?.stop();
      shimmerLoop.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore, hasScore, reduceMotion, refreshTrigger]);

  // count-up display (guarded: re-render only when the integer changes)
  useEffect(() => {
    const id = dashOffset.addListener(({ value }) => {
      const v = Math.min(targetScore, Math.round((1 - value / PATH_LEN) * 100));
      if (v !== lastShown.current) {
        lastShown.current = v;
        setFillScore(v);
      }
    });
    return () => dashOffset.removeListener(id);
  }, [dashOffset, targetScore]);

  // celebration burst on mission saves (mount + first load + resets never fire)
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
  }, [celebrateTrigger, reduceMotion, burstAnim]);

  const burstScale = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const burstFade = burstAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
  });

  // HL-144: one readout, the habits score (no rotating BP, pulse or streak views)
  const current = { value: hasScore ? String(fillScore) : "--" };

  const scoreColor = isDark ? "#FFFFFF" : "#0f172a";

  return (
    // HL-144: nothing to tap any more (the views no longer rotate), so a plain View
    <View
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Habits score ${hasScore ? targetScore : "unavailable"} of 100, ${bandName(tokens.label)}`}
      style={{ width: size, height: size }}
    >
      <View style={{ width: size, height: size }}>
        {/* Ping rings */}
        {done && !reduceMotion && <PingRing delay={0} color={heartColor} stageSize={size} />}
        {done && !reduceMotion && <PingRing delay={300} color={heartColor} stageSize={size} />}

        {/* Heartbeat wrapper */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ scale: heartbeat }] }]}
        >
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          >
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="62%" r="48%">
                <Stop offset="0%" stopColor={heartColor} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={heartColor} stopOpacity="0" />
              </RadialGradient>
              <Filter id="blur">
                <FeGaussianBlur stdDeviation="3" />
              </Filter>
            </Defs>

            {/* Ambient blob */}
            <Ellipse cx="120" cy="138" rx="88" ry="64" fill="url(#glow)" />

            {/* Blurred glow arc */}
            <AnimatedPath
              d={HEART}
              fill="none"
              stroke={heartColor}
              strokeWidth={18}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={PATH_LEN}
              strokeDashoffset={glowOffset}
              opacity={0.2}
            />

            {/* Track */}
            <Path
              d={HEART}
              fill="none"
              stroke={tokens.trackColor}
              strokeWidth={10}
              strokeLinejoin="round"
            />

            {/* Main filled arc */}
            <AnimatedPath
              d={HEART}
              fill="none"
              stroke={heartColor}
              strokeWidth={10}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={PATH_LEN}
              strokeDashoffset={dashOffset}
            />

            {/* Shimmer sweep */}
            {done && !reduceMotion && (
              <AnimatedPath
                d={HEART}
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="12 999"
                strokeDashoffset={shimmer}
                opacity={0.45}
              />
            )}
          </Svg>
        </Animated.View>

        {/* Particles */}
        {done && !reduceMotion && PARTICLES.map((p, i) => (
          <Particle key={i} {...p} color={heartColor} stageSize={size} />
        ))}

        {/* Center readout: the habits score */}
        {/* Narrowed to the heart's interior so text can't spill past its edges */}
        <View
          style={[
            styles.labelContainer,
            {
              left: Math.round(size * 0.16),
              right: Math.round(size * 0.16),
              paddingBottom: Math.round(size * 0.13)
            },
          ]}
          pointerEvents="none"
        >
          <Reanimated.View
            key={current.value}
            entering={reduceMotion ? undefined : FadeInDown.duration(260)}
            exiting={FadeOutUp.duration(200)}
            style={{ alignItems: "center" }}
          >
            <Animated.Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.6}
              style={[
                styles.scoreText,
                {
                  // HL-144: the score is the card's main number, so it's large; the card's title names it
                  fontSize: Math.round(size * 0.21),
                  lineHeight: Math.round(size * 0.24),
                  color: scoreColor,
                  opacity: scoreFade,
                  transform: [{ translateY: scoreSlide }],
                  width: "100%",
                  textAlign: "center",
                },
              ]}
            >
              {current.value}
            </Animated.Text>
            <Animated.Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
              style={[
                styles.scoreLabel,
                {
                  opacity: labelFade,
                  width: "100%",
                  textAlign: "center",
                  fontSize: Math.max(10, Math.round(size * 0.075))
                }
              ]}
            >
              {/* "Habits score" didn't fit inside the heart on a phone; the card's title already says it */}
              {hasScore ? `of 100${trend && trend !== "0" && trend !== "+0" ? ` ${trend.startsWith('-') ? '↓' : '↑'} ${Math.abs(parseInt(trend))}` : ''}` : ""}
            </Animated.Text>
          </Reanimated.View>
        </View>

        {/* Celebration ripple (mission saves) */}
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
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  labelContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontWeight: "700",
    letterSpacing: -2,
  },
  scoreLabel: {
    color: theme.textMuted,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 6,
  },
});
