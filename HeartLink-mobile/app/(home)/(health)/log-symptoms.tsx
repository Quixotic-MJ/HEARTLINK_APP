import { useColorScheme } from "nativewind";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Switch,
  KeyboardAvoidingView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../../contexts/UserContext";
import { OfflineSyncService } from "../../../utils/OfflineSyncService";
import * as Haptics from "expo-haptics";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

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

// Icon map for each symptom
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

// ─── Severity colors ──────────────────────────────────────────────────────────

function getSeverityColor(num: number) {
  if (num <= 3) return { bg: "#eaf3de", border: "#c0dd97", text: "#3b6d11" };
  if (num <= 6) return { bg: "#faeeda", border: "#fac775", text: "#854f0b" };
  return { bg: "#fcebeb", border: "#f7c1c1", text: "#a32d2d" };
}

function getSeverityLabel(num: number) {
  if (num <= 3) return "Mild";
  if (num <= 6) return "Moderate";
  return "Severe";
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LogSymptomsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams<{ triggered_by_exercise_id?: string }>();
  const { userId } = useUser();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<1 | 2>(params.triggered_by_exercise_id ? 2 : 1);
  const [timestamp, setTimestamp] = useState("");

  // Step 1 State (Vitals)
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");
  const [medicationTaken, setMedicationTaken] = useState<boolean | null>(null);

  // Step 2 State (Symptoms)
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>(["None (Feeling fine)"]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const [context, setContext] = useState<ContextType>(
    params.triggered_by_exercise_id ? "During physical activity" : "While resting"
  );

  useEffect(() => {
    setTimestamp(
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
    hasRealSymptoms &&
    ((selectedSymptoms.includes("Chest Discomfort / Tightness") &&
      (severities["Chest Discomfort / Tightness"] || 1) >= 7) ||
      (selectedSymptoms.includes("Shortness of Breath") &&
        context === "While resting"));

  const handleLocateCardiologist = () => {
    Linking.openURL(
      "https://www.google.com/maps/search/Cardiologist+in+Cebu+City"
    ).catch(() => showToast({ title: "Error", message: "Could not open map application.", type: "error" }));
  };

  const handleSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const targetUrl = `${base_url}/api/health-logs/${userId}`;
    const payload = {
      systolic_bp: parseInt(systolic) || 0,
      diastolic_bp: parseInt(diastolic) || 0,
      heart_rate_bpm: parseInt(heartRate) || 0,
      weight_kg: parseFloat(weight) || 0,
      medication_taken: medicationTaken || false,
      symptoms: selectedSymptoms,
      severity_map: severities,
      context: context,
      triggered_by_exercise_id: params.triggered_by_exercise_id || null,
      notes: "",
    };

    // Optimistic UI: Immediately give feedback and return to dashboard
    if (isEmergency) {
      showToast({ 
        title: "Critical log submitted", 
        message: "Your clinical indicators reflect an elevated risk. Please seek medical attention immediately.", 
        type: "error",
        duration: 5000 
      });
      router.back();
    } else {
      showToast({ 
        title: "Health log submitted", 
        message: "Your symptom and vitals log has been saved to your weekly wrap-up.", 
        type: "success" 
      });
      router.back();
    }

    // Run the API request silently in the background
    (async () => {
      try {
        if (params.pending_exercise) {
          try {
            const exercisePayload = JSON.parse(decodeURIComponent(params.pending_exercise as string));
            const exUrl = `${base_url}/api/exercises/logs/${userId}`;
            await fetch(exUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(exercisePayload),
            });
          } catch (e) {
            console.warn("Failed to log pending exercise", e);
          }
        }

        const res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save log");
      } catch (err) {
        console.warn("Network error during silent submission. Queuing log for offline sync...", err);
        await OfflineSyncService.queueRequest(targetUrl, "POST", payload);
      }
    })();
  };

  const maxSeverity = hasRealSymptoms ? Math.max(...selectedSymptoms.map(s => severities[s] || 1)) : 1;
  const sevColor = getSeverityColor(maxSeverity);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 z-10 border-b border-slate-200 dark:border-slate-800/50">
        <TouchableOpacity
          onPress={() => step === 2 ? setStep(1) : router.back()}
          className="p-2 -ml-2 mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">
            Daily Log
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">
            Step {step} of 2 • {timestamp}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerClassName="px-5 pb-32 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* ============================================================== */}
          {/* STEP 1: VITALS */}
          {/* ============================================================== */}
          {step === 1 && (
            <>
              <Text className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-5">
                Let's start with the numbers. Please record your basic vitals and medication status.
              </Text>

              {/* 1. Core Vitals */}
              <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 leading-snug">
                  Basic Vitals
                </Text>

                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Blood Pressure (SYS)
                    </Text>
                    <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                      <TextInput
                        value={systolic}
                        onChangeText={setSystolic}
                        placeholder="120"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={3}
                        className="flex-1 text-[14px] text-slate-900 dark:text-white h-full"
                      />
                      <Text className="text-[11px] text-slate-400">mmHg</Text>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Blood Pressure (DIA)
                    </Text>
                    <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                      <TextInput
                        value={diastolic}
                        onChangeText={setDiastolic}
                        placeholder="80"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={3}
                        className="flex-1 text-[14px] text-slate-900 dark:text-white h-full"
                      />
                      <Text className="text-[11px] text-slate-400">mmHg</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Heart Rate
                    </Text>
                    <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                      <TextInput
                        value={heartRate}
                        onChangeText={setHeartRate}
                        placeholder="72"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={3}
                        className="flex-1 text-[14px] text-slate-900 dark:text-white h-full"
                      />
                      <Text className="text-[11px] text-slate-400">bpm</Text>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Weight
                    </Text>
                    <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                      <TextInput
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="70"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        maxLength={3}
                        className="flex-1 text-[14px] text-slate-900 dark:text-white h-full"
                      />
                      <Text className="text-[11px] text-slate-400">kg</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. Medication Status */}
              <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-3 leading-snug">
                  Medication Check
                </Text>
                <Text className="text-[13px] text-slate-400 mb-4">
                  Did you take your prescribed maintenance medication today?
                </Text>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setMedicationTaken(false)}
                    className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                    style={
                      medicationTaken === false
                        ? { backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }
                        : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                    }
                  >
                    <Text
                      className="font-medium text-[13px]"
                      style={{ color: medicationTaken === false ? "#a32d2d" : "#64748b" }}
                    >
                      No
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setMedicationTaken(true)}
                    className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                    style={
                      medicationTaken === true
                        ? { backgroundColor: "#eaf3de", borderColor: "#c0dd97" }
                        : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                    }
                  >
                    <Text
                      className="font-medium text-[13px]"
                      style={{ color: medicationTaken === true ? "#3b6d11" : "#64748b" }}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ============================================================== */}
          {/* STEP 2: SYMPTOMS */}
          {/* ============================================================== */}
          {step === 2 && (
            <>
              {/* ── Emergency Banner ── */}
              {isEmergency && (
                <View
                  className="rounded-2xl p-4 mb-5 border"
                  style={{ backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <Feather name="alert-triangle" size={16} color="#a32d2d" />
                    <Text
                      className="text-[13px] font-medium uppercase tracking-wide"
                      style={{ color: "#a32d2d" }}
                    >
                      Elevated risk detected
                    </Text>
                  </View>
                  <Text
                    className="text-[13px] leading-relaxed mb-3"
                    style={{ color: "#791f1f" }}
                  >
                    Your symptoms suggest an acute cardiovascular event. Please seek
                    immediate medical evaluation.
                  </Text>
                  <TouchableOpacity
                    onPress={handleLocateCardiologist}
                    activeOpacity={0.8}
                    className="bg-white dark:bg-slate-900 rounded-xl py-2.5 flex-row items-center justify-center gap-2 border border-red-100"
                  >
                    <MaterialCommunityIcons
                      name="map-marker-radius"
                      size={16}
                      color="#a32d2d"
                    />
                    <Text
                      className="text-[13px] font-medium"
                      style={{ color: "#a32d2d" }}
                    >
                      Find cardiologist in Cebu City
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Status overview card ── */}
              <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
                <Text className="text-white font-medium text-[16px]">
                  {isSubmitting ? "Submitting..." : "Submit Daily Log"}
                </Text>
                <View className="flex-row gap-3">
                  {/* Symptom count */}
                  <View className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800/70 items-center">
                    <Text className="text-[22px] font-medium text-slate-900 dark:text-white">
                      {hasRealSymptoms ? selectedSymptoms.length : 0}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                      Symptoms
                    </Text>
                  </View>
                  {/* Severity */}
                  <View
                    className="flex-1 rounded-xl p-3 border items-center"
                    style={{
                      backgroundColor: hasRealSymptoms ? sevColor.bg : "#f8fafc",
                      borderColor: hasRealSymptoms ? sevColor.border : "#e2e8f0",
                    }}
                  >
                    <Text
                      className="text-[22px] font-medium"
                      style={{ color: hasRealSymptoms ? sevColor.text : "#cbd5e1" }}
                    >
                      {hasRealSymptoms ? maxSeverity : "—"}
                    </Text>
                    <Text
                      className="text-[10px] mt-0.5 uppercase tracking-wide"
                      style={{ color: hasRealSymptoms ? sevColor.text : "#cbd5e1" }}
                    >
                      {hasRealSymptoms ? getSeverityLabel(maxSeverity) : "Severity"}
                    </Text>
                  </View>
                  {/* Context */}
                  <View className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800/70 items-center">
                    <MaterialCommunityIcons
                      name={CONTEXT_ICONS[context] as any}
                      size={22}
                      color="#64748b"
                    />
                    <Text
                      className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide text-center"
                      numberOfLines={2}
                    >
                      {context.replace("During ", "")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Symptoms ── */}
              <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 leading-snug">
                What are you feeling?
              </Text>

              <View className="gap-3">
                {SYMPTOMS.map((symp) => {
                  const isSelected = selectedSymptoms.includes(symp);
                  const isNone = symp === "None (Feeling fine)";

                  const bg = isSelected ? (isNone ? "#eaf3de" : "#0f172a") : "#fff";
                  const border = isSelected
                    ? isNone
                      ? "#c0dd97"
                      : "#0f172a"
                    : "#e2e8f0";
                  const textColor = isSelected
                    ? isNone
                      ? "#3b6d11"
                      : "#fff"
                    : "#475569";
                  const iconColor = isSelected
                    ? isNone
                      ? "#3b6d11"
                      : "#fff"
                    : "#94a3b8";

                  return (
                    <View key={symp} className="mb-1">
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => toggleSymptom(symp)}
                        className="flex-row items-center px-4 py-3.5 rounded-xl border"
                        style={{ backgroundColor: bg, borderColor: border }}
                      >
                        <View
                          className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                          style={{
                            backgroundColor: isSelected
                              ? "rgba(255,255,255,0.12)"
                              : "#f8fafc",
                          }}
                        >
                          <MaterialCommunityIcons
                            name={SYMPTOM_ICONS[symp] as any}
                            size={17}
                            color={iconColor}
                          />
                        </View>
                        <Text
                          className="flex-1 text-[14px] font-medium"
                          style={{ color: textColor }}
                        >
                          {symp}
                        </Text>
                        {isSelected && (
                          <View
                            className="w-5 h-5 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: isNone
                                ? "#c0dd97"
                                : "rgba(255,255,255,0.2)",
                            }}
                          >
                            <Feather
                              name="check"
                              size={11}
                              color={isNone ? "#3b6d11" : "#fff"}
                            />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Dropdown severity slider underneath active symptom */}
                      {isSelected && !isNone && (
                        <View className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/70 p-4 mt-2 mb-1">
                          <View className="flex-row justify-between mb-3">
                            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
                              1 — Mild
                            </Text>
                            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
                              10 — Severe
                            </Text>
                          </View>

                          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerClassName="gap-2"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                              const currentSeverity = severities[symp] || 1;
                              const isActive = currentSeverity === num;
                              const c = getSeverityColor(num);
                              return (
                                <TouchableOpacity
                                  key={num}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    setSeverities(prev => ({ ...prev, [symp]: num }));
                                  }}
                                  className="w-11 h-11 rounded-xl items-center justify-center border"
                                  style={{
                                    backgroundColor: isActive ? c.bg : "#f8fafc",
                                    borderColor: isActive ? c.border : "#e2e8f0",
                                  }}
                                >
                                  <Text
                                    className="text-[16px] font-medium"
                                    style={{ color: isActive ? c.text : "#94a3b8" }}
                                  >
                                    {num}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* ── Context ── */}
              {hasRealSymptoms && (
                <>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white mt-6 mb-4 leading-snug">
                    When did this happen?
                  </Text>
                  <View className="gap-2 mb-8">
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
                          className="flex-row items-center px-4 py-3.5 rounded-xl border"
                          style={{
                            backgroundColor: isSelected ? "#0f172a" : "#fff",
                            borderColor: isSelected ? "#0f172a" : "#e2e8f0",
                          }}
                        >
                          <View
                            className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(255,255,255,0.1)"
                                : "#f8fafc",
                            }}
                          >
                            <MaterialCommunityIcons
                              name={CONTEXT_ICONS[ctx] as any}
                              size={16}
                              color={isSelected ? "#fff" : "#94a3b8"}
                            />
                          </View>
                          <Text
                            className="flex-1 text-[14px] font-medium"
                            style={{ color: isSelected ? "#fff" : "#475569" }}
                          >
                            {ctx}
                          </Text>
                          {/* Radio indicator */}
                          <View
                            className="w-5 h-5 rounded-full border-2 items-center justify-center"
                            style={{
                              borderColor: isSelected
                                ? "rgba(255,255,255,0.4)"
                                : "#e2e8f0",
                            }}
                          >
                            {isSelected && (
                              <View
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: "#fff" }}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/70 px-5 pt-3 pb-8">
         {step === 1 ? (
           <TouchableOpacity
             activeOpacity={0.8}
             onPress={() => setStep(2)}
             className="w-full py-3.5 rounded-xl flex-row justify-center items-center bg-slate-900"
           >
             <Text className="font-medium text-[14px] mr-2 text-white">
               Next: Symptoms
             </Text>
             <Feather name="arrow-right" size={16} color="white" />
           </TouchableOpacity>
         ) : (
           <TouchableOpacity
             onPress={handleSubmit}
             activeOpacity={0.85}
             disabled={isSubmitting}
             className="w-full rounded-xl py-3.5 flex-row items-center justify-center gap-2"
             style={{ backgroundColor: isEmergency ? "#a32d2d" : "#0f172a", opacity: isSubmitting ? 0.8 : 1 }}
           >
             {isSubmitting ? (
               <ActivityIndicator size="small" color="#fff" />
             ) : (
               <>
                 <Feather
                   name={isEmergency ? "alert-triangle" : "check"}
                   size={16}
                   color="#fff"
                 />
                 <Text className="text-white text-[14px] font-medium">
                   {isEmergency ? "Submit critical log" : "Submit health log"}
                 </Text>
               </>
             )}
           </TouchableOpacity>
         )}
      </View>
    </SafeAreaView>
  );
}
