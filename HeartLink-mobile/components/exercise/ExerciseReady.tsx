import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';

export interface ExerciseReadyProps {
  onComplete: () => void;
  routine: any;
}

export function ExerciseReady({ onComplete, routine }: ExerciseReadyProps) {
  const [countdown, setCountdown] = useState(3);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (countdown > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, scaleAnim, onComplete]);

  const hint = routine?.steps?.[0] 
    ? (typeof routine.steps[0] === 'string' ? routine.steps[0] : routine.steps[0].instruction)
    : (routine?.goal || "Prepare yourself for the exercise");

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <Text className="text-sky-500 text-[16px] font-bold tracking-[2px] uppercase mb-16">
        Get Ready
      </Text>
      
      <Animated.View 
        className="w-48 h-48 rounded-full bg-sky-500 items-center justify-center mb-16 shadow-lg shadow-sky-500/30"
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <Text className="text-white text-[80px] font-black">{countdown}</Text>
      </Animated.View>

      <Text className="text-slate-700 text-[18px] text-center font-medium leading-relaxed px-4">
        {hint}
      </Text>
    </View>
  );
}
