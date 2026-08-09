import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AnimatedButtonProps extends PressableProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  slideDistance?: number;
}

export default function AnimatedButton({
  children,
  style,
  className,
  onPressIn,
  onPressOut,
  slideDistance = 4, // Slides 4 pixels right on press
  ...rest
}: AnimatedButtonProps) {
  const offset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  const handlePressIn = (e: any) => {
    offset.value = withTiming(slideDistance, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
    if (onPressIn) {
      onPressIn(e);
    }
  };

  const handlePressOut = (e: any) => {
    offset.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
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
