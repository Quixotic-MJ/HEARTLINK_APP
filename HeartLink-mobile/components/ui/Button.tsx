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
  variant?: "primary" | "outline" | "destructive";
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
  const isDestructive = variant === "destructive";

  const buttonBg = isDestructive
    ? "w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 bg-[#A93226] shadow-sm"
    : isPrimary
    ? "w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 bg-[#E8532E] shadow-sm"
    : "w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 bg-transparent border border-[#DCE3DF]";

  const textColor = isDestructive || isPrimary
    ? "text-sm font-semibold text-white tracking-wide"
    : "text-sm font-semibold text-[#152131] dark:text-foreground";

  const iconColor = isDestructive || isPrimary ? "#ffffff" : "#152131";

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
      className={buttonBg}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text className={textColor}>
            {loadingText || label}
          </Text>
        </>
      ) : (
        <>
          {icon && (
            <Feather 
              name={icon} 
              size={16} 
              color={iconColor} 
            />
          )}
          <Text className={textColor}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
