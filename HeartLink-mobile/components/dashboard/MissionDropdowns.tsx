import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Linking } from "react-native";
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
  onSaved,
}: {
  userId?: string | null;
  token?: string | null;
  onSaved: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { showToast } = useToast();

  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(30);
  const [quality, setQuality] = useState("Good");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepper = (
    val: number,
    set: (v: number) => void,
    step: number,
    min: number,
    max: number,
    suffix: string
  ) => (
    <View className="flex-1 flex-row items-center justify-between rounded-xl px-2 py-1.5 bg-white dark:bg-slate-950/60 border border-[#DCE3DF] dark:border-slate-800">
      <TouchableOpacity
        hitSlop={8}
        onPress={() => {
          Haptics.selectionAsync();
          set(Math.max(min, val - step));
        }}
        className="w-8 h-8 rounded-full bg-[#EDF1EF]/80 dark:bg-slate-800 items-center justify-center"
      >
        <Feather name="minus" size={13} color={isDark ? "#cbd5e1" : "#475569"} />
      </TouchableOpacity>
      <Text className="text-[17px] font-bold text-[#152131] dark:text-white">
        {val}
        <Text className="text-[11px] font-semibold text-[#8D9B96] dark:text-slate-500">{suffix}</Text>
      </Text>
      <TouchableOpacity
        hitSlop={8}
        onPress={() => {
          Haptics.selectionAsync();
          set(Math.min(max, val + step));
        }}
        className="w-8 h-8 rounded-full bg-[#EDF1EF]/80 dark:bg-slate-800 items-center justify-center"
      >
        <Feather name="plus" size={13} color={isDark ? "#cbd5e1" : "#475569"} />
      </TouchableOpacity>
    </View>
  );

  const handleSave = async () => {
    if (!userId) {
      showToast({ title: "Not signed in", message: "Please sign in to log sleep.", type: "error" });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    const payload = { duration_hours: hours + minutes / 60, quality };
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

  return (
    <View className="gap-2.5 pt-3 mt-1 border-t border-[#DCE3DF]/60 dark:border-slate-800">
      <View className="flex-row gap-2">
        {stepper(hours, setHours, 1, 0, 14, "h")}
        {stepper(minutes, setMinutes, 15, 0, 45, "m")}
      </View>
      <View className="flex-row flex-wrap gap-1.5">
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
