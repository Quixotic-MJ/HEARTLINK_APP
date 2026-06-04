import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// ─── Settings Row ───────────────────────────────────────────────────────────
function SettingsRow({
  icon,
  iconType = "feather",
  label,
  subtitle,
  iconBg = "bg-slate-50",
  iconColor = "#64748b",
  danger = false,
  onPress,
}: {
  icon: string;
  iconType?: "feather" | "material";
  label: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      className="flex-row items-center py-4 border-b border-slate-100"
    >
      <View
        className={`w-10 h-10 rounded-[14px] items-center justify-center mr-4 border border-slate-100 ${iconBg}`}
      >
        {iconType === "material" ? (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={iconColor}
          />
        ) : (
          <Feather name={icon as any} size={18} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-bold tracking-tight ${
            danger ? "text-red-600" : "text-slate-900"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[12px] font-medium text-slate-400 mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ─── Section Label ──────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-7 mb-2">
      {title}
    </Text>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-[14px] bg-slate-100 items-center justify-center"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[17px] font-extrabold text-slate-900 tracking-tight">
          Settings
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-5 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm shadow-slate-900/5 mt-4">
          <SectionLabel title="Account" />
          <SettingsRow
            icon="user"
            label="Edit Profile"
            subtitle="Update personal details and photo"
            iconBg="bg-blue-50"
            iconColor="#1e4ed8"
            onPress={() => router.push("/(home)/profile")}
          />
          <SettingsRow
            icon="lock"
            label="Privacy & Security"
            subtitle="Password, 2FA, data permissions"
            iconBg="bg-slate-50"
            iconColor="#475569"
          />
          <SettingsRow
            icon="bell"
            label="Notifications"
            subtitle="Alerts, reminders, and push settings"
            iconBg="bg-amber-50"
            iconColor="#d97706"
          />

          <SectionLabel title="Health" />
          <SettingsRow
            icon="heart-pulse"
            iconType="material"
            label="Health Data Sources"
            subtitle="Connected devices and wearables"
            iconBg="bg-rose-50"
            iconColor="#e11d48"
          />
          <SettingsRow
            icon="target"
            label="Goals & Thresholds"
            subtitle="BP targets, sodium limits, activity goals"
            iconBg="bg-emerald-50"
            iconColor="#059669"
          />
          <SettingsRow
            icon="file-text"
            label="Medical Records"
            subtitle="Upload and manage health documents"
            iconBg="bg-indigo-50"
            iconColor="#6366f1"
          />

          <SectionLabel title="App" />
          <SettingsRow
            icon="moon"
            label="Appearance"
            subtitle="Light, dark, or system theme"
          />
          <SettingsRow
            icon="globe"
            label="Language"
            subtitle="English (US)"
          />
          <SettingsRow
            icon="help-circle"
            label="Help & Support"
            subtitle="FAQ, feedback, contact us"
          />
          <SettingsRow
            icon="info"
            label="About HeartLink"
            subtitle="Version 1.0.0"
          />

          <SectionLabel title="Danger Zone" />
          <SettingsRow
            icon="log-out"
            label="Sign Out"
            danger
            iconBg="bg-red-50"
            iconColor="#dc2626"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
