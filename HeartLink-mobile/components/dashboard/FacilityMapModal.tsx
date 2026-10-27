import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import { theme } from "../../constants/theme";
import { ClinicMap } from "../clinics/ClinicMap";
import { useNearbyClinics } from "../../hooks/useNearbyClinics";
import { Clinic, callClinic, clinicLabel, distanceLabel, hasEmergencyRoom, openDirections } from "../../services/clinics";

/**
 * FacilityMapModal: the dashboard's "Nearby clinics" pop-up (opened from Care tools).
 *
 * HL-078: the map is OpenStreetMap (ClinicMap), not Google's map SDK, which crashed the test build without a key.
 * HL-088: places come from the checked Cebu City directory, nearest emergency rooms first; labels come from real
 * fields only, and Call shows only for a number the team checked. Directions opens the phone's maps app.
 */

const MAX_PINS = 8;

export function FacilityMapModal({
  visible,
  onClose,
  onOpenFull,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { clinics, you, isPending: isLoading, isError } = useNearbyClinics(visible);
  const facilities = clinics.slice(0, MAX_PINS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Panel motion uses RN Animated (Reanimated entering swallows touches
  // inside RN Modals). Blueprint spring: stiffness 400, damping 30, mass 0.8.
  const [slideAnim] = useState(() => new Animated.Value(Dimensions.get("window").height));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  const animateIn = useCallback(() => {
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get("window").height,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [slideAnim, backdropAnim]
  );

  // Each time it opens, start from the nearest emergency room
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the pop-up resets the highlighted clinic
    if (visible) setSelectedId(null);
  }, [visible]);

  const selected = facilities.find((f) => f.id === selectedId) ?? facilities[0];

  const focusFacility = (f: Clinic) => {
    Haptics.selectionAsync();
    setSelectedId(f.id);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={() => animateOut(onClose)}
    >
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.6)", opacity: backdropAnim, justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          style={{
            width: "100%",
            maxHeight: "88%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8E5",
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Map (blueprint expanded square) */}
          <View style={{ height: 300, backgroundColor: isDark ? "#0f172a" : "#E5E4EE", overflow: "hidden" }}>
            {facilities.length ? (
              <ClinicMap clinics={facilities} you={you} selectedId={selected?.id ?? null} onSelect={setSelectedId} height={300} />
            ) : null}

            {/* Loader until the map is ready (blueprint) */}
            {isLoading && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#0f172a" : "#E5E4EE",
                }}
              >
                <ActivityIndicator size="large" color={theme.dangerMid} />
                <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "600", color: isDark ? "#94A3B8" : "#64748b" }}>
                  Finding nearby clinics…
                </Text>
              </View>
            )}

            {/* Close (blueprint) */}
            <TouchableOpacity
              onPress={() => animateOut(onClose)}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#2A2A2D" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                  },
                  android: { elevation: 6 },
                }),
              }}
            >
              <Feather name="x" size={20} color={isDark ? "#fff" : "#85848B"} />
            </TouchableOpacity>

            {/* Cebu scope pill */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "rgba(15,23,42,0.65)",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Feather name="map-pin" size={12} color={theme.onPrimary} />
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "700", color: theme.surface }}>
                Cebu City area
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#94A3B8" : "#64748b", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Nearest emergency rooms first
            </Text>

            {selected ? (
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      numberOfLines={2}
                      style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#fff" : "#0f172a", marginBottom: 4 }}
                    >
                      {selected.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: isDark ? "#94A3B8" : "#64748b" }}>
                      {distanceLabel(selected.distanceKm)} • {clinicLabel(selected)}
                    </Text>
                    {selected.address ? (
                      <Text numberOfLines={2} style={{ fontSize: 13, color: isDark ? "#94A3B8" : "#64748b", marginTop: 2 }}>
                        {selected.address}
                      </Text>
                    ) : null}
                  </View>
                  {hasEmergencyRoom(selected) && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: "rgba(34,197,94,0.15)",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: theme.success }}>ER</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openDirections(selected)}
                    accessibilityRole="button"
                    accessibilityLabel={`Directions to ${selected.name}`}
                    style={{ flex: 1, borderRadius: 10, paddingVertical: 11, backgroundColor: theme.primary, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                  >
                    <Feather name="navigation" size={15} color={theme.onPrimary} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.surface }}>Directions</Text>
                  </TouchableOpacity>
                  {selected.phone ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => callClinic(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${selected.name}`}
                      style={{ flex: 1, borderRadius: 10, paddingVertical: 11, backgroundColor: isDark ? "#0f172a" : "#1e293b", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                    >
                      <Feather name="phone-call" size={15} color={theme.onPrimary} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: theme.surface }}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
              !isLoading && (
                <Text style={{ textAlign: "center", fontSize: 13, color: isDark ? "#94A3B8" : "#64748b", paddingVertical: 8 }}>
                  {isError ? "Couldn't load clinics. Check your connection and try again." : "No clinics to show."} In an emergency, call 911.
                </Text>
              )
            )}

            {/* Nearby list */}
            {facilities.length > 1 && (
              <View style={{ gap: 8 }}>
                {facilities.filter(f => f.id !== selected?.id).slice(0, 3).map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    activeOpacity={0.75}
                    onPress={() => focusFacility(f)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#fff" : "#0f172a", marginBottom: 2 }}>
                        {f.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748b" }}>
                        {distanceLabel(f.distanceKm)} • {clinicLabel(f)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={isDark ? "#94A3B8" : "#94a3b8"} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => animateOut(onOpenFull)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16, marginTop: 4 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.blue }}>
                Open full locator
              </Text>
              <Feather name="arrow-right" size={15} color={theme.blue} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
