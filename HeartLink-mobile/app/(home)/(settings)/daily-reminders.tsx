import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

const base_url = process.env.EXPO_PUBLIC_API_URL;

function ReminderToggle({ 
  title, 
  description, 
  icon, 
  iconBg,
  iconColor,
  enabled, 
  time, 
  onToggle, 
  onTimePress, 
  isLast = false,
  isDark = false 
}: any) {
  // Format "HH:mm" to "h:mm A" for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m.padStart(2, "0")} ${ampm}`;
  };

  return (
    <View className={`py-4.5 ${!isLast ? "border-b border-slate-100 dark:border-slate-800/80" : ""}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          <View 
            className="w-10 h-10 rounded-2xl items-center justify-center mr-3.5 border border-slate-200/80 dark:border-slate-800"
            style={{ backgroundColor: iconBg }}
          >
            <Feather name={icon} size={18} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {title}
            </Text>
            <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {description}
            </Text>
          </View>
        </View>

        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: isDark ? "#334155" : "#e2e8f0", true: "#2563eb" }}
          thumbColor="#ffffff"
          ios_backgroundColor={isDark ? "#334155" : "#e2e8f0"}
          accessibilityLabel={`${title} toggle`}
          accessibilityRole="switch"
        />
      </View>

      {enabled && (
        <View className="mt-3.5 pl-[54px] flex-row items-center">
          <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mr-2.5">
            Trigger at:
          </Text>
          <TouchableOpacity 
            onPress={onTimePress}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Change time for ${title}, currently ${formatTime(time)}`}
            className="bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center gap-1.5"
          >
            <Feather name="clock" size={13} color={isDark ? "#94a3b8" : "#64748b"} />
            <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">
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
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [reminders, setReminders] = useState({
    morning: { enabled: false, time: "08:00" },
    evening: { enabled: false, time: "20:00" },
    activity: { enabled: false, time: "17:00" }
  });

  const [initialReminders, setInitialReminders] = useState({
    morning: { enabled: false, time: "08:00" },
    evening: { enabled: false, time: "20:00" },
    activity: { enabled: false, time: "17:00" }
  });

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, key: keyof typeof reminders | null }>({
    visible: false,
    key: null
  });

  const isDirty = JSON.stringify(reminders) !== JSON.stringify(initialReminders);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const effectiveToken = token || "";
        const response = await fetch(`${base_url}/api/users/${userId}/reminders`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data) {
            const loaded = {
              morning: data.morning || { enabled: false, time: "08:00" },
              evening: data.evening || { enabled: false, time: "20:00" },
              activity: data.activity || { enabled: false, time: "17:00" }
            };
            setReminders(loaded);
            setInitialReminders(loaded);
          }
        }
      } catch (err) {
        console.error("Failed to load reminders", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchReminders();
  }, [userId, token]);

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
      const h = selectedDate.getHours().toString().padStart(2, "0");
      const m = selectedDate.getMinutes().toString().padStart(2, "0");
      const timeStr = `${h}:${m}`;
      
      const key = pickerConfig.key;
      setReminders(prev => ({
        ...prev,
        [key]: { ...prev[key], time: timeStr }
      }));
    }
  };

  const handleSave = async (shouldNavigateBack = false) => {
    setIsSaving(true);
    try {
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/users/${userId}/reminders`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify(reminders)
      });
      if (response.ok) {
        setInitialReminders(reminders);
        // Handle Local Notifications
        try {
          const { requestNotificationPermissions, scheduleDailyReminder, cancelReminder } = require("../../../utils/notifications");
          const hasPermission = await requestNotificationPermissions();
          
          if (hasPermission) {
            // Morning
            if (reminders.morning.enabled) {
              await scheduleDailyReminder("morning_reminder", "Morning Check-in", "Start your day with a HeartLink check-in.", reminders.morning.time);
            } else {
              await cancelReminder("morning_reminder");
            }
            // Evening
            if (reminders.evening.enabled) {
              await scheduleDailyReminder("evening_reminder", "Evening Wrap-up", "Review your day before bedtime.", reminders.evening.time);
            } else {
              await cancelReminder("evening_reminder");
            }
            // Activity
            if (reminders.activity.enabled) {
              await scheduleDailyReminder("activity_reminder", "Activity Goal", "Get a reminder to stay on track with your movement goal.", reminders.activity.time);
            } else {
              await cancelReminder("activity_reminder");
            }
          }
        } catch (notifErr) {
          console.warn("Local notification scheduling error:", notifErr);
        }

        showToast({ title: "Reminders Saved", message: "Your daily check-in schedule has been updated.", type: "success" });
        if (shouldNavigateBack) {
          router.back();
        }
      } else {
        showToast({ title: "Save Failed", message: "Failed to save reminder preferences.", type: "error" });
      }
    } catch (err) {
      showToast({ title: "Network Error", message: "Please check your connection and try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackPress = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={handleBackPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
          Daily Reminders
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-28" showsVerticalScrollIndicator={false}>
        <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Stay on track with your cardiovascular health by setting gentle reminders for your check-ins and daily routine.
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 px-5 mb-6 shadow-sm shadow-slate-100 dark:shadow-none">
          <ReminderToggle
            title="Morning Check-in"
            description="Start your day with a HeartLink check-in."
            icon="sunrise"
            iconBg="#eff6ff"
            iconColor="#2563eb"
            enabled={reminders.morning.enabled}
            time={reminders.morning.time}
            onToggle={() => toggleReminder("morning")}
            onTimePress={() => setPickerConfig({ visible: true, key: "morning" })}
            isDark={isDark}
          />
          <ReminderToggle
            title="Evening Wrap-up"
            description="Review your day before bedtime."
            icon="moon"
            iconBg="#f5f3ff"
            iconColor="#7c3aed"
            enabled={reminders.evening.enabled}
            time={reminders.evening.time}
            onToggle={() => toggleReminder("evening")}
            onTimePress={() => setPickerConfig({ visible: true, key: "evening" })}
            isDark={isDark}
          />
          <ReminderToggle
            title="Activity Goal"
            description="Get a reminder to stay on track with your movement goal."
            icon="activity"
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            enabled={reminders.activity.enabled}
            time={reminders.activity.time}
            onToggle={() => toggleReminder("activity")}
            onTimePress={() => setPickerConfig({ visible: true, key: "activity" })}
            isLast
            isDark={isDark}
          />
        </View>

        <TouchableOpacity 
          className={`h-13 rounded-2xl items-center justify-center flex-row py-3.5 shadow-sm ${
            isDirty ? "bg-slate-900 dark:bg-blue-600" : "bg-slate-300 dark:bg-slate-800"
          }`}
          onPress={() => handleSave(false)}
          disabled={isSaving || !isDirty}
          activeOpacity={0.85}
        >
          {isSaving && <ActivityIndicator color="#fff" size="small" className="mr-2" />}
          <Text className={`font-semibold text-[15px] ${isDirty ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
            {isDirty ? "Save Reminder Changes" : "Reminders Up to Date"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Time Picker */}
      {pickerConfig.visible && pickerConfig.key && (
        <DateTimePicker
          value={parseTimeToDate(reminders[pickerConfig.key].time)}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Unsaved Changes Confirmation Modal */}
      <ConfirmDialog
        visible={showExitConfirm}
        onCancel={() => {
          setShowExitConfirm(false);
          router.back();
        }}
        onConfirm={() => {
          setShowExitConfirm(false);
          handleSave(true);
        }}
        title="Save reminder changes?"
        message="You have modified your reminder schedule. Would you like to save before leaving?"
        confirmLabel="Save & Exit"
        cancelLabel="Discard"
        variant="info"
        mode="bottom-sheet"
        icon="bell"
      />
    </SafeAreaView>
  );
}
