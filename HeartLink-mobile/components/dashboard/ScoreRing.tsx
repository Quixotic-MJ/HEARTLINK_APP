import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, AccessibilityInfo } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreTheme = {
  label: string;
  ringColor: string;
  trackColor: string;
  glowColor: string;
};

function getScoreTheme(score: number, isDark: boolean): ScoreTheme {
  if (score >= 80)
    return {
      label: "Stable",
      ringColor: isDark ? "#34D399" : "#10B981",
      trackColor: isDark ? "#064E3B" : "#D1FAE5",
      glowColor: "#10B981",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      ringColor: isDark ? "#FACC15" : "#EAB308",
      trackColor: isDark ? "#713F12" : "#FEF9C3",
      glowColor: "#EAB308",
    };
  if (score >= 50)
    return {
      label: "Elevated Risk",
      ringColor: isDark ? "#FB923C" : "#F97316",
      trackColor: isDark ? "#7C2D12" : "#FFEDD5",
      glowColor: "#F97316",
    };
  return {
    label: "Critical",
    ringColor: isDark ? "#F87171" : "#EF4444",
    trackColor: isDark ? "#7F1D1D" : "#FEE2E2",
    glowColor: "#EF4444",
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
  const [displayScore, setDisplayScore] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const theme = getScoreTheme(score, isDark);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 1400;

    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: score,
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
  }, [score, reduceMotion]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: score }}
      accessibilityLabel={`Heart health score: ${score} out of 100. Status: ${theme.label}`}
      className="items-center justify-center self-center"
      style={{
        width: size,
        height: size,
        opacity: mountAnim,
        transform: [
          {
            scale: mountAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
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
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="70%" stopColor={theme.glowColor} stopOpacity={0} />
            <Stop offset="100%" stopColor={theme.glowColor} stopOpacity={0.16} />
          </RadialGradient>
        </Defs>

        {/* Soft ambient glow behind the ring, tuned to status */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius + strokeWidth / 2}
          fill="url(#glow)"
        />

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated progress ring */}
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
      </Svg>

      {/* Score text inside ring */}
      <View className="items-center justify-center">
        <Text
          className="text-[52px] font-light text-slate-900 dark:text-white leading-[56px]"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {displayScore}
        </Text>
        <Text className="text-[11px] text-slate-400 dark:text-slate-300 tracking-widest">
          /100
        </Text>
      </View>
    </Animated.View>
  );
}
