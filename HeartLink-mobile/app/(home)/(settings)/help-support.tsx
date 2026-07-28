import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

function SupportLink({ icon, title, subtitle, onPress, isDark, isLast = false }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row items-center py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
    >
      <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 items-center justify-center border border-slate-100 dark:border-slate-800 mr-4">
        <Feather name={icon} size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-slate-900 dark:text-white">{title}</Text>
        {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@heartlink.com?subject=HeartLink Support Request");
  };

  const handleReportBug = () => {
    Linking.openURL(
      "mailto:support@heartlink.com?subject=Bug Report&body=Please describe the bug and your device info: \n\n"
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Help & Support</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        
        <View className="items-center py-6 pb-4">
          <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center mb-4">
            <Feather name="life-buoy" size={32} color="#3b82f6" />
          </View>
          <Text className="text-[20px] font-medium text-slate-900 dark:text-white">How can we help?</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 text-center mt-2 px-6">
            Find answers to common questions or reach out to our support team directly.
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-8">
          <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm shadow-slate-200/50">
            <Feather name="search" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
            <TextInput
              className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
              placeholder="Search help articles..."
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-6 shadow-sm shadow-slate-200/50">
          <SupportLink 
            icon="book" 
            title="Knowledge Base" 
            subtitle="Guides & FAQs"
            isDark={isDark}
            onPress={() => router.push("/(home)/(settings)/faq")} 
          />
          <SupportLink 
            icon="message-circle" 
            title="Contact Support" 
            subtitle="Send us a message"
            isDark={isDark}
            onPress={handleContactSupport} 
          />
          <SupportLink 
            icon="alert-triangle" 
            title="Report a Bug" 
            subtitle="Help us improve"
            isDark={isDark}
            onPress={handleReportBug} 
            isLast 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
