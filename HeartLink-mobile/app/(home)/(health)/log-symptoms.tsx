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
import { ds, DsColors } from "../../../constants/theme";
import { useDs } from "../../../components/onboarding/useDs";
import { DsTextField } from "../../../components/onboarding/Controls";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { IconBadge } from "../../../components/onboarding/QuestionLayout";
import { TickBox } from "../../../components/food/FoodBits";
import { API_BASE_URL, apiFetch } from "../../../lib/api";
const base_url = API_BASE_URL;

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

/** Tinted tag colours: mint for mild, peach for moderate, rose with dark text for severe. */
function getSeverityColor(num: number, c: DsColors) {
  if (num <= 3) return { bg: c.mint, text: c.charcoal };
  if (num <= 6) return { bg: c.peach, text: c.warmText };
  return { bg: c.rose, text: c.ink };
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
  isTouched,
}: {
  value: number;
  onChange: (val: number) => void;
  isTouched?: boolean;
}) {
  const { c } = useDs();
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

  const sev = getSeverityColor(value, c);
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

  // Like the score ring: the line stays blue and the severity shows as a tinted tag.
  const primaryColor = c.line;

  return (
    <View className="gap-3 mt-1">
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1.5">
          <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>
            Intensity:
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>
            Level {value}
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.steel }}> /10</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: sev.bg }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: sev.text }}>
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
              backgroundColor: c.hairlineSoft,
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
                  <View key={i} style={{ width: 2, height: 4, backgroundColor: c.hairlineStrong, borderRadius: 1 }} />
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
              backgroundColor: c.canvas,
              borderWidth: 1.5,
              borderColor: c.hairlineStrong,
              alignItems: "center",
              justifyContent: "center",
            }, thumbStyle]}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isTouched === false ? c.danger : primaryColor }} />

            {isTouched === false && (
              <View style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger, borderWidth: 1, borderColor: c.canvas }} />
            )}
          </Animated.View>
        </View>
      </View>

      {/* Calibration Labels */}
      <View className="flex-row justify-between items-center px-1">
        <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>
          1 • Mild
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>
          5 • Moderate
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>
          10 • Severe
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LogSymptomsScreen() {
  const { c, isDark } = useDs();
  // A selected answer: sky tint with a blue border.
  const pick = (on: boolean) => ({ backgroundColor: on ? c.tint : c.canvas, borderColor: on ? c.line : c.hairline });
  const card = { backgroundColor: c.canvas, borderColor: c.hairline };
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    triggered_by_exercise_id?: string;
  }>();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergencyGuidanceModal, setShowEmergencyGuidanceModal] = useState(false);
  const [hasInterrupted, setHasInterrupted] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const [timestamp, setTimestamp] = useState("");
  const diastolicRef = useRef<TextInput>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [symptomsY, setSymptomsY] = useState(0);

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

  useEffect(() => {
    if (!userId || !token) return;
    
    let isMounted = true;
    const fetchLatestLog = async () => {
      try {
        const res = await apiFetch(`/api/health-logs/${userId}?page=1&page_size=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const body = await res.json();
          const items = body.data ?? body;
          if (items && items.length > 0) {
            const lastLog = items[0];
            const logDate = new Date(lastLog.logged_at);
            const today = new Date();
            const isToday = logDate.getDate() === today.getDate() && 
                            logDate.getMonth() === today.getMonth() && 
                            logDate.getFullYear() === today.getFullYear();
            
            if (isToday) {
              if (lastLog.systolic_bp) setSystolic(lastLog.systolic_bp.toString());
              if (lastLog.diastolic_bp) setDiastolic(lastLog.diastolic_bp.toString());
              if (lastLog.heart_rate_bpm) setHeartRate(lastLog.heart_rate_bpm.toString());
              if (lastLog.medication_taken !== undefined && lastLog.medication_taken !== null) setMedicationTaken(lastLog.medication_taken);
            }
            if (lastLog.weight_kg) setWeight(lastLog.weight_kg.toString());
          }
        }
      } catch (err) {
        console.warn("Autofill fetch failed", err);
      }
    };
    
    fetchLatestLog();
    return () => { isMounted = false; };
  }, [userId, token]);

  useEffect(() => {
    if (params.triggered_by_exercise_id && symptomsY > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: symptomsY, animated: true });
      }, 300);
    }
  }, [params.triggered_by_exercise_id, symptomsY]);

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

  useEffect(() => {
    if (isEmergency && !hasInterrupted) {
      setShowEmergencyGuidanceModal(true);
      setHasInterrupted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isEmergency, hasInterrupted]);

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
      const res = await apiFetch(`/api/health-logs/${userId}`, {
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
      if (hasInterrupted) {
        router.back();
      } else {
        setShowEmergencyGuidanceModal(true);
        setHasInterrupted(true);
      }
    } else {
      let comparisonStr = undefined;
      if (sys !== null && dia !== null) {
        try {
          const res = await apiFetch(`/api/health-logs/${userId}?page=1&page_size=1`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const body = await res.json();
            const logs = body.data ?? body;
            if (logs && logs.length > 0 && logs[0].systolic_bp && logs[0].diastolic_bp) {
              const prevSys = logs[0].systolic_bp;
              const prevDia = logs[0].diastolic_bp;
              const dirSys = sys < prevSys ? "down from" : (sys > prevSys ? "up from" : "steady with");
              const prevDate = new Date(logs[0].logged_at);
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
  const sevColor = getSeverityColor(maxSeverity, c);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Bar ── */}
      <View className="flex-row items-center px-5 pt-3 pb-1">
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.duration(240)} style={{ marginBottom: 24 }}>
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.tint, marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.onTint }}>DAILY CHECK-IN</Text>
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
              Log Health Data
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate, marginTop: 8 }}>
              Record today&apos;s cardiovascular vitals, medication status, and any symptoms.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(260)} className="gap-4">
            {/* ── Section 1: Vitals & Measurements ── */}
            <View className="gap-4">
              {/* Core Vitals Card */}
              <View style={[{ borderRadius: 12, borderWidth: 1, padding: 20, gap: 16 }, card]}>
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <IconBadge icon="pulse" tint="sky" size={36} />
                  <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>Cardiovascular Metrics</Text>
                </View>

                {/* Blood Pressure Row */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Blood Pressure</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <DsTextField
                        label="Systolic (SYS)"
                        unit="mmHg"
                        value={systolic}
                        onChangeText={(val) => {
                          setSystolic(val);
                          if (val.length === 3) diastolicRef.current?.focus();
                        }}
                        placeholder="120"
                        keyboardType="numeric"
                        maxLength={3}
                        returnKeyType="next"
                        onSubmitEditing={() => diastolicRef.current?.focus()}
                      />
                    </View>
                    <View className="flex-1">
                      <DsTextField
                        inputRef={diastolicRef}
                        label="Diastolic (DIA)"
                        unit="mmHg"
                        value={diastolic}
                        onChangeText={setDiastolic}
                        placeholder="80"
                        keyboardType="numeric"
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>

                {/* Heart Rate & Weight Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <DsTextField label="Heart Rate" unit="BPM" value={heartRate} onChangeText={setHeartRate} placeholder="72" keyboardType="numeric" maxLength={3} />
                  </View>
                  <View className="flex-1">
                    <DsTextField label="Weight" unit="kg" value={weight} onChangeText={setWeight} placeholder="70" keyboardType="numeric" maxLength={5} />
                  </View>
                </View>
              </View>

              {/* Medication Status Card */}
              <View style={[{ borderRadius: 12, borderWidth: 1, padding: 20, gap: 12 }, card]}>
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <IconBadge icon="check-circle-outline" tint="lavender" size={36} />
                  <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>Medication Check</Text>
                </View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
                  Did you take your prescribed maintenance medications today?
                </Text>
                <View className="flex-row gap-3 mt-1">
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => { Haptics.selectionAsync(); setMedicationTaken(false); }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: medicationTaken === false }}
                    className="flex-1 flex-row items-center justify-center gap-2"
                    style={[{ height: 56, borderRadius: 12, borderWidth: 1.5 }, pick(medicationTaken === false)]}
                  >
                    <Feather name="x-circle" size={16} color={medicationTaken === false ? c.onTint : c.slate} />
                    <Text style={{ fontSize: 15, fontWeight: "500", color: medicationTaken === false ? c.onTint : c.ink }}>No, missed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => { Haptics.selectionAsync(); setMedicationTaken(true); }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: medicationTaken === true }}
                    className="flex-1 flex-row items-center justify-center gap-2"
                    style={[{ height: 56, borderRadius: 12, borderWidth: 1.5 }, pick(medicationTaken === true)]}
                  >
                    <Feather name="check-circle" size={16} color={medicationTaken === true ? c.onTint : c.slate} />
                    <Text style={{ fontSize: 15, fontWeight: "500", color: medicationTaken === true ? c.onTint : c.ink }}>Yes, taken</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Section 2: Symptoms & Feelings ── */}
            <View className="gap-4 mt-2" onLayout={(e) => setSymptomsY(e.nativeEvent.layout.y)}>
              {/* Section Divider */}
              <View className="flex-row items-center gap-3 px-1">
                <View style={{ flex: 1, height: 1, backgroundColor: c.hairlineSoft }} />
                <View className="flex-row items-center gap-2">
                  <IconBadge icon="heart-outline" tint="rose" size={28} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }}>Symptoms & Feelings</Text>
                </View>
                <View style={{ flex: 1, height: 1, backgroundColor: c.hairlineSoft }} />
              </View>

              {/* Status Overview Summary */}
              <Animated.View layout={LinearTransition.duration(220)} className="flex-row gap-3 mt-2">
                <View style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: "center", backgroundColor: c.surface }}>
                  <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>{hasRealSymptoms ? selectedSymptoms.length : 0}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate, marginTop: 4 }}>Symptoms</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", backgroundColor: hasRealSymptoms ? sevColor.bg : c.surface }}>
                  <Text style={{ fontSize: 22, fontWeight: "600", color: hasRealSymptoms ? sevColor.text : c.steel }}>{hasRealSymptoms ? maxSeverity : "—"}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: hasRealSymptoms ? sevColor.text : c.slate, marginTop: 4 }}>{hasRealSymptoms ? getSeverityLabel(maxSeverity) : "Severity"}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surface }}>
                  <MaterialCommunityIcons name={CONTEXT_ICONS[context] as any} size={24} color={c.charcoal} style={{ marginBottom: 2 }} />
                  <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate, marginTop: 2, textAlign: "center" }} numberOfLines={1}>{context.replace("While ", "").replace("During ", "")}</Text>
                </View>
              </Animated.View>

              {/* Symptom Selection Cards */}
              <Animated.View layout={LinearTransition.duration(220)} className="gap-3 mt-2">
                <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink, marginTop: 4 }}>What are you feeling?</Text>
                <View className="gap-2">
                  {SYMPTOMS.map((symp) => {
                    const isSelected = selectedSymptoms.includes(symp);
                    const isNone = symp === "None (Feeling fine)";
                    return (
                      <View key={symp} style={[{ borderRadius: 12, borderWidth: 1.5 }, pick(isSelected)]}>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => toggleSymptom(symp)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isSelected }}
                          className="flex-row items-center px-4"
                          style={{ minHeight: 56 }}
                        >
                          <MaterialCommunityIcons name={SYMPTOM_ICONS[symp] as any} size={20} color={isSelected ? c.onTint : c.slate} style={{ marginRight: 12 }} />
                          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: isSelected ? c.onTint : c.ink }}>{symp}</Text>
                          <TickBox on={isSelected} />
                        </TouchableOpacity>
                        
                        {isSelected && !isNone && (
                          <View style={{ marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: c.canvas }}>
                            <SeveritySlider 
                              value={severities[symp] || 1} 
                              onChange={(val) => {
                                setSeverities((prev) => ({ ...prev, [symp]: val }));
                                setTouchedSeverities((prev) => ({ ...prev, [symp]: true }));
                              }} 
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
                <Animated.View layout={LinearTransition.duration(220)} className="gap-3 mt-2">
                  <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>When did this happen?</Text>
                  <View className="gap-2">
                    {CONTEXTS.map((ctx) => {
                      const isSelected = context === ctx;
                      return (
                        <TouchableOpacity 
                          key={ctx} 
                          activeOpacity={0.75} 
                          onPress={() => { Haptics.selectionAsync(); setContext(ctx); }} 
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          className="flex-row items-center px-4"
                          style={[{ minHeight: 56, borderRadius: 12, borderWidth: 1.5 }, pick(isSelected)]}
                        >
                          <MaterialCommunityIcons name={CONTEXT_ICONS[ctx] as any} size={20} color={isSelected ? c.onTint : c.slate} style={{ marginRight: 12 }} />
                          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: isSelected ? c.onTint : c.ink }}>{ctx}</Text>
                          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", borderColor: isSelected ? c.line : c.hairlineStrong }}>
                            {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.line }} />}
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
        <Animated.View layout={LinearTransition.duration(220)} className="px-5 pt-3 gap-2.5" style={{ backgroundColor: c.canvas, borderTopWidth: 1, borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "android" ? 10 : 4) }}>
          {/* Docked Emergency Warning — fixed-height container prevents jitter */}
          <View style={{ minHeight: isEmergency ? undefined : 0, overflow: "hidden" }}>
            {isEmergency && (
              <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(160)} style={{ backgroundColor: c.rose, borderRadius: 12, padding: 14, gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                    <Feather name="alert-triangle" size={16} color={c.danger} />
                    <Text style={{ flex: 1, flexShrink: 1, fontSize: 13, fontWeight: "600", color: c.ink }}>
                      {isSevereHypotension ? "Severe Hypotension (<90/60)" : isHypertensiveCrisis ? "Hypertensive Crisis (≥180/120)" : "Elevated Risk Detected"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleLocateCardiologist} activeOpacity={0.75} className="flex-row items-center gap-1" style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, backgroundColor: c.canvas }}>
                    <MaterialCommunityIcons name="map-marker-radius" size={14} color={c.danger} />
                    <Text style={{ fontSize: 13, fontWeight: "500", color: c.ink }}>Find Cardiologist</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, lineHeight: 18, color: c.charcoal }}>
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
      <Modal visible={showEmergencyGuidanceModal} transparent animationType="fade" onRequestClose={() => { setShowEmergencyGuidanceModal(false); }}>
        <View className="flex-1 justify-center items-center px-5" style={{ backgroundColor: "rgba(15,15,15,0.6)" }}>
          {/* Emergency: rose card, red icon, dark text (never red text on pink). */}
          <View className="w-full max-w-sm" style={{ backgroundColor: c.rose, borderRadius: 16, padding: 24 }}>
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 }}>
              <Feather name="alert-triangle" size={28} color={c.danger} />
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: "600", textAlign: "center", color: c.ink, marginBottom: 12 }}>This may be a medical{"\n"}emergency</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, textAlign: "center", color: c.charcoal, marginBottom: 24, paddingHorizontal: 8 }}>
              {isSevereHypotension
                ? "Your blood pressure reading reflects acute hypotension (<90/60 mmHg)."
                : isHypertensiveCrisis
                ? "Your blood pressure reading reflects an acute Hypertensive Crisis (≥180/120 mmHg)."
                : `You reported severe chest discomfort (${severities["Chest Discomfort / Tightness"] || 10}/10) ${context.toLowerCase().replace("during ", "while ")}. This combination can be a sign of a heart attack.`}
            </Text>

            <TouchableOpacity activeOpacity={0.85} onPress={() => { Linking.openURL("tel:911").catch(() => {}); }} className="w-full items-center justify-center mb-2" style={{ height: 52, borderRadius: 8, backgroundColor: ds.light.danger }}>
              <Text style={{ color: ds.light.onPrimary, fontSize: 16, fontWeight: "600" }}>Call Emergency Services</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 13, textAlign: "center", color: c.charcoal, marginBottom: 24 }}>This will dial your local emergency number</Text>

            <View style={{ backgroundColor: c.canvas, borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink, marginBottom: 6 }}>WHILE YOU WAIT</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                Sit or lie down. Stay calm. If prescribed, take aspirin only if advised by a doctor to do so. Do not drive yourself.
              </Text>
            </View>

            <TouchableOpacity activeOpacity={0.7} onPress={() => { setShowEmergencyGuidanceModal(false); }} className="w-full items-center justify-center" style={{ minHeight: 44 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", textDecorationLine: "underline", color: c.ink }}>I&apos;m safe — just logging this for later</Text>
            </TouchableOpacity>
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
