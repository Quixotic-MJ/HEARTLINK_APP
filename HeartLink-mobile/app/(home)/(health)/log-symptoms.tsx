import { useColorScheme } from "nativewind";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  KeyboardAvoidingView,
  PanResponder,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useUser } from "../../../contexts/UserContext";
import { OfflineSyncService } from "../../../utils/OfflineSyncService";
import * as Haptics from "expo-haptics";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postLogAck } from "../../../services/companionCopy";
const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types & Constants ────────────────────────────────────────────────────────

type SymptomType =
  | "None (Feeling fine)"
  | "Chest Discomfort / Tightness"
  | "Shortness of Breath"
  | "Dizziness / Lightheadedness"
  | "Palpitations"
  | "Fatigue / Weakness";

type ContextType =
  | "While resting"
  | "During physical activity"
  | "After eating";

const SYMPTOMS: SymptomType[] = [
  "None (Feeling fine)",
  "Chest Discomfort / Tightness",
  "Shortness of Breath",
  "Dizziness / Lightheadedness",
  "Palpitations",
  "Fatigue / Weakness",
];

const CONTEXTS: ContextType[] = [
  "While resting",
  "During physical activity",
  "After eating",
];

const SYMPTOM_ICONS: Record<SymptomType, string> = {
  "None (Feeling fine)": "emoticon-happy-outline",
  "Chest Discomfort / Tightness": "heart-pulse",
  "Shortness of Breath": "lungs",
  "Dizziness / Lightheadedness": "emoticon-confused-outline",
  Palpitations: "waveform",
  "Fatigue / Weakness": "battery-low",
};

const CONTEXT_ICONS: Record<ContextType, string> = {
  "While resting": "sofa-outline",
  "During physical activity": "run",
  "After eating": "food-outline",
};

// ─── Severity Colors ──────────────────────────────────────────────────────────

function getSeverityColor(num: number, isDark: boolean) {
  if (num <= 3) {
    return {
      bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
      border: isDark ? "rgba(16, 185, 129, 0.4)" : "#a7f3d0",
      text: isDark ? "#34d399" : "#047857",
    };
  }
  if (num <= 6) {
    return {
      bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#fefce8",
      border: isDark ? "rgba(245, 158, 11, 0.4)" : "#fde68a",
      text: isDark ? "#fbbf24" : "#b45309",
    };
  }
  return {
    bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2",
    border: isDark ? "rgba(239, 68, 68, 0.4)" : "#fecaca",
    text: isDark ? "#f87171" : "#b91c1c",
  };
}

function getSeverityLabel(num: number) {
  if (num <= 3) return "Mild";
  if (num <= 6) return "Moderate";
  return "Severe";
}

// ─── Interactive Severity Slider Component ───────────────────────────────────

function SeveritySlider({
  value,
  onChange,
  isDark,
  isTouched,
}: {
  value: number;
  onChange: (val: number) => void;
  isDark: boolean;
  isTouched?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const widthRef = useRef(width);
  widthRef.current = width;

  const isDragging = useRef(false);

  const updateFromPosition = (x: number) => {
    if (widthRef.current <= 0) return;
    const padding = 14;
    const usableWidth = widthRef.current - padding * 2;
    const clampedX = Math.max(0, Math.min(usableWidth, x - padding));
    const ratio = clampedX / usableWidth;
    
    // Update visual position continuously without delay for perfectly smooth drag
    animatedPercentage.value = ratio * 100;

    const stepVal = Math.round(1 + ratio * 9);
    const clampedVal = Math.max(1, Math.min(10, stepVal));
    if (clampedVal !== valueRef.current) {
      const prevVal = valueRef.current;
      if (clampedVal >= 7 && prevVal < 7) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.selectionAsync();
      }
      onChange(clampedVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        animatedPercentage.value = withTiming(((valueRef.current - 1) / 9) * 100, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        animatedPercentage.value = withTiming(((valueRef.current - 1) / 9) * 100, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      },
    })
  ).current;

  const sev = getSeverityColor(value, isDark);
  const label = getSeverityLabel(value);
  const percentage = Math.max(0, Math.min(100, ((value - 1) / 9) * 100));

  const animatedPercentage = useSharedValue(percentage);

  useEffect(() => {
    if (!isDragging.current) {
      animatedPercentage.value = withTiming(percentage, {
        duration: 150,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [percentage]);

  const activeTrackStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedPercentage.value}%`,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const trackWidth = width > 0 ? width - 28 : 0;
    return {
      left: (animatedPercentage.value / 100) * trackWidth - 14,
    };
  });

  // Severity-aware accent: the track itself shifts green → amber → red,
  // matching the clinical meaning (replaces the off-brand slate blue).
  const primaryColor = sev.text;
  const inactiveTrackColor = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(100, 116, 139, 0.18)";
  const activeDotColor = "rgba(255, 255, 255, 0.9)";
  const inactiveDotColor = isDark ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.45)";

  return (
    <View className="gap-3 mt-1">
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            Intensity:
          </Text>
          <Text className="text-[15px] font-extrabold text-slate-800 dark:text-white">
            Level {value}
            <Text className="text-[13px] font-semibold text-slate-400 dark:text-slate-500"> /10</Text>
          </Text>
        </View>

        <View
          className="px-2.5 py-0.5 rounded-full border"
          style={{ backgroundColor: sev.bg, borderColor: sev.border }}
        >
          <Text
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: sev.text }}
          >
            {label}
          </Text>
        </View>
      </View>

      {/* Discrete Slider Track Container */}
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        className="py-3 px-3.5 justify-center"
      >
        <View style={{ height: 28, justifyContent: "center" }}>
          {/* Inactive Track */}
          <View
            style={{
              height: 8,
              width: "100%",
              backgroundColor: inactiveTrackColor,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {/* Active Primary Track */}
            <Animated.View
              style={[{
                height: "100%",
                backgroundColor: primaryColor,
                borderRadius: 4,
                position: "absolute",
              }, activeTrackStyle]}
            />
            
            {/* Tick Marks */}
            {width > 0 && (
              <View style={{ position: "absolute", width: "100%", height: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }} pointerEvents="none">
                {Array.from({ length: 10 }).map((_, i) => (
                  <View key={i} style={{ width: 2, height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", borderRadius: 1 }} />
                ))}
              </View>
            )}
          </View>

          {/* Floating Thumb (white with inner severity dot) */}
          <Animated.View
            style={[{
              position: "absolute",
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 5,
              elevation: 4,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              alignItems: "center",
              justifyContent: "center",
            }, thumbStyle]}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isTouched === false ? "#ef4444" : primaryColor }} />
            
            {isTouched === false && (
              <View style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1, borderColor: "#fff" }} />
            )}
          </Animated.View>
        </View>
      </View>

      {/* Calibration Labels */}
      <View className="flex-row justify-between items-center px-1">
        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
          1 • Mild
        </Text>
        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
          5 • Moderate
        </Text>
        <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
          10 • Severe
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LogSymptomsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const primaryThemeColor = isDark ? "#22c55e" : "#1BA382"; // New Teal/Green
  const successThemeColor = isDark ? "#22c55e" : "#1BA382";
  const destructiveThemeColor = isDark ? "#D15C4E" : "#8A1F1A";
  const cardThemeBg = isDark ? "#1e293b" : "#FFFFFF";
  const borderThemeColor = isDark ? "#334155" : "#E2E8F0";
  const fgThemeColor = isDark ? "#EDF1EF" : "#152131";
  const mutedFgThemeColor = isDark ? "#94A3B8" : "#64748B";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    triggered_by_exercise_id?: string;
  }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyGuidanceModal, setShowEmergencyGuidanceModal] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const [timestamp, setTimestamp] = useState("");
  const diastolicRef = useRef<TextInput>(null);

  // Vitals State
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [medicationTaken, setMedicationTaken] = useState<boolean | null>(null);

  // Hemodynamic boundary checks (AHA / Philippine DOH Hypertensive Crisis & Hypotension)
  const sysVal = parseInt(systolic, 10);
  const diaVal = parseInt(diastolic, 10);
  const isHypertensiveCrisis =
    (!isNaN(sysVal) && sysVal >= 180) || (!isNaN(diaVal) && diaVal >= 120);
  const isSevereHypotension =
    (!isNaN(sysVal) && sysVal > 0 && sysVal < 90) ||
    (!isNaN(diaVal) && diaVal > 0 && diaVal < 60);

  // Symptoms State
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>(["None (Feeling fine)"]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const [touchedSeverities, setTouchedSeverities] = useState<Record<string, boolean>>({});
  const [context, setContext] = useState<ContextType>(
    params.triggered_by_exercise_id ? "During physical activity" : "While resting"
  );

  useEffect(() => {
    setTimestamp(
      new Date().toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  const hasRealSymptoms =
    !selectedSymptoms.includes("None (Feeling fine)") &&
    selectedSymptoms.length > 0;

  const toggleSymptom = (symp: SymptomType) => {
    Haptics.selectionAsync();
    if (symp === "None (Feeling fine)") {
      setSelectedSymptoms(["None (Feeling fine)"]);
      return;
    }
    let next = selectedSymptoms.filter((s) => s !== "None (Feeling fine)");
    if (next.includes(symp)) {
      next = next.filter((s) => s !== symp);
    } else {
      next.push(symp);
    }
    setSelectedSymptoms(next.length === 0 ? ["None (Feeling fine)"] : next);
  };

  const isEmergency =
    (hasRealSymptoms &&
      ((selectedSymptoms.includes("Chest Discomfort / Tightness") &&
        (severities["Chest Discomfort / Tightness"] || 1) >= 7) ||
        (selectedSymptoms.includes("Shortness of Breath") &&
          context === "While resting"))) ||
    isHypertensiveCrisis ||
    isSevereHypotension;

  const handleLocateCardiologist = () => {
    Linking.openURL(
      "https://www.google.com/maps/search/Cardiologist+in+Cebu+City"
    ).catch(() => showToast({ title: "Error", message: "Could not open map application.", type: "error" }));
  };

  const handleSubmit = async (bypassIncompleteCheck = false) => {
    const parseIntegerInput = (val: string): number | null => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return !Number.isInteger(n) ? NaN : n;
    };
    const parseFloatInput = (val: string): number | null => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return isNaN(n) ? NaN : n;
    };

    const sys = parseIntegerInput(systolic);
    const dia = parseIntegerInput(diastolic);
    const hr = parseIntegerInput(heartRate);
    const w = parseFloatInput(weight);

    if (sys !== null) {
      if (isNaN(sys) || sys < 50 || sys > 300) {
        showToast({ title: "Unusual Reading", message: "Top blood pressure (systolic) is typically between 50 and 300 mmHg. Please double-check your reading.", type: "error" });
        return;
      }
    }
    if (dia !== null) {
      if (isNaN(dia) || dia < 30 || dia > 200) {
        showToast({ title: "Unusual Reading", message: "Bottom blood pressure (diastolic) is typically between 30 and 200 mmHg. Please double-check your reading.", type: "error" });
        return;
      }
    }
    if (hr !== null) {
      if (isNaN(hr) || hr < 30 || hr > 250) {
        showToast({ title: "Unusual Pulse Rate", message: "Heart rate is typically between 30 and 250 BPM. Please re-check your pulse reading.", type: "error" });
        return;
      }
    }
    if (w !== null) {
      if (isNaN(w) || w < 20 || w > 400) {
        showToast({ title: "Check Weight", message: "Please enter a realistic body weight between 20 and 400 kg.", type: "error" });
        return;
      }
    }

    if ((sys !== null && dia === null) || (sys === null && dia !== null)) {
      showToast({
        title: "Incomplete Blood Pressure",
        message: "Please enter both the top (systolic) and bottom (diastolic) numbers for an accurate reading.",
        type: "error",
      });
      return;
    }

    if (sys !== null && dia !== null) {
      if (sys <= dia) {
        showToast({
          title: "Check Your Numbers",
          message: "The top number (systolic) should always be higher than the bottom number (diastolic).",
          type: "error",
        });
        return;
      }
      if (sys - dia < 15) {
        showToast({
          title: "Numbers Too Close",
          message: "The top and bottom numbers are unusually close together. Please verify your blood pressure cuff placement.",
          type: "error",
        });
        return;
      }
    }

    const hasAnyContent =
      (sys !== null && dia !== null) ||
      hr !== null ||
      w !== null ||
      hasRealSymptoms ||
      medicationTaken !== null;

    if (!hasAnyContent) {
      showToast({
        title: "Ready to Log?",
        message: "Please enter your vitals, select any symptoms, or check off your medications before saving.",
        type: "info",
      });
      return;
    }

    const untouchedSymp = selectedSymptoms.find(s => s !== "None (Feeling fine)" && !touchedSeverities[s]);
    if (untouchedSymp) {
      showToast({ title: "Action Required", message: `Please set the severity for ${untouchedSymp}.`, type: "error" });
      return;
    }

    const isBpComplete = sys !== null && dia !== null;
    const isMedsComplete = medicationTaken !== null;
    
    if (bypassIncompleteCheck !== true && (!isBpComplete || !isMedsComplete)) {
      setShowIncompleteWarning(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    const targetUrl = `${base_url}/api/health-logs/${userId}`;
    const contextMap: Record<string, string> = {
      "While resting": "resting",
      "During physical activity": "after_exercise",
      "After eating": "after_eating",
    };
    const mappedContext = contextMap[context] || "resting";
    const effectiveHr = hr !== null && !isNaN(hr) ? hr : null;
    const payload = {
      systolic_bp: sys,
      diastolic_bp: dia,
      heart_rate_bpm: effectiveHr,
      weight_kg: w,
      medication_taken: medicationTaken || false,
      symptoms: selectedSymptoms,
      severity_map: severities,
      context: mappedContext,
      triggered_by_exercise_id: params.triggered_by_exercise_id || null,
      notes: "",
    };

    let saveSucceeded = false;

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          console.error(`Health log rejected with client status ${res.status}. Not enqueuing invalid payload.`);
          showToast({
            title: "Couldn't Save Log",
            message: "Oops, we couldn't save that. Please double-check your numbers and try again!",
            type: "error",
            duration: 6000,
          });
          setIsSubmitting(false);
          return;
        }
        throw new Error(`Server returned status ${res.status}`);
      }

      saveSucceeded = true;

      if (userId) {
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const keysToRemove = allKeys.filter((k) => k.startsWith(`@trends_cache_${userId}`));
          if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
          }
        } catch (e) {
          console.warn("Failed to invalidate trends cache after log", e);
        }
      }
    } catch (err: any) {
      console.warn("Network error during submission. Queuing log for offline sync...", err);
      await OfflineSyncService.queueRequest(targetUrl, "POST", payload, undefined, userId || undefined);
      saveSucceeded = true;
    } finally {
      setIsSubmitting(false);
    }

    if (!saveSucceeded) return;

    if (isEmergency) {
      if (isSevereHypotension) {
        showToast({ 
          title: "Critical Low Blood Pressure", 
          message: "Blood pressure reading reflects acute hypotension (<90/60 mmHg). Please sit or lie down safely, hydrate, and seek medical attention.", 
          type: "error",
          duration: 8000 
        });
      } else if (isHypertensiveCrisis) {
        showToast({ 
          title: "Hypertensive Crisis Detected", 
          message: "Blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg). Please seek emergency medical care.", 
          type: "error",
          duration: 8000 
        });
      } else {
        showToast({ 
          title: "Critical Clinical Indicators", 
          message: "Your clinical indicators reflect acute cardiac risk. Emergency medical evaluation is recommended.", 
          type: "error",
          duration: 6000 
        });
      }
      setShowEmergencyGuidanceModal(true);
    } else {
      let comparisonStr = undefined;
      if (sys !== null && dia !== null) {
        try {
          const res = await fetch(`${base_url}/api/health-logs/${userId}?limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const logs = await res.json();
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
          // ignore
        }
      }

      if (sys !== null && dia !== null) {
        showToast({ 
          ...postLogAck("vitals", `${sys}/${dia} mmHg${effectiveHr ? ` • ${effectiveHr} BPM` : ""}`), 
          type: "success" 
        });
      } else {
        showToast({ 
          title: "Health Log Saved",
          message: "Your symptoms and daily check-in have been recorded.",
          type: "success" 
        });
      }
      router.back();
    }
  };

  const maxSeverity = hasRealSymptoms ? Math.max(...selectedSymptoms.map(s => severities[s] || 1)) : 1;
  const sevColor = getSeverityColor(maxSeverity, isDark);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0b1120]" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Bar ── */}
      <View className="flex-row items-center px-5 pt-3 pb-1">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 items-center justify-center z-10"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#475569"} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.duration(240)} className="mb-5 px-2">
            <View className="flex-row items-center mb-1">
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full mb-1">
                <Feather name="plus" size={11} color={primaryThemeColor} strokeWidth={3} />
                <Text className="text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: primaryThemeColor }}>
                  DAILY CHECK-IN
                </Text>
              </View>
            </View>
            <Text className="text-[26px] font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight mb-2">
              Log Health Data
            </Text>
            <Text className="text-[13.5px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
              Record today's cardiovascular vitals, medication status, and any symptoms.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(260)} className="gap-4">
            {/* ── Section 1: Vitals & Measurements ── */}
            <View className="gap-4">
              {/* Core Vitals Card */}
              <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 px-5 py-6 gap-4 shadow-sm">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Feather name="activity" size={15} color={isDark ? "#6488B0" : "#4A6080"} />
                  </View>
                  <Text className="text-[16px] font-bold text-slate-800 dark:text-white">Cardiovascular Metrics</Text>
                </View>

                {/* Blood Pressure Row */}
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">Blood Pressure</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-0.5">Systolic (SYS)</Text>
                      <View className="h-[50px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex-row items-center px-3.5">
                        <TextInput 
                          value={systolic} 
                          onChangeText={(val) => {
                            setSystolic(val);
                            if (val.length === 3) diastolicRef.current?.focus();
                          }} 
                          placeholder="120" 
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} 
                          keyboardType="numeric" 
                          maxLength={3} 
                          returnKeyType="next"
                          onSubmitEditing={() => diastolicRef.current?.focus()}
                          className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium h-full" 
                        />
                        <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">mmHg</Text>
                      </View>
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-0.5">Diastolic (DIA)</Text>
                      <View className="h-[50px] bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center px-3.5">
                        <TextInput 
                          ref={diastolicRef}
                          value={diastolic} 
                          onChangeText={setDiastolic} 
                          placeholder="80" 
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} 
                          keyboardType="numeric" 
                          maxLength={3} 
                          className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium h-full" 
                        />
                        <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">mmHg</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Heart Rate & Weight Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">Heart Rate</Text>
                    <View className="h-[50px] bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center px-3.5">
                      <TextInput value={heartRate} onChangeText={setHeartRate} placeholder="72" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} keyboardType="numeric" maxLength={3} className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium h-full" />
                      <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">BPM</Text>
                    </View>
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-0.5">Weight</Text>
                    <View className="h-[50px] bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center px-3.5">
                      <TextInput value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} keyboardType="numeric" maxLength={5} className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium h-full" />
                      <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">kg</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Medication Status Card */}
              <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 px-5 py-6 gap-3.5 shadow-sm">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Feather name="check-circle" size={15} color={isDark ? "#6488B0" : "#4A6080"} />
                  </View>
                  <Text className="text-[16px] font-bold text-slate-800 dark:text-white">Medication Check</Text>
                </View>
                <Text className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Did you take your prescribed maintenance medications today?
                </Text>
                <View className="flex-row gap-3 mt-1">
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => { Haptics.selectionAsync(); setMedicationTaken(false); }}
                    className="flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2"
                    style={{
                      backgroundColor: medicationTaken === false ? (isDark ? "#7f1d1d" : "#fee2e2") : (isDark ? "#1e293b" : "#F1F5F9"),
                      borderWidth: 1,
                      borderColor: medicationTaken === false ? (isDark ? "#ef4444" : "#fca5a5") : "transparent",
                    }}
                  >
                    <Feather name="x-circle" size={15} color={medicationTaken === false ? (isDark ? "#fca5a5" : "#ef4444") : "#94A3B8"} />
                    <Text className="text-sm font-semibold" style={{ color: medicationTaken === false ? (isDark ? "#fca5a5" : "#ef4444") : "#94A3B8" }}>No, missed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => { Haptics.selectionAsync(); setMedicationTaken(true); }}
                    className="flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
                    style={{
                      backgroundColor: medicationTaken === true ? primaryThemeColor : (isDark ? "#1e293b" : "#F1F5F9"),
                      borderWidth: 1,
                      borderColor: medicationTaken === true ? primaryThemeColor : "transparent",
                    }}
                  >
                    <Feather name="check-circle" size={15} color={medicationTaken === true ? "#ffffff" : "#94A3B8"} />
                    <Text className="text-sm" style={{ color: medicationTaken === true ? "#ffffff" : "#94A3B8", fontWeight: medicationTaken === true ? "800" : "600" }}>Yes, taken</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Section 2: Symptoms & Feelings ── */}
            <View className="gap-4 mt-2">
              {/* Section Divider */}
              <View className="flex-row items-center gap-3 px-1">
                <View className="flex-1 h-px bg-border" />
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: `${primaryThemeColor}1A` }}>
                    <Feather name="heart" size={14} color={primaryThemeColor} />
                  </View>
                  <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: primaryThemeColor }}>Symptoms & Feelings</Text>
                </View>
                <View className="flex-1 h-px bg-border" />
              </View>

              {/* Status Overview Summary */}
              <Animated.View layout={LinearTransition.duration(220)} className="flex-row gap-3 mt-2">
                <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 items-center shadow-sm">
                  <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white">{hasRealSymptoms ? selectedSymptoms.length : 0}</Text>
                  <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Symptoms</Text>
                </View>
                <View className="flex-1 rounded-2xl p-4 border items-center justify-center shadow-sm" style={{ backgroundColor: hasRealSymptoms ? (isDark ? "rgba(34, 197, 94, 0.1)" : "#ecfdf5") : (isDark ? "#0f172a" : "#ffffff"), borderColor: hasRealSymptoms ? primaryThemeColor : (isDark ? "#1e293b" : "#e2e8f0") }}>
                  <Text className="text-[22px] font-extrabold" style={{ color: hasRealSymptoms ? primaryThemeColor : (isDark ? "#64748b" : "#94a3b8") }}>{hasRealSymptoms ? maxSeverity : "—"}</Text>
                  <Text className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: hasRealSymptoms ? primaryThemeColor : (isDark ? "#64748b" : "#94a3b8") }}>{hasRealSymptoms ? getSeverityLabel(maxSeverity) : "Severity"}</Text>
                </View>
                <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 items-center justify-center shadow-sm">
                  <MaterialCommunityIcons name={CONTEXT_ICONS[context] as any} size={24} color={isDark ? "#94a3b8" : "#64748b"} style={{ marginBottom: 2 }} />
                  <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 text-center" numberOfLines={1}>{context.replace("While ", "").replace("During ", "")}</Text>
                </View>
              </Animated.View>

              {/* Symptom Selection Cards */}
              <Animated.View layout={LinearTransition.duration(220)} className="gap-3.5 mt-2">
                <Text className="text-[16px] font-bold text-slate-800 dark:text-white mt-1">What are you feeling?</Text>
                <View className="gap-2.5">
                  {SYMPTOMS.map((symp) => {
                    const isSelected = selectedSymptoms.includes(symp);
                    const isNone = symp === "None (Feeling fine)";
                    return (
                      <View 
                        key={symp} 
                        className="rounded-2xl border" 
                        style={{ 
                          backgroundColor: isSelected ? (isDark ? "#1e293b" : "#ffffff") : (isDark ? "#0f172a" : "#F1F5F9"),
                          borderColor: isSelected ? primaryThemeColor : "transparent",
                          shadowColor: isSelected ? (isDark ? "#000" : "#64748b") : "transparent",
                          shadowOffset: isSelected ? { width: 0, height: 2 } : { width: 0, height: 0 },
                          shadowOpacity: isSelected ? (isDark ? 0.3 : 0.05) : 0,
                          shadowRadius: isSelected ? 4 : 0,
                          elevation: isSelected ? 2 : 0,
                        }}
                      >
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => toggleSymptom(symp)}
                          className="flex-row items-center px-4 py-4"
                        >
                          <MaterialCommunityIcons name={SYMPTOM_ICONS[symp] as any} size={18} color={isSelected ? primaryThemeColor : "#94A3B8"} style={{ marginRight: 12 }} />
                          <Text className="flex-1 text-[13.5px] font-semibold" style={{ color: isSelected ? (isDark ? "#f8fafc" : "#1e293b") : "#64748b" }}>{symp}</Text>
                          <View className="w-[18px] h-[18px] rounded-full border-2 items-center justify-center" style={{ borderColor: isSelected ? primaryThemeColor : "#cbd5e1" }}>
                            {isSelected && <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryThemeColor }} />}
                          </View>
                        </TouchableOpacity>
                        
                        {isSelected && !isNone && (
                          <View className="px-4 pb-4">
                            <SeveritySlider 
                              value={severities[symp] || 1} 
                              onChange={(val) => {
                                setSeverities((prev) => ({ ...prev, [symp]: val }));
                                setTouchedSeverities((prev) => ({ ...prev, [symp]: true }));
                              }} 
                              isDark={isDark} 
                              isTouched={touchedSeverities[symp]}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Context Selector */}
              {hasRealSymptoms && (
                <Animated.View layout={LinearTransition.duration(220)} className="gap-3.5 mt-2">
                  <Text className="text-[16px] font-bold text-slate-800 dark:text-white">When did this happen?</Text>
                  <View className="gap-2.5">
                    {CONTEXTS.map((ctx) => {
                      const isSelected = context === ctx;
                      return (
                        <TouchableOpacity 
                          key={ctx} 
                          activeOpacity={0.75} 
                          onPress={() => { Haptics.selectionAsync(); setContext(ctx); }} 
                          className="flex-row items-center px-4 py-4 rounded-2xl border" 
                          style={{ 
                            backgroundColor: isSelected ? (isDark ? "#1e293b" : "#ffffff") : (isDark ? "#0f172a" : "#F1F5F9"),
                            borderColor: isSelected ? primaryThemeColor : "transparent",
                          }}
                        >
                          <MaterialCommunityIcons name={CONTEXT_ICONS[ctx] as any} size={18} color={isSelected ? primaryThemeColor : "#94A3B8"} style={{ marginRight: 12 }} />
                          <Text className="flex-1 text-[13.5px] font-semibold" style={{ color: isSelected ? (isDark ? "#f8fafc" : "#1e293b") : "#64748b" }}>{ctx}</Text>
                          <View className="w-[18px] h-[18px] rounded-full border-2 items-center justify-center" style={{ borderColor: isSelected ? primaryThemeColor : "#cbd5e1" }}>
                            {isSelected && <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryThemeColor }} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Bottom Action Bar ── */}
        <Animated.View layout={LinearTransition.duration(220)} className="bg-slate-50/95 dark:bg-[#0b1120]/95 border-t border-slate-200 dark:border-slate-800 px-5 pt-3 gap-2.5" style={{ paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "android" ? 10 : 4) }}>
          {/* Docked Emergency Warning — fixed-height container prevents jitter */}
          <View style={{ minHeight: isEmergency ? undefined : 0, overflow: "hidden" }}>
            {isEmergency && (
              <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(160)} className="bg-destructive/15 border border-destructive/40 rounded-2xl p-3.5 gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="alert-triangle" size={15} color="#ef4444" />
                    <Text className="text-xs font-bold text-destructive uppercase tracking-wide">
                      {isSevereHypotension ? "Severe Hypotension (<90/60)" : isHypertensiveCrisis ? "Hypertensive Crisis (≥180/120)" : "Elevated Risk Detected"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleLocateCardiologist} activeOpacity={0.75} className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-destructive/30 flex-row items-center gap-1">
                    <MaterialCommunityIcons name="map-marker-radius" size={13} color="#ef4444" />
                    <Text className="text-[11px] font-bold text-destructive">Find Cardiologist</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-[12px] text-destructive leading-snug font-medium">
                  {isSevereHypotension
                    ? "Entered blood pressure indicates acute hypotension (<90/60 mmHg). Sit or lie down safely, hydrate, and seek medical attention if faint or symptomatic."
                    : isHypertensiveCrisis
                    ? `Entered blood pressure (${systolic || "--"}/${diastolic || "--"} mmHg) indicates an acute Hypertensive Crisis (≥180/120 mmHg). Rest for 5 mins and re-test. If sustained or symptoms worsen, call 911 immediately.`
                    : "Clinical indicators suggest acute risk. Please seek medical evaluation immediately."}
                </Text>
              </Animated.View>
            )}
          </View>

          <View className="mt-2 mb-4">
            <Button label={isEmergency ? "Submit Critical Log" : "Submit Health Log"} icon={isEmergency ? "alert-triangle" : "check"} onPress={() => handleSubmit(false)} isLoading={isSubmitting} loadingText="Saving log..." variant={isEmergency ? "destructive" : "primary"} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Emergency Guidance Modal (HL-ENG-17) */}
      <Modal visible={showEmergencyGuidanceModal} transparent animationType="fade" onRequestClose={() => { setShowEmergencyGuidanceModal(false); router.back(); }}>
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-red-500 shadow-2xl">
            <View className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/80 items-center justify-center mb-4 self-center">
              <Feather name="alert-triangle" size={28} color="#dc2626" />
            </View>
            <Text className="text-[20px] font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">Critical Vitals Detected</Text>
            <Text className="text-[14px] text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-6 font-medium">
              {isSevereHypotension
                ? "Your blood pressure reading reflects acute hypotension (<90/60 mmHg). Please sit or lie down, hydrate, and seek medical assistance immediately."
                : isHypertensiveCrisis
                ? "Your blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg). Immediate emergency medical evaluation is strongly advised."
                : "Your clinical indicators reflect acute cardiac strain. Please seek emergency medical care immediately."}
            </Text>
            <View className="gap-3 w-full">
              <TouchableOpacity activeOpacity={0.85} onPress={() => { setShowEmergencyGuidanceModal(false); router.replace("/locator" as any); }} className="w-full bg-red-600 py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm">
                <Feather name="map-pin" size={16} color="#ffffff" />
                <Text className="text-white text-[14px] font-bold">Find Nearby Emergency Hospital</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => { Linking.openURL("tel:911").catch(() => {}); }} className="w-full bg-slate-900 dark:bg-slate-800 py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2">
                <Feather name="phone-call" size={16} color="#ffffff" />
                <Text className="text-white text-[14px] font-bold">Call Emergency Services (911)</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setShowEmergencyGuidanceModal(false); router.back(); }} className="w-full py-2.5 items-center justify-center mt-1">
                <Text className="text-slate-400 dark:text-slate-500 text-[13px] font-semibold">Acknowledge & Return to App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showIncompleteWarning}
        onCancel={() => setShowIncompleteWarning(false)}
        onConfirm={() => {
          setShowIncompleteWarning(false);
          handleSubmit(true);
        }}
        title="Incomplete Check-In"
        message="You haven't logged your Blood Pressure or Medications today. Are you sure you want to save this partial check-in?"
        confirmLabel="Save Anyway"
        variant="warning"
        icon="alert-circle"
      />
    </SafeAreaView>
  );
}
