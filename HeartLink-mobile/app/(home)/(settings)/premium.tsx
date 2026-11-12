import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { ChoiceList } from "../../../components/onboarding/Controls";
import { DsScreen, IconBadge, InfoNote } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../contexts/ToastContext";
import { useDemoCheckout, usePremium, useStartTrial } from "../../../hooks/usePremium";
import {
  PREMIUM_FEATURES,
  PaymentMethod,
  PremiumFeature,
  PremiumPeriod,
  PremiumStatus,
  peso,
  premiumStatusLine,
  priceFor,
  yearlySaving,
} from "../../../services/premium";

// HL-084: HeartLink Premium. The free trial, a plan, and a demo checkout (test mode: nothing is charged and no card or
// GCash details are asked for). Premium only adds features; everything that keeps people safe stays free.
// 2026-11-12: rebuilt on the design system (DESIGN.md + HEARTLINK.md), like the onboarding and Visit summary screens.

// Where each feature lives, so a Premium patient can open it from here
const FEATURE_ROUTES: Record<PremiumFeature["key"], string> = {
  reports: "/(home)/(profile)/health-report",
  trends: "/(home)/(tabs)/trends",
  family: "/(home)/(settings)/family-sharing",
  meals: "/(home)/(meals)/meal-plan",
};

function SectionTitle({ children }: { children: string }) {
  const { c } = useDs();
  return (
    <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

/** The three Premium features in one card. When the patient has Premium, each row opens the feature. */
function Features({ open }: { open?: (f: PremiumFeature) => void }) {
  const { c } = useDs();
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
      {PREMIUM_FEATURES.map((f, i) => {
        const row = (
          <View style={{ flexDirection: "row", gap: 14, padding: 16, alignItems: "flex-start" }}>
            <IconBadge icon={f.icon} tint={f.tint} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{f.title}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 3 }}>{f.text}</Text>
            </View>
            {open ? <Feather name="chevron-right" size={18} color={c.steel} style={{ marginTop: 10 }} /> : null}
          </View>
        );
        return (
          <View key={f.key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}>
            {open ? (
              <AnimatedButton onPress={() => open(f)} accessibilityRole="button" accessibilityLabel={`Open ${f.title}`}>
                {row}
              </AnimatedButton>
            ) : (
              row
            )}
          </View>
        );
      })}
    </View>
  );
}

/** "You're on Premium" with how long it lasts. */
function ActiveCard({ status }: { status: PremiumStatus }) {
  const { c } = useDs();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, backgroundColor: c.tint }}>
      <IconBadge icon="check-decagram-outline" tint="sky" size={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.onTint }}>You&apos;re on Premium</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.onTint, marginTop: 2 }}>{premiumStatusLine(status)}</Text>
      </View>
    </View>
  );
}

/** The demo checkout: confirm the plan, pick GCash or card, pay (test mode). */
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
  onPaid: (s: PremiumStatus) => void;
}) {
  const { c } = useDs();
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
        onSuccess: (s) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onPaid(s);
        },
        onError: (e) => showToast({ title: "Payment didn't go through", message: e.message, type: "error" }),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 15, 15, 0.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={checkout.isPending ? undefined : onClose} accessibilityLabel="Close checkout" />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.canvas,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: c.hairline,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            gap: 16,
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong }} />
          <View>
            <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
              Confirm your plan
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 4 }}>
              {period === "yearly" ? "HeartLink Premium for 1 year" : "HeartLink Premium for 1 month"}
              {status.is_premium ? ", added after your current Premium ends" : ""}.
            </Text>
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline }}
          >
            <Text style={{ fontSize: 15, color: c.slate }}>{period === "yearly" ? "Yearly plan" : "Monthly plan"}</Text>
            <Text style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>{amount}</Text>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, marginBottom: 8 }}>Pay with</Text>
            <ChoiceList
              accessibilityLabel="Payment method"
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              options={[
                { value: "gcash", label: "GCash", desc: "GCash wallet" },
                { value: "card", label: "Credit or debit card", desc: "Visa, Mastercard or JCB" },
              ]}
            />
          </View>

          <InfoNote icon="lock" text="Test mode: nothing is charged, and no card or GCash details are asked for. You pay once; it doesn't renew by itself." />

          <View style={{ gap: 4 }}>
            <DsButton label={`Pay ${amount} (test)`} onPress={pay} loading={checkout.isPending} block />
            <DsButton label="Cancel" variant="quiet" onPress={onClose} disabled={checkout.isPending} block />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PremiumScreen() {
  const router = useRouter();
  const { c } = useDs();
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
        showToast({ title: "Your free trial has started", message: premiumStatusLine(s), type: "success" });
      },
      onError: (e) => showToast({ title: "Couldn't start the trial", message: e.message, type: "error" }),
    });
  };

  const onPaid = (s: PremiumStatus) => {
    setCheckoutOpen(false);
    showToast({ title: "You're on Premium", message: premiumStatusLine(s), type: "success" });
  };

  const openCheckout = () => {
    Haptics.selectionAsync().catch(() => {});
    setCheckoutOpen(true);
  };

  const price = status ? peso(priceFor(status, period)) : "";
  const footer =
    status && status.checkout_enabled ? (
      status.trial_available ? (
        <>
          <DsButton label={`Start ${status.trial_days}-day free trial`} onPress={startTrial} loading={trial.isPending} block />
          <DsButton label={`Or pay ${price} now`} variant="quiet" onPress={openCheckout} disabled={trial.isPending} block />
        </>
      ) : (
        <DsButton
          label={status.is_premium ? `Add ${period === "yearly" ? "1 year" : "1 month"} · ${price}` : `Get Premium · ${price}`}
          onPress={openCheckout}
          block
        />
      )
    ) : null;

  const plans = status
    ? [
        {
          value: "yearly",
          label: `Yearly · ${peso(status.yearly_price_php)}`,
          desc:
            yearlySaving(status) > 0
              ? `${peso(Math.round(status.yearly_price_php / 12))} a month, ${peso(yearlySaving(status))} less than paying monthly`
              : `${peso(Math.round(status.yearly_price_php / 12))} a month`,
        },
        { value: "monthly", label: `Monthly · ${peso(status.monthly_price_php)}`, desc: "One month at a time" },
      ]
    : [];

  return (
    <DsScreen header={<PageHeader title="HeartLink Premium" onBack={() => router.back()} />} footer={footer}>
      <IconBadge icon="star-four-points-outline" tint="yellow" />
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", color: c.ink, marginTop: 16 }}>
        Follow your heart health over months
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8 }}>
        Longer Visit summaries, trends over months, family sharing and a weekly meal plan, on top of everything you
        already use for free.
      </Text>

      {premium.isPending ? (
        <View style={{ gap: 12, marginTop: 24 }}>
          <Skeleton style={{ height: 240, borderRadius: 12 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
        </View>
      ) : premium.isError || !status ? (
        <View style={{ gap: 12, marginTop: 24 }}>
          <InfoNote icon="wifi-off" title="Premium couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => premium.refetch()} block />
        </View>
      ) : (
        <View style={{ gap: 24, marginTop: 24 }}>
          {status.is_premium ? <ActiveCard status={status} /> : null}

          <View>
            <SectionTitle>{status.is_premium ? "Your Premium features" : "What you get"}</SectionTitle>
            <Features open={status.is_premium ? (f) => router.push(FEATURE_ROUTES[f.key] as never) : undefined} />
          </View>

          <InfoNote
            icon="shield"
            title="Safety stays free"
            text="Check-ins, emergency warnings, nearby clinics, reminders, your Heart risk and habits score, and the 7-day Visit summary are free for everyone."
          />

          {status.checkout_enabled ? (
            <View>
              <SectionTitle>{status.is_premium ? "Add more time" : "Choose a plan"}</SectionTitle>
              <ChoiceList
                accessibilityLabel="Premium plan"
                value={period}
                onChange={(v) => setPeriod(v as PremiumPeriod)}
                options={plans}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
                <Feather name="lock" size={13} color={c.steel} />
                <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.steel }}>
                  Test mode: no real money is charged. You pay once; it doesn&apos;t renew by itself.
                </Text>
              </View>
            </View>
          ) : (
            <InfoNote
              icon="pause-circle"
              title="New Premium plans are paused"
              text="HeartLink isn't taking new Premium plans right now. Everything that keeps you safe stays free."
            />
          )}
        </View>
      )}

      {status ? (
        <CheckoutSheet visible={checkoutOpen} status={status} period={period} onClose={() => setCheckoutOpen(false)} onPaid={onPaid} />
      ) : null}
    </DsScreen>
  );
}
