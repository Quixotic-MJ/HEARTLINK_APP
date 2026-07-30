import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Feather } from "@expo/vector-icons";

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
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const hasError = !!error;
        return (
          <View className="mb-2">
            {/* Label */}
            {label && (
              <Text className="text-sm font-semibold text-foreground mb-1.5 ml-1">
                {label}
              </Text>
            )}
            
            {/* Input Container */}
            <View
              className={`w-full rounded-2xl flex-row items-center px-4 min-h-[52px] border bg-background ${
                hasError ? "border-destructive" : "border-border"
              } ${!textInputProps.editable && textInputProps.editable !== undefined ? "opacity-60" : ""}`}
            >
              {icon && (
                <Feather
                  name={icon}
                  size={18}
                  className={hasError ? "text-destructive" : "text-muted-foreground"}
                />
              )}
              {leftElement}
              
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor="#94a3b8"
                className="flex-1 ml-3 text-base text-foreground py-3.5"
                accessibilityInvalid={hasError}
                aria-describedby={hasError ? `${name}-error` : undefined}
                {...textInputProps}
              />
              {rightElement}
            </View>
            
            {/* Fixed height wrapper for error message to prevent CLS */}
            <View className="min-h-[24px] justify-center mt-1 ml-1">
              {hasError && (
                <View 
                  className="flex-row items-center gap-1.5" 
                  accessible={true} 
                  accessibilityRole="alert" 
                  nativeID={`${name}-error`}
                >
                  <Feather name="alert-circle" size={12} className="text-destructive" />
                  <Text className="text-xs text-destructive font-medium">
                    {error.message}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}
