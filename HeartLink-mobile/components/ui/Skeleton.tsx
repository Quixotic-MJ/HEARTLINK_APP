import React, { useEffect, useState } from "react";
import { ViewProps, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";

export interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const [width, setWidth] = useState(0);
  const shimmerValue = useSharedValue(-1);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, [shimmerValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerValue.value * width }],
  }));

  const backgroundColor = isDark ? "#1e293b" : "#e2e8f0";
  const highlightColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)";

  return (
    <Animated.View
      className={`rounded-xl overflow-hidden ${className}`}
      style={[
        { backgroundColor },
        style,
      ]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      {...props}
    >
      {width > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, { width }]}>
          <LinearGradient
            colors={["transparent", highlightColor, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
