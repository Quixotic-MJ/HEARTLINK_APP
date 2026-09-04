import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface StepProgressProps {
  current: number;
  total?: number;
}

function AnimatedStepSegment({
  stepNum,
  current,
}: {
  stepNum: number;
  current: number;
}) {
  const isCompleted = stepNum < current;
  const isCurrent = stepNum === current;

  const flexAnim = useSharedValue(isCurrent ? 1.6 : 1);
  const fillAnim = useSharedValue(isCompleted || isCurrent ? 1 : 0);

  useEffect(() => {
    flexAnim.value = withTiming(isCurrent ? 1.6 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    fillAnim.value = withTiming(isCompleted || isCurrent ? 1 : 0, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [isCompleted, isCurrent]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: flexAnim.value,
  }));

  const animatedFillStyle = useAnimatedStyle(() => ({
    opacity: fillAnim.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="h-1.5 rounded-full overflow-hidden relative bg-[#DCE3DF] dark:bg-slate-800/80"
    >
      {/* Animated Fill Bar */}
      <Animated.View
        style={animatedFillStyle}
        className="absolute inset-0 bg-[#E8532E] rounded-full"
      />
    </Animated.View>
  );
}

export default function StepProgress({ current, total = 6 }: StepProgressProps) {
  return (
    <View className="flex-row items-center gap-1.5 mt-1 mb-1">
      {Array.from({ length: total }).map((_, i) => (
        <AnimatedStepSegment
          key={i}
          stepNum={i + 1}
          current={current}
        />
      ))}
    </View>
  );
}
