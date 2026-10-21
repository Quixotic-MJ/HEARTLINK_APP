import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";

/** The dashboard's last section: the visit summary and the nearest clinics. */
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
    divider: boolean
  ) => (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: c.hairlineSoft,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={18} color={c.charcoal} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }}>{title}</Text>
        <Text style={{ fontSize: 14, color: c.slate }}>{detail}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.steel} />
    </AnimatedButton>
  );

  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
        Care tools
      </Text>
      <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden", backgroundColor: c.canvas }}>
        {row("clipboard", c.sky, "Visit summary", "Your readings and logs, ready to show your doctor", onOpenSummary, true)}
        {row(
          "map-pin",
          c.peach,
          "Nearby clinics",
          nearestClinic ? `Closest: ${nearestClinic.name}, ${nearestClinic.distance}` : "Finding clinics near you…",
          onOpenClinics,
          false
        )}
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>
        {"Clinics come from a public directory. HeartLink isn't partnered with any of them."}
      </Text>
    </View>
  );
}
