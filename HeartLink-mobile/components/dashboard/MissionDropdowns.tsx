import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Linking, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import { useToast } from "../../contexts/ToastContext";
import { OfflineSyncService } from "../../utils/OfflineSyncService";
import { postLogAck } from "../../services/companionCopy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

/* ─── Collapsible body ───
   Uses Reanimated layout animations so the accordion expands and collapses
   naturally without requiring fragile onLayout height measurements. */

export function MissionDropdown({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  if (!expanded) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(180).easing(Easing.in(Easing.cubic))}
      layout={LinearTransition.duration(240)}
      style={{ overflow: "hidden" }}
    >
      {children}
    </Animated.View>
  );
}

/* ─── Chevron that rotates with the dropdown ─── */

export function SpinChevron({
  expanded,
  color = "#8D9B96",
  size = 13,
}: {
  expanded: boolean;
  color?: string;
  size?: number;
}) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withTiming(expanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rot]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 90}deg` }],
  }));

  return (
    <Animated.View style={chevronStyle}>
      <Feather name="chevron-right" size={size} color={color} />
    </Animated.View>
  );
}

/* ─── Shared bits ─── */

function FieldShell({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View className="gap-1">
      <Text
        className="text-[11px] font-semibold ml-0.5"
        style={{ color: isDark ? "#cbd5e1" : "#5C6B66" }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  unit,
  isDark,
  maxLength = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  unit: string;
  isDark: boolean;
  maxLength?: number;
}) {
  return (
    <View
      className="h-[46px] rounded-xl flex-row items-center px-3.5 border bg-white dark:bg-slate-950/60 border-[#DCE3DF] dark:border-slate-800"
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        keyboardType="numeric"
        maxLength={maxLength}
        className="flex-1 text-[15px] font-medium h-full text-[#152131] dark:text-white"
      />
      <Text className="text-[11px] font-medium text-[#8D9B96] dark:text-slate-500">
        {unit}
      </Text>
    </View>
  );
}

function SaveButton({
  label,
  onPress,
  isLoading,
  color = "#1B6E63",
}: {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      style={{
        backgroundColor: color,
        opacity: isLoading ? 0.7 : 1,
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Feather name="check" size={14} color="#fff" />
      <Text className="text-[13px] font-bold text-white">
        {isLoading ? "Saving…" : label}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Mission 1 body: Step-1 vitals quick log ───
   Step 2 (symptoms) stays    </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Mission 2 body: sodium quick log ─── */
// Replaced by 3-option picker in MissionLogModal

/* ─── Mission 4 body: sleep quick log ─── */

const SLEEP_QUALITIES = ["Poor", "Fair", "Good", "Excellent"];

export function SleepQuickForm({
  userId,
  token,
  initialSleepHours,
  onSaved,
}: {
  userId?: string | null;
  token?: string | null;
  initialSleepHours?: number;
  onSaved: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { showToast } = useToast();

  const defaultWake = new Date();

  const defaultBed = new Date(defaultWake);
  const backHours = initialSleepHours || 7.5;
  defaultBed.setMinutes(defaultBed.getMinutes() - backHours * 60);

  const [bedTime, setBedTime] = useState<Date>(defaultBed);
  const [wakeTime, setWakeTime] = useState<Date>(defaultWake);
  
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);

  const [quality, setQuality] = useState("Good");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate duration in hours
  let diffMs = wakeTime.getTime() - bedTime.getTime();
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
  const durationHours = diffMs / (1000 * 60 * 60);
  const displayHours = Math.floor(durationHours);
  const displayMins = Math.round((durationHours % 1) * 60);

  const handleSave = async () => {
    if (!userId) {
      showToast({ title: "Not signed in", message: "Please sign in to log sleep.", type: "error" });
      return;
    }
    if (durationHours < 1 || durationHours > 14) {
      showToast({ title: "Invalid Duration", message: "Please check your AM/PM times. Sleep must be between 1 and 14 hours.", type: "error" });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    const payload = { 
      duration_hours: durationHours, 
      quality,
      bedtime: bedTime.toISOString(),
      wake_time: wakeTime.toISOString()
    };
    try {
      const res = await fetch(`${base_url}/api/sleep-logs/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save sleep log");
      showToast({ ...postLogAck("sleep", `${payload.duration_hours.toFixed(1)} hrs • ${quality}`), type: "success" });
      onSaved();
    } catch {
      const { queueSleepForSync } = await import("../../services/SyncService");
      await queueSleepForSync(userId, payload);
      showToast({ title: "Saved offline", message: "Sleep saved on this device — I'll sync it when you're back online.", type: "success" });
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View className="gap-2.5 pt-3 mt-1 border-t border-[#DCE3DF]/60 dark:border-slate-800">
      
      <View className="flex-row items-center justify-between rounded-xl px-4 py-3 bg-white dark:bg-slate-950/60 border border-[#DCE3DF] dark:border-slate-800">
        <Text className="text-[14px] font-semibold text-[#152131] dark:text-white">Bedtime</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={bedTime}
            mode="time"
            display="default"
            onValueChange={(e, date) => date && setBedTime(date)}
            themeVariant={isDark ? "dark" : "light"}
          />
        ) : (
          <>
            <TouchableOpacity 
              onPress={() => setShowBedPicker(true)}
              className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-[#DCE3DF] dark:border-slate-700 px-3 py-2 rounded-lg"
            >
              <Text className="text-[15px] font-bold text-[#1B6E63] dark:text-[#5EEAD4]">{formatTime(bedTime)}</Text>
              <Feather name="chevron-down" size={14} color={isDark ? "#94a3b8" : "#8D9B96"} />
            </TouchableOpacity>
            {showBedPicker && (
              <DateTimePicker
                value={bedTime}
                mode="time"
                display="default"
                onValueChange={(e, date) => {
                  setShowBedPicker(false);
                  if (date) setBedTime(date);
                }}
                onDismiss={() => setShowBedPicker(false)}
              />
            )}
          </>
        )}
      </View>

      <View className="flex-row items-center justify-between rounded-xl px-4 py-3 bg-white dark:bg-slate-950/60 border border-[#DCE3DF] dark:border-slate-800">
        <Text className="text-[14px] font-semibold text-[#152131] dark:text-white">Wake Up</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={wakeTime}
            mode="time"
            display="default"
            onValueChange={(e, date) => date && setWakeTime(date)}
            themeVariant={isDark ? "dark" : "light"}
          />
        ) : (
          <>
            <TouchableOpacity 
              onPress={() => setShowWakePicker(true)}
              className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-[#DCE3DF] dark:border-slate-700 px-3 py-2 rounded-lg"
            >
              <Text className="text-[15px] font-bold text-[#1B6E63] dark:text-[#5EEAD4]">{formatTime(wakeTime)}</Text>
              <Feather name="chevron-down" size={14} color={isDark ? "#94a3b8" : "#8D9B96"} />
            </TouchableOpacity>
            {showWakePicker && (
              <DateTimePicker
                value={wakeTime}
                mode="time"
                display="default"
                onValueChange={(e, date) => {
                  setShowWakePicker(false);
                  if (date) setWakeTime(date);
                }}
                onDismiss={() => setShowWakePicker(false)}
              />
            )}
          </>
        )}
      </View>

      <Text className="text-[12px] text-center font-medium text-[#5C6B66] dark:text-slate-400 my-1">
        Total sleep: {displayHours} hr {displayMins} min
      </Text>

      <View className="flex-row flex-wrap gap-1.5 justify-center mt-1">
        {SLEEP_QUALITIES.map((q) => {
          const selected = quality === q;
          return (
            <TouchableOpacity
              key={q}
              hitSlop={4}
              onPress={() => {
                Haptics.selectionAsync();
                setQuality(q);
              }}
              className={`px-3 py-2 rounded-full border ${
                selected
                  ? "bg-[#46516B] border-[#46516B]"
                  : "bg-white dark:bg-slate-800/60 border-[#DCE3DF] dark:border-slate-700"
              }`}
            >
              <Text
                className={`text-[11.5px] font-semibold ${selected ? "text-white" : "text-[#5C6B66] dark:text-slate-400"}`}
              >
                {q}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <SaveButton label="Log Sleep" onPress={handleSave} isLoading={isSubmitting} color="#46516B" />
    </View>
  );
}
