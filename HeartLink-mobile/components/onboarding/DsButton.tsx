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
  icon?: React.ReactNode;
}

// Design-system button: 10px corners, 48-50px tall, one primary per screen.
export default function DsButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  block,
  accessibilityHint,
  style,
  icon,
}: DsButtonProps) {
  const { c } = useDs();
  const isBlock = block ?? variant === "primary";
  const inactive = disabled || loading;

  const boxStyle: ViewStyle = {
    height: variant === "link" || variant === "quiet" ? 44 : 50,
    borderRadius: variant === "link" || variant === "quiet" ? 6 : 10,
    paddingHorizontal: variant === "link" ? 4 : 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    alignSelf: isBlock ? "stretch" : "auto",
  };
  let textColor = c.ink;
  if (variant === "primary") {
    boxStyle.backgroundColor = inactive && !loading ? c.hairline : c.primary;
    textColor = inactive && !loading ? c.steel : c.onPrimary;
    if (!inactive) {
      boxStyle.shadowColor = c.primary;
      boxStyle.shadowOffset = { width: 0, height: 4 };
      boxStyle.shadowOpacity = 0.22;
      boxStyle.shadowRadius = 8;
      boxStyle.elevation = 3;
    }
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Text
            style={{
              color: textColor,
              fontSize: variant === "link" || variant === "quiet" ? 14 : 15.5,
              fontWeight: "600",
              letterSpacing: -0.1,
            }}
          >
            {label}
          </Text>
          {icon}
        </View>
      )}
    </AnimatedButton>
  );
}
