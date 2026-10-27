import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
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

// HL-084: HeartLink Premium. Test mode: the checkout is a demo, nothing is charged and no payment details are asked.

function Header() {
  const router = useRouter();
  return (
    <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
      <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
      <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">
        HeartLink Premium
      </Text>
    </View>
  );
}

/** Full-width single-choice row with a radio (HEARTLINK.md: single choice = rows with a radio). */
function ChoiceRow({ title, detail, badge, selected, onPress }: { title: string; detail: string; badge?: string; selected: boolean; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${detail}${badge ? `, ${badge}` : ""}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.line : c.hairline,
        backgroundColor: selected ? c.tint : c.canvas,
      }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selected ? c.line : c.hairlineStrong, alignItems: "center", justifyContent: "center" }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.line }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: selected ? c.onTint : c.ink }}>{title}</Text>
        <Text style={{ fontSize: 14, color: selected ? c.onTint : c.slate, marginTop: 2 }}>{detail}</Text>
      </View>
      {badge ? <Tag label={badge} tone="warm" align="center" /> : null}
    </AnimatedButton>
  );
}

function FeatureRow({ feature }: { feature: (typeof PREMIUM_FEATURES)[number] }) {
  const { c } = useDs();
  return (
    <View style={{ flexDirection: "row", gap: 14, paddingVertical: 14 }}>
      <IconBadge icon={feature.icon} tint={feature.tint} size={40} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{feature.title}</Text>
          {feature.ready ? null : <Tag label="Coming soon" tone="neutral" align="center" />}
        </View>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 3 }}>{feature.text}</Text>
      </View>
    </View>
  );
}

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
  const { c } = useDs();
  const { showToast } = useToast();
  const checkout = useDemoCheckout();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const amount = peso(priceFor(status, period));

  const pay = () =>
    checkout.mutate(
      { period, method },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPaid();
        },
        onError: (e) => showToast({ title: "Payment didn't go through", message: e.message, type: "error" }),
      },
    );

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10,21,48,0.45)" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} accessibilityLabel="Close checkout" style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ backgroundColor: c.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, gap: 14 }}>
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
              Checkout
            </Text>
            <Tag label="Test mode" tone="warm" align="center" />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.hairlineSoft }}>
            <Text style={{ fontSize: 15, color: c.slate }}>Premium, {period === "monthly" ? "1 month" : "1 year"}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{amount}</Text>
          </View>

          <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Pay with</Text>
          <ChoiceRow title="GCash" detail="Pay from your GCash wallet" selected={method === "gcash"} onPress={() => setMethod("gcash")} />
          <ChoiceRow title="Card" detail="Visa or Mastercard" selected={method === "card"} onPress={() => setMethod("card")} />

          <InfoNote text="This is a demo. Nothing is charged, and HeartLink doesn't ask for your GCash or card details. Premium is paid once and doesn't renew by itself." />

          <DsButton label={`Pay ${amount} (test)`} onPress={pay} loading={checkout.isPending} />
          <DsButton label="Cancel" variant="quiet" onPress={onClose} block />
        </View>
      </View>
    </Modal>
  );
}

export default function PremiumScreen() {
  const { c } = useDs();
  const { showToast } = useToast();
  const premium = usePremium();
  const trial = useStartTrial();
  const [period, setPeriod] = useState<PremiumPeriod>("yearly");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const status = premium.data;

  const startTrial = () =>
    trial.mutate(undefined, {
      onSuccess: (s) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({ title: "Your free trial has started", message: premiumStatusLine(s), type: "success" });
      },
      onError: (e) => showToast({ title: "Couldn't start the trial", message: e.message, type: "error" }),
    });

  const onPaid = () => {
    setCheckoutOpen(false);
    showToast({ title: "You're on Premium", message: "Thanks for supporting HeartLink.", type: "success" });
  };

  let footer: React.ReactNode = null;
  if (status && status.checkout_enabled) {
    const amount = peso(priceFor(status, period));
    footer = status.trial_available ? (
      <>
        <DsButton label={`Start ${status.trial_days}-day free trial`} onPress={startTrial} loading={trial.isPending} />
        <DsButton label={`Or pay ${amount} now`} variant="quiet" onPress={() => setCheckoutOpen(true)} block />
      </>
    ) : (
      <DsButton label={status.is_premium ? `Add ${period === "monthly" ? "a month" : "a year"}, ${amount}` : `Get Premium, ${amount}`} onPress={() => setCheckoutOpen(true)} />
    );
  }

  return (
    <DsScreen header={<Header />} footer={footer}>
      <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
        See the longer story of your heart health
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate, marginTop: 8 }}>
        Premium adds long-term views and sharing on top of everything HeartLink already does for you.
      </Text>

      {premium.isPending ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Skeleton style={{ height: 72, borderRadius: 12 }} />
          <Skeleton style={{ height: 180, borderRadius: 12 }} />
        </View>
      ) : premium.isError || !status ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          <InfoNote icon="wifi-off" title="Premium couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => premium.refetch()} block />
        </View>
      ) : (
        <>
          {status.is_premium ? (
            <View style={{ marginTop: 22, padding: 16, borderRadius: 12, backgroundColor: c.tint, flexDirection: "row", gap: 12, alignItems: "center" }}>
              <MaterialCommunityIcons name="check-decagram" size={24} color={c.onTint} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.onTint }}>{"You're on Premium"}</Text>
                <Text style={{ fontSize: 14, color: c.onTint, marginTop: 2 }}>{premiumStatusLine(status)}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 22, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16 }}>
            {PREMIUM_FEATURES.map((f, i) => (
              <View key={f.key} style={i ? { borderTopWidth: 1, borderTopColor: c.hairlineSoft } : undefined}>
                <FeatureRow feature={f} />
              </View>
            ))}
          </View>

          <View style={{ marginTop: 14 }}>
            <InfoNote
              icon="shield"
              title="Safety features are always free"
              text="Daily check-ins, emergency warnings, nearby clinics, reminders and your heart score work the same with or without Premium."
            />
          </View>

          {status.checkout_enabled ? (
            <View style={{ marginTop: 24, gap: 10 }} accessibilityRole="radiogroup">
              <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Choose a plan</Text>
              <ChoiceRow
                title="Yearly"
                detail={`${peso(status.yearly_price_php)} a year`}
                badge={yearlySaving(status) > 0 ? `Save ${peso(yearlySaving(status))}` : undefined}
                selected={period === "yearly"}
                onPress={() => setPeriod("yearly")}
              />
              <ChoiceRow title="Monthly" detail={`${peso(status.monthly_price_php)} a month`} selected={period === "monthly"} onPress={() => setPeriod("monthly")} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Feather name="info" size={13} color={c.steel} />
                <Text style={{ flex: 1, fontSize: 13, color: c.steel }}>Test mode: no real money is charged. Paid once, no automatic renewal.</Text>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <InfoNote icon="pause-circle" text="New Premium sign-ups are paused right now. Check back soon." />
            </View>
          )}
        </>
      )}

      {status ? <CheckoutSheet visible={checkoutOpen} status={status} period={period} onClose={() => setCheckoutOpen(false)} onPaid={onPaid} /> : null}
    </DsScreen>
  );
}
