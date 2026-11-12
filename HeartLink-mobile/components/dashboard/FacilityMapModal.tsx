import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Modal, Pressable, ScrollView, Animated, Easing, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDs } from "../onboarding/useDs";
import DsButton from "../onboarding/DsButton";
import { SquareIconButton } from "../exercise/ExerciseBits";
import { Skeleton } from "../ui/Skeleton";
import { ClinicMap } from "../clinics/ClinicMap";
import { ClinicCard, ClinicRow } from "../clinics/ClinicCard";
import { useNearbyClinics } from "../../hooks/useNearbyClinics";
import { Clinic, hasEmergencyRoom } from "../../services/clinics";

/**
 * FacilityMapModal: the dashboard's "Nearby clinics" pop-up (opened from Care tools).
 *
 * HL-078: the map is OpenStreetMap (ClinicMap), not Google's map SDK, which crashed the test build without a key.
 * HL-088: places come from the checked Cebu City directory, nearest emergency rooms first; labels come from real
 * fields only, and Call shows only for a number the team checked. Directions opens the phone's maps app.
 * Built on the design system: a white sheet with a title row (so nothing sits on top of the map's own buttons), the
 * same clinic card as the full locator, and the nearest emergency room's Directions as the one blue button.
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
  const { c } = useDs();
  // The sheet draws behind Android's navigation bar (statusBarTranslucent), so its last lines need that much room
  const insets = useSafeAreaInsets();
  const { clinics, you, locationDenied, isPending: isLoading, isError } = useNearbyClinics(visible);
  const facilities = clinics.slice(0, MAX_PINS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Panel motion uses RN Animated (Reanimated entering swallows touches inside RN Modals).
  const [slideAnim] = useState(() => new Animated.Value(Dimensions.get("window").height));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  const animateIn = useCallback(() => {
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, stiffness: 400, damping: 30, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
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
  const others = facilities.filter((f) => f.id !== selected?.id).slice(0, 3);

  const focusFacility = (f: Clinic) => {
    Haptics.selectionAsync();
    setSelectedId(f.id);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onShow={animateIn} onRequestClose={() => animateOut(onClose)}>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(15, 15, 15, 0.5)", opacity: backdropAnim, justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => animateOut(onClose)}
          accessibilityLabel="Close"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          style={{
            width: "100%",
            maxHeight: "90%",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
            backgroundColor: c.canvas,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Title row: the close button lives here, not on the map */}
          <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
            <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: "600", color: c.ink }}>
                  Nearby emergency rooms
                </Text>
                <Text style={{ fontSize: 14, color: c.slate }}>
                  {locationDenied ? "From Cebu City's centre (location is off)" : "Cebu City area, nearest first"}
                </Text>
              </View>
              <SquareIconButton icon="x" label="Close" onPress={() => animateOut(onClose)} />
            </View>
          </View>

          {/* The map stays out of the scrolling part: inside it, Android gives every drag to the scroll */}
          {isLoading ? (
            <View style={{ padding: 20, paddingBottom: 20 + insets.bottom, gap: 12 }} accessibilityLabel="Finding nearby clinics">
              <Skeleton style={{ height: 220, borderRadius: 12 }} />
              <Skeleton style={{ height: 150, borderRadius: 12 }} />
            </View>
          ) : (
            <>
              {facilities.length ? (
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
                  <ClinicMap clinics={facilities} you={you} selectedId={selected?.id ?? null} onSelect={setSelectedId} height={200} />
                </View>
              ) : null}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 24 + insets.bottom, gap: 12 }}>
                {selected ? (
                  <ClinicCard clinic={selected} primary={hasEmergencyRoom(selected)} />
                ) : (
                  <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.surface }}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                      {isError ? "Couldn't load clinics. Check your connection and try again." : "No clinics to show."} In an emergency, call 911.
                    </Text>
                  </View>
                )}

                {others.length ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>More nearby</Text>
                    {others.map((f) => (
                      <ClinicRow key={f.id} clinic={f} onPress={() => focusFacility(f)} />
                    ))}
                  </View>
                ) : null}

                <DsButton label="Open the full locator" variant="secondary" block onPress={() => animateOut(onOpenFull)} style={{ marginTop: 4 }} />

                {facilities.length ? (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: c.steel }}>
                    {"Places come from OpenStreetMap, a public map. HeartLink isn't partnered with any of them. In an emergency, call 911."}
                  </Text>
                ) : null}
              </ScrollView>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
