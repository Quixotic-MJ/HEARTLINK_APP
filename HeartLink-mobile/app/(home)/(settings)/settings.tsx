import { useDs } from "../../../components/onboarding/useDs";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { isPremiumProfile } from "../../../services/premium";
import { pushStatusText, registerForPush, usePushStatus } from "../../../services/pushNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsRowProps = {
  icon: string;
  iconType?: "feather" | "material";
  label: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  accessibilityLabel?: string;
};

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  iconType = "feather",
  label,
  subtitle,
  iconBg,
  iconColor,
  danger = false,
  onPress,
  isLast = false,
  accessibilityLabel,
}: SettingsRowProps) {
  const { c } = useDs();
  iconBg = iconBg ?? c.surface;
  iconColor = iconColor ?? c.slate;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel || label}
      className="flex-row items-center py-3.5"
      style={{ minHeight: 64, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      {/* Icon badge */}
      <View
        className="w-10 h-10 rounded-lg items-center justify-center mr-3.5"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={18} color={iconColor} />
        )}
      </View>

      {/* Label + subtitle */}
      <View className="flex-1 pr-3">
        <Text style={{ fontSize: 16, fontWeight: "500", color: danger ? c.danger : c.ink }}>
          {label}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, lineHeight: 18, marginTop: 2, color: c.slate }}>
            {subtitle}
          </Text>
        )}
      </View>

      {onPress ? <Feather name="chevron-right" size={18} color={danger ? (c.danger) : (c.steel)} /> : null}
    </TouchableOpacity>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] text-ds-steel uppercase font-semibold tracking-widest mb-2 mt-6 px-1">
      {title}
    </Text>
  );
}

// ─── Settings Group ───────────────────────────────────────────────────────────

function SettingsGroup({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <View className={`bg-ds-canvas rounded-xl border border-ds-hairline px-4 ${className || ""}`}>
      {children}
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { logout, user } = useUser();
  const isPremium = isPremiumProfile(user);
  // HL-077: whether this phone gets push notifications, and why not
  const push = pushStatusText(usePushStatus());
  const onPushRow = () => {
    if (push.action === "open_settings") Linking.openSettings();
    else if (push.action === "retry") registerForPush();
  };

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await logout();
  };

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 py-5 pb-20"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Account & Security ── */}
        <SectionLabel title="ACCOUNT AND SECURITY" />
        <SettingsGroup>
          <SettingsRow
            icon="user"
            label="Personal profile"
            subtitle="Details, biometrics and health PDF"
            iconBg={c.sky}
            iconColor={c.charcoal}
            onPress={() => router.push("/(home)/(profile)/profile")}
          />
          <SettingsRow
            icon="shield"
            label="Login and security"
            subtitle="Password and account security"
            iconBg={c.lavender}
            iconColor={c.charcoal}
            onPress={() => router.push("/(home)/(settings)/account-security")}
          />
          <SettingsRow
            icon="star"
            label="HeartLink Premium"
            subtitle={isPremium ? "You're on Premium" : "Reports, long-term trends, family sharing"}
            iconBg={c.yellow}
            iconColor={c.warmText}
            onPress={() => router.push("/(home)/(settings)/premium")}
            isLast
          />
        </SettingsGroup>

        {/* ── 2. Health & Routine ── */}
        <SectionLabel title="HEALTH AND ROUTINE" />
        <SettingsGroup>
          <SettingsRow
            icon="bell"
            label="Daily reminders"
            subtitle="Morning, evening and movement"
            iconBg={c.yellow}
            iconColor={c.warmText}
            onPress={() => router.push("/(home)/(settings)/daily-reminders")}
          />
          <SettingsRow
            icon="smartphone"
            label="Notifications on this phone"
            subtitle={push.subtitle}
            iconBg={c.sky}
            iconColor={c.charcoal}
            onPress={push.action ? onPushRow : undefined}
          />
          <SettingsRow
            icon="target"
            label="Health targets and limits"
            subtitle="Sodium, fluid, movement, BP target"
            iconBg={c.mint}
            iconColor={c.charcoal}
            onPress={() => router.push("/(home)/(health)/goals-thresholds")}
          />
          <SettingsRow
            icon="users"
            label="My care team"
            subtitle="Doctors, specialists, contacts"
            iconBg={c.sky}
            iconColor={c.charcoal}
            onPress={() => router.push("/(home)/(profile)/care-team")}
            isLast
          />
        </SettingsGroup>

        {/* ── 3. App Preferences ── */}
        <SectionLabel title="APP PREFERENCES" />
        <SettingsGroup>
          <SettingsRow
            icon="moon"
            label="Appearance and theme"
            subtitle="Light, dark or system default"
            iconBg={c.surface}
            iconColor={c.slate}
            onPress={() => router.push("/(home)/(settings)/appearance")}
            isLast
          />
        </SettingsGroup>

        {/* ── 4. Support & Legal ── */}
        <SectionLabel title="SUPPORT AND LEGAL" />
        <SettingsGroup>
          <SettingsRow
            icon="help-circle"
            label="Help and FAQ"
            subtitle="Questions and user guides"
            iconBg={c.surface}
            iconColor={c.slate}
            onPress={() => router.push("/(home)/(settings)/help-support")}
          />
          <SettingsRow
            icon="message-square"
            label="Send feedback"
            subtitle="Report a bug or suggestion"
            iconBg={c.surface}
            iconColor={c.slate}
            onPress={() => router.push("/(home)/(settings)/submit-ticket")}
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0, terms and privacy"
            iconBg={c.surface}
            iconColor={c.slate}
            onPress={() => router.push("/(home)/(settings)/about")}
            isLast
          />
        </SettingsGroup>

        {/* ── 5. Sign Out ── */}
        <View className="mt-8 mb-4">
          <SettingsGroup>
            <SettingsRow
              icon="log-out"
              label="Sign out"
              subtitle="End your session on this device"
              danger
              iconBg={c.rose}
              iconColor={c.danger}
              onPress={() => setShowSignOutConfirm(true)}
              isLast
            />
          </SettingsGroup>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <ConfirmDialog
        visible={showSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign out of HeartLink?"
        message="You can sign back in anytime using your account credentials."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        variant="destructive"
        mode="bottom-sheet"
        icon="log-out"
      />
    </SafeAreaView>
  );
}