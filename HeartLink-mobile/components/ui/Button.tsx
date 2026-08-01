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

  return (
    <AnimatedPressable
      {...props}
      onPress={props.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, props.style]}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      accessibilityRole="button"
      className={`w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 ${
        variant === "primary" ? "bg-primary" : "bg-transparent border border-border"
      } ${isDisabled ? "opacity-70" : ""}`}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : "#000"} />
          <Text className={`text-sm font-semibold ${variant === "primary" ? "text-primary-foreground" : "text-foreground"}`}>
            {loadingText || label}
          </Text>
        </>
      ) : (
        <>
          {icon && (
            <Feather 
              name={icon} 
              size={16} 
              className={variant === "primary" ? "text-primary-foreground" : "text-foreground"} 
            />
          )}
          <Text className={`text-sm font-semibold ${variant === "primary" ? "text-primary-foreground" : "text-foreground"}`}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
