import React from "react";
import { View, Text, TouchableOpacity, ViewProps } from "react-native";

export interface EmptyStateProps extends ViewProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View className={`flex-1 justify-center items-center px-8 py-10 ${className || ""}`} {...props}>
      {icon && (
        <View className="w-16 h-16 rounded-2xl bg-surface-alt items-center justify-center mb-4 border border-border">
          {icon}
        </View>
      )}
      <Text className="text-[17px] font-medium text-text text-center mb-1">
        {title}
      </Text>
      <Text className="text-[13px] text-text-soft text-center mb-6 leading-relaxed">
        {subtitle}
      </Text>
      
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-primary px-5 py-3 rounded-xl flex-row items-center justify-center gap-2"
          activeOpacity={0.8}
        >
          {actionIcon}
          <Text className="text-on-primary font-semibold text-[13px]">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
