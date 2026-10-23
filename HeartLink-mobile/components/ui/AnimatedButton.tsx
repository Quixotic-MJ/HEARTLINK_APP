import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type AnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AnimatedButtonProps extends Omit<PressableProps, 'style'> {
  className?: string;
  /** Plain styles, or Reanimated animated styles (e.g. a colour that fades on selection). */
  style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
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
    scale.set(withTiming(0.97, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    }));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPressIn) {
      onPressIn(e);
    }
  };

  const handlePressOut = (e: any) => {
    scale.set(withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    }));
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
