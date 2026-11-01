import React from "react";
import { Text, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";

/** The dashboard's care section: the visit summary and the nearest clinics, each as an elevated interactive card. */
export function CareTools({
  nearestClinic,
  onOpenSummary,
  onOpenClinics,
}: {
  nearestClinic: { name: string; distance: string } | null;
  onOpenSummary: () => void;
  onOpenClinics: () => void;
}) {
  const { c, isDark } = useDs();

  return (
    <View accessibilityLabel="Care tools" style={{ gap: 12 }}>
      {/* ── Section Header ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: c.ink,
              letterSpacing: -0.3,
            }}
          >
            Care & Support
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2.5,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
              borderWidth: 1,
              borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: isDark ? "#34D399" : "#059669",
                letterSpacing: 0.2,
              }}
            >
              CLINICAL
            </Text>
          </View>
        </View>
      </View>

      {/* ── Card 1: Visit Summary ── */}
      <AnimatedButton
        onPress={onOpenSummary}
        accessibilityRole="button"
        accessibilityLabel="Visit summary. Your readings and logs, ready to show your doctor"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.surface : "#FFFFFF",
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.04,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
          }),
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(14, 165, 233, 0.16)" : "#F0F9FF",
            borderWidth: 1,
            borderColor: isDark ? "rgba(14, 165, 233, 0.3)" : "#BAE6FD",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="file-text" size={22} color={isDark ? "#38BDF8" : "#0284C7"} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: c.ink,
                letterSpacing: -0.2,
              }}
            >
              Visit summary
            </Text>
            <View
              style={{
                paddingVertical: 2,
                paddingHorizontal: 7,
                borderRadius: 999,
                backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: "600", color: c.steel }}>
                PDF Export
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: c.slate,
              lineHeight: 18,
            }}
          >
            Your readings and logs, ready to show your doctor
          </Text>
        </View>

        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-right" size={18} color={c.steel} />
        </View>
      </AnimatedButton>

      {/* ── Card 2: Nearby Clinics ── */}
      <AnimatedButton
        onPress={onOpenClinics}
        accessibilityRole="button"
        accessibilityLabel={`Nearby clinics. ${nearestClinic ? `Closest: ${nearestClinic.name}, ${nearestClinic.distance}` : "Find clinics and hospitals near you"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.surface : "#FFFFFF",
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.04,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
          }),
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFF7ED",
            borderWidth: 1,
            borderColor: isDark ? "rgba(249, 115, 22, 0.3)" : "#FED7AA",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="map-pin" size={22} color={isDark ? "#FB923C" : "#EA580C"} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: c.ink,
                letterSpacing: -0.2,
              }}
            >
              Nearby clinics
            </Text>
            {nearestClinic?.distance ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3.5,
                  paddingHorizontal: 7.5,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(249, 115, 22, 0.2)" : "#FFEDD5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(249, 115, 22, 0.35)" : "#FDBA74",
                }}
              >
                <Feather name="navigation" size={10} color={isDark ? "#FB923C" : "#C2410C"} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isDark ? "#FB923C" : "#C2410C",
                  }}
                >
                  {nearestClinic.distance}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 13,
              color: c.slate,
              lineHeight: 18,
            }}
          >
            {nearestClinic ? nearestClinic.name : "Find clinics and cardiology facilities near you"}
          </Text>
        </View>

        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-right" size={18} color={c.steel} />
        </View>
      </AnimatedButton>
    </View>
  );
}
