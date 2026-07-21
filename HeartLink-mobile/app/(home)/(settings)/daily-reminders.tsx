import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

function ReminderToggle({ title, description, icon, enabled, onToggle, isLast = false }: any) {
  return (
    <View className={`flex-row items-center justify-between py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
      <View className="flex-row items-center flex-1 pr-4">
        <View className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 items-center justify-center border border-slate-100 dark:border-slate-800 mr-3">
          <Feather name={icon} size={18} color="#0f172a" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-slate-900 dark:text-white">{title}</Text>
          <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</Text>
        </View>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: "#e2e8f0", true: "#0f172a" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export default function DailyRemindersScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [reminders, setReminders] = useState({
    morning: true,
    evening: false,
  });

  const toggleReminder = (key: keyof typeof reminders) => {
    setReminders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[17px] font-medium text-slate-900 dark:text-white">Daily Reminders</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-16" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Stay on track by setting up gentle reminders for your daily health check-ins.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-6">
          <ReminderToggle
            title="Morning Check-in"
            description="Log your morning weight and blood pressure"
            icon="sunrise"
            enabled={reminders.morning}
            onToggle={() => toggleReminder('morning')}
          />
          <ReminderToggle
            title="Evening Wrap-up"
            description="Review your day and log any symptoms"
            icon="moon"
            enabled={reminders.evening}
            onToggle={() => toggleReminder('evening')}
            isLast
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
