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
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      className="flex-row items-center py-4"
      style={!isLast ? { borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" } : undefined}
    >
      {/* Icon bubble */}
      <View
        className="w-10 h-10 rounded-2xl items-center justify-center mr-3.5 border border-slate-200/80 dark:border-slate-800"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={19} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={18} color={iconColor} />
        )}
      </View>

      {/* Label + subtitle */}
      <View className="flex-1 pr-3">
        <Text
          className={`text-[15px] font-semibold ${
            danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {subtitle}
          </Text>
        )}
      </View>

      <Feather name="chevron-right" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[12px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-2.5 mt-2 px-1">
      {title}
    </Text>
  );
}

// ─── Settings Group ───────────────────────────────────────────────────────────

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 px-4 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
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
        <SectionLabel title="Account & Security" />
        <SettingsGroup>
          <SettingsRow
            icon="user"
            label="Personal Profile"
            subtitle="View personal details, biometrics & export health PDF"
            iconBg="#eff6ff"
            iconColor="#2563eb"
            onPress={() => router.push("/(home)/(profile)/profile")}
          />
          <SettingsRow
            icon="shield"
            label="Login & Security"
            subtitle="Change password and manage account security"
            iconBg="#f8fafc"
            iconColor="#475569"
            onPress={() => router.push("/(home)/(settings)/account-security")}
            isLast
          />
        </SettingsGroup>

        {/* ── 2. Health & Routine ── */}
        <SectionLabel title="Health & Routine" />
        <SettingsGroup>
          <SettingsRow
            icon="bell"
            label="Daily Reminders"
            subtitle="Morning, evening, and movement check-in reminders"
            iconBg="#fffbeb"
            iconColor="#d97706"
            onPress={() => router.push("/(home)/(settings)/daily-reminders")}
          />
          <SettingsRow
            icon="target"
            label="Health Targets & Limits"
            subtitle="Sodium, fluid, movement, and target blood pressure"
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            onPress={() => router.push("/(home)/(health)/goals-thresholds")}
          />
          <SettingsRow
            icon="users"
            label="My Care Team"
            subtitle="Manage doctors, specialists, and emergency contacts"
            iconBg="#eff6ff"
            iconColor="#2563eb"
            onPress={() => router.push("/(home)/(profile)/care-team")}
            isLast
          />
        </SettingsGroup>

        {/* ── 3. App Preferences ── */}
        <SectionLabel title="App Preferences" />
        <SettingsGroup>
          <SettingsRow
            icon="moon"
            label="Appearance & Theme"
            subtitle="Light mode, dark mode, or system default"
            iconBg="#f8fafc"
            iconColor="#475569"
            onPress={() => router.push("/(home)/(settings)/appearance")}
            isLast
          />
        </SettingsGroup>

        {/* ── 4. Support & Legal ── */}
        <SectionLabel title="Support & Legal" />
        <SettingsGroup>
          <SettingsRow
            icon="help-circle"
            label="Help & FAQ"
            subtitle="Frequently asked questions and user guides"
            iconBg="#f8fafc"
            iconColor="#475569"
            onPress={() => router.push("/(home)/(settings)/help-support")}
          />
          <SettingsRow
            icon="message-square"
            label="Send Feedback / Report Issue"
            subtitle="Submit a question, suggestion, or bug report"
            iconBg="#f8fafc"
            iconColor="#475569"
            onPress={() => router.push("/(home)/(settings)/submit-ticket")}
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0, Terms of Service & Privacy"
            iconBg="#f8fafc"
            iconColor="#475569"
            onPress={() => router.push("/(home)/(settings)/about")}
            isLast
          />
        </SettingsGroup>

        {/* ── 5. Account Action ── */}
        <SectionLabel title="Account Action" />
        <SettingsGroup>
          <SettingsRow
            icon="log-out"
            label="Sign out"
            subtitle="Sign out of your HeartLink session on this device"
            danger
            iconBg="#fef2f2"
            iconColor="#dc2626"
            onPress={() => setShowSignOutConfirm(true)}
            isLast
          />
        </SettingsGroup>
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