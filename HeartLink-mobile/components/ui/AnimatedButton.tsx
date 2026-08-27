import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AnimatedButtonProps extends PressableProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function AnimatedButton({
  children,
  style,
  className,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withTiming(0.97, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPressIn) {
      onPressIn(e);
    }
  };

  const handlePressOut = (e: any) => {
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
    if (onPressOut) {
      onPressOut(e);
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={className}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
