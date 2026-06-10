import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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
};

// ─── Settings Row ─────────────────────────────────────────────────────────────
// danger text color via inline style — avoids dynamic className

function SettingsRow({
  icon,
  iconType = "feather",
  label,
  subtitle,
  iconBg = "#f8fafc",
  iconColor = "#94a3b8",
  danger = false,
  onPress,
  isLast = false,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      className="flex-row items-center py-3.5"
      style={!isLast ? { borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" } : undefined}
    >
      {/* Icon bubble — dynamic bg via inline style */}
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3.5 border border-slate-200 dark:border-slate-800/70"
        style={{ backgroundColor: iconBg }}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
        ) : (
          <Feather name={icon as any} size={16} color={iconColor} />
        )}
      </View>

      {/* Label + subtitle */}
      <View className="flex-1">
        <Text
          className="text-[14px] font-medium"
          style={{ color: danger ? "#a32d2d" : "#0f172a" }}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[12px] text-slate-400 mt-0.5">{subtitle}</Text>
        )}
      </View>

      <Feather name="chevron-right" size={16} color="#e2e8f0" />
    </TouchableOpacity>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 mt-1">
      {title}
    </Text>
  );
}

// ─── Settings Group ───────────────────────────────────────────────────────────

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-3">
      {children}
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Settings</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 py-4 pb-16"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <SettingsGroup>
          <SettingsRow
            icon="user"
            label="Edit profile"
            subtitle="Update personal details and photo"
            iconBg="#e6f1fb"
            iconColor="#185fa5"
            onPress={() => router.push("/(home)/profile")}
          />
          <SettingsRow
            icon="lock"
            label="Account security"
            subtitle="Change your password"
            iconBg="#f8fafc"
            iconColor="#64748b"
            onPress={() => router.push("/(home)/(settings)/account-security")}
          />
          <SettingsRow
            icon="bell"
            label="Daily Reminders"
            subtitle="Set local logging reminders"
            iconBg="#faeeda"
            iconColor="#854f0b"
            onPress={() => router.push("/(home)/(settings)/daily-reminders")}
            isLast
          />
        </SettingsGroup>

        {/* ── Health ── */}
        <SectionLabel title="Health" />
        <SettingsGroup>
          <SettingsRow
            icon="target"
            label="Goals & thresholds"
            subtitle="BP targets, sodium limits, activity goals"
            iconBg="#eaf3de"
            iconColor="#3b6d11"
            onPress={() => router.push("/(home)/goals-thresholds")}
          />
          <SettingsRow
            icon="map-pin"
            label="My Care Team"
            subtitle="Manage doctor and emergency contacts"
            iconBg="#e6f1fb"
            iconColor="#185fa5"
            onPress={() => router.push("/(home)/care-team")}
            isLast
          />
        </SettingsGroup>

        {/* ── App ── */}
        <SectionLabel title="App" />
        <SettingsGroup>
          <SettingsRow
            icon="moon"
            label="Appearance"
            subtitle="Light, dark, or system theme"
            iconBg="#f8fafc"
            iconColor="#64748b"
            onPress={() => router.push("/(home)/(settings)/appearance")}
          />
          <SettingsRow
            icon="help-circle"
            label="Help & support"
            subtitle="FAQ, feedback, contact us"
            iconBg="#f8fafc"
            iconColor="#64748b"
            onPress={() => router.push("/(home)/(settings)/help-support")}
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0"
            iconBg="#f8fafc"
            iconColor="#64748b"
            onPress={() => router.push("/(home)/(settings)/about")}
            isLast
          />
        </SettingsGroup>

        {/* ── Danger Zone ── */}
        <SectionLabel title="Account actions" />
        <SettingsGroup>
          <SettingsRow
            icon="log-out"
            label="Sign out"
            danger
            iconBg="#fcebeb"
            iconColor="#a32d2d"
          />
          <SettingsRow
            icon="trash-2"
            label="Delete account"
            subtitle="Permanently remove your health data"
            danger
            iconBg="#fef2f2"
            iconColor="#ef4444"
            isLast
          />
        </SettingsGroup>

      </ScrollView>
    </SafeAreaView>
  );
}