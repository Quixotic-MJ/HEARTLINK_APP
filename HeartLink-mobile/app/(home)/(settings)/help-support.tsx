import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

function SupportLink({ icon, title, subtitle, onPress, isLast = false }: any) {
  const { c } = useDs();
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="flex-row items-center py-3.5"
      style={{ minHeight: 64, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <View className="w-10 h-10 rounded-lg bg-ds-surface items-center justify-center mr-3.5">
        <Feather name={icon} size={18} color={c.charcoal} />
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[16px] font-medium text-ds-ink">{title}</Text>
        {subtitle && <Text className="text-[13px] text-ds-slate mt-0.5 leading-snug">{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color={c.slate} />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleContactSupport = () => {
    router.push({ pathname: "/(home)/(settings)/submit-ticket", params: { category: "Question" } });
  };

  const handleReportBug = () => {
    router.push({ pathname: "/(home)/(settings)/submit-ticket", params: { category: "Bug Report" } });
  };

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Help & Support
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        
        <View className="items-center py-6 pb-4">
          <View className="w-16 h-16 bg-ds-sky rounded-xl items-center justify-center mb-3.5">
            <Feather name="life-buoy" size={30} color={c.charcoal} />
          </View>
          <Text className="text-[22px] font-semibold text-ds-ink tracking-tight">
            How can we help?
          </Text>
          <Text className="text-[15px] text-ds-slate text-center mt-1.5 px-4 leading-relaxed">
            Find answers to common questions about HeartLink or reach out to our team directly.
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-6">
          <View className="flex-row items-center bg-ds-surface border border-ds-hairline rounded-lg px-4" style={{ height: 48 }}>
            <Feather name="search" size={18} color={c.slate} />
            <TextInput
              className="flex-1 ml-3 text-[16px] text-ds-ink"
              placeholder="Search help topics..."
              placeholderTextColor={c.steel}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View className="bg-ds-canvas rounded-xl border border-ds-hairline px-4 mb-6">
          <SupportLink 
            icon="help-circle" 
            title="Frequently Asked Questions" 
            subtitle="Guides, stability score explanations & FAQ"
            onPress={() => router.push("/(home)/(settings)/faq")} 
          />
          <SupportLink 
            icon="message-square" 
            title="Send Feedback / Ask Question" 
            subtitle="Share feedback or ask our support team"
            onPress={handleContactSupport} 
          />
          <SupportLink 
            icon="alert-circle" 
            title="Report an Issue" 
            subtitle="Help us resolve technical or display bugs"
            onPress={handleReportBug} 
            isLast 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
