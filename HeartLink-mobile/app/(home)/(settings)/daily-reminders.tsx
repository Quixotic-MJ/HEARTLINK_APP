import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { DEFAULT_REMINDERS, Reminders, loadReminders, saveReminders, scheduleReminders } from "../../../services/remindersService";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

function ReminderToggle({ 
  title, 
  description,
  icon,
  mcIcon,
  iconBg,
  iconColor,
  enabled, 
  time, 
  onToggle, 
  onTimePress, 
  isLast = false,
}: any) {
  const { c } = useDs();
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
    <View className="py-4" style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.hairlineSoft }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          <View 
            className="w-10 h-10 rounded-lg items-center justify-center mr-3.5"
            style={{ backgroundColor: iconBg }}
          >
            {mcIcon ? (
              <MaterialCommunityIcons name={mcIcon} size={18} color={iconColor} />
            ) : (
              <Feather name={icon} size={18} color={iconColor} />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-medium text-ds-ink">
              {title}
            </Text>
            <Text className="text-[13px] text-ds-slate mt-0.5 leading-snug">
              {description}
            </Text>
          </View>
        </View>

        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: c.hairlineStrong, true: c.line }}
          thumbColor={c.onPrimary}
          ios_backgroundColor={c.hairlineStrong}
          accessibilityLabel={`${title} toggle`}
          accessibilityRole="switch"
        />
      </View>

      {enabled && (
        <View className="mt-3.5 pl-[54px] flex-row items-center">
          <Text className="text-[13px] font-medium text-ds-slate mr-2.5">
            Trigger at:
          </Text>
          <TouchableOpacity 
            onPress={onTimePress}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Change time for ${title}, currently ${formatTime(time)}`}
            className="bg-ds-canvas px-3.5 rounded-lg border border-ds-hairline-strong flex-row items-center gap-1.5"
            style={{ minHeight: 40 }}
          >
            <Feather name="clock" size={14} color={c.charcoal} />
            <Text className="text-[15px] font-medium text-ds-ink">
              {formatTime(time)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function DailyRemindersScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Shown until the saved reminders load (and if they can't be loaded).
  const fallback: Reminders = {
    morning: { enabled: false, time: "08:00" },
    evening: { enabled: false, time: "20:00" },
    activity: { enabled: false, time: "17:00" },
    medicine: DEFAULT_REMINDERS.medicine,
  };
  const [reminders, setReminders] = useState<Reminders>(fallback);
  const [initialReminders, setInitialReminders] = useState<Reminders>(fallback);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, key: keyof Reminders | null }>({
    visible: false,
    key: null
  });

  const isDirty = JSON.stringify(reminders) !== JSON.stringify(initialReminders);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const loaded = await loadReminders(userId as string, token || "");
        if (loaded) {
          setReminders(loaded);
          setInitialReminders(loaded);
        }
      } catch (err) {
        console.error("Failed to load reminders", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchReminders();
  }, [userId, token]);

  const toggleReminder = (key: keyof Reminders) => {
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
    if (!userId) return;
    setIsSaving(true);
    try {
      await saveReminders(userId, token || "", reminders);
    } catch (err) {
      showToast({ title: "Save Failed", message: "Failed to save reminder preferences. Please check your connection and try again.", type: "error" });
      setIsSaving(false);
      return;
    }
    setInitialReminders(reminders);
    try {
      await scheduleReminders(reminders);
    } catch (notifErr) {
      console.warn("Local notification scheduling error:", notifErr);
    }
    setIsSaving(false);
    showToast({ title: "Reminders Saved", message: "Your daily check-in schedule has been updated.", type: "success" });
    if (shouldNavigateBack) {
      router.back();
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
      <SafeAreaView className="flex-1 bg-ds-canvas items-center justify-center">
        <ActivityIndicator size="large" color={c.line} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={handleBackPress} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Daily Reminders
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 pb-28" showsVerticalScrollIndicator={false}>
        <Text className="text-[15px] text-ds-slate mb-6 leading-relaxed">
          Stay on track with your cardiovascular health by setting gentle reminders for your check-ins and daily routine.
        </Text>

        <View className="bg-ds-canvas rounded-xl border border-ds-hairline px-5 mb-6">
          <ReminderToggle
            title="Morning Check-in"
            description="Start your day with a HeartLink check-in."
            icon="sunrise"
            iconBg={c.sky}
            iconColor={c.charcoal}
            enabled={reminders.morning.enabled}
            time={reminders.morning.time}
            onToggle={() => toggleReminder("morning")}
            onTimePress={() => setPickerConfig({ visible: true, key: "morning" })}
          />
          <ReminderToggle
            title="Take Your Medicines"
            description="A daily reminder to take your medicines as prescribed."
            mcIcon="pill"
            iconBg={c.peach}
            iconColor={c.charcoal}
            enabled={reminders.medicine.enabled}
            time={reminders.medicine.time}
            onToggle={() => toggleReminder("medicine")}
            onTimePress={() => setPickerConfig({ visible: true, key: "medicine" })}
          />
          <ReminderToggle
            title="Evening Wrap-up"
            description="Review your day before bedtime."
            icon="moon"
            iconBg={c.lavender}
            iconColor={c.charcoal}
            enabled={reminders.evening.enabled}
            time={reminders.evening.time}
            onToggle={() => toggleReminder("evening")}
            onTimePress={() => setPickerConfig({ visible: true, key: "evening" })}
          />
          <ReminderToggle
            title="Activity Goal"
            description="Get a reminder to stay on track with your movement goal."
            icon="activity"
            iconBg={c.mint}
            iconColor={c.charcoal}
            enabled={reminders.activity.enabled}
            time={reminders.activity.time}
            onToggle={() => toggleReminder("activity")}
            onTimePress={() => setPickerConfig({ visible: true, key: "activity" })}
            isLast
          />
        </View>

        <DsButton
          label={isDirty ? "Save Reminder Changes" : "Reminders Up to Date"}
          onPress={() => handleSave(false)}
          disabled={!isDirty}
          loading={isSaving}
        />
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
