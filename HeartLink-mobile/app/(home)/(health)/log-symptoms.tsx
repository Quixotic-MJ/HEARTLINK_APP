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
} from "react-native-reanimated";
import { useUser } from "../../../contexts/UserContext";
import { OfflineSyncService } from "../../../utils/OfflineSyncService";
import * as Haptics from "expo-haptics";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
}: {
  value: number;
  onChange: (val: number) => void;
  isDark: boolean;
}) {
  const [width, setWidth] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const widthRef = useRef(width);
  widthRef.current = width;

  const updateFromPosition = (x: number) => {
    if (widthRef.current <= 0) return;
    const padding = 14;
    const usableWidth = widthRef.current - padding * 2;
    const clampedX = Math.max(0, Math.min(usableWidth, x - padding));
    const ratio = clampedX / usableWidth;
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
        updateFromPosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromPosition(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const sev = getSeverityColor(value, isDark);
  const label = getSeverityLabel(value);
  const percentage = Math.max(0, Math.min(100, ((value - 1) / 9) * 100));

  const primaryColor = isDark ? "#3b82f6" : "#2563eb";
  const inactiveTrackColor = isDark ? "rgba(59, 130, 246, 0.22)" : "rgba(37, 99, 235, 0.18)";
  const activeDotColor = "rgba(255, 255, 255, 0.85)";
  const inactiveDotColor = isDark ? "rgba(59, 130, 246, 0.7)" : "rgba(37, 99, 235, 0.5)";

  return (
    <View className="bg-background/80 dark:bg-slate-950/70 rounded-2xl border border-border p-4 gap-3">
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs font-semibold text-foreground">
            Intensity:
          </Text>
          <Text className="text-sm font-bold text-foreground">
            Level {value}
            <Text className="text-xs font-normal text-muted-foreground">/10</Text>
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
        {/* Inactive Track */}
        <View
          style={{
            height: 6,
            width: "100%",
            backgroundColor: inactiveTrackColor,
            borderRadius: 3,
            overflow: "hidden",
            justifyContent: "center",
          }}
        >
          {/* Active Primary Track */}
          <View
            style={{
              height: "100%",
              width: `${percentage}%`,
              backgroundColor: primaryColor,
              borderRadius: 3,
            }}
          />
        </View>

        {/* Discrete Step Dots */}
        {width > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              height: 6,
              justifyContent: "center",
            }}
          >
            {Array.from({ length: 10 }).map((_, idx) => {
              const dotValue = idx + 1;
              const dotPos = (idx / 9) * 100;
              const isPast = dotValue <= value;
              return (
                <View
                  key={idx}
                  style={{
                    position: "absolute",
                    left: `${dotPos}%`,
                    marginLeft: -1.5,
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: isPast ? activeDotColor : inactiveDotColor,
                  }}
                />
              );
            })}
          </View>
        )}

        {/* Floating Solid Primary Thumb */}
        <View
          style={{
            position: "absolute",
            left: width > 0 ? 14 + (percentage / 100) * (width - 28) - 11 : 0,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 3,
            elevation: 4,
            borderWidth: 2,
            borderColor: "#ffffff",
          }}
        />
      </View>

      {/* Calibration Labels */}
      <View className="flex-row justify-between items-center px-1">
        <Text className="text-[10px] font-bold text-muted-foreground uppercase">
          1 • Mild
        </Text>
        <Text className="text-[10px] font-bold text-muted-foreground uppercase">
          5 • Moderate
        </Text>
        <Text className="text-[10px] font-bold text-muted-foreground uppercase">
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    triggered_by_exercise_id?: string;
    pending_exercise?: string;
    quick_entry?: string;
    default_sys?: string;
    default_dia?: string;
  }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyGuidanceModal, setShowEmergencyGuidanceModal] = useState(false);

  const [step, setStep] = useState<1 | 2>(params.triggered_by_exercise_id ? 2 : 1);
  const [timestamp, setTimestamp] = useState("");

  // Step 1 State (Vitals) with fast-entry prefill
  const [systolic, setSystolic] = useState(params.default_sys || "");
  const [diastolic, setDiastolic] = useState(params.default_dia || "");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [medicationTaken, setMedicationTaken] = useState<boolean | null>(null);

  // Stepper adjustments for quick low-dexterity tap input
  const adjustSystolic = (delta: number) => {
    Haptics.selectionAsync();
    const current = parseInt(systolic, 10) || 120;
    const updated = Math.min(260, Math.max(70, current + delta));
    setSystolic(String(updated));
  };

  const adjustDiastolic = (delta: number) => {
    Haptics.selectionAsync();
    const current = parseInt(diastolic, 10) || 80;
    const updated = Math.min(180, Math.max(40, current + delta));
    setDiastolic(String(updated));
  };

  // Hemodynamic boundary checks (AHA / Philippine DOH Hypertensive Crisis & Hypotension)
  const sysVal = parseInt(systolic, 10);
  const diaVal = parseInt(diastolic, 10);
  const isHypertensiveCrisis =
    (!isNaN(sysVal) && sysVal >= 180) || (!isNaN(diaVal) && diaVal >= 120);
  const isSevereHypotension =
    (!isNaN(sysVal) && sysVal > 0 && sysVal < 90) ||
    (!isNaN(diaVal) && diaVal > 0 && diaVal < 60);

  // Step 2 State (Symptoms)
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>(["None (Feeling fine)"]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
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

  const handleSubmit = async () => {
    // 1. Strict numeric parsing (treating 0 as a distinct number, not falsy)
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

    // 2. Boundary validations (treating 0 as an invalid out-of-range number, not falsy null)
    if (sys !== null) {
      if (isNaN(sys) || sys < 50 || sys > 300) {
        showToast({ title: "Validation Error", message: "Systolic blood pressure must be an integer between 50 and 300.", type: "error" });
        return;
      }
    }
    if (dia !== null) {
      if (isNaN(dia) || dia < 30 || dia > 200) {
        showToast({ title: "Validation Error", message: "Diastolic blood pressure must be an integer between 30 and 200.", type: "error" });
        return;
      }
    }
    if (hr !== null) {
      if (isNaN(hr) || hr < 30 || hr > 250) {
        showToast({ title: "Validation Error", message: "Heart rate must be an integer between 30 and 250.", type: "error" });
        return;
      }
    }
    if (w !== null) {
      if (isNaN(w) || w <= 0 || w > 500) {
        showToast({ title: "Validation Error", message: "Weight must be greater than 0 and up to 500 kg.", type: "error" });
        return;
      }
    }

    // 3. Physiological BP Invariants (Pairwise requirement and SBP > DBP)
    if ((sys !== null && dia === null) || (sys === null && dia !== null)) {
      showToast({
        title: "Validation Error",
        message: "Blood pressure requires both systolic and diastolic values.",
        type: "error",
      });
      return;
    }

    if (params.quick_entry === "true" && (sys === null || dia === null)) {
      showToast({
        title: "Missing Blood Pressure",
        message: "Please enter your blood pressure before logging vitals.",
        type: "error",
      });
      return;
    }

    if (sys !== null && dia !== null) {
      if (sys <= dia) {
        showToast({
          title: "Validation Error",
          message: "Systolic blood pressure must be strictly greater than diastolic blood pressure.",
          type: "error",
        });
        return;
      }
      if (sys - dia < 15) {
        showToast({
          title: "Validation Error",
          message: "Pulse pressure (Systolic - Diastolic) must be at least 15 mmHg.",
          type: "error",
        });
        return;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    const targetUrl = `${base_url}/api/health-logs/${userId}`;
    const payload = {
      systolic_bp: sys,
      diastolic_bp: dia,
      heart_rate_bpm: hr,
      weight_kg: w,
      medication_taken: medicationTaken || false,
      symptoms: selectedSymptoms,
      severity_map: severities,
      context: context,
      triggered_by_exercise_id: params.triggered_by_exercise_id || null,
      notes: "",
    };

    // Optimistic UI: Feedback & navigation
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
      showToast({ 
        title: "Health log submitted", 
        message: "Your symptom and vitals log has been saved to your health history.", 
        type: "success" 
      });
      router.back();
    }

    // Run the API request in background with network vs 4xx discrimination (CLN-01)
    (async () => {
      try {
        if (params.pending_exercise) {
          try {
            const exercisePayload = JSON.parse(decodeURIComponent(params.pending_exercise as string));
            const exUrl = `${base_url}/api/exercises/logs/${userId}`;
            await fetch(exUrl, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token || ""}`,
              },
              body: JSON.stringify(exercisePayload),
            });
          } catch (e) {
            console.warn("Failed to log pending exercise", e);
          }
        }

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
              title: "Log Rejected",
              message: "The server rejected this health log due to invalid data. Please verify your entries.",
              type: "error",
              duration: 6000,
            });
            return;
          }
          throw new Error(`Server returned status ${res.status}`);
        }

        // Vital-event cache invalidation (TKT-CLN-05)
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
        console.warn("Network error during silent submission. Queuing log for offline sync...", err);
        await OfflineSyncService.queueRequest(targetUrl, "POST", payload, undefined, userId || undefined);
      }
    })();
  };

  const maxSeverity = hasRealSymptoms ? Math.max(...selectedSymptoms.map(s => severities[s] || 1)) : 1;
  const sevColor = getSeverityColor(maxSeverity, isDark);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Bar (Consistent with Auth & App standard) ── */}
      <View className="px-5 pt-2 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (step === 2 && !params.triggered_by_exercise_id) {
              setStep(1);
            } else {
              router.back();
            }
          }}
          className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center"
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2.5">
          <View className="px-2.5 py-1 rounded-full bg-card border border-border">
            <Text className="text-[11px] font-semibold text-muted-foreground">
              Step {step} of 2 • {timestamp}
            </Text>
          </View>
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card shadow-sm">
            <Feather name="heart" size={14} color={isDark ? "#f8fafc" : "#0f172a"} />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.duration(240)} className="mb-4 mt-1 px-1">
            <Text className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-1">
              {step === 1 ? "Daily Vitals" : "Log Symptoms"}
            </Text>
            <Text className="text-[14px] text-muted-foreground leading-relaxed">
              {step === 1
                ? "Record today's cardiovascular vitals and medication status."
                : "Select any symptoms experienced today and their intensity."}
            </Text>
          </Animated.View>

          {/* ============================================================== */}
          {/* STEP 1: VITALS */}
          {/* ============================================================== */}
          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(260)} className="gap-4">
              {/* Acute Hypertensive Crisis In-Line Banner */}
              {isHypertensiveCrisis && (
                <View className="bg-red-50 dark:bg-red-950/40 border border-red-500 rounded-2xl p-4 gap-2 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Feather name="alert-triangle" size={16} color="#ef4444" />
                      <Text className="text-[12.5px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Hypertensive Crisis Alert
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleLocateCardiologist}
                      activeOpacity={0.8}
                      className="bg-red-600 px-2.5 py-1 rounded-lg"
                    >
                      <Text className="text-[11px] font-bold text-white">Find Doctor</Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="text-[12px] text-red-700 dark:text-red-300 leading-relaxed font-medium">
                    Entered blood pressure ({systolic || "--"}/{diastolic || "--"} mmHg) meets AHA/DOH Hypertensive Crisis threshold (≥180/120 mmHg). Rest quietly for 5 minutes and re-test. If reading persists or if experiencing chest pressure, shortness of breath, numbness, or vision changes, call 911 immediately.
                  </Text>
                </View>
              )}

              {/* Acute Hypotension In-Line Advisory */}
              {isSevereHypotension && !isHypertensiveCrisis && (
                <View className="bg-amber-50 dark:bg-amber-950/40 border border-amber-500 rounded-2xl p-3.5 gap-1.5 shadow-sm">
                  <View className="flex-row items-center gap-2">
                    <Feather name="alert-circle" size={15} color="#d97706" />
                    <Text className="text-[12px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                      Low Blood Pressure Advisory
                    </Text>
                  </View>
                  <Text className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-snug">
                    Entered reading is below 90/60 mmHg. Drink water, sit or lie down to prevent dizziness or fainting, and verify cuff placement.
                  </Text>
                </View>
              )}

              {/* 1. Core Vitals Card */}
              <View className="bg-card rounded-2xl border border-border px-5 py-6 gap-4 shadow-md">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Feather name="activity" size={15} color={isDark ? "#60a5fa" : "#2563eb"} />
                  </View>
                  <Text className="text-[15px] font-semibold text-foreground">
                    Cardiovascular Metrics
                  </Text>
                </View>

                {/* Blood Pressure Row */}
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-foreground ml-0.5">
                    Blood Pressure
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-[11px] font-medium text-muted-foreground ml-0.5">
                        Systolic (SYS)
                      </Text>
                      <View className="h-[50px] bg-background/60 dark:bg-slate-950/60 border border-border rounded-xl flex-row items-center px-3.5">
                        <TextInput
                          value={systolic}
                          onChangeText={setSystolic}
                          placeholder="120"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                          keyboardType="numeric"
                          maxLength={3}
                          className="flex-1 text-[15px] text-foreground font-medium h-full"
                        />
                        <Text className="text-[11px] font-medium text-muted-foreground">mmHg</Text>
                      </View>
                      {/* Steppers */}
                      <View className="flex-row items-center gap-1 mt-1.5">
                        <TouchableOpacity
                          onPress={() => adjustSystolic(-5)}
                          activeOpacity={0.7}
                          className="flex-1 py-1 rounded-lg bg-muted/60 border border-border items-center"
                        >
                          <Text className="text-[11px] font-bold text-foreground">-5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => adjustSystolic(5)}
                          activeOpacity={0.7}
                          className="flex-1 py-1 rounded-lg bg-muted/60 border border-border items-center"
                        >
                          <Text className="text-[11px] font-bold text-foreground">+5</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-1 gap-1">
                      <Text className="text-[11px] font-medium text-muted-foreground ml-0.5">
                        Diastolic (DIA)
                      </Text>
                      <View className="h-[50px] bg-background/60 dark:bg-slate-950/60 border border-border rounded-xl flex-row items-center px-3.5">
                        <TextInput
                          value={diastolic}
                          onChangeText={setDiastolic}
                          placeholder="80"
                          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                          keyboardType="numeric"
                          maxLength={3}
                          className="flex-1 text-[15px] text-foreground font-medium h-full"
                        />
                        <Text className="text-[11px] font-medium text-muted-foreground">mmHg</Text>
                      </View>
                      {/* Steppers */}
                      <View className="flex-row items-center gap-1 mt-1.5">
                        <TouchableOpacity
                          onPress={() => adjustDiastolic(-5)}
                          activeOpacity={0.7}
                          className="flex-1 py-1 rounded-lg bg-muted/60 border border-border items-center"
                        >
                          <Text className="text-[11px] font-bold text-foreground">-5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => adjustDiastolic(5)}
                          activeOpacity={0.7}
                          className="flex-1 py-1 rounded-lg bg-muted/60 border border-border items-center"
                        >
                          <Text className="text-[11px] font-bold text-foreground">+5</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Heart Rate & Weight Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-foreground ml-0.5">
                      Heart Rate
                    </Text>
                    <View className="h-[50px] bg-background/60 dark:bg-slate-950/60 border border-border rounded-xl flex-row items-center px-3.5">
                      <TextInput
                        value={heartRate}
                        onChangeText={setHeartRate}
                        placeholder="72"
                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        keyboardType="numeric"
                        maxLength={3}
                        className="flex-1 text-[15px] text-foreground font-medium h-full"
                      />
                      <Text className="text-[11px] font-medium text-muted-foreground">BPM</Text>
                    </View>
                  </View>

                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-foreground ml-0.5">
                      Weight
                    </Text>
                    <View className="h-[50px] bg-background/60 dark:bg-slate-950/60 border border-border rounded-xl flex-row items-center px-3.5">
                      <TextInput
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="70"
                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        keyboardType="numeric"
                        maxLength={5}
                        className="flex-1 text-[15px] text-foreground font-medium h-full"
                      />
                      <Text className="text-[11px] font-medium text-muted-foreground">kg</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. Medication Status Card */}
              <View className="bg-card rounded-2xl border border-border px-5 py-6 gap-3.5 shadow-md">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Feather name="check-circle" size={15} color={isDark ? "#60a5fa" : "#2563eb"} />
                  </View>
                  <Text className="text-[15px] font-semibold text-foreground">
                    Medication Check
                  </Text>
                </View>

                <Text className="text-[13px] text-muted-foreground leading-relaxed">
                  Did you take your prescribed maintenance medications today?
                </Text>

                <View className="flex-row gap-3 mt-1">
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMedicationTaken(false);
                    }}
                    className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 border ${
                      medicationTaken === false
                        ? "bg-destructive/15 border-destructive/40"
                        : "bg-background/80 border-border"
                    }`}
                  >
                    <Feather
                      name="x-circle"
                      size={15}
                      color={medicationTaken === false ? "#ef4444" : (isDark ? "#94a3b8" : "#64748b")}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        medicationTaken === false ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      No, missed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMedicationTaken(true);
                    }}
                    className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 border ${
                      medicationTaken === true
                        ? "bg-success/15 border-success/40"
                        : "bg-background/80 border-border"
                    }`}
                  >
                    <Feather
                      name="check-circle"
                      size={15}
                      color={medicationTaken === true ? "#10b981" : (isDark ? "#94a3b8" : "#64748b")}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        medicationTaken === true ? "text-success font-bold" : "text-muted-foreground"
                      }`}
                    >
                      Yes, taken
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ============================================================== */}
          {/* STEP 2: SYMPTOMS */}
          {/* ============================================================== */}
          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(260)} layout={LinearTransition.duration(220)} className="gap-4">
              {/* ── Status Overview Summary ── */}
              <Animated.View layout={LinearTransition.duration(220)} className="bg-card rounded-2xl border border-border p-4 shadow-sm flex-row gap-3">
                <View className="flex-1 bg-background/70 border border-border rounded-xl p-3 items-center">
                  <Text className="text-2xl font-bold text-foreground">
                    {hasRealSymptoms ? selectedSymptoms.length : 0}
                  </Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                    Symptoms
                  </Text>
                </View>

                <View
                  className="flex-1 rounded-xl p-3 border items-center justify-center"
                  style={{
                    backgroundColor: hasRealSymptoms ? sevColor.bg : (isDark ? "rgba(15, 23, 42, 0.4)" : "#f8fafc"),
                    borderColor: hasRealSymptoms ? sevColor.border : (isDark ? "#1e293b" : "#e2e8f0"),
                  }}
                >
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: hasRealSymptoms ? sevColor.text : (isDark ? "#64748b" : "#94a3b8") }}
                  >
                    {hasRealSymptoms ? maxSeverity : "—"}
                  </Text>
                  <Text
                    className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                    style={{ color: hasRealSymptoms ? sevColor.text : (isDark ? "#64748b" : "#94a3b8") }}
                  >
                    {hasRealSymptoms ? getSeverityLabel(maxSeverity) : "Severity"}
                  </Text>
                </View>

                <View className="flex-1 bg-background/70 border border-border rounded-xl p-3 items-center justify-center">
                  <MaterialCommunityIcons
                    name={CONTEXT_ICONS[context] as any}
                    size={22}
                    color={isDark ? "#94a3b8" : "#64748b"}
                  />
                  <Text
                    className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 text-center"
                    numberOfLines={1}
                  >
                    {context.replace("While ", "").replace("During ", "")}
                  </Text>
                </View>
              </Animated.View>

              {/* ── Symptom Selection Cards ── */}
              <Animated.View
                layout={LinearTransition.duration(220)}
                className="bg-card rounded-2xl border border-border px-5 py-6 gap-3.5 shadow-md"
              >
                <Text className="text-[15px] font-semibold text-foreground mb-1">
                  What are you feeling?
                </Text>

                <View className="gap-2.5">
                  {SYMPTOMS.map((symp) => {
                    const isSelected = selectedSymptoms.includes(symp);
                    const isNone = symp === "None (Feeling fine)";

                    return (
                      <View key={symp} className="gap-2">
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => toggleSymptom(symp)}
                          className={`flex-row items-center px-4 py-3.5 rounded-xl border ${
                            isSelected
                              ? isNone
                                ? "bg-success/15 border-success/40"
                                : "bg-primary/10 border-primary"
                              : "bg-background/60 border-border"
                          }`}
                        >
                          <View
                            className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                              isSelected
                                ? isNone
                                  ? "bg-success/20"
                                  : "bg-primary/20"
                                : "bg-card border border-border"
                            }`}
                          >
                            <MaterialCommunityIcons
                              name={SYMPTOM_ICONS[symp] as any}
                              size={17}
                              color={
                                isSelected
                                  ? isNone
                                    ? "#10b981"
                                    : (isDark ? "#60a5fa" : "#2563eb")
                                  : (isDark ? "#94a3b8" : "#64748b")
                              }
                            />
                          </View>

                          <Text
                            className={`flex-1 text-sm font-semibold ${
                              isSelected
                                ? isNone
                                  ? "text-success font-bold"
                                  : "text-primary font-bold"
                                : "text-foreground"
                            }`}
                          >
                            {symp}
                          </Text>

                          {isSelected && (
                            <View
                              className={`w-5 h-5 rounded-full items-center justify-center ${
                                isNone ? "bg-success" : "bg-primary"
                              }`}
                            >
                              <Feather name="check" size={12} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Interactive Severity Slider for active symptom */}
                        {isSelected && !isNone && (
                          <SeveritySlider
                            value={severities[symp] || 1}
                            onChange={(val) =>
                              setSeverities((prev) => ({ ...prev, [symp]: val }))
                            }
                            isDark={isDark}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>

              {/* ── Context Selector ── */}
              {hasRealSymptoms && (
                <Animated.View
                  layout={LinearTransition.duration(220)}
                  className="bg-card rounded-2xl border border-border px-5 py-6 gap-3.5 shadow-md"
                >
                  <Text className="text-[15px] font-semibold text-foreground">
                    When did this happen?
                  </Text>

                  <View className="gap-2.5">
                    {CONTEXTS.map((ctx) => {
                      const isSelected = context === ctx;
                      return (
                        <TouchableOpacity
                          key={ctx}
                          activeOpacity={0.75}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setContext(ctx);
                          }}
                          className={`flex-row items-center px-4 py-3.5 rounded-xl border ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "bg-background/60 border-border"
                          }`}
                        >
                          <View
                            className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                              isSelected ? "bg-primary/20" : "bg-card border border-border"
                            }`}
                          >
                            <MaterialCommunityIcons
                              name={CONTEXT_ICONS[ctx] as any}
                              size={16}
                              color={isSelected ? (isDark ? "#60a5fa" : "#2563eb") : (isDark ? "#94a3b8" : "#64748b")}
                            />
                          </View>

                          <Text
                            className={`flex-1 text-sm font-semibold ${
                              isSelected ? "text-primary font-bold" : "text-foreground"
                            }`}
                          >
                            {ctx}
                          </Text>

                          <View
                            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                              isSelected ? "border-primary" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Bottom Action Bar ── */}
        <Animated.View
          layout={LinearTransition.duration(220)}
          className="bg-background/95 border-t border-border px-5 pt-3 gap-2.5"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "android" ? 10 : 4),
          }}
        >
          {/* Docked Emergency Warning Callout */}
          {step === 2 && isEmergency && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              exiting={FadeOutUp.duration(160)}
              className="bg-destructive/15 border border-destructive/40 rounded-2xl p-3.5 gap-2"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="alert-triangle" size={15} color="#ef4444" />
                  <Text className="text-xs font-bold text-destructive uppercase tracking-wide">
                    {isSevereHypotension
                      ? "Severe Hypotension (<90/60)"
                      : isHypertensiveCrisis
                      ? "Hypertensive Crisis (≥180/120)"
                      : "Elevated Risk Detected"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleLocateCardiologist}
                  activeOpacity={0.75}
                  className="bg-card px-2.5 py-1 rounded-lg border border-destructive/30 flex-row items-center gap-1"
                >
                  <MaterialCommunityIcons name="map-marker-radius" size={13} color="#ef4444" />
                  <Text className="text-[11px] font-bold text-destructive">
                    Find Cardiologist
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="text-[12px] text-destructive leading-snug font-medium">
                {isSevereHypotension
                  ? "Entered blood pressure indicates acute hypotension (<90/60 mmHg). Sit or lie down safely, hydrate, and seek medical attention if faint or symptomatic."
                  : isHypertensiveCrisis
                  ? "Entered blood pressure indicates an acute Hypertensive Crisis (≥180/120 mmHg). Rest for 5 mins and re-test. If sustained or symptoms worsen, call 911 immediately."
                  : "Clinical indicators suggest acute risk. Please seek medical evaluation immediately."}
              </Text>
            </Animated.View>
          )}

          {step === 1 ? (
            <View className="gap-2">
              {params.quick_entry === "true" && (
                <Button
                  label="Log Vitals Directly"
                  icon="check"
                  variant="outline"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                />
              )}
              <Button
                label="Next: Symptoms"
                icon="arrow-right"
                onPress={() => {
                  Haptics.selectionAsync();
                  setStep(2);
                }}
              />
            </View>
          ) : (
            <Button
              label={isEmergency ? "Submit Critical Log" : "Submit Health Log"}
              icon={isEmergency ? "alert-triangle" : "check"}
              onPress={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Saving log..."
              variant={isEmergency ? "destructive" : "primary"}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Emergency Guidance Modal for Acute Clinical Crisis (HL-ENG-17) */}
      <Modal
        visible={showEmergencyGuidanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEmergencyGuidanceModal(false);
          router.back();
        }}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-red-500 shadow-2xl">
            <View className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/80 items-center justify-center mb-4 self-center">
              <Feather name="alert-triangle" size={28} color="#dc2626" />
            </View>
            <Text className="text-[20px] font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">
              Critical Vitals Detected
            </Text>
            <Text className="text-[14px] text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-6 font-medium">
              {isSevereHypotension
                ? "Your blood pressure reading reflects acute hypotension (<90/60 mmHg). Please sit or lie down, hydrate, and seek medical assistance immediately."
                : isHypertensiveCrisis
                ? "Your blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg). Immediate emergency medical evaluation is strongly advised."
                : "Your clinical indicators reflect acute cardiac strain. Please seek emergency medical care immediately."}
            </Text>

            <View className="gap-3 w-full">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowEmergencyGuidanceModal(false);
                  router.replace("/locator" as any);
                }}
                className="w-full bg-red-600 py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
              >
                <Feather name="map-pin" size={16} color="#ffffff" />
                <Text className="text-white text-[14px] font-bold">
                  Find Nearby Emergency Hospital
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  Linking.openURL("tel:911").catch(() => {});
                }}
                className="w-full bg-slate-900 dark:bg-slate-800 py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Feather name="phone-call" size={16} color="#ffffff" />
                <Text className="text-white text-[14px] font-bold">
                  Call Emergency Services (911)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowEmergencyGuidanceModal(false);
                  router.back();
                }}
                className="w-full py-2.5 items-center justify-center mt-1"
              >
                <Text className="text-slate-400 dark:text-slate-500 text-[13px] font-semibold">
                  Acknowledge & Return to App
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
