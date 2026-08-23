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

  const gradientColors: [string, string, ...string[]] = isDark
    ? ["#F87171", "#FB923C", "#FACC15", "#34D399"]
    : ["#EF4444", "#F97316", "#EAB308", "#10B981"];

  const primaryBlue = isDark ? "#60a5fa" : "#2563eb";
  const tickColor = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(15, 23, 42, 0.35)";
  const labelColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <View style={styles.container} accessible={false} importantForAccessibility="no">
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

        {/* Subtle Threshold Tick Markers at 50, 60, 80 */}
        <View style={[styles.tickMarker, { left: "50%", backgroundColor: tickColor }]} />
        <View style={[styles.tickMarker, { left: "60%", backgroundColor: tickColor }]} />
        <View style={[styles.tickMarker, { left: "80%", backgroundColor: tickColor }]} />

        {/* Sliding Pure Blue Heart Indicator */}
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

      {/* Scale Numeric Markers Row */}
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleText, { left: 0, color: labelColor }]}>0</Text>
        <Text style={[styles.scaleTextCentered, { left: "50%", color: labelColor }]}>50</Text>
        <Text style={[styles.scaleTextCentered, { left: "60%", color: labelColor }]}>60</Text>
        <Text style={[styles.scaleTextCentered, { left: "80%", color: labelColor }]}>80</Text>
        <Text style={[styles.scaleText, { right: 0, color: labelColor }]}>100</Text>
      </View>

      {/* Tier Category Labels Row */}
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
          Stable
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
  tickMarker: {
    position: "absolute",
    top: 10,
    width: 1.5,
    height: 10,
    marginLeft: -0.75,
    borderRadius: 1,
    zIndex: 1,
  },
  heartThumb: {
    position: "absolute",
    top: 3,
    marginLeft: -12, // Half of 24px width to center directly over the score point
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  scaleRow: {
    width: "100%",
    height: 14,
    position: "relative",
    marginTop: 2,
  },
  scaleText: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "600",
  },
  scaleTextCentered: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "600",
    width: 24,
    marginLeft: -12,
    textAlign: "center",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
