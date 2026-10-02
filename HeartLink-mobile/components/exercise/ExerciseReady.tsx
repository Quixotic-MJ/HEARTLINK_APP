import React, { useState, useEffect } from 'react';
import { View, Text, Animated, AccessibilityInfo } from 'react-native';

export interface ExerciseReadyProps {
  onComplete: () => void;
  routine: any;
}

export function ExerciseReady({ onComplete, routine }: ExerciseReadyProps) {
  const [countdown, setCountdown] = useState(3);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      if (!reduceMotion) {
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      }

      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, scaleAnim, onComplete, reduceMotion]);

  const hint = routine?.steps?.[0] 
    ? (typeof routine.steps[0] === 'string' ? routine.steps[0] : routine.steps[0].instruction)
    : (routine?.goal || "Prepare yourself for the exercise");

  const isStretching = routine?.type === "Stretching" || routine?.title?.toLowerCase().includes("stretch");
  const textColorClass = isStretching ? "text-teal" : "text-primary";
  const bgColorClass = isStretching ? "bg-teal" : "bg-primary";
  const shadowColorClass = isStretching ? "shadow-teal/30" : "shadow-primary/30";

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <Text className={`${textColorClass} text-[16px] font-bold tracking-[2px] uppercase mb-16`}>
        Get Ready
      </Text>
      
      <Animated.View 
        className={`w-48 h-48 rounded-full ${bgColorClass} items-center justify-center mb-16 shadow-lg ${shadowColorClass}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <Text className="text-white text-[80px] font-black">{countdown}</Text>
      </Animated.View>

      <Text className="text-text text-[18px] text-center font-medium leading-relaxed px-4">
        {hint}
      </Text>
    </View>
  );
}
