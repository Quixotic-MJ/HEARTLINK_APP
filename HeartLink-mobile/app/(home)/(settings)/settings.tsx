import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

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
  iconBg = "#f8fafc",
  iconColor = "#64748b",
  danger = false,
  onPress,
  isLast = false,
  accessibilityLabel,
}: SettingsRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      className={`flex-row items-center py-4 ${!isLast ? "border-b border-slate-100 dark:border-slate-800/60" : ""}`}
    >
      {/* Icon bubble */}
      <View
        className="w-10 h-10 rounded-2xl items-center justify-center mr-3.5 border border-slate-200/80 dark:border-slate-800/60"
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
        <Text
          className={`text-[15px] font-bold tracking-tight ${
            danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className={`text-[12px] mt-0.5 leading-snug ${danger ? "text-red-500 dark:text-red-400/80" : "text-slate-500 dark:text-slate-400"}`}>
            {subtitle}
          </Text>
        )}
      </View>

      <Feather name="chevron-right" size={18} color={danger ? (isDark ? "#f87171" : "#dc2626") : (isDark ? "#475569" : "#94a3b8")} />
    </TouchableOpacity>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-2 mt-5 px-1">
      {title}
    </Text>
  );
}

// ─── Settings Group ───────────────────────────────────────────────────────────

function SettingsGroup({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <View className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 px-4 shadow-sm shadow-slate-100 dark:shadow-none ${className || ""}`}>
      {children}
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { logout } = useUser();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await logout();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
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
            iconBg={isDark ? "#172554" : "#eff6ff"}
            iconColor={isDark ? "#60a5fa" : "#3b82f6"}
            onPress={() => router.push("/(home)/(profile)/profile")}
          />
          <SettingsRow
            icon="shield"
            label="Login and security"
            subtitle="Password and account security"
            iconBg={isDark ? "#2e1065" : "#f5f3ff"}
            iconColor={isDark ? "#a78bfa" : "#8b5cf6"}
            onPress={() => router.push("/(home)/(settings)/account-security")}
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
            iconBg={isDark ? "#451a03" : "#fffbeb"}
            iconColor={isDark ? "#fbbf24" : "#d97706"}
            onPress={() => router.push("/(home)/(settings)/daily-reminders")}
          />
          <SettingsRow
            icon="target"
            label="Health targets and limits"
            subtitle="Sodium, fluid, movement, BP target"
            iconBg={isDark ? "#064e3b" : "#f0fdf4"}
            iconColor={isDark ? "#34d399" : "#10b981"}
            onPress={() => router.push("/(home)/(health)/goals-thresholds")}
          />
          <SettingsRow
            icon="users"
            label="My care team"
            subtitle="Doctors, specialists, contacts"
            iconBg={isDark ? "#172554" : "#eff6ff"}
            iconColor={isDark ? "#60a5fa" : "#3b82f6"}
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
            iconBg={isDark ? "#334155" : "#f8fafc"}
            iconColor={isDark ? "#cbd5e1" : "#475569"}
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
            iconBg={isDark ? "#334155" : "#f8fafc"}
            iconColor={isDark ? "#cbd5e1" : "#475569"}
            onPress={() => router.push("/(home)/(settings)/help-support")}
          />
          <SettingsRow
            icon="message-square"
            label="Send feedback"
            subtitle="Report a bug or suggestion"
            iconBg={isDark ? "#334155" : "#f8fafc"}
            iconColor={isDark ? "#cbd5e1" : "#475569"}
            onPress={() => router.push("/(home)/(settings)/submit-ticket")}
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0, terms and privacy"
            iconBg={isDark ? "#334155" : "#f8fafc"}
            iconColor={isDark ? "#cbd5e1" : "#475569"}
            onPress={() => router.push("/(home)/(settings)/about")}
            isLast
          />
        </SettingsGroup>

        {/* ── 5. Sign Out ── */}
        <View className="mt-8 mb-4">
          <SettingsGroup className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40">
            <SettingsRow
              icon="log-out"
              label="Sign out"
              subtitle="End your session on this device"
              danger
              iconBg={isDark ? "#450a0a" : "#fee2e2"}
              iconColor={isDark ? "#f87171" : "#ef4444"}
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