import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

function SupportLink({ icon, title, subtitle, onPress, isLast = false }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row items-center py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
    >
      <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 items-center justify-center border border-slate-100 dark:border-slate-800 mr-4">
        <Feather name={icon} size={18} color="#0f172a" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900">{title}</Text>
        {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900 dark:bg-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white dark:text-slate-900">Help & Support</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        
        <View className="items-center py-6">
          <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
            <Feather name="life-buoy" size={32} color="#3b82f6" />
          </View>
          <Text className="text-[20px] font-medium text-slate-900 dark:text-white dark:text-slate-900">How can we help?</Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 text-center mt-2 px-6">
            Find answers to common questions or reach out to our support team directly.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-6">
          <SupportLink 
            icon="book" 
            title="Knowledge Base" 
            subtitle="Guides & FAQs" 
            onPress={() => Alert.alert("FAQ", "Frequently Asked Questions will be available here soon.")} 
          />
          <SupportLink 
            icon="message-circle" 
            title="Contact Support" 
            subtitle="Send us a message" 
            onPress={() => Alert.alert("Contact Us", "Support contact details will be available here soon.")} 
          />
          <SupportLink 
            icon="alert-triangle" 
            title="Report a Bug" 
            subtitle="Help us improve" 
            onPress={() => Alert.alert("Report an Issue", "Issue reporting will be available here soon.")} 
            isLast 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
