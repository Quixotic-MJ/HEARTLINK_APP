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

interface InputFieldProps<T extends FieldValues> extends TextInputProps {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export function InputField<T extends FieldValues>({
  name,
  control,
  label,
  icon,
  rightElement,
  leftElement,
  ...textInputProps
}: InputFieldProps<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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

  const borderColor = hasError
    ? "#ef4444"
    : isFocused
    ? (isDark ? "#3b82f6" : "#2563eb")
    : (isDark ? "#1e293b" : "#e2e8f0");

  const iconColor = hasError
    ? "#ef4444"
    : isFocused
    ? (isDark ? "#3b82f6" : "#2563eb")
    : (isDark ? "#94a3b8" : "#64748b");

  const inputBg = isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.9)";

  return (
    <View className="mb-2">
      {label && (
        <Text className="text-sm font-semibold text-foreground mb-1.5 ml-1">
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          animatedStyle, 
          { 
            borderColor, 
            backgroundColor: inputBg,
            opacity: !textInputProps.editable && textInputProps.editable !== undefined ? 0.6 : 1,
            shadowColor: isFocused ? (isDark ? "#3b82f6" : "#2563eb") : "transparent",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isFocused ? 0.15 : 0,
            shadowRadius: 3,
            elevation: isFocused ? 2 : 0
          }
        ]}
        className="w-full rounded-xl flex-row items-center px-4 min-h-[52px] border"
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
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          className="flex-1 ml-3 text-base text-foreground py-3.5"
          accessibilityInvalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          {...textInputProps}
        />
        {rightElement}
      </Animated.View>

      <View className="min-h-[24px] justify-center mt-1 ml-1">
        {hasError && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(200)}
            className="flex-row items-center gap-1.5"
            accessible={true}
            accessibilityRole="alert"
            nativeID={`${name}-error`}
          >
            <Feather name="alert-circle" size={12} className="text-destructive" />
            <Text className="text-xs text-destructive font-medium">
              {fieldState.error?.message}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
