import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreTheme = {
  label: string;
  ringColor: string;
  trackColor: string;
};

function getScoreTheme(score: number, isDark: boolean): ScoreTheme {
  if (score >= 80)
    return {
      label: "Stable",
      ringColor: isDark ? "#2DD4BF" : "#0D9488",
      trackColor: isDark ? "#115E59" : "#CCFBF1",
    };
  if (score >= 60)
    return {
      label: "Moderate",
      ringColor: isDark ? "#FBBF24" : "#D97706",
      trackColor: isDark ? "#78350F" : "#FEF3C7",
    };
  if (score >= 40)
    return {
      label: "Caution",
      ringColor: isDark ? "#FB923C" : "#EA580C",
      trackColor: isDark ? "#7C2D12" : "#FFEDD5",
    };
  return {
    label: "At risk",
    ringColor: isDark ? "#FB7185" : "#E11D48",
    trackColor: isDark ? "#881337" : "#FFE4E6",
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
  const theme = getScoreTheme(score, isDark);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: score }}
      accessibilityLabel={`Heart health score: ${score} out of 100. Status: ${theme.label}`}
      className="items-center justify-center relative w-full aspect-square max-w-[200px] self-center"
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
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
      <View className="absolute items-center justify-center">
        <Text className="text-[52px] font-light text-slate-900 dark:text-white leading-[56px]">
          {score}
        </Text>
        <Text className="text-[11px] text-slate-400 dark:text-slate-300 tracking-widest">
          /100
        </Text>
      </View>
    </View>
  );
}
