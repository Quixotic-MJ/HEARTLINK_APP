import React, { useEffect } from "react";
import { ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";

export interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Match slate-200 in light mode and slate-800/slate-700 in dark mode
  const backgroundColor = isDark ? "#1e293b" : "#e2e8f0";

  return (
    <Animated.View
      className={`rounded-xl ${className}`}
      style={[
        { backgroundColor },
        animatedStyle,
        style,
      ]}
      {...props}
    />
  );
}
