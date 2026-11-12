import React from "react";
import { Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { Clinic, callClinic, clinicLabel, distanceLabel, hasEmergencyRoom, openDirections } from "../../services/clinics";

// One clinic, used by the full locator and the dashboard's pop-up so they look the same (DESIGN.md with HEARTLINK.md):
// a flat card with a hairline border, a rose badge with a red icon for an emergency room (HEARTLINK.md's emergency
// style, never red text on pink), and Directions / Call. Only the nearest emergency room gets the blue main button,
// so a person in a hurry sees one obvious thing to press (one primary button per screen).

function ActionButton({
  label,
  accessibilityLabel,
  icon,
  primary,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  icon: keyof typeof Feather.glyphMap;
  primary: boolean;
  onPress: () => void;
}) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: primary ? c.primary : c.canvas,
        borderWidth: primary ? 0 : 1,
        borderColor: c.hairlineStrong,
      }}
    >
      <Feather name={icon} size={16} color={primary ? c.onPrimary : c.ink} />
      <Text style={{ fontSize: 15, fontWeight: "500", color: primary ? c.onPrimary : c.ink }}>{label}</Text>
    </AnimatedButton>
  );
}

export function ClinicCard({ clinic, selected = false, primary = false }: { clinic: Clinic; selected?: boolean; primary?: boolean }) {
  const { c } = useDs();
  const er = hasEmergencyRoom(clinic);

  return (
    <View
      style={{
        padding: 16,
        gap: 16,
        borderRadius: 12,
        backgroundColor: c.canvas,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.line : c.hairline,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <View
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: er ? c.rose : c.sky }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <MaterialCommunityIcons name={er ? "hospital-box-outline" : "hospital-building"} size={22} color={er ? c.danger : c.charcoal} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: "600", color: c.ink }}>{clinic.name}</Text>
          {clinic.address ? <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>{clinic.address}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: er ? c.rose : c.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: er ? c.ink : c.slate }}>{clinicLabel(clinic)}</Text>
            </View>
            <Text style={{ fontSize: 13, color: c.slate }}>{distanceLabel(clinic.distanceKm)}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <ActionButton
          label="Directions"
          accessibilityLabel={`Directions to ${clinic.name}`}
          icon="navigation"
          primary={primary}
          onPress={() => openDirections(clinic)}
        />
        {clinic.phone ? (
          <ActionButton
            label="Call"
            accessibilityLabel={`Call ${clinic.name}`}
            icon="phone"
            primary={false}
            onPress={() => callClinic(clinic)}
          />
        ) : null}
      </View>
    </View>
  );
}

/** A short row for another nearby place: tap to show it in the card above (the pop-up). */
export function ClinicRow({ clinic, onPress }: { clinic: Clinic; onPress: () => void }) {
  const { c } = useDs();
  const er = hasEmergencyRoom(clinic);
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${clinic.name}. ${distanceLabel(clinic.distanceKm)}, ${clinicLabel(clinic)}. Show on the map`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.hairline,
        backgroundColor: c.canvas,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: er ? c.danger : c.slate }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{clinic.name}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{`${distanceLabel(clinic.distanceKm)}, ${clinicLabel(clinic).toLowerCase()}`}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.steel} />
    </AnimatedButton>
  );
}
