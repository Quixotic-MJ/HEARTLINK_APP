import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

function ReminderToggle({ title, description, icon, enabled, time, onToggle, onTimePress, isLast = false }: any) {
  // Format "HH:mm" to "h:mm A" for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m.padStart(2, '0')} ${ampm}`;
  };

  return (
    <View className={`py-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
      <View className="flex-row items-center justify-between">
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

      {enabled && (
        <View className="mt-3 pl-[52px] flex-row items-center">
          <Text className="text-[13px] text-slate-500 dark:text-slate-400 mr-3">Time:</Text>
          <TouchableOpacity 
            onPress={onTimePress}
            className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <Text className="text-[14px] font-medium text-slate-900 dark:text-white">
              {formatTime(time)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function DailyRemindersScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId } = useUser();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reminders, setReminders] = useState({
    morning: { enabled: false, time: "08:00" },
    evening: { enabled: false, time: "20:00" },
    activity: { enabled: false, time: "17:00" }
  });

  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, key: keyof typeof reminders | null }>({
    visible: false,
    key: null
  });

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await fetch(`${base_url}/api/users/${userId}/reminders`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setReminders({
              morning: data.morning || { enabled: false, time: "08:00" },
              evening: data.evening || { enabled: false, time: "20:00" },
              activity: data.activity || { enabled: false, time: "17:00" }
            });
          }
        }
      } catch (err) {
        console.error("Failed to load reminders", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchReminders();
  }, [userId]);

  const toggleReminder = (key: keyof typeof reminders) => {
    setReminders(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const parseTimeToDate = (timeStr: string) => {
    const d = new Date();
    const [h, m] = timeStr.split(":");
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return d;
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setPickerConfig({ visible: false, key: null });
    }
    
    if (selectedDate && pickerConfig.key) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${h}:${m}`;
      
      const key = pickerConfig.key; // capture current key
      setReminders(prev => ({
        ...prev,
        [key]: { ...prev[key], time: timeStr }
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${base_url}/api/users/${userId}/reminders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminders)
      });
      if (response.ok) {
        // Handle Local Notifications
        const { requestNotificationPermissions, scheduleDailyReminder, cancelReminder } = require("../../../utils/notifications");
        const hasPermission = await requestNotificationPermissions();
        
        if (hasPermission) {
          // Morning
          if (reminders.morning.enabled) {
            await scheduleDailyReminder('morning_reminder', 'Morning Check-in', 'Time to log your morning weight and blood pressure!', reminders.morning.time);
          } else {
            await cancelReminder('morning_reminder');
          }
          // Evening
          if (reminders.evening.enabled) {
            await scheduleDailyReminder('evening_reminder', 'Evening Wrap-up', 'Time to review your day and log any symptoms.', reminders.evening.time);
          } else {
            await cancelReminder('evening_reminder');
          }
          // Activity
          if (reminders.activity.enabled) {
            await scheduleDailyReminder('activity_reminder', 'Activity Goal', 'Time to get moving and reach your daily goals!', reminders.activity.time);
          } else {
            await cancelReminder('activity_reminder');
          }
        }

        showToast({ title: "Success", message: "Reminder preferences saved successfully.", type: "success" });
      } else {
        showToast({ title: "Error", message: "Failed to save preferences.", type: "error" });
      }
    } catch (err) {
      showToast({ title: "Error", message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#0f172a" />
      </SafeAreaView>
    );
  }

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

      <ScrollView contentContainerClassName="px-5 py-6 pb-24" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Stay on track by setting up gentle reminders for your daily health check-ins.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-4 mb-6">
          <ReminderToggle
            title="Morning Check-in"
            description="Log your morning weight and blood pressure"
            icon="sunrise"
            enabled={reminders.morning.enabled}
            time={reminders.morning.time}
            onToggle={() => toggleReminder('morning')}
            onTimePress={() => setPickerConfig({ visible: true, key: 'morning' })}
          />
          <ReminderToggle
            title="Evening Wrap-up"
            description="Review your day and log any symptoms"
            icon="moon"
            enabled={reminders.evening.enabled}
            time={reminders.evening.time}
            onToggle={() => toggleReminder('evening')}
            onTimePress={() => setPickerConfig({ visible: true, key: 'evening' })}
          />
          <ReminderToggle
            title="Activity / Exercise"
            description="Reminder to meet your daily movement goals"
            icon="activity"
            enabled={reminders.activity.enabled}
            time={reminders.activity.time}
            onToggle={() => toggleReminder('activity')}
            onTimePress={() => setPickerConfig({ visible: true, key: 'activity' })}
            isLast
          />
        </View>

        <TouchableOpacity 
          className="bg-slate-900 h-13 rounded-xl items-center justify-center mt-2 flex-row py-3.5"
          onPress={handleSave}
          disabled={isSaving}
          style={{ opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving && <ActivityIndicator color="#fff" size="small" className="mr-2" />}
          <Text className="text-white font-medium text-[15px]">Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Time Picker Modal */}
      {pickerConfig.visible && pickerConfig.key && (
        <DateTimePicker
          value={parseTimeToDate(reminders[pickerConfig.key].time)}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}
