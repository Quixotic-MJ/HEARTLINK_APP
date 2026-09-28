import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";

function SupportLink({ icon, title, subtitle, onPress, isDark, isLast = false }: any) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`flex-row items-center py-4 ${!isLast ? "border-b border-border dark:border-slate-800/80" : ""}`}
    >
      <View className="w-10 h-10 rounded-2xl bg-surface-alt items-center justify-center border border-border/80 dark:border-slate-800 mr-3.5">
        <Feather name={icon} size={18} color={isDark ? "#8AADCC" : "#4A6080"} />
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[15px] font-semibold text-text">{title}</Text>
        {subtitle && <Text className="text-[12px] text-text-soft mt-0.5 leading-snug">{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color={theme.textSoft} />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleContactSupport = () => {
    router.push({ pathname: "/(home)/(settings)/submit-ticket", params: { category: "Question" } });
  };

  const handleReportBug = () => {
    router.push({ pathname: "/(home)/(settings)/submit-ticket", params: { category: "Bug Report" } });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-alt" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-border bg-surface">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-surface-alt border border-border items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-text tracking-tight">
          Help & Support
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        
        <View className="items-center py-6 pb-4">
          <View className="w-18 h-18 bg-blue-tint dark:bg-blue-950/40 rounded-3xl items-center justify-center mb-3.5 border border-blue-100 dark:border-blue-900/40">
            <Feather name="life-buoy" size={32} color={theme.textSoft} />
          </View>
          <Text className="text-[22px] font-bold text-text tracking-tight">
            How can we help?
          </Text>
          <Text className="text-[14px] text-text-soft text-center mt-1.5 px-4 leading-relaxed">
            Find answers to common questions about HeartLink or reach out to our team directly.
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-6">
          <View className="flex-row items-center bg-surface border border-border/80 dark:border-slate-800 rounded-2xl px-4 h-13 shadow-sm shadow-slate-100 dark:shadow-none">
            <Feather name="search" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
            <TextInput
              className="flex-1 ml-3 text-[15px] text-text"
              placeholder="Search help topics..."
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View className="bg-surface rounded-3xl border border-border/80 dark:border-slate-800/80 px-4 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <SupportLink 
            icon="help-circle" 
            title="Frequently Asked Questions" 
            subtitle="Guides, stability score explanations & FAQ"
            isDark={isDark}
            onPress={() => router.push("/(home)/(settings)/faq")} 
          />
          <SupportLink 
            icon="message-square" 
            title="Send Feedback / Ask Question" 
            subtitle="Share feedback or ask our support team"
            isDark={isDark}
            onPress={handleContactSupport} 
          />
          <SupportLink 
            icon="alert-circle" 
            title="Report an Issue" 
            subtitle="Help us resolve technical or display bugs"
            isDark={isDark}
            onPress={handleReportBug} 
            isLast 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
