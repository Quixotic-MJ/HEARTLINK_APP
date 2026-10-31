import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
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
import * as Haptics from "expo-haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLogSleep } from "../../hooks/useLogSleep";
import { useDs } from "../onboarding/useDs";

/* ─── Collapsible body ─── */
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
  color = "#64748B",
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

/* ─── Mission 4 body: Sleep Quick Log ─── */

const SLEEP_QUALITIES = [
  { key: "Poor", label: "Poor" },
  { key: "Fair", label: "Fair" },
  { key: "Good", label: "Good" },
  { key: "Excellent", label: "Great" },
];

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
  const { c, isDark } = useDs();
  const { showToast } = useToast();
  
  const logSleepMutation = useLogSleep(userId ?? null, token ?? null);

  const defaultWake = new Date();
  const defaultBed = new Date(defaultWake);
  const backHours = initialSleepHours || 7.5;
  defaultBed.setMinutes(defaultBed.getMinutes() - backHours * 60);

  const [bedTime, setBedTime] = useState<Date>(defaultBed);
  const [wakeTime, setWakeTime] = useState<Date>(defaultWake);
  
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);

  const [quality, setQuality] = useState("Good");

  // Calculate duration in hours
  let diffMs = wakeTime.getTime() - bedTime.getTime();
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }
  const durationHours = diffMs / (1000 * 60 * 60);
  const displayHours = Math.floor(durationHours);
  const displayMins = Math.round((durationHours % 1) * 60);

  let targetLabel = "Optimal (7–9h)";
  let targetBg = isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5";
  let targetBorder = isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0";
  let targetColor = isDark ? "#34D399" : "#059669";

  if (durationHours < 7) {
    targetLabel = "Below 7h target";
    targetBg = isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7";
    targetBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A";
    targetColor = isDark ? "#FBBF24" : "#D97706";
  } else if (durationHours > 9) {
    targetLabel = "Extended (>9h)";
    targetBg = isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF";
    targetBorder = isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE";
    targetColor = isDark ? "#60A5FA" : "#2563EB";
  }

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
    
    // Fix cross-midnight bug for the payload:
    const actualBedTime = new Date(bedTime);
    if (wakeTime.getTime() - bedTime.getTime() < 0) {
      actualBedTime.setDate(actualBedTime.getDate() - 1);
    }
    
    const payload = { 
      duration_hours: durationHours, 
      quality,
      bedtime: actualBedTime.toISOString(),
      wake_time: wakeTime.toISOString()
    };
    
    logSleepMutation.mutate(payload, {
      onError: async (error: any) => {
        if (error.status === 401) {
           const { useUser } = require("../../contexts/UserContext");
        }
      }
    });

    onSaved(); // Close immediately for optimistic UI
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={{ gap: 14, paddingTop: 14 }}>
      
      {/* 2-Column Bedtime & Wake Up Time Cards */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        
        {/* Bedtime Card */}
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.hairline,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="moon" size={13} color={c.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>Bedtime</Text>
            </View>
            <Text style={{ fontSize: 10.5, color: c.slate }}>Night</Text>
          </View>

          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={bedTime}
              mode="time"
              display="default"
              onValueChange={(_e, date) => date && setBedTime(date)}
              themeVariant={isDark ? "dark" : "light"}
            />
          ) : (
            <>
              <TouchableOpacity 
                onPress={() => setShowBedPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Bedtime: ${formatTime(bedTime)}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.canvas,
                  borderWidth: 1,
                  borderColor: c.hairline,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                  {formatTime(bedTime)}
                </Text>
                <Feather name="chevron-down" size={13} color={c.slate} />
              </TouchableOpacity>
              {showBedPicker && (
                <DateTimePicker
                  value={bedTime}
                  mode="time"
                  display="default"
                  onValueChange={(_e, date) => {
                    setShowBedPicker(false);
                    if (date) setBedTime(date);
                  }}
                  onDismiss={() => setShowBedPicker(false)}
                />
              )}
            </>
          )}
        </View>

        {/* Wake Up Card */}
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.hairline,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="sun" size={13} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>Wake Up</Text>
            </View>
            <Text style={{ fontSize: 10.5, color: c.slate }}>Morning</Text>
          </View>

          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={wakeTime}
              mode="time"
              display="default"
              onValueChange={(_e, date) => date && setWakeTime(date)}
              themeVariant={isDark ? "dark" : "light"}
            />
          ) : (
            <>
              <TouchableOpacity 
                onPress={() => setShowWakePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Wake up time: ${formatTime(wakeTime)}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.canvas,
                  borderWidth: 1,
                  borderColor: c.hairline,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                  {formatTime(wakeTime)}
                </Text>
                <Feather name="chevron-down" size={13} color={c.slate} />
              </TouchableOpacity>
              {showWakePicker && (
                <DateTimePicker
                  value={wakeTime}
                  mode="time"
                  display="default"
                  onValueChange={(_e, date) => {
                    setShowWakePicker(false);
                    if (date) setWakeTime(date);
                  }}
                  onDismiss={() => setShowWakePicker(false)}
                />
              )}
            </>
          )}
        </View>

      </View>

      {/* Calculated Duration Summary Card */}
      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: c.tint,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#BFDBFE",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: c.primary }}>
            Calculated Duration
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>
            {displayHours} <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>hr</Text> {displayMins < 10 ? `0${displayMins}` : displayMins} <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>min</Text>
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: targetBg,
            borderWidth: 1,
            borderColor: targetBorder,
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: "600", color: targetColor }}>
            {targetLabel}
          </Text>
        </View>
      </View>

      {/* Rest Quality Rating */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>
          How rested do you feel?
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SLEEP_QUALITIES.map((q) => {
            const selected = quality === q.key;
            return (
              <TouchableOpacity
                key={q.key}
                hitSlop={4}
                onPress={() => {
                  Haptics.selectionAsync();
                  setQuality(q.key);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Sleep quality ${q.label}`}
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: selected ? c.tint : c.surfaceAlt,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? c.primary : c.hairline,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: selected ? "600" : "500",
                    color: selected ? c.primary : c.charcoal,
                  }}
                >
                  {q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={logSleepMutation.isPending}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Save Sleep Log"
        style={{
          marginTop: 6,
          height: 48,
          borderRadius: 12,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: logSleepMutation.isPending ? 0.7 : 1,
        }}
      >
        <Feather name="check" size={16} color={c.onPrimary} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.onPrimary }}>
          {logSleepMutation.isPending ? "Saving…" : "Save Sleep Log"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}
