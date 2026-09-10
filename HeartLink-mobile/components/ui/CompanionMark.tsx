import React from "react";
import { View } from "react-native";
import HeartLogo from "./HeartLogo";

/**
 * CompanionMark — the tiny visual anchor placed next to anything the
 * companion voice "says", so users learn the mark means guidance,
 * not raw data. Uses the existing HeartLogo; no new art.
 */
export function CompanionMark({ size = 14 }: { size?: number }) {
  return (
    <View
      style={{ width: size + 6, height: size + 6, alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      accessible={false}
    >
      <HeartLogo size={size} />
    </View>
  );
}
