import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export function ScoreGradientBar({ score = 0 }: { score: number }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Score normalized between 0 and 100
  const clampedScore = Math.max(
    0,
    Math.min(100, typeof score === "number" && !isNaN(score) ? score : 0)
  );

  const animScore = useSharedValue(clampedScore);

  useEffect(() => {
    animScore.value = withSpring(clampedScore, {
      damping: 18,
      stiffness: 90,
    });
  }, [clampedScore]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      left: `${animScore.value}%`,
    };
  });

  const gradientColors = isDark
    ? ["#F87171", "#FB923C", "#FACC15", "#34D399"]
    : ["#EF4444", "#F97316", "#EAB308", "#10B981"];

  const primaryBlue = isDark ? "#60a5fa" : "#2563eb";

  return (
    <View style={styles.container}>
      {/* Track & Indicator Wrapper */}
      <View style={styles.trackWrapper}>
        {/* Continuous Linear Gradient Track matching ScoreRing tiers */}
        <View style={styles.trackBackground}>
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.49, 0.65, 0.85]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Sliding Pure Blue Heart Indicator (No Circle) */}
        <Animated.View
          style={[
            styles.heartThumb,
            thumbAnimatedStyle,
          ]}
        >
          <Ionicons
            name="heart"
            size={24}
            color={primaryBlue}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.55 : 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
          />
        </Animated.View>
      </View>

      {/* Range Labels */}
      <View style={styles.labelsRow}>
        <Text
          style={[
            styles.labelText,
            { color: isDark ? "#F87171" : "#EF4444" },
          ]}
        >
          Critical
        </Text>
        <Text
          style={[
            styles.labelText,
            { color: isDark ? "#34D399" : "#10B981" },
          ]}
        >
          Stable 100
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  trackWrapper: {
    width: "100%",
    height: 30,
    justifyContent: "center",
    position: "relative",
  },
  trackBackground: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  heartThumb: {
    position: "absolute",
    top: 3,
    marginLeft: -12, // Half of 24px width to center directly over the score point
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
