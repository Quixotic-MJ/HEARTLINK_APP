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
import { Colors, ds } from "../../constants/theme";
import { theme } from "../../constants/theme";

interface InputFieldProps<T extends FieldValues> extends TextInputProps {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  forceLight?: boolean;
  inputRef?: React.Ref<TextInput>;
  /** "ds" = design-system look (documentation/design-system/HEARTLINK.md), used by sign-up screens. */
  look?: "default" | "ds";
}

export function InputField<T extends FieldValues>({
  name,
  control,
  label,
  icon,
  rightElement,
  leftElement,
  forceLight = true,
  inputRef,
  look = "default",
  onChangeText,
  onBlur,
  onFocus,
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
    ? theme.primary
    : theme.borderStrong;

  const iconColor = hasError
    ? theme.dangerMid
    : isFocused
    ? theme.ink
    : theme.textMuted;

  const inputBg = hasError ? theme.dangerTint : theme.surface;

  const shadowColor = isFocused ? theme.shadow : "transparent";

  if (look === "ds") {
    const d = isDark ? ds.dark : ds.light;
    const dsBorder = hasError ? d.danger : isFocused ? d.line : d.hairlineStrong;
    const thick = hasError || isFocused;
    return (
      <View>
        {label && (
          <Text style={{ fontSize: 14, fontWeight: "500", color: d.ink, marginBottom: 6 }}>{label}</Text>
        )}
        <Animated.View
          style={[
            animatedStyle,
            {
              flexDirection: "row",
              alignItems: "center",
              minHeight: 52,
              borderRadius: 8,
              borderWidth: thick ? 2 : 1,
              borderColor: dsBorder,
              paddingHorizontal: thick ? 15 : 16,
              backgroundColor: d.canvas,
              opacity: !textInputProps.editable && textInputProps.editable !== undefined ? 0.6 : 1,
            },
          ]}
        >
          {leftElement}
          <TextInput
            ref={inputRef}
            value={field.value}
            onChangeText={(text) => {
              if (onChangeText) {
                onChangeText(text);
              } else {
                field.onChange(text);
              }
            }}
            onBlur={(e) => {
              setIsFocused(false);
              field.onBlur();
              onBlur?.(e);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            placeholderTextColor={d.steel}
            style={{ flex: 1, fontSize: 16, color: d.ink, paddingVertical: 12 }}
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
            className="flex-row items-center gap-1.5 mt-1.5"
            accessible={true}
            accessibilityRole="alert"
            nativeID={`${name}-error`}
          >
            <Feather name="alert-circle" size={12} color={d.danger} />
            <Text style={{ fontSize: 13, color: d.danger, flex: 1 }}>{fieldState.error?.message}</Text>
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View className="mb-1">
      {label && (
        <Text className="text-sm font-semibold text-text mb-1.5 ml-1">
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
          ref={inputRef}
          value={field.value}
          onChangeText={(text) => {
            if (onChangeText) {
              onChangeText(text);
            } else {
              field.onChange(text);
            }
          }}
          onBlur={(e) => {
            setIsFocused(false);
            field.onBlur();
            onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
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
