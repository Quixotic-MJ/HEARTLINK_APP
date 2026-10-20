import React from "react";
import { Text, ActivityIndicator, Pressable, PressableProps, Platform } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ds } from "../../constants/theme";
import { useDs } from "../onboarding/useDs";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps extends PressableProps {
  label: string;
  isLoading?: boolean;
  loadingText?: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: "primary" | "outline" | "destructive";
}

// Design-system button (8px corners, 48px tall) with an optional icon and loading text.
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

  const { c } = useDs();

  const isDisabled = props.disabled || isLoading;
  // A disabled (not loading) primary button turns grey so it reads as "not yet".
  const isIdleDisabled = !!props.disabled && !isLoading && variant === "primary";

  // Red keeps its light-mode shade in dark mode so white text stays readable (4.5:1).
  const bg = variant === "destructive" ? ds.light.danger : variant === "primary" ? c.primary : "transparent";
  const fg = isIdleDisabled ? c.steel : variant === "outline" ? c.ink : c.onPrimary;

  return (
    <AnimatedPressable
      {...props}
      onPress={props.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        {
          minHeight: 48,
          borderRadius: 8,
          paddingHorizontal: 18,
          backgroundColor: isIdleDisabled ? c.hairline : bg,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: c.hairlineStrong,
          opacity: isDisabled && !isIdleDisabled ? 0.7 : 1,
        },
        props.style,
      ]}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      accessibilityRole="button"
      className="w-full flex-row justify-center items-center gap-2"
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={fg} />
          <Text style={{ fontSize: 15, fontWeight: "500", color: fg }}>
            {loadingText || label}
          </Text>
        </>
      ) : (
        <>
          {icon && <Feather name={icon} size={16} color={fg} />}
          <Text style={{ fontSize: 15, fontWeight: "500", color: fg }}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
