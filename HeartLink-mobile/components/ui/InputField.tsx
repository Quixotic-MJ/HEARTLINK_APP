import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { useController, Control, FieldValues, Path } from "react-hook-form";
import { Feather } from "@expo/vector-icons";
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

  const borderColorClass = hasError
    ? "border-destructive"
    : isFocused
    ? "border-primary"
    : "border-border";

  return (
    <View className="mb-2">
      {label && (
        <Text className="text-sm font-semibold text-foreground mb-1.5 ml-1">
          {label}
        </Text>
      )}

      <Animated.View
        style={animatedStyle}
        className={`w-full rounded-2xl flex-row items-center px-4 min-h-[52px] border bg-background transition-colors duration-200 ${borderColorClass} ${
          !textInputProps.editable && textInputProps.editable !== undefined
            ? "opacity-60"
            : ""
        }`}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            className={hasError ? "text-destructive" : isFocused ? "text-primary" : "text-muted-foreground"}
          />
        )}
        {leftElement}

        <TextInput
          value={field.value}
          onChangeText={field.onChange}
          onBlur={(e) => {
            setIsFocused(false);
            field.onBlur();
            textInputProps.onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          placeholderTextColor="#94a3b8"
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
