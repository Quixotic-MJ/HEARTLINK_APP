import { useDs } from "../../../components/onboarding/useDs";
import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Linking, Switch, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { useUser } from "../../../contexts/UserContext";
import { DARK_MODE_ENABLED } from "../../../constants/theme";
import { useSoundsSetting } from "../../../services/sounds";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { isPremiumProfile } from "../../../services/premium";
import { isFamilyAccount } from "../../../services/family";
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
  const { c, isDark } = useDs();
  const bg = danger
    ? isDark ? "rgba(239, 68, 68, 0.16)" : "#FEF2F2"
    : iconBg ?? (isDark ? c.surfaceAlt : "#F1F5F9");
  const fg = danger
    ? c.danger
    : iconColor ?? (isDark ? c.steel : c.slate);

  return (
    <AnimatedButton
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel || label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        minHeight: 62,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: isDark ? c.hairline : "#F1F5F9",
        gap: 12,
      }}
    >
      {/* Icon badge */}
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={fg} />
        ) : (
          <Feather name={icon as any} size={17} color={fg} />
        )}
      </View>

      {/* Label + subtitle */}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: danger ? c.danger : c.ink }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12.5, lineHeight: 17, color: c.slate }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onPress ? (
        <Feather name="chevron-right" size={16} color={danger ? c.danger : c.steel} />
      ) : null}
    </AnimatedButton>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  const { c } = useDs();
  return (
    <Text
      style={{
        fontSize: 11.5,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: c.slate,
        marginTop: 22,
        marginBottom: 8,
        paddingHorizontal: 2,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Settings Group ───────────────────────────────────────────────────────────

function SettingsGroup({ children }: { children: React.ReactNode }) {
  const { c, isDark } = useDs();
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#E2E8F0",
        backgroundColor: isDark ? c.surface : c.canvas,
        paddingHorizontal: 16,
        overflow: "hidden",
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      {children}
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  // HL-137: the Appearance row shows the current choice; System is the default when nothing is saved
  const [themeChoice, setThemeChoice] = useState("System default");
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("theme_preference")
        .then((pref) => setThemeChoice(pref === "light" ? "Light" : pref === "dark" ? "Dark" : "System default"))
        .catch(() => {});
    }, [])
  );
  const { logout, user } = useUser();
  const isPremium = isPremiumProfile(user);
  const [soundsOn, setSoundsOn] = useSoundsSetting();
  // HL-087: an account made only to follow family members has no health set-up, so those rows are left out
  const familyOnly = isFamilyAccount(user);
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
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 12,
        }}
      >
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 22, fontWeight: "700", color: c.ink, letterSpacing: -0.4 }}
          >
            Settings
          </Text>
          <Text style={{ fontSize: 12.5, color: c.slate }}>
            App preferences, account & devices
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Account & Security ── */}
        <SectionLabel title="ACCOUNT AND SECURITY" />
        <SettingsGroup>
          {familyOnly ? null : (
            <SettingsRow
              icon="user"
              label="Personal profile"
              subtitle="Details, biometrics and health PDF"
              iconBg={isDark ? "rgba(46, 154, 232, 0.16)" : "#E0F2FE"}
              iconColor={isDark ? "#38BDF8" : "#0284C7"}
              onPress={() => router.push("/(home)/(profile)/profile")}
            />
          )}
          <SettingsRow
            icon="shield"
            label="Login and security"
            subtitle="Password and account security"
            iconBg={isDark ? "rgba(168, 85, 247, 0.16)" : "#F3E8FF"}
            iconColor={isDark ? "#C084FC" : "#7C3AED"}
            onPress={() => router.push("/(home)/(settings)/account-security")}
            isLast={familyOnly}
          />
          {familyOnly ? null : (
            <SettingsRow
              icon="clipboard"
              label="Exercise safety check (PAR-Q+)"
              subtitle="Do it again if your health changes"
              iconBg={c.surface}
              iconColor={c.slate}
              onPress={() => router.push("/(home)/(health)/exercise-screening")}
            />
          )}
          {familyOnly ? null : (
            <SettingsRow
              icon="star"
              label="HeartLink Premium"
              subtitle={isPremium ? "You're on Premium" : "Reports, long-term trends, family sharing"}
              iconBg={isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7"}
              iconColor={isDark ? "#FBBF24" : "#D97706"}
              onPress={() => router.push("/(home)/(settings)/premium")}
              isLast
            />
          )}
        </SettingsGroup>

        {/* ── HL-087: Family ── */}
        <SectionLabel title="FAMILY" />
        <SettingsGroup>
          {familyOnly ? null : (
            <SettingsRow
              icon="account-heart-outline"
              iconType="material"
              label="Family sharing"
              subtitle={isPremium ? "Let family follow your readings" : "Premium: let family follow your readings"}
              iconBg={isDark ? "rgba(249, 115, 22, 0.16)" : "#FFEDD5"}
              iconColor={isDark ? "#FB923C" : "#EA580C"}
              onPress={() => router.push("/(home)/(settings)/family-sharing")}
            />
          )}
          <SettingsRow
            icon="users"
            label={familyOnly ? "People you follow" : "Follow a family member"}
            subtitle="See their readings and get their alerts"
            iconBg={isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5"}
            iconColor={isDark ? "#34D399" : "#059669"}
            onPress={() => router.push("/(family)")}
            isLast
          />
        </SettingsGroup>

        {/* ── 2. Health & Routine ── */}
        <SectionLabel title={familyOnly ? "NOTIFICATIONS" : "HEALTH AND ROUTINE"} />
        <SettingsGroup>
          {familyOnly ? null : (
            <SettingsRow
              icon="bell"
              label="Daily reminders"
              subtitle="Morning, evening and movement"
              iconBg={isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7"}
              iconColor={isDark ? "#FBBF24" : "#D97706"}
              onPress={() => router.push("/(home)/(settings)/daily-reminders")}
            />
          )}
          <SettingsRow
            icon="smartphone"
            label="Notifications on this phone"
            subtitle={push.subtitle}
            iconBg={isDark ? "rgba(59, 130, 246, 0.16)" : "#EFF6FF"}
            iconColor={isDark ? "#60A5FA" : "#2563EB"}
            onPress={push.action ? onPushRow : undefined}
            isLast={familyOnly}
          />
          {familyOnly ? null : (
            <>
              <SettingsRow
                icon="target"
                label="Health targets and limits"
                subtitle="Sodium, fluid, movement, BP target"
                iconBg={isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5"}
                iconColor={isDark ? "#34D399" : "#059669"}
                onPress={() => router.push("/(home)/(health)/goals-thresholds")}
              />
              <SettingsRow
                icon="droplet"
                label="Lab results (optional)"
                subtitle="Cholesterol and blood sugar from a blood test"
                iconBg={isDark ? c.surfaceAlt : c.rose}
                iconColor={isDark ? c.steel : c.charcoal}
                onPress={() => router.push("/(home)/(settings)/lab-results")}
              />
              <SettingsRow
                icon="edit-3"
                label="Health answers"
                subtitle="Medicine, diabetes, smoking and diet"
                iconBg={isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7"}
                iconColor={isDark ? "#FBBF24" : "#D97706"}
                onPress={() => router.push("/(home)/(settings)/heart-answers")}
              />
              <SettingsRow
                icon="users"
                label="My care team"
                subtitle="Doctors, specialists, contacts"
                iconBg={isDark ? "rgba(59, 130, 246, 0.16)" : "#EFF6FF"}
                iconColor={isDark ? "#60A5FA" : "#2563EB"}
                onPress={() => router.push("/(home)/(profile)/care-team")}
                isLast
              />
            </>
          )}
        </SettingsGroup>

        {/* ── 3. App Preferences ── */}
        <SectionLabel title="APP PREFERENCES" />
        <SettingsGroup>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 62,
              paddingVertical: 13,
              borderBottomWidth: DARK_MODE_ENABLED ? 1 : 0,
              borderBottomColor: isDark ? c.hairline : "#F1F5F9",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
              }}
            >
              <Feather name={soundsOn ? "volume-2" : "volume-x"} size={17} color={isDark ? c.steel : c.slate} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Sounds</Text>
              <Text style={{ fontSize: 12.5, lineHeight: 17, color: c.slate }}>
                Taps, saved messages, score and workout tones
              </Text>
            </View>
            <Switch
              value={soundsOn}
              onValueChange={setSoundsOn}
              trackColor={{ false: isDark ? c.hairlineStrong : "#CBD5E1", true: c.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? c.hairlineStrong : "#CBD5E1"}
              accessibilityLabel="Sounds"
              accessibilityRole="switch"
            />
          </View>
          {DARK_MODE_ENABLED ? (
            <SettingsRow
              icon="moon"
              label="Appearance and theme"
              subtitle={themeChoice}
              iconBg={isDark ? c.surfaceAlt : "#F1F5F9"}
              iconColor={isDark ? c.steel : c.slate}
              onPress={() => router.push("/(home)/(settings)/appearance")}
              isLast
            />
          ) : null}
        </SettingsGroup>

        {/* ── 4. Support & Legal ── */}
        <SectionLabel title="SUPPORT AND LEGAL" />
        <SettingsGroup>
          <SettingsRow
            icon="book-open"
            label="Heart health basics"
            subtitle="Blood pressure, sodium, activity, sleep"
            iconBg={isDark ? c.surfaceAlt : "#F1F5F9"}
            iconColor={isDark ? c.steel : c.slate}
            onPress={() => router.push("/(home)/(settings)/heart-basics")}
          />
          <SettingsRow
            icon="help-circle"
            label="Help and FAQ"
            subtitle="Questions and user guides"
            iconBg={isDark ? c.surfaceAlt : "#F1F5F9"}
            iconColor={isDark ? c.steel : c.slate}
            onPress={() => router.push("/(home)/(settings)/help-support")}
          />
          <SettingsRow
            icon="message-square"
            label="Send feedback"
            subtitle="Report a bug or suggestion"
            iconBg={isDark ? c.surfaceAlt : "#F1F5F9"}
            iconColor={isDark ? c.steel : c.slate}
            onPress={() => router.push("/(home)/(settings)/submit-ticket")}
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0, terms and privacy"
            iconBg={isDark ? c.surfaceAlt : "#F1F5F9"}
            iconColor={isDark ? c.steel : c.slate}
            onPress={() => router.push("/(home)/(settings)/about")}
            isLast
          />
        </SettingsGroup>

        {/* ── 5. Sign Out ── */}
        <View style={{ marginTop: 28, marginBottom: 8 }}>
          <SettingsGroup>
            <SettingsRow
              icon="log-out"
              label="Sign out"
              subtitle="End your session on this device"
              danger
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
    </ScreenWrapper>
  );
}
