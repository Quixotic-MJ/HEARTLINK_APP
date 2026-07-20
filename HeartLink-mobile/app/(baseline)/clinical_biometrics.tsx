import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// ─── Step Progress ────────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className="flex-1 h-1 rounded-full"
          style={{ backgroundColor: i < current ? "#0f172a" : "#e2e8f0" }}
        />
      ))}
    </View>
  );
}

export default function BiometricsStep4Screen() {

  const router = useRouter()
  const { user_id } = useLocalSearchParams();
  const base_url = process.env.EXPO_PUBLIC_API_URL;
  // Clinical History
  const [diagnosedConditions, setDiagnosedConditions] = useState<string[]>([]);
  const [takingMedication, setTakingMedication] = useState<boolean | null>(null);
  const conditionOptions = ["Hypertension", "Arrhythmia", "Diabetes", "High Cholesterol", "None"];

  const toggleCondition = (condition: string) => {
    if (condition === "None") {
      setDiagnosedConditions(["None"]);
      return;
    }
    let newConditions = diagnosedConditions.includes("None") ? [] : [...diagnosedConditions];
    if (newConditions.includes(condition)) {
      newConditions = newConditions.filter(c => c !== condition);
    } else {
      newConditions.push(condition);
    }
    setDiagnosedConditions(newConditions);
  };

  // Vitals State (Ideal if known, but ML can impute/handle)
  const [restingBP, setRestingBP] = useState("");
  const [maxHR, setMaxHR] = useState("");

  // Lab Results State (Explicitly Optional for UX)
  const [fastingBloodSugar, setFastingBloodSugar] = useState("");
  const [cholesterol, setCholesterol] = useState("");

  // Symptom State (Required for baseline)
  const [chestPainType, setChestPainType] = useState(null);
  const [exerciseAngina, setExerciseAngina] = useState(null); // 'yes' or 'no'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompleteOnboarding = async () => {
    const payload = {
      diagnosed_conditions: diagnosedConditions,
      on_medication: takingMedication,
      resting_bp_mmhg: restingBP ? parseInt(restingBP) : null,
      max_heart_rate_bpm: maxHR ? parseInt(maxHR) : null,
      fasting_blood_sugar: fastingBloodSugar
        ? parseInt(fastingBloodSugar) > 120 ? 1 : 0
        : null,
      serum_cholesterol: cholesterol ? parseInt(cholesterol) : null,
      chest_pain_type: chestPainType,
      exercise_angina: exerciseAngina === "yes" ? 1 : 0,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${base_url}/api/users/${user_id}/baseline/clinical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("Clinical saved — onboarding complete:", data.message);
        router.replace("/(baseline)/calculating");
      } else {
        Alert.alert("Error", data.detail || "Failed to save clinical data");
      }
    } catch (error) {
      console.log("Clinical save error:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 z-10">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 5 of 5
            </Text>
          </View>
        </View>
        <StepProgress current={5} total={5} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pb-12 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Page title */}
          <View className="mb-6">
            <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-1.5">
              Clinical Baseline
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              These clinical markers directly power our predictive risk algorithms. Accurate values yield better foresight.
            </Text>
          </View>

          {/* Optional Data UX Callout */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5 flex-row items-start gap-3">
             <Feather name="info" size={18} color="#d97706" style={{ marginTop: 2 }} />
             <Text className="text-[13px] text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">
                Don't have recent lab results? That's okay! You can leave those
                fields blank and update your profile later.
             </Text>
          </View>

          {/* 0. Clinical History */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-1 leading-snug">
              Clinical History
            </Text>
            <Text className="text-[13px] text-slate-400 mb-4">
              Select any conditions you have been diagnosed with.
            </Text>

            <View className="flex-row flex-wrap gap-1.5 mb-5">
              {conditionOptions.map((cond) => {
                const isSelected = diagnosedConditions.includes(cond);
                return (
                  <TouchableOpacity
                    key={cond}
                    onPress={() => toggleCondition(cond)}
                    activeOpacity={0.7}
                    className="px-2 py-1 rounded-md border"
                    style={{
                      backgroundColor: isSelected ? "#eaf3de" : "#f8fafc",
                      borderColor: isSelected ? "#c0dd97" : "#e2e8f0"
                    }}
                  >
                    <Text
                      className="text-[11px] uppercase tracking-wide font-medium"
                      style={{ color: isSelected ? "#3b6d11" : "#94a3b8" }}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[14px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-3">
              Currently taking maintenance medication?
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setTakingMedication(false)}
                className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                style={
                  takingMedication === false
                    ? { backgroundColor: "#0f172a", borderColor: "#0f172a" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: takingMedication === false ? "#fff" : "#64748b" }}
                >
                  No
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setTakingMedication(true)}
                className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                style={
                  takingMedication === true
                    ? { backgroundColor: "#0f172a", borderColor: "#0f172a" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: takingMedication === true ? "#fff" : "#64748b" }}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 1. Core Vitals */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-4 leading-snug">
              Basic Vitals
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Resting BP
                </Text>
                <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={restingBP}
                    onChangeText={setRestingBP}
                    placeholder="120"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mm Hg
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Max Heart Rate
                </Text>
                <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={maxHR}
                    onChangeText={setMaxHR}
                    placeholder="150"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    bpm
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Lab Results */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <View className="flex-row items-center justify-between mb-4">
               <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug">
                 Lab Results
               </Text>
               <View className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                  <Text className="text-[9px] uppercase tracking-wide text-slate-400">Optional</Text>
               </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Fasting Blood Sugar
                </Text>
                <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={fastingBloodSugar}
                    onChangeText={setFastingBloodSugar}
                    placeholder="95"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mg/dl
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Serum Cholesterol
                </Text>
                <View className="h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={cholesterol}
                    onChangeText={setCholesterol}
                    placeholder="200"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 dark:text-white dark:text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mg/dl
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Chest Pain Assessment */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-1 leading-snug">
              Chest Pain Assessment
            </Text>
            <Text className="text-[13px] text-slate-400 mb-4">
              Select the description that best matches your typical experience.
            </Text>

            <View className="space-y-2">
              {[
                { id: 1, label: "Classic Angina", sub: "Pressure or squeezing during exertion/stress." },
                { id: 2, label: "Atypical Pain", sub: "Chest pain not fitting classic patterns." },
                { id: 3, label: "Non-Heart Related", sub: "Sharp pain from breathing or muscles." },
                { id: 4, label: "No Chest Pain", sub: "I do not experience chest discomfort." },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => setChestPainType(item.id)}
                  className="p-3 rounded-xl border flex-row items-center mb-2"
                  style={
                    chestPainType === item.id
                      ? { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }
                      : { backgroundColor: "#fff", borderColor: "#e2e8f0" }
                  }
                >
                  <View
                    className="w-4 h-4 rounded-full border items-center justify-center mr-3"
                    style={{ borderColor: chestPainType === item.id ? "#0f172a" : "#cbd5e1" }}
                  >
                    {chestPainType === item.id && (
                      <View className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-medium text-[13px] mb-0.5"
                      style={{ color: chestPainType === item.id ? "#0f172a" : "#334155" }}
                    >
                      {item.label}
                    </Text>
                    <Text className="text-[11px] text-slate-400">
                      {item.sub}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 4. Exercise Induced Angina */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-1 leading-snug">
              Exercise Assessment
            </Text>
            <Text className="text-[13px] text-slate-400 mb-4">
              Do you experience chest pain when exercising?
            </Text>

            <View className="flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExerciseAngina("no")}
                className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                style={
                  exerciseAngina === "no"
                    ? { backgroundColor: "#eaf3de", borderColor: "#c0dd97" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: exerciseAngina === "no" ? "#3b6d11" : "#64748b" }}
                >
                  No, I do not
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExerciseAngina("yes")}
                className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border"
                style={
                  exerciseAngina === "yes"
                    ? { backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: exerciseAngina === "yes" ? "#a32d2d" : "#64748b" }}
                >
                  Yes, I do
                </Text>
              </TouchableOpacity>
            </View>

            {/* Next button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCompleteOnboarding}
              disabled={!chestPainType || !exerciseAngina || takingMedication === null || diagnosedConditions.length === 0 || isSubmitting}
              className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2 mt-4"
              style={{ backgroundColor: chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#0f172a" : "#e2e8f0", opacity: isSubmitting ? 0.8 : 1 }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text
                    className="text-[14px] font-medium"
                    style={{ color: chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#fff" : "#94a3b8" }}
                  >
                    Complete setup
                  </Text>
                  <Feather name="check" size={15} color={chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#fff" : "#94a3b8"} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
