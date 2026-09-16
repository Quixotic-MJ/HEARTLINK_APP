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
import { useRouter } from "expo-router";
import type { MissionId } from "./MissionList";
import { SleepQuickForm } from "./MissionDropdowns";

const FOOD_LOG_OPTIONS = [
  {
    icon: "camera" as const,
    iconType: "feather" as const,
    label: "Scan food barcode",
    subtitle: "Use camera to scan product barcodes",
    iconColor: "#185fa5",
    iconBg: "#e6f1fb",
    route: "/(home)/(meals)/barcode-scan",
  },
  {
    icon: "search" as const,
    iconType: "feather" as const,
    label: "Search food database",
    subtitle: "Search verified meals & nutritional facts",
    iconColor: "#16a34a",
    iconBg: "#eaf3de",
    route: "/(home)/(meals)/search-meal",
  },
  {
    icon: "silverware-fork-knife" as const,
    iconType: "material" as const,
    label: "Log manually / Estimate",
    subtitle: "Enter custom food details & nutrients",
    iconColor: "#d97706",
    iconBg: "#fef3c7",
    route: "/(home)/(meals)/estimate-meal",
  },
];

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
  Exclude<MissionId, "exercise">,
  { title: string; icon: string; iconType: "feather" | "material"; tile: [string, string] }
> = {
  vitals: { title: "Log Vitals", icon: "heart", iconType: "feather", tile: ["#E11D48", "#FB7185"] },
  meals: { title: "Log Meal", icon: "silverware-fork-knife", iconType: "material", tile: ["#A9741B", "#E0A93E"] },
  sleep: { title: "Log Sleep", icon: "moon", iconType: "feather", tile: ["#6366F1", "#A5B4FC"] },
};

export function MissionLogModal({
  mission,
  userId,
  token,
  initialSleepHours,
  onClose,
  onSaved,
  onOpenDiary,
}: {
  mission: Exclude<MissionId, "exercise"> | null;
  userId?: string | null;
  token?: string | null;
  initialSleepHours?: number;
  onClose: () => void;
  onSaved: () => void;
  onOpenDiary: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

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
                  <MaterialCommunityIcons name={meta.icon as any} size={17} color="#fff" />
                ) : (
                  <Feather name={meta.icon as any} size={16} color="#fff" />
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
            {mission === "meals" && (
              <View style={{ paddingTop: 8 }}>
                {FOOD_LOG_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={option.label}
                    activeOpacity={0.7}
                    onPress={() => animateOut(() => router.push(option.route as any))}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isDark ? "#1e293b" : "#fff",
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: index < FOOD_LOG_OPTIONS.length - 1 ? 10 : 0,
                      borderWidth: 0.5,
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: option.iconBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      {option.iconType === "feather" ? (
                        <Feather name={option.icon as any} size={18} color={option.iconColor} />
                      ) : (
                        <MaterialCommunityIcons name={option.icon as any} size={18} color={option.iconColor} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#f8fafc" : "#0f172a", marginBottom: 2 }}>
                        {option.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? "#cbd5e1" : "#64748b", lineHeight: 16 }}>
                        {option.subtitle}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={isDark ? "#64748b" : "#cbd5e1"} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => animateOut(onOpenDiary)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, marginTop: 4 }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#A9741B" }}>
                    Open Food Diary
                  </Text>
                  <Feather name="arrow-right" size={13} color="#A9741B" />
                </TouchableOpacity>
              </View>
            )}
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
