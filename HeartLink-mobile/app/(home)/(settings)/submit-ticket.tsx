import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useDs } from "../../../components/onboarding/useDs";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";

type CategoryItem = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  iconType: "feather" | "material";
  tint: "rose" | "sky" | "mint" | "lavender";
};

const CATEGORIES: CategoryItem[] = [
  {
    id: "Bug Report",
    label: "Report a Bug",
    subtitle: "Something isn't working as expected",
    icon: "alert-circle",
    iconType: "feather",
    tint: "rose",
  },
  {
    id: "UI/UX Suggestion",
    label: "Suggestion",
    subtitle: "Ideas to improve the interface",
    icon: "lightbulb-on-outline",
    iconType: "material",
    tint: "sky",
  },
  {
    id: "Account Issue",
    label: "Account & Sync",
    subtitle: "Sign-in, backup, or profile",
    icon: "account-cog-outline",
    iconType: "material",
    tint: "mint",
  },
  {
    id: "Question",
    label: "General Question",
    subtitle: "How to use features or vitals",
    icon: "help-circle",
    iconType: "feather",
    tint: "lavender",
  },
];

export default function SubmitTicketScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user, userId, token } = useUser();

  const initialCategory = (params.category as string) || "Bug Report";
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getTintColors = (tint: CategoryItem["tint"]) => {
    switch (tint) {
      case "rose":
        return {
          bg: isDark ? "rgba(239, 68, 68, 0.18)" : "#FEF2F2",
          border: isDark ? "rgba(239, 68, 68, 0.35)" : "#FECACA",
          fg: isDark ? "#F87171" : "#DC2626",
        };
      case "mint":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
          border: isDark ? "rgba(16, 185, 129, 0.35)" : "#A7F3D0",
          fg: isDark ? "#34D399" : "#059669",
        };
      case "lavender":
        return {
          bg: isDark ? "rgba(124, 58, 237, 0.18)" : "#F5F3FF",
          border: isDark ? "rgba(124, 58, 237, 0.35)" : "#DDD6FE",
          fg: isDark ? "#A78BFA" : "#7C3AED",
        };
      case "sky":
      default:
        return {
          bg: isDark ? "rgba(2, 132, 199, 0.18)" : "#F0F9FF",
          border: isDark ? "rgba(2, 132, 199, 0.35)" : "#BAE6FD",
          fg: isDark ? "#38BDF8" : "#0284C7",
        };
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast({
        title: "Description Required",
        message: "Please provide details so our clinical engineering team can assist you.",
        type: "error",
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSubmitting(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const effectiveToken = token || "";

      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
        },
        body: JSON.stringify({
          category,
          fullMessage: description.trim(),
          deviceMeta: {
            os: Platform.OS,
            model: "Mobile Device",
            appVersion: Constants.expoConfig?.version || "1.0.0",
          },
          user: user?.displayName || user?.name || "Patient User",
          userEmail: user?.email || "Not Provided",
          userId: userId || "N/A",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast({
          title: "Feedback Received",
          message: "Thank you for helping us refine HeartLink for all patients.",
          type: "success",
        });
        router.back();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (err) {
      showToast({
        title: "Submission Error",
        message: "Could not send feedback at this time. Please try again later.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Header Bar ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.canvas : "#FFFFFF",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
          <SquareIconButton
            icon="arrow-left"
            label="Back to Settings"
            onPress={() => router.back()}
          />
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: -0.4,
              color: c.ink,
              flexShrink: 1,
            }}
          >
            Send Feedback
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 5,
            paddingHorizontal: 9,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7",
            borderWidth: 1,
            borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
          }}
        >
          <Feather name="message-circle" size={13} color={isDark ? "#FBBF24" : "#D97706"} />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              color: isDark ? "#FBBF24" : "#D97706",
              letterSpacing: 0.3,
            }}
          >
            SUPPORT
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 40,
            gap: 22,
          }}
        >
          {/* Hero Section */}
          <View style={{ gap: 10 }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 15,
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
                borderWidth: 1,
                borderColor: isDark ? "rgba(245, 158, 11, 0.35)" : "#FDE68A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="message-square" size={24} color={isDark ? "#FBBF24" : "#D97706"} />
            </View>

            <Text
              accessibilityRole="header"
              style={{
                fontSize: 22,
                lineHeight: 28,
                fontWeight: "700",
                letterSpacing: -0.4,
                color: c.ink,
              }}
            >
              Share your experience
            </Text>

            <Text
              style={{
                fontSize: 14.5,
                lineHeight: 21,
                color: c.slate,
              }}
            >
              Your suggestions and issue reports go directly to our engineering and clinical team to make HeartLink better.
            </Text>
          </View>

          {/* ── Category Selection ── */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: c.steel,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                paddingHorizontal: 2,
              }}
            >
              Topic / Category
            </Text>

            <View style={{ gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat.id;
                const colors = getTintColors(cat.tint);

                return (
                  <AnimatedButton
                    key={cat.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setCategory(cat.id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${cat.label}, ${cat.subtitle}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected
                        ? isDark
                          ? "#38BDF8"
                          : "#0284C7"
                        : isDark
                        ? c.hairline
                        : "#EEF2F6",
                      backgroundColor: selected
                        ? isDark
                          ? "rgba(14, 165, 233, 0.12)"
                          : "#F0F9FF"
                        : isDark
                        ? c.surface
                        : "#FFFFFF",
                      gap: 12,
                      ...Platform.select({
                        ios: {
                          shadowColor: "#0F172A",
                          shadowOffset: { width: 0, height: selected ? 3 : 1 },
                          shadowOpacity: isDark ? 0.2 : selected ? 0.06 : 0.02,
                          shadowRadius: selected ? 6 : 3,
                        },
                        android: { elevation: selected ? 2 : 1 },
                      }),
                    }}
                  >
                    {/* Icon Badge */}
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: colors.bg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {cat.iconType === "material" ? (
                        <MaterialCommunityIcons
                          name={cat.icon as any}
                          size={19}
                          color={colors.fg}
                        />
                      ) : (
                        <Feather name={cat.icon as any} size={17} color={colors.fg} />
                      )}
                    </View>

                    {/* Text Details */}
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: c.ink,
                          letterSpacing: -0.2,
                        }}
                      >
                        {cat.label}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: c.slate }}>{cat.subtitle}</Text>
                    </View>

                    {/* Radio Check Indicator */}
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected
                          ? isDark
                            ? "#38BDF8"
                            : "#0284C7"
                          : isDark
                          ? c.steel
                          : "#CBD5E1",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected
                          ? isDark
                            ? "#38BDF8"
                            : "#0284C7"
                          : "transparent",
                      }}
                    >
                      {selected ? (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isDark ? "#0A1530" : "#FFFFFF",
                          }}
                        />
                      ) : null}
                    </View>
                  </AnimatedButton>
                );
              })}
            </View>
          </View>

          {/* ── Feedback Input Details ── */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: c.steel,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Details & Description
              </Text>
              <Text style={{ fontSize: 12, color: c.steel }}>
                {description.length} characters
              </Text>
            </View>

            <View
              style={{
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: isFocused
                  ? isDark
                    ? "#38BDF8"
                    : "#0284C7"
                  : isDark
                  ? c.hairline
                  : "#E2E8F0",
                backgroundColor: isDark ? c.surface : "#FFFFFF",
                padding: 14,
                minHeight: 160,
                ...Platform.select({
                  ios: {
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.2 : 0.03,
                    shadowRadius: 4,
                  },
                  android: { elevation: 1 },
                }),
              }}
            >
              <TextInput
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: c.ink,
                  minHeight: 130,
                  textAlignVertical: "top",
                }}
                placeholder="Please describe what happened, what you expected, or your suggestion in detail..."
                placeholderTextColor={c.steel}
                multiline
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* ── Device Metadata Box ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.16)" : "#E0F2FE",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="smartphone" size={16} color={isDark ? "#38BDF8" : "#0284C7"} />
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: c.ink }}>
                Diagnostic Metadata Included
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 17, color: c.slate }}>
                Platform: {Platform.OS} • App: v{Constants.expoConfig?.version || "1.0.0"} • Account: {user?.email || "Patient User"}
              </Text>
              <Text style={{ fontSize: 11.5, color: c.steel, marginTop: 2 }}>
                Device diagnostic info is automatically attached to help resolve issues quickly.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Fixed Bottom Action Bar ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.canvas : "#FFFFFF",
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.25 : 0.06,
              shadowRadius: 10,
            },
            android: { elevation: 6 },
          }),
        }}
      >
        <AnimatedButton
          onPress={handleSubmit}
          disabled={!description.trim() || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Submit Feedback"
          style={{
            height: 48,
            borderRadius: 14,
            backgroundColor: !description.trim()
              ? isDark
                ? c.surfaceAlt
                : "#E2E8F0"
              : isDark
              ? "#0284C7"
              : "#0284C7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: !description.trim()
                ? c.steel
                : "#FFFFFF",
            }}
          >
            {isSubmitting ? "Sending Feedback..." : "Send Feedback"}
          </Text>
        </AnimatedButton>
      </View>
    </ScreenWrapper>
  );
}
