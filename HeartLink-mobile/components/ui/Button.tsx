import React from "react";
import { Text, ActivityIndicator, Pressable, PressableProps, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends PressableProps {
  label: string;
  isLoading?: boolean;
  loadingText?: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "outline";
}

export function Button({
  label,
  isLoading = false,
  loadingText,
  icon,
  variant = "primary",
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.ease) });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (props.onPressIn) props.onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
    if (props.onPressOut) props.onPressOut(e);
  };

  const isDisabled = props.disabled || isLoading;
  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      {...props}
      onPress={props.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, { opacity: isDisabled ? 0.7 : 1 }, props.style]}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      accessibilityRole="button"
      className={isPrimary ? "w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 bg-primary" : "w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 bg-transparent border border-border"}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={isPrimary ? "#fff" : "#000"} />
          <Text className={isPrimary ? "text-sm font-semibold text-primary-foreground" : "text-sm font-semibold text-foreground"}>
            {loadingText || label}
          </Text>
        </>
      ) : (
        <>
          {icon && (
            <Feather 
              name={icon} 
              size={16} 
              color={isPrimary ? "#ffffff" : "#0f172a"} 
            />
          )}
          <Text className={isPrimary ? "text-sm font-semibold text-primary-foreground" : "text-sm font-semibold text-foreground"}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
