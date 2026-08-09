import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const faqs = [
  {
    question: "How does the HSS (Health Stability Score) work?",
    answer: "The HSS is an AI-driven score that evaluates your daily health logs, baseline clinical data, and lifestyle metrics to give you a single snapshot of your cardiovascular health. A higher score indicates better stability."
  },
  {
    question: "How do I edit my Care Team?",
    answer: "Go to your Profile and tap on 'My Care Team'. You can add new contacts using the plus button, or edit/remove an existing contact by tapping 'Edit' on their card."
  },
  {
    question: "Are my medical records and logs private?",
    answer: "Yes, HeartLink is designed with privacy in mind. Your data is encrypted and only accessible to you and the Care Team members you explicitly share it with."
  },
  {
    question: "How do I change my daily limits (e.g. Sodium or Fluid)?",
    answer: "Go to 'Goals & Thresholds' on the Home screen to adjust your daily Sodium, Fluid, and Activity targets. Note that changing these will impact your HSS score."
  },
  {
    question: "Why aren't my push notifications working?",
    answer: "Make sure you have enabled Notifications in your device settings for HeartLink, and check the 'Daily Reminders' screen in the app settings to ensure your toggles are ON."
  }
];

function FAQItem({ question, answer, isDark }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="border-b border-slate-100 dark:border-slate-800/70 overflow-hidden">
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-4"
      >
        <Text className="flex-1 text-[15px] font-medium text-slate-900 dark:text-white mr-4 leading-6">
          {question}
        </Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={isDark ? "#94a3b8" : "#64748b"} />
      </TouchableOpacity>
      {expanded && (
        <View className="pb-4">
          <Text className="text-[14px] leading-6 text-slate-600 dark:text-slate-400">
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FAQScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Knowledge Base</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        
        <View className="mb-6">
          <Text className="text-[24px] font-bold text-slate-900 dark:text-white mb-2">
            Frequently Asked Questions
          </Text>
          <Text className="text-[15px] text-slate-500 dark:text-slate-400 leading-6">
            Everything you need to know about using HeartLink and managing your cardiovascular health.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 pt-1 shadow-sm shadow-slate-200/50">
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index} 
              question={faq.question} 
              answer={faq.answer} 
              isDark={isDark} 
            />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
