import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, AccessibilityInfo } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreTheme = {
  label: string;
  ringColor: string;
  trackColor: string;
  glowColor: string;
  innerGuideColor: string;
};

function getScoreTheme(score: number, isDark: boolean): ScoreTheme {
  if (!score || score <= 0) {
    return {
      label: "Score unavailable",
      ringColor: isDark ? "#475569" : "#cbd5e1",
      trackColor: isDark ? "#1e293b" : "#f1f5f9",
      glowColor: "transparent",
      innerGuideColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    };
  }
  if (score >= 80)
    return {
      label: "Stable",
      ringColor: isDark ? "#34D399" : "#10B981",
      trackColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5",
      glowColor: "#10B981",
      innerGuideColor: isDark ? "rgba(52, 211, 153, 0.12)" : "rgba(16, 185, 129, 0.1)",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      ringColor: isDark ? "#FACC15" : "#EAB308",
      trackColor: isDark ? "rgba(234, 179, 8, 0.15)" : "#FEF9C3",
      glowColor: "#EAB308",
      innerGuideColor: isDark ? "rgba(250, 204, 21, 0.12)" : "rgba(234, 179, 8, 0.1)",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      ringColor: isDark ? "#FB923C" : "#F97316",
      trackColor: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFEDD5",
      glowColor: "#F97316",
      innerGuideColor: isDark ? "rgba(251, 146, 60, 0.12)" : "rgba(249, 115, 22, 0.1)",
    };
  return {
    label: "Critical",
    ringColor: isDark ? "#F87171" : "#EF4444",
    trackColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
    glowColor: "#EF4444",
    innerGuideColor: isDark ? "rgba(248, 113, 113, 0.12)" : "rgba(239, 68, 68, 0.1)",
  };
}

export function ScoreRing({
  score,
  size = 180,
  strokeWidth = 12,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const animatedValue = useRef(new Animated.Value(0)).current;
  const mountAnim = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;
  const [displayScore, setDisplayScore] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const hasScore = typeof score === "number" && score > 0;
  const theme = getScoreTheme(score, isDark);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
  }, []);

  // Sync count-up progress animation
  useEffect(() => {
    const duration = reduceMotion ? 0 : 1400;
    const targetScore = hasScore ? score : 0;

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: targetScore,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(mountAnim, {
        toValue: 1,
        duration: reduceMotion ? 0 : 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    return () => animatedValue.removeListener(listenerId);
  }, [score, hasScore, reduceMotion]);

  // Organic heartbeat cadence animation
  useEffect(() => {
    if (reduceMotion || !hasScore) return;

    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.28,
          duration: 130,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1.0,
          duration: 110,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1.18,
          duration: 110,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1.0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ])
    );

    heartbeat.start();
    return () => heartbeat.stop();
  }, [reduceMotion, hasScore]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: hasScore ? score : 0 }}
      accessibilityLabel={
        hasScore
          ? `Heart health score: ${score} out of 100. Status: ${theme.label}`
          : "Heart health score is not available yet"
      }
      className="items-center justify-center self-center"
      style={{
        width: size,
        height: size,
        opacity: mountAnim,
        transform: [
          {
            scale: mountAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          },
        ],
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Defs>
          <RadialGradient id="scoreGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="65%" stopColor={theme.glowColor} stopOpacity={0} />
            <Stop offset="100%" stopColor={theme.glowColor} stopOpacity={hasScore ? 0.16 : 0} />
          </RadialGradient>
        </Defs>

        {/* Ambient radial glow tuned to health score */}
        {hasScore && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius + strokeWidth / 2}
            fill="url(#scoreGlow)"
          />
        )}

        {/* Main background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated precision progress ring */}
        {hasScore && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.ringColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Interior Metric Stack */}
      <View className="items-center justify-center">
        {/* Pulsing mini heart indicator */}
        <Animated.View
          style={{ transform: [{ scale: heartPulse }] }}
          className="items-center justify-center mb-0.5"
        >
          <Feather
            name="heart"
            size={Math.max(10, Math.round(size * 0.08))}
            color={theme.ringColor}
          />
        </Animated.View>

        {/* Tabular Score */}
        <Text
          className="font-bold text-foreground tracking-tight"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontSize: Math.round(size * 0.25),
            fontVariant: ["tabular-nums"],
            includeFontPadding: false,
            lineHeight: Math.round(size * 0.27),
            textAlignVertical: "center",
          }}
        >
          {hasScore ? displayScore : "--"}
        </Text>

        {/* Compact Subtitle Pill */}
        {size >= 140 ? (
          <View className="px-2 py-0.5 rounded-full bg-muted/20 mt-0.5">
            <Text
              className="text-[8px] font-semibold text-muted-foreground tracking-wider uppercase"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Health Score
            </Text>
          </View>
        ) : (
          <Text className="text-[9px] font-medium text-muted-foreground">
            HSS
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
