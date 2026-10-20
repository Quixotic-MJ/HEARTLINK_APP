import { useDs } from "../../../components/onboarding/useDs";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
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

function FAQItem({ question, answer }: any) {
  const { c } = useDs();
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="border-b border-ds-hairline-soft overflow-hidden">
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => setExpanded(!expanded)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${question}, ${expanded ? "expanded" : "collapsed"}`}
        className="flex-row items-center justify-between py-4"
      >
        <Text className="flex-1 text-[16px] font-medium text-ds-ink mr-3 leading-6">
          {question}
        </Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.slate} />
      </TouchableOpacity>
      {expanded && (
        <View className="pb-4 pt-1">
          <Text className="text-[15px] leading-relaxed text-ds-slate">
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FAQScreen() {
  const { isDark } = useDs();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Frequently Asked Questions
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-20" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-[22px] font-semibold text-ds-ink mb-1.5 tracking-tight">
            Help & Knowledge Base
          </Text>
          <Text className="text-[14px] text-ds-slate leading-relaxed">
            Common questions about cardiovascular logging, health stability scoring, and app features.
          </Text>
        </View>

        <View className="bg-ds-canvas rounded-xl border border-ds-hairline px-5 pt-1">
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index} 
              question={faq.question} 
              answer={faq.answer} 
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
