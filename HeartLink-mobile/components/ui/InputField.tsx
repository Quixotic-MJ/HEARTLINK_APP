import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { useController, Control, FieldValues, Path } from "react-hook-form";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { Colors } from "../../constants/theme";
import { theme } from "../../constants/theme";

interface InputFieldProps<T extends FieldValues> extends TextInputProps {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  forceLight?: boolean;
}

export function InputField<T extends FieldValues>({
  name,
  control,
  label,
  icon,
  rightElement,
  leftElement,
  forceLight = true,
  ...textInputProps
}: InputFieldProps<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = !forceLight && colorScheme === "dark";
  const { field, fieldState } = useController({ name, control });
  const hasError = !!fieldState.error;
  const [isFocused, setIsFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (hasError) {
      shake.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const theme = isDark ? Colors.dark : Colors.light;

  const borderColor = hasError
    ? theme.dangerMid
    : isFocused
    ? theme.ink
    : theme.borderStrong;

  const iconColor = hasError
    ? theme.dangerMid
    : isFocused
    ? theme.ink
    : theme.textMuted;

  const inputBg = hasError
    ? theme.dangerTint
    : isFocused
    ? theme.surface
    : theme.surfaceAlt;

  const shadowColor = isFocused ? theme.shadow : "transparent";

  return (
    <View className="mb-1">
      {label && (
        <Text className="text-xs sm:text-sm font-semibold text-text mb-1.5 ml-1">
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          animatedStyle, 
          { 
            borderColor, 
            backgroundColor: inputBg,
            borderWidth: isFocused ? 1.5 : 1,
            opacity: !textInputProps.editable && textInputProps.editable !== undefined ? 0.6 : 1,
            shadowColor,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isFocused ? 0.06 : 0,
            shadowRadius: 3,
            elevation: isFocused ? 1 : 0
          }
        ]}
        className="w-full rounded-xl flex-row items-center px-4 min-h-[52px]"
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={iconColor}
          />
        )}
        {leftElement}

        <TextInput
          value={field.value}
          onChangeText={(text) => {
            if (textInputProps.onChangeText) {
              textInputProps.onChangeText(text);
            } else {
              field.onChange(text);
            }
          }}
          onBlur={(e) => {
            setIsFocused(false);
            field.onBlur();
            textInputProps.onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          placeholderTextColor={theme.textMuted}
          className="flex-1 ml-3 text-sm sm:text-base text-text py-3.5"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          {...textInputProps}
        />
        {rightElement}
      </Animated.View>

      {hasError && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(200)}
          className="flex-row items-center gap-1.5 mt-1.5 ml-1"
          accessible={true}
          accessibilityRole="alert"
          nativeID={`${name}-error`}
        >
          <Feather name="alert-circle" size={12} color={theme.dangerMid} />
          <Text className="text-xs text-danger-text font-medium">
            {fieldState.error?.message}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
