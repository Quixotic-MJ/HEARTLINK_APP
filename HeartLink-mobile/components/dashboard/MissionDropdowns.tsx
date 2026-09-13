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
   Step 2 (symptoms) stays on its own screen via onContinueToSymptoms. */

export function VitalsQuickForm({
  userId,
  token,
  initialSys,
  initialDia,
  initialBpm,
  onSaved,
  onContinueToSymptoms,
}: {
  userId?: string | null;
  token?: string | null;
  initialSys?: number | null;
  initialDia?: number | null;
  initialBpm?: number | null;
  onSaved: () => void;
  onContinueToSymptoms: (sys: string, dia: string) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { showToast } = useToast();

  const [systolic, setSystolic] = useState(initialSys ? String(initialSys) : "");
  const [diastolic, setDiastolic] = useState(initialDia ? String(initialDia) : "");
  const [heartRate, setHeartRate] = useState(initialBpm ? String(initialBpm) : "");
  const [medicationTaken, setMedicationTaken] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyGuidanceModal, setShowEmergencyGuidanceModal] = useState(false);

  const sysVal = parseInt(systolic, 10);
  const diaVal = parseInt(diastolic, 10);
  const isHypertensiveCrisis =
    (!isNaN(sysVal) && sysVal >= 180) || (!isNaN(diaVal) && diaVal >= 120);
  const isSevereHypotension =
    (!isNaN(sysVal) && sysVal > 0 && sysVal < 90) ||
    (!isNaN(diaVal) && diaVal > 0 && diaVal < 60);
  const isCrisis = isHypertensiveCrisis;
  const isEmergency = isHypertensiveCrisis || isSevereHypotension;

  const bump = (
    raw: string,
    set: (v: string) => void,
    delta: number,
    min: number,
    max: number,
    fallback: number
  ) => {
    Haptics.selectionAsync();
    const current = parseInt(raw, 10);
    set(String(Math.min(max, Math.max(min, (isNaN(current) ? fallback : current) + delta))));
  };

  const handleSave = async () => {
    const parseIntInput = (val: string): number | null => {
      const t = val.trim();
      if (!t) return null;
      const n = Number(t);
      return !Number.isInteger(n) ? NaN : n;
    };
    const sys = parseIntInput(systolic);
    const dia = parseIntInput(diastolic);
    const hr = parseIntInput(heartRate);

    if (sys === null || dia === null) {
      showToast({ title: "Missing Blood Pressure", message: "Enter both systolic and diastolic values.", type: "error" });
      return;
    }
    if (isNaN(sys) || sys < 50 || sys > 300) {
      showToast({ title: "Validation Error", message: "Systolic must be an integer between 50 and 300.", type: "error" });
      return;
    }
    if (isNaN(dia) || dia < 30 || dia > 200) {
      showToast({ title: "Validation Error", message: "Diastolic must be an integer between 30 and 200.", type: "error" });
      return;
    }
    if (hr !== null && (isNaN(hr) || hr < 30 || hr > 250)) {
      showToast({ title: "Validation Error", message: "Heart rate must be an integer between 30 and 250.", type: "error" });
      return;
    }
    if (sys <= dia) {
      showToast({ title: "Validation Error", message: "Systolic must be greater than diastolic.", type: "error" });
      return;
    }
    if (sys - dia < 15) {
      showToast({ title: "Validation Error", message: "Pulse pressure (SYS − DIA) must be at least 15 mmHg.", type: "error" });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    const effectiveHr = hr !== null && !isNaN(hr) ? hr : (initialBpm || 72);
    const payload = {
      systolic_bp: sys,
      diastolic_bp: dia,
      heart_rate_bpm: effectiveHr,
      weight_kg: null,
      medication_taken: medicationTaken || false,
      symptoms: ["None (Feeling fine)"],
      severity_map: {},
      context: "resting",
      triggered_by_exercise_id: null,
      notes: "",
    };

    // ── Emergency path: show crisis alert + guidance modal, save in background ──
    if (isEmergency) {
      if (isSevereHypotension) {
        showToast({
          title: "Critical Low Blood Pressure",
          message: "Blood pressure reading reflects acute hypotension (<90/60 mmHg). Please sit or lie down safely, hydrate, and seek medical attention.",
          type: "error",
          duration: 8000,
        });
      } else if (isHypertensiveCrisis) {
        showToast({
          title: "Hypertensive Crisis Detected",
          message: "Blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg). Please seek emergency medical care.",
          type: "error",
          duration: 8000,
        });
      }
      setShowEmergencyGuidanceModal(true);

      // Save the reading in background (same as log-symptoms.tsx: save even for emergency)
      (async () => {
        try {
          const res = await fetch(`${base_url}/api/health-logs/${userId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token || ""}`,
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok && res.status >= 400 && res.status < 500) {
            console.error(`Health log rejected with client status ${res.status}. Not enqueuing invalid payload.`);
            return;
          }
          if (!res.ok) throw new Error(`Server returned status ${res.status}`);
          // Invalidate trends cache after successful save
          if (userId) {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter((k) => k.startsWith(`@trends_cache_${userId}`));
              if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
            } catch (e) { /* ignore */ }
          }
        } catch (err) {
          await OfflineSyncService.queueRequest(
            `${base_url}/api/health-logs/${userId}`,
            "POST",
            payload,
            undefined,
            userId || undefined,
          );
        }
      })();
      setIsSubmitting(false);
      return;
    }

    // ── Normal path: fetch prior reading for comparison, then save ──
    try {
      const res = await fetch(`${base_url}/api/health-logs/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          showToast({ title: "Log Rejected", message: "Server rejected these vitals. Please verify your entries.", type: "error" });
          return;
        }
        throw new Error(`Server returned status ${res.status}`);
      }

      // Fetch the prior reading for smart companion comparison
      let comparisonStr: string | undefined;
      try {
        const priorRes = await fetch(`${base_url}/api/health-logs/${userId}?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (priorRes.ok) {
          const logs = await priorRes.json();
          if (logs && logs.length > 0 && logs[0].systolic_bp && logs[0].diastolic_bp) {
            const prevSys = logs[0].systolic_bp;
            const prevDia = logs[0].diastolic_bp;
            const dirSys = sys < prevSys ? "down from" : (sys > prevSys ? "up from" : "steady with");

            const prevDate = new Date(logs[0].recorded_at);
            const today = new Date();
            const isYesterday = today.getDate() - prevDate.getDate() === 1 && today.getMonth() === prevDate.getMonth() && today.getFullYear() === prevDate.getFullYear();
            const timeRef = isYesterday ? "yesterday's" : "your previous";

            comparisonStr = `that's ${dirSys} ${timeRef} ${prevSys}/${prevDia}. Steady progress.`;
          }
        }
      } catch (e) {
        // Comparison is best-effort; fail silently and use the default message
      }

      showToast({ ...postLogAck("vitals", `${sys}/${dia} mmHg${effectiveHr ? ` • ${effectiveHr} BPM` : ""}`, comparisonStr), type: "success" });

      // Invalidate trends cache after successful save
      if (userId) {
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const keysToRemove = allKeys.filter((k) => k.startsWith(`@trends_cache_${userId}`));
          if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
        } catch (e) { /* ignore */ }
      }

      onSaved();
    } catch (err) {
      await OfflineSyncService.queueRequest(
        `${base_url}/api/health-logs/${userId}`,
        "POST",
        payload,
        undefined,
        userId || undefined
      );
      showToast({ title: "Saved offline", message: "Vitals saved on this device — I'll sync them when you're back online.", type: "success" });
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="gap-3 pt-3 mt-1 border-t border-[#DCE3DF]/60 dark:border-slate-800">
      {isCrisis && (
        <View className="rounded-xl p-3 bg-[#FBEAE9] dark:bg-[#8A1F1A]/25 border border-[#8A1F1A]/30 flex-row items-center gap-2">
          <Feather name="alert-triangle" size={14} color="#8A1F1A" />
          <Text className="flex-1 text-[11px] font-semibold text-[#8A1F1A] dark:text-[#E0958B]">
            Crisis range (≥180/120). Rest 5 mins, re-test, seek emergency care if it persists.
          </Text>
        </View>
      )}

      {isSevereHypotension && !isCrisis && (
        <View className="rounded-xl p-3 bg-[#FBEAE9] dark:bg-[#8A1F1A]/25 border border-[#8A1F1A]/30 flex-row items-center gap-2">
          <Feather name="alert-triangle" size={14} color="#8A1F1A" />
          <Text className="flex-1 text-[11px] font-semibold text-[#8A1F1A] dark:text-[#E0958B]">
            Low BP range (&lt;90/60). Please sit or lie down, hydrate, and seek medical attention if symptoms persist.
          </Text>
        </View>
      )}

      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <FieldShell label="Systolic" isDark={isDark}>
            <NumberInput value={systolic} onChange={setSystolic} placeholder="120" unit="mmHg" isDark={isDark} />
          </FieldShell>
          <View className="flex-row gap-1.5 mt-1.5">
            <TouchableOpacity onPress={() => bump(systolic, setSystolic, -5, 50, 300, 120)} hitSlop={10} className="flex-1 py-1.5 rounded-lg bg-[#EDF1EF]/70 dark:bg-slate-800 items-center border border-[#DCE3DF]/60 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-[#152131] dark:text-slate-200">−5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bump(systolic, setSystolic, 5, 50, 300, 120)} hitSlop={10} className="flex-1 py-1.5 rounded-lg bg-[#EDF1EF]/70 dark:bg-slate-800 items-center border border-[#DCE3DF]/60 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-[#152131] dark:text-slate-200">+5</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-1">
          <FieldShell label="Diastolic" isDark={isDark}>
            <NumberInput value={diastolic} onChange={setDiastolic} placeholder="80" unit="mmHg" isDark={isDark} />
          </FieldShell>
          <View className="flex-row gap-1.5 mt-1.5">
            <TouchableOpacity onPress={() => bump(diastolic, setDiastolic, -5, 30, 200, 80)} hitSlop={10} className="flex-1 py-1.5 rounded-lg bg-[#EDF1EF]/70 dark:bg-slate-800 items-center border border-[#DCE3DF]/60 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-[#152131] dark:text-slate-200">−5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bump(diastolic, setDiastolic, 5, 30, 200, 80)} hitSlop={10} className="flex-1 py-1.5 rounded-lg bg-[#EDF1EF]/70 dark:bg-slate-800 items-center border border-[#DCE3DF]/60 dark:border-slate-700">
              <Text className="text-[11px] font-bold text-[#152131] dark:text-slate-200">+5</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FieldShell label="Pulse (optional)" isDark={isDark}>
        <NumberInput value={heartRate} onChange={setHeartRate} placeholder="72" unit="BPM" isDark={isDark} />
      </FieldShell>

      <View className="flex-row gap-2">
        {(["No", "Yes"] as const).map((opt) => {
          const val = opt === "Yes";
          const selected = medicationTaken === val;
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.75}
              hitSlop={4}
              onPress={() => {
                Haptics.selectionAsync();
                setMedicationTaken(val);
              }}
              className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 border ${
                selected
                  ? "bg-[#1B6E63]/10 border-[#1B6E63]/40"
                  : "bg-white dark:bg-slate-800/60 border-[#DCE3DF] dark:border-slate-700"
              }`}
            >
              <Feather
                name={val ? "check-circle" : "x-circle"}
                size={13}
                color={selected ? "#1B6E63" : isDark ? "#94a3b8" : "#64748b"}
              />
              <Text className={`text-[11.5px] font-semibold ${selected ? "text-[#1B6E63]" : "text-[#5C6B66] dark:text-slate-400"}`}>
                Meds: {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SaveButton
        label={isEmergency ? "Submit Critical Log" : "Save Vitals"}
        onPress={handleSave}
        isLoading={isSubmitting}
        color={isEmergency ? "#8A1F1A" : "#1B6E63"}
      />

      <TouchableOpacity
        activeOpacity={0.7}
        hitSlop={6}
        onPress={() => onContinueToSymptoms(systolic.trim(), diastolic.trim())}
        className="flex-row items-center justify-center gap-1.5 py-2"
      >
        <Text className="text-[12px] font-bold text-[#E8532E]">Continue to Symptoms</Text>
        <Feather name="arrow-right" size={13} color="#E8532E" />
      </TouchableOpacity>

      {/* Emergency Guidance Modal — matches log-symptoms.tsx (HL-ENG-17) */}
      <Modal
        visible={showEmergencyGuidanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEmergencyGuidanceModal(false);
          onSaved();
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderRadius: 24,
              padding: 24,
              borderWidth: 2,
              borderColor: "#dc2626",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(127,29,29,0.5)" : "#fee2e2",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                alignSelf: "center",
              }}
            >
              <Feather name="alert-triangle" size={28} color="#dc2626" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: isDark ? "#ffffff" : "#0f172a",
                textAlign: "center",
                marginBottom: 8,
                letterSpacing: -0.3,
              }}
            >
              Critical Vitals Detected
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? "#cbd5e1" : "#475569",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 24,
                fontWeight: "500",
              }}
            >
              {isSevereHypotension
                ? "Your blood pressure reading reflects acute hypotension (<90/60 mmHg). Please sit or lie down, hydrate, and seek medical assistance immediately."
                : isHypertensiveCrisis
                ? "Your blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg). Immediate emergency medical evaluation is strongly advised."
                : "Your clinical indicators reflect acute cardiac strain. Please seek emergency medical care immediately."}
            </Text>

            <View style={{ gap: 12, width: "100%" }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowEmergencyGuidanceModal(false);
                  Linking.openURL(
                    "https://www.google.com/maps/search/Emergency+Hospital+near+me"
                  ).catch(() => {});
                  onSaved();
                }}
                style={{
                  width: "100%",
                  backgroundColor: "#dc2626",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="map-pin" size={16} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>
                  Find Nearby Emergency Hospital
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  Linking.openURL("tel:911").catch(() => {});
                }}
                style={{
                  width: "100%",
                  backgroundColor: isDark ? "#1e293b" : "#0f172a",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="phone-call" size={16} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>
                  Call Emergency Services (911)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowEmergencyGuidanceModal(false);
                  onSaved();
                }}
                style={{
                  width: "100%",
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <Text style={{ color: isDark ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: "600" }}>
                  Acknowledge & Return to App
                </Text>
              </TouchableOpacity>
            </View>
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
