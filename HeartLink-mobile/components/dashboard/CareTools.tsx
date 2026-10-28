import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";

/** The dashboard's last section: the visit summary and the nearest clinics, one row each. */
export function CareTools({
  nearestClinic,
  onOpenSummary,
  onOpenClinics,
}: {
  nearestClinic: { name: string; distance: string } | null;
  onOpenSummary: () => void;
  onOpenClinics: () => void;
}) {
  const { c } = useDs();

  const row = (
    icon: keyof typeof Feather.glyphMap,
    tint: string,
    title: string,
    detail: string,
    onPress: () => void,
    divider: boolean,
    /** Shown at the right, e.g. the nearest clinic's distance. */
    aside?: string
  ) => (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 16,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: c.hairlineSoft,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={16} color={c.charcoal} />
      </View>
      <Text style={{ flex: 1, fontSize: 16, color: c.ink }}>{title}</Text>
      {aside ? <Text style={{ fontSize: 14, color: c.slate }}>{aside}</Text> : null}
      <Feather name="chevron-right" size={18} color={c.steel} />
    </AnimatedButton>
  );

  return (
    <View
      accessibilityLabel="Care tools"
      style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden", backgroundColor: c.canvas }}
    >
      {row("clipboard", c.sky, "Visit summary", "Your readings and logs, ready to show your doctor", onOpenSummary, true)}
      {row(
        "map-pin",
        c.peach,
        "Nearby clinics",
        nearestClinic ? `Closest: ${nearestClinic.name}, ${nearestClinic.distance}` : "Finding clinics near you",
        onOpenClinics,
        false,
        nearestClinic?.distance
      )}
    </View>
  );
}
