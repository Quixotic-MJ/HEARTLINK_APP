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
    answer: "The HSS is an algorithmic score that evaluates your daily health logs, baseline clinical data, and lifestyle metrics to give you a single comprehensive snapshot of your cardiovascular stability. A higher score indicates better daily health consistency."
  },
  {
    question: "How do I manage my Care Team contacts?",
    answer: "Go to Settings -> 'My Care Team' or tap Care Team in your Profile. You can add new cardiologists or family emergency contacts using the plus button, and call or message them with a single tap."
  },
  {
    question: "Are my medical records and health logs private?",
    answer: "Yes. HeartLink protects your health data. Your records are securely associated with your authenticated account and are never shared with third parties without your explicit consent."
  },
  {
    question: "How do I change my daily targets (e.g. Sodium or Fluid)?",
    answer: "Go to Settings -> 'Health Targets & Limits' to adjust your daily Sodium, Fluid, Movement, and Target Blood Pressure goals."
  },
  {
    question: "Why aren't my daily reminders working?",
    answer: "Make sure you have allowed Notifications in your device's system settings for HeartLink, and check the 'Daily Reminders' screen under Settings to confirm your check-in toggles are enabled."
  }
];

function FAQItem({ question, answer, isDark }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="border-b border-slate-100 dark:border-slate-800/80 overflow-hidden">
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => setExpanded(!expanded)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${question}, ${expanded ? "expanded" : "collapsed"}`}
        className="flex-row items-center justify-between py-4"
      >
        <Text className="flex-1 text-[15px] font-semibold text-slate-900 dark:text-white mr-3 leading-6">
          {question}
        </Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={isDark ? "#94a3b8" : "#64748b"} />
      </TouchableOpacity>
      {expanded && (
        <View className="pb-4 pt-1">
          <Text className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
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
          Frequently Asked Questions
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-[22px] font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
            Help & Knowledge Base
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Common questions about cardiovascular logging, health stability scoring, and app features.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 px-5 pt-1 shadow-sm shadow-slate-100 dark:shadow-none">
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
