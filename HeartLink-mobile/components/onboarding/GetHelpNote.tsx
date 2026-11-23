import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDs } from "./useDs";

/** "When to get help right away": the emergency signs, on "Before we start" and the health check (HL-164). */
export default function GetHelpNote({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useDs();
  return (
    <View
      accessibilityRole="alert"
      className="flex-row"
      style={[{ gap: 12, padding: 16, borderRadius: 14, backgroundColor: c.rose, borderWidth: 1, borderColor: c.hairline }, style]}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}>
        <Feather name="alert-triangle" size={16} color={c.danger} />
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: 14.5, fontWeight: "700", color: c.ink }}>When to get help right away</Text>
        <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.charcoal, marginTop: 4 }}>
          A reading of 180/120 or higher, chest pain, trouble breathing, fainting or sudden weakness. Call 911 or go to the
          nearest hospital.
        </Text>
      </View>
    </View>
  );
}
