import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { MissionId } from "./MissionList";
import { SleepQuickForm } from "./MissionDropdowns";
import { useDs } from "../onboarding/useDs";

const META: Record<
  Exclude<MissionId, "exercise" | "meals">,
  { title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }
> = {
  vitals: { title: "Log Vitals", subtitle: "Blood pressure & symptoms", icon: "heart" },
  sleep: { title: "Log Sleep", subtitle: "Last night's rest & recovery", icon: "moon" },
};

export function MissionLogModal({
  mission,
  userId,
  token,
  initialSleepHours,
  onClose,
  onSaved,
}: {
  /** Meals have their own sheet (LogMealSheet); exercise has its own screen. */
  mission: Exclude<MissionId, "exercise" | "meals"> | null;
  userId?: string | null;
  token?: string | null;
  initialSleepHours?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { c, isDark } = useDs();

  const [scaleAnim] = useState(() => new Animated.Value(0.94));
  const [translateYAnim] = useState(() => new Animated.Value(24));
  const [panelOpacity] = useState(() => new Animated.Value(0));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  const animateIn = useCallback(() => {
    scaleAnim.setValue(0.94);
    translateYAnim.setValue(24);
    panelOpacity.setValue(0);
    backdropAnim.setValue(0);

    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, translateYAnim, panelOpacity, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 16,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [scaleAnim, translateYAnim, panelOpacity, backdropAnim]
  );

  useEffect(() => {
    if (mission !== null) {
      animateIn();
    }
  }, [mission, animateIn]);

  if (!mission) return null;
  const meta = META[mission] ?? META.sleep;

  return (
    <Modal
      visible={mission !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => animateOut(onClose)}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          opacity: backdropAnim,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss background"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 360,
            maxHeight: "88%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: c.canvas,
            borderWidth: 1,
            borderColor: c.hairline,
            opacity: panelOpacity,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isDark ? 0.4 : 0.12,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          {/* Header row: title, icon badge & close button */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: c.hairlineSoft,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: c.tint,
                  borderWidth: 1,
                  borderColor: isDark ? c.hairline : "#DBEAFE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={meta.icon} size={18} color={c.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink, letterSpacing: -0.3 }}>
                  {meta.title}
                </Text>
                <Text style={{ fontSize: 12, color: c.slate, marginTop: 1 }}>
                  {meta.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => animateOut(onClose)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.surfaceAlt,
                borderWidth: 1,
                borderColor: c.hairline,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="x" size={15} color={c.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}
          >
            {mission === "sleep" && (
              <SleepQuickForm
                userId={userId}
                token={token}
                initialSleepHours={initialSleepHours}
                onSaved={onSaved}
              />
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
