import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useToast } from "../../../contexts/ToastContext";
import { useDemoCheckout, usePremium, useStartTrial } from "../../../hooks/usePremium";
import {
  PaymentMethod,
  PREMIUM_FEATURES,
  PremiumPeriod,
  PremiumStatus,
  peso,
  premiumStatusLine,
  priceFor,
  yearlySaving,
} from "../../../services/premium";

// ─── Plan Choice Card ─────────────────────────────────────────────────────────

function PlanChoiceCard({
  title,
  priceLabel,
  subLabel,
  badge,
  selected,
  onPress,
}: {
  title: string;
  priceLabel: string;
  subLabel?: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c, isDark } = useDs();

  return (
    <AnimatedButton
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${priceLabel}${subLabel ? `, ${subLabel}` : ""}${badge ? `, ${badge}` : ""}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? (isDark ? "#38BDF8" : "#0284C7") : (isDark ? c.hairline : "#EEF2F6"),
        backgroundColor: selected
          ? (isDark ? "rgba(14, 165, 233, 0.12)" : "#F0F9FF")
          : (isDark ? c.surface : "#FFFFFF"),
        gap: 14,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: selected ? 3 : 1 },
            shadowOpacity: isDark ? 0.2 : (selected ? 0.08 : 0.03),
            shadowRadius: selected ? 8 : 4,
          },
          android: { elevation: selected ? 2 : 1 },
        }),
      }}
    >
      {/* Custom Radio Circle */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? (isDark ? "#38BDF8" : "#0284C7") : (isDark ? c.steel : "#CBD5E1"),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? (isDark ? "#38BDF8" : "#0284C7") : "transparent",
        }}
      >
        {selected ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isDark ? "#0A1530" : "#FFFFFF",
            }}
          />
        ) : null}
      </View>

      {/* Title & Subtitle */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: c.ink,
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Text>
          {badge ? (
            <View
              style={{
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7",
                borderWidth: 1,
                borderColor: isDark ? "rgba(245, 158, 11, 0.35)" : "#FDE68A",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: isDark ? "#FBBF24" : "#B45309",
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        {subLabel ? (
          <Text style={{ fontSize: 13, color: c.slate }}>{subLabel}</Text>
        ) : null}
      </View>

      {/* Price tag */}
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: selected ? (isDark ? "#38BDF8" : "#0284C7") : c.ink,
            letterSpacing: -0.3,
          }}
        >
          {priceLabel}
        </Text>
      </View>
    </AnimatedButton>
  );
}

// ─── Feature Item Card ────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: (typeof PREMIUM_FEATURES)[number] }) {
  const { c, isDark } = useDs();

  const getTintConfig = (tint: string) => {
    switch (tint) {
      case "mint":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
          border: isDark ? "rgba(16, 185, 129, 0.32)" : "#A7F3D0",
          fg: isDark ? "#34D399" : "#059669",
        };
      case "peach":
        return {
          bg: isDark ? "rgba(249, 115, 22, 0.18)" : "#FFF7ED",
          border: isDark ? "rgba(249, 115, 22, 0.32)" : "#FED7AA",
          fg: isDark ? "#FB923C" : "#EA580C",
        };
      case "sky":
      default:
        return {
          bg: isDark ? "rgba(2, 132, 199, 0.18)" : "#F0F9FF",
          border: isDark ? "rgba(2, 132, 199, 0.32)" : "#BAE6FD",
          fg: isDark ? "#38BDF8" : "#0284C7",
        };
    }
  };

  const colors = getTintConfig(feature.tint);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 16,
        borderRadius: 16,
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        gap: 14,
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
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={feature.icon as any} size={22} color={colors.fg} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text
            style={{
              flex: 1,
              fontSize: 15.5,
              fontWeight: "700",
              color: c.ink,
              letterSpacing: -0.2,
            }}
          >
            {feature.title}
          </Text>

          {!feature.ready ? (
            <View
              style={{
                flexShrink: 0,
                paddingVertical: 2.5,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.steel }}>
                Coming soon
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 19.5,
            color: c.slate,
          }}
        >
          {feature.text}
        </Text>
      </View>
    </View>
  );
}

// ─── Checkout Sheet Modal ─────────────────────────────────────────────────────

function CheckoutSheet({
  visible,
  status,
  period,
  onClose,
  onPaid,
}: {
  visible: boolean;
  status: PremiumStatus;
  period: PremiumPeriod;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { c, isDark } = useDs();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const checkout = useDemoCheckout();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const amount = peso(priceFor(status, period));

  const pay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    checkout.mutate(
      { period, method },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onPaid();
        },
        onError: (e) =>
          showToast({
            title: "Payment didn't go through",
            message: e.message,
            type: "error",
          }),
      },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(15, 23, 42, 0.55)",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close checkout sheet"
          style={{ flex: 1 }}
        />

        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: isDark ? c.surface : "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 22,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
            gap: 16,
            borderTopWidth: 1,
            borderColor: isDark ? c.hairline : "#E2E8F0",
            ...Platform.select({
              ios: {
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
              },
              android: { elevation: 12 },
            }),
          }}
        >
          {/* Drag Handle */}
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? c.hairlineStrong : "#CBD5E1",
              marginBottom: 4,
            }}
          />

          {/* Title Row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 21,
                  fontWeight: "700",
                  letterSpacing: -0.4,
                  color: c.ink,
                }}
              >
                Checkout
              </Text>
              <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>
                Confirm your HeartLink Premium plan
              </Text>
            </View>

            <View
              style={{
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
                borderWidth: 1,
                borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: "700",
                  color: isDark ? "#FBBF24" : "#B45309",
                  letterSpacing: 0.2,
                }}
              >
                Test mode
              </Text>
            </View>
          </View>

          {/* Plan Summary Box */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.ink }}>
                Premium ({period === "monthly" ? "1 Month" : "1 Year"})
              </Text>
              <Text style={{ fontSize: 13, color: c.slate }}>
                Single payment, non-renewing demo
              </Text>
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: isDark ? "#38BDF8" : "#0284C7",
                letterSpacing: -0.4,
              }}
            >
              {amount}
            </Text>
          </View>

          {/* Payment Method Selector */}
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.charcoal,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Select Payment Method
            </Text>

            <AnimatedButton
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setMethod("gcash");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 13,
                borderRadius: 14,
                borderWidth: method === "gcash" ? 2 : 1,
                borderColor: method === "gcash" ? (isDark ? "#38BDF8" : "#0284C7") : (isDark ? c.hairline : "#E2E8F0"),
                backgroundColor: method === "gcash"
                  ? (isDark ? "rgba(14, 165, 233, 0.1)" : "#F0F9FF")
                  : (isDark ? c.canvas : "#FFFFFF"),
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#EFF6FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="smartphone" size={18} color={isDark ? "#60A5FA" : "#2563EB"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>GCash</Text>
                <Text style={{ fontSize: 12.5, color: c.slate }}>Pay securely via GCash wallet</Text>
              </View>
              <Feather
                name={method === "gcash" ? "check-circle" : "circle"}
                size={20}
                color={method === "gcash" ? (isDark ? "#38BDF8" : "#0284C7") : c.steel}
              />
            </AnimatedButton>

            <AnimatedButton
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setMethod("card");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 13,
                borderRadius: 14,
                borderWidth: method === "card" ? 2 : 1,
                borderColor: method === "card" ? (isDark ? "#38BDF8" : "#0284C7") : (isDark ? c.hairline : "#E2E8F0"),
                backgroundColor: method === "card"
                  ? (isDark ? "rgba(14, 165, 233, 0.1)" : "#F0F9FF")
                  : (isDark ? c.canvas : "#FFFFFF"),
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "#F5F3FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="credit-card" size={18} color={isDark ? "#A78BFA" : "#7C3AED"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Credit or Debit Card</Text>
                <Text style={{ fontSize: 12.5, color: c.slate }}>Visa, Mastercard or JCB</Text>
              </View>
              <Feather
                name={method === "card" ? "check-circle" : "circle"}
                size={20}
                color={method === "card" ? (isDark ? "#38BDF8" : "#0284C7") : c.steel}
              />
            </AnimatedButton>
          </View>

          {/* Test Notice */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              padding: 11,
              borderRadius: 12,
              backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
            }}
          >
            <Feather name="shield" size={14} color={c.steel} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: c.steel }}>
              This is a sandbox simulation. No real charges are processed and no financial credentials are requested.
            </Text>
          </View>

          {/* Action CTAs */}
          <View style={{ gap: 8, marginTop: 4 }}>
            <AnimatedButton
              onPress={pay}
              disabled={checkout.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Pay ${amount}`}
              style={{
                height: 48,
                borderRadius: 14,
                backgroundColor: isDark ? "#0284C7" : "#0284C7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                {checkout.isPending ? "Processing..." : `Complete ${amount} (Test)`}
              </Text>
            </AnimatedButton>

            <AnimatedButton
              onPress={onClose}
              disabled={checkout.isPending}
              accessibilityRole="button"
              accessibilityLabel="Cancel checkout"
              style={{
                height: 44,
                borderRadius: 14,
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: "600", color: c.slate }}>
                Cancel
              </Text>
            </AnimatedButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Premium Screen ──────────────────────────────────────────────────────

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useDs();
  const { showToast } = useToast();
  const premium = usePremium();
  const trial = useStartTrial();
  const [period, setPeriod] = useState<PremiumPeriod>("yearly");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const status = premium.data;

  const startTrial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    trial.mutate(undefined, {
      onSuccess: (s) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast({
          title: "Your free trial has started",
          message: premiumStatusLine(s),
          type: "success",
        });
      },
      onError: (e) =>
        showToast({
          title: "Couldn't start the trial",
          message: e.message,
          type: "error",
        }),
    });
  };

  const onPaid = () => {
    setCheckoutOpen(false);
    showToast({
      title: "You're on Premium!",
      message: "Thanks for supporting HeartLink.",
      type: "success",
    });
  };

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Header Bar (Full Width Edge-to-Edge) ── */}
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
            HeartLink Premium
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(14, 165, 233, 0.16)" : "#E0F2FE",
            borderWidth: 1,
            borderColor: isDark ? "rgba(14, 165, 233, 0.3)" : "#BAE6FD",
          }}
        >
          <MaterialCommunityIcons
            name="crown"
            size={14}
            color={isDark ? "#38BDF8" : "#0284C7"}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: isDark ? "#38BDF8" : "#0284C7",
              letterSpacing: 0.3,
            }}
          >
            PRO
          </Text>
        </View>
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: isDark ? c.canvas : "#F8FAFC" }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
          gap: 18,
        }}
      >
        {/* Hero Section */}
        <View style={{ gap: 8 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
              borderWidth: 1,
              borderColor: isDark ? "rgba(245, 158, 11, 0.35)" : "#FDE68A",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="crown"
              size={26}
              color={isDark ? "#FBBF24" : "#D97706"}
            />
          </View>

          <Text
            accessibilityRole="header"
            style={{
              fontSize: 23,
              lineHeight: 30,
              fontWeight: "700",
              letterSpacing: -0.4,
              color: c.ink,
            }}
          >
            See the longer story of your heart health
          </Text>

          <Text
            style={{
              fontSize: 14,
              lineHeight: 21,
              color: c.slate,
            }}
          >
            Clinical doctor reports, long-term trends, and trusted family sharing on top of daily monitoring.
          </Text>
        </View>

        {/* Loading Skeleton */}
        {premium.isPending ? (
          <View style={{ gap: 12, marginTop: 4 }}>
            <Skeleton style={{ height: 80, borderRadius: 16 }} />
            <Skeleton style={{ height: 180, borderRadius: 16 }} />
          </View>
        ) : premium.isError || !status ? (
          /* Error State */
          <View
            style={{
              padding: 20,
              borderRadius: 16,
              backgroundColor: isDark ? c.surface : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Feather name="wifi-off" size={28} color={c.steel} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
              Premium couldn&apos;t load
            </Text>
            <Text style={{ fontSize: 13.5, color: c.slate, textAlign: "center" }}>
              Check your connection, then try again.
            </Text>
            <AnimatedButton
              onPress={() => premium.refetch()}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>
                Try again
              </Text>
            </AnimatedButton>
          </View>
        ) : (
          <>
            {/* Active Membership Banner */}
            {status.is_premium ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: isDark ? "rgba(14, 165, 233, 0.14)" : "#F0F9FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.3)" : "#BAE6FD",
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: isDark ? "rgba(14, 165, 233, 0.22)" : "#E0F2FE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={24}
                    color={isDark ? "#38BDF8" : "#0284C7"}
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: c.ink,
                        letterSpacing: -0.2,
                      }}
                    >
                      You&apos;re on Premium
                    </Text>
                    <View
                      style={{
                        paddingVertical: 2,
                        paddingHorizontal: 7,
                        borderRadius: 999,
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isDark ? "#34D399" : "#059669",
                        }}
                      >
                        ACTIVE
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: isDark ? "#7DD3FC" : "#0369A1",
                      fontWeight: "500",
                    }}
                  >
                    {premiumStatusLine(status)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Feature Cards Grid */}
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
                What&apos;s Included
              </Text>

              <View style={{ gap: 10 }}>
                {PREMIUM_FEATURES.map((feature) => (
                  <FeatureCard key={feature.key} feature={feature} />
                ))}
              </View>
            </View>

            {/* Safety Guarantee Trust Card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                padding: 16,
                borderRadius: 16,
                backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                borderWidth: 1,
                borderColor: isDark ? c.hairline : "#EEF2F6",
                gap: 13,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(16, 185, 129, 0.28)" : "#A7F3D0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="shield" size={18} color={isDark ? "#34D399" : "#059669"} />
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    fontSize: 14.5,
                    fontWeight: "700",
                    color: c.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  Safety features are always free
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 19,
                    color: c.slate,
                  }}
                >
                  Daily check-ins, emergency alerts, nearby clinics, reminders, and your heart score remain 100% free forever.
                </Text>
              </View>
            </View>

            {/* Plan Picker or Paused Banner */}
            {status.checkout_enabled ? (
              <View style={{ gap: 10 }} accessibilityRole="radiogroup">
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
                  Choose Your Plan
                </Text>

                <View style={{ gap: 10 }}>
                  <PlanChoiceCard
                    title="Yearly Plan"
                    priceLabel={`${peso(status.yearly_price_php)} / yr`}
                    subLabel={`Just ${peso(Math.round(status.yearly_price_php / 12))} / month`}
                    badge={yearlySaving(status) > 0 ? `Save ${peso(yearlySaving(status))}` : "Best Value"}
                    selected={period === "yearly"}
                    onPress={() => setPeriod("yearly")}
                  />

                  <PlanChoiceCard
                    title="Monthly Plan"
                    priceLabel={`${peso(status.monthly_price_php)} / mo`}
                    subLabel="Billed month to month"
                    selected={period === "monthly"}
                    onPress={() => setPeriod("monthly")}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 4,
                    marginTop: 4,
                  }}
                >
                  <Feather name="lock" size={13} color={c.steel} />
                  <Text style={{ flex: 1, fontSize: 12.5, color: c.steel }}>
                    Test mode: no real money is charged. Paid once, no automatic recurrence.
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={{
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: isDark ? c.surface : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isDark ? c.hairline : "#EEF2F6",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
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
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="pause-circle" size={18} color={c.steel} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.ink }}>
                    Subscriptions Currently Paused
                  </Text>
                  <Text style={{ fontSize: 12.5, lineHeight: 17, color: c.slate }}>
                    New sign-ups are being upgraded. All core features remain 100% free. Check back soon!
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Fixed Bottom Action Bar ── */}
      {status && status.checkout_enabled ? (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: isDark ? c.hairline : "#EEF2F6",
            backgroundColor: isDark ? c.canvas : "#FFFFFF",
            gap: 8,
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
          {status.trial_available ? (
            <>
              <AnimatedButton
                onPress={startTrial}
                disabled={trial.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Start ${status.trial_days}-day free trial`}
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#0284C7" : "#0284C7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  {trial.isPending ? "Starting trial..." : `Start ${status.trial_days}-Day Free Trial`}
                </Text>
              </AnimatedButton>

              <AnimatedButton
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setCheckoutOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Pay ${peso(priceFor(status, period))} now`}
                style={{
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isDark ? "#38BDF8" : "#0284C7",
                  }}
                >
                  Or buy directly for {peso(priceFor(status, period))}
                </Text>
              </AnimatedButton>
            </>
          ) : (
            <AnimatedButton
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCheckoutOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Get Premium for ${peso(priceFor(status, period))}`}
              style={{
                height: 48,
                borderRadius: 14,
                backgroundColor: isDark ? "#0284C7" : "#0284C7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                {status.is_premium
                  ? `Extend ${period === "monthly" ? "1 Month" : "1 Year"} • ${peso(priceFor(status, period))}`
                  : `Get Premium • ${peso(priceFor(status, period))}`}
              </Text>
            </AnimatedButton>
          )}
        </View>
      ) : null}

      {/* ── Checkout Modal ── */}
      {status ? (
        <CheckoutSheet
          visible={checkoutOpen}
          status={status}
          period={period}
          onClose={() => setCheckoutOpen(false)}
          onPaid={onPaid}
        />
      ) : null}
    </ScreenWrapper>
  );
}
