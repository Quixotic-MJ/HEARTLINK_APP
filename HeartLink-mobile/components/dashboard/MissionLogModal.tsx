import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import type { MissionId } from "./MissionList";
import { SleepQuickForm } from "./MissionDropdowns";
import { theme } from "../../constants/theme";

/**
 * MissionLogModal — centered pop-up input modal for the heart missions,
 * compiled from the InviteDisclosure blueprint.
 *
 * Blueprint mechanics preserved:
 * - Closed trigger -> centered rounded panel popping in (reference spring:
 *   stiffness 800, damping 80, mass 5; layoutId morph has no RN equivalent).
 * - Header row: title + circular close badge.
 * - Content rises with a short delay (reference item stagger: spring 260/20).
 *
 * Motion uses RN Animated (Reanimated entering swallows touches inside
 * RN Modals). div -> View, text -> Text, onClick -> TouchableOpacity.
 */

const META: Record<
  Exclude<MissionId, "exercise" | "meals">,
  { title: string; icon: string; iconType: "feather" | "material"; tile: [string, string] }
> = {
  vitals: { title: "Log Vitals", icon: "heart", iconType: "feather", tile: ["#E11D48", "#FB7185"] },
  sleep: { title: "Log Sleep", icon: "moon", iconType: "feather", tile: ["#6366F1", "#A5B4FC"] },
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const popScale = useRef(new Animated.Value(0.9)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentShift = useRef(new Animated.Value(10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    popScale.setValue(0.9);
    panelOpacity.setValue(0);
    backdropAnim.setValue(0);
    contentShift.setValue(10);
    contentOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Reference container spring: stiffness 800, damping 80, mass 5.
      Animated.spring(popScale, {
        toValue: 1,
        stiffness: 800,
        damping: 80,
        mass: 5,
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      // Reference item stagger: rise with a beat of delay, spring 260/20.
      Animated.spring(contentShift, {
        toValue: 0,
        stiffness: 260,
        damping: 20,
        mass: 1,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [popScale, panelOpacity, backdropAnim, contentShift, contentOpacity]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(popScale, {
          toValue: 0.94,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [popScale, panelOpacity, backdropAnim]
  );

  if (!mission) return null;
  const meta = META[mission];

  return (
    <Modal
      visible={mission !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={() => animateOut(onClose)}
    >
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.55)", opacity: backdropAnim, justifyContent: "center", alignItems: "center", padding: 20 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          style={{
            width: "100%",
            maxWidth: 380,
            maxHeight: "84%",
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8E5",
            opacity: panelOpacity,
            transform: [{ scale: popScale }],
          }}
        >
          {/* Header: title + circular close badge (reference) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <LinearGradient
                colors={meta.tile}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
              >
                {meta.iconType === "material" ? (
                  <MaterialCommunityIcons name={meta.icon as any} size={17} color={theme.onPrimary} />
                ) : (
                  <Feather name={meta.icon as any} size={16} color={theme.onPrimary} />
                )}
              </LinearGradient>
              <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#fff" : "#152131" }}>
                {meta.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => animateOut(onClose)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#0f172a" : "#F1F5F4",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="x" size={16} color={isDark ? "#94A3B8" : "#5C6B66"} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
          >
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentShift }],
            }}
          >
            {mission === "sleep" && (
              <SleepQuickForm
                userId={userId}
                token={token}
                initialSleepHours={initialSleepHours}
                onSaved={onSaved}
              />
            )}
          </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
