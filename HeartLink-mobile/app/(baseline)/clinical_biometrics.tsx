import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function BiometricsStep4Screen() {

  const router = useRouter()
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

  // Form submission handler
  const handleCompleteOnboarding = () => {
    // Format the payload matching the Cleveland dataset requirements
    // Nullifying empty optional fields so the backend DB handles them gracefully
    const payload = {
      diagnosed_conditions: diagnosedConditions,
      medication_status: takingMedication,
      trestbps: restingBP ? parseInt(restingBP) : null, // Resting Blood Pressure
      thalach: maxHR ? parseInt(maxHR) : null, // Maximum Heart Rate
      fbs: fastingBloodSugar
        ? parseInt(fastingBloodSugar) > 120
          ? 1
          : 0
        : null, // Fasting Blood Sugar > 120 mg/dl
      chol: cholesterol ? parseInt(cholesterol) : null, // Serum Cholesterol
      cp: chestPainType, // Chest Pain Type (1-4)
      exang: exerciseAngina === "yes" ? 1 : 0, // Exercise Induced Angina
    };

    console.log("SUCCESS! Saving ML Clinical Baseline:", payload);
    router.push('/(home)/(tabs)/dashboard')
    // When ready to navigate, add your navigation logic here.
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-5 pt-4 pb-2 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Clinical Baseline
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">
            Step 4 of 4 • Predictive metrics
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pb-32 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Optional Data UX Callout */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5 flex-row items-start gap-3">
             <Feather name="info" size={18} color="#d97706" style={{ marginTop: 2 }} />
             <Text className="text-[13px] text-slate-500 flex-1 leading-relaxed">
                Don't have recent lab results? That's okay! You can leave those
                fields blank and update your profile later.
             </Text>
          </View>

          {/* 0. Clinical History */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-1 leading-snug">
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

            <Text className="text-[14px] font-medium text-slate-900 mb-3">
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
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-4 leading-snug">
              Basic Vitals
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 mb-2">
                  Resting BP
                </Text>
                <View className="h-[44px] bg-slate-50 border border-slate-200/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={restingBP}
                    onChangeText={setRestingBP}
                    placeholder="120"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mm Hg
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 mb-2">
                  Max Heart Rate
                </Text>
                <View className="h-[44px] bg-slate-50 border border-slate-200/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={maxHR}
                    onChangeText={setMaxHR}
                    placeholder="150"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    bpm
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Lab Results */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <View className="flex-row items-center justify-between mb-4">
               <Text className="text-[15px] font-medium text-slate-900 leading-snug">
                 Lab Results
               </Text>
               <View className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                  <Text className="text-[9px] uppercase tracking-wide text-slate-400">Optional</Text>
               </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 mb-2">
                  Fasting Blood Sugar
                </Text>
                <View className="h-[44px] bg-slate-50 border border-slate-200/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={fastingBloodSugar}
                    onChangeText={setFastingBloodSugar}
                    placeholder="95"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mg/dl
                  </Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-medium text-slate-500 mb-2">
                  Serum Cholesterol
                </Text>
                <View className="h-[44px] bg-slate-50 border border-slate-200/70 rounded-xl flex-row items-center px-3">
                  <TextInput
                    value={cholesterol}
                    onChangeText={setCholesterol}
                    placeholder="200"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={3}
                    className="flex-1 text-[14px] text-slate-900 h-full"
                  />
                  <Text className="text-[11px] text-slate-400">
                    mg/dl
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Chest Pain Assessment */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-1 leading-snug">
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
                      <View className="w-2 h-2 rounded-full bg-slate-900" />
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
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-1 leading-snug">
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
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200/70 px-5 pt-3 pb-8">
         <TouchableOpacity
           activeOpacity={0.8}
           onPress={handleCompleteOnboarding}
           disabled={!chestPainType || !exerciseAngina || takingMedication === null || diagnosedConditions.length === 0}
           className="w-full py-3.5 rounded-xl flex-row justify-center items-center"
           style={{
             backgroundColor: chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#0f172a" : "#e2e8f0",
           }}
         >
           <Feather name="check" size={16} color={chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#fff" : "#94a3b8"} className="mr-2" />
           <Text className="font-medium text-[14px]" style={{ color: chestPainType && exerciseAngina && takingMedication !== null && diagnosedConditions.length > 0 ? "#fff" : "#94a3b8" }}>
             Complete Baseline
           </Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
