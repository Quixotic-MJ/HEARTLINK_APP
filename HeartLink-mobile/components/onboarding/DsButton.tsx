import React from "react";
import { ActivityIndicator, Text, View, StyleProp, ViewStyle } from "react-native";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "./useDs";

type Variant = "primary" | "secondary" | "quiet" | "link";

interface DsButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the full width of the parent (default for primary). */
  block?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

// Design-system button: 8px corners, 48px tall, one primary per screen.
export default function DsButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  block,
  accessibilityHint,
  style,
}: DsButtonProps) {
  const { c } = useDs();
  const isBlock = block ?? variant === "primary";
  const inactive = disabled || loading;

  const boxStyle: ViewStyle = {
    height: variant === "link" || variant === "quiet" ? 44 : 48,
    borderRadius: variant === "link" || variant === "quiet" ? 6 : 8,
    paddingHorizontal: variant === "link" ? 4 : 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignSelf: isBlock ? "stretch" : "auto",
  };
  let textColor = c.ink;
  if (variant === "primary") {
    boxStyle.backgroundColor = inactive && !loading ? c.hairline : c.primary;
    textColor = inactive && !loading ? c.steel : c.onPrimary;
  } else if (variant === "secondary") {
    boxStyle.borderWidth = 1;
    boxStyle.borderColor = c.hairlineStrong;
  } else if (variant === "link") {
    textColor = c.link;
  }

  return (
    <AnimatedButton
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[boxStyle, style]}
    >
      {loading ? (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color={textColor} />
        </View>
      ) : (
        <Text style={{ color: textColor, fontSize: variant === "link" || variant === "quiet" ? 14 : 15, fontWeight: "500" }}>
          {label}
        </Text>
      )}
    </AnimatedButton>
  );
}
