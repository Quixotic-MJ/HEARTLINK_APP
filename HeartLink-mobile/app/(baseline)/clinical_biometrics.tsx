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
    alert("Dashboard in progress. Please wait until JM is done");
    // When ready to navigate, add your navigation logic here.
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-6 pt-2 pb-2 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#475569" />
        </TouchableOpacity>

        <View className="flex-1 items-center pr-8">
          <Text className="text-[14px] font-bold text-slate-400 tracking-widest uppercase">
            Step 4 of 4
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          /* Fixed: Explicit paddingBottom ensures nothing gets cut off */
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 120,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Main White Card Container */}
          <View className="bg-white mx-5 rounded-[32px] px-6 py-8 shadow-sm shadow-blue-900/5 mb-6">
            {/* Header Text */}
            <View className="mb-8">
              <Text className="text-[26px] font-black text-slate-900 tracking-tight mb-2">
                Clinical Baseline
              </Text>
              <Text className="text-[14px] text-slate-500 font-medium leading-relaxed pr-2">
                These medical metrics power our predictive engine. Please answer
                as accurately as possible.
              </Text>
            </View>

            {/* Optional Data UX Callout */}
            <View className="bg-amber-50 p-4 rounded-[20px] flex-row items-start mb-8 border border-amber-200/60 shadow-sm shadow-amber-900/5">
              <Feather
                name="info"
                size={18}
                color="#d97706"
                style={{ marginTop: 2 }}
              />
              <Text className="text-[12.5px] text-amber-800 ml-3 flex-1 leading-relaxed font-medium">
                Don't have recent lab results? That's okay! You can leave those
                fields blank and update your profile after your next clinic
                visit.
              </Text>
            </View>

            {/* 1. Core Vitals */}
            <View className="mb-8">
              <Text className="text-[15px] font-black text-slate-900 mb-4">
                Basic Vitals
              </Text>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Resting BP
                  </Text>
                  <View className="h-[52px] bg-[#f8fafc] border border-slate-200 rounded-[16px] flex-row items-center px-4">
                    <TextInput
                      value={restingBP}
                      onChangeText={setRestingBP}
                      placeholder="120"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                    />
                    <Text className="text-[12px] font-medium text-slate-400">
                      mm Hg
                    </Text>
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Max Heart Rate
                  </Text>
                  <View className="h-[52px] bg-[#f8fafc] border border-slate-200 rounded-[16px] flex-row items-center px-4">
                    <TextInput
                      value={maxHR}
                      onChangeText={setMaxHR}
                      placeholder="150"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                    />
                    <Text className="text-[12px] font-medium text-slate-400">
                      bpm
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Lab Results (Explicitly Optional) */}
            <View className="mb-10">
              <Text className="text-[15px] font-black text-slate-900 mb-4">
                Lab Results{" "}
                <Text className="text-slate-400 font-medium text-[12px]">
                  (Optional)
                </Text>
              </Text>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Fasting Blood Sugar
                  </Text>
                  <View className="h-[52px] bg-[#f8fafc] border border-slate-200 rounded-[16px] flex-row items-center px-4">
                    <TextInput
                      value={fastingBloodSugar}
                      onChangeText={setFastingBloodSugar}
                      placeholder="e.g. 95"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                    />
                    <Text className="text-[12px] font-medium text-slate-400">
                      mg/dl
                    </Text>
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Serum Cholesterol
                  </Text>
                  <View className="h-[52px] bg-[#f8fafc] border border-slate-200 rounded-[16px] flex-row items-center px-4">
                    <TextInput
                      value={cholesterol}
                      onChangeText={setCholesterol}
                      placeholder="e.g. 200"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                    />
                    <Text className="text-[12px] font-medium text-slate-400">
                      mg/dl
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Chest Pain Assessment (Translated from ML Jargon) */}
            <View className="mb-10">
              <Text className="text-[15px] font-black text-slate-900 mb-1">
                Chest Pain Assessment
              </Text>
              <Text className="text-[12px] text-slate-500 mb-4 pr-2">
                Select the description that best matches your typical
                experience.
              </Text>

              <View className="space-y-3">
                {[
                  {
                    id: 1,
                    label: "Classic Angina",
                    sub: "Pressure or squeezing during physical exertion or stress.",
                  },
                  {
                    id: 2,
                    label: "Atypical Pain",
                    sub: "Chest pain that does not fit the classic exertion pattern.",
                  },
                  {
                    id: 3,
                    label: "Non-Heart Related",
                    sub: "Sharp pain from breathing, muscles, or digestion.",
                  },
                  {
                    id: 4,
                    label: "No Chest Pain",
                    sub: "I do not experience any chest discomfort.",
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => setChestPainType(item.id)}
                    className="p-4 rounded-[20px] border flex-row items-center"
                    style={
                      chestPainType === item.id
                        ? { backgroundColor: "rgba(239,246,255,0.5)", borderColor: "#1e4ed8" }
                        : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                    }
                  >
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center mr-4"
                      style={{
                        borderColor: chestPainType === item.id ? "#1e4ed8" : "#cbd5e1",
                      }}
                    >
                      {chestPainType === item.id && (
                        <View className="w-2.5 h-2.5 rounded-full bg-[#1e4ed8]" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-[14px] mb-0.5"
                        style={{
                          color: chestPainType === item.id ? "#1e4ed8" : "#0f172a",
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        className="text-[12px] leading-relaxed"
                        style={{
                          color: chestPainType === item.id ? "rgba(29,78,216,0.7)" : "#64748b",
                        }}
                      >
                        {item.sub}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 4. Exercise Induced Angina */}
            <View className="mb-10">
              <Text className="text-[15px] font-black text-slate-900 mb-1">
                Exercise Assessment
              </Text>
              <Text className="text-[12px] text-slate-500 mb-4 pr-2">
                Do you experience chest pain or severe discomfort specifically
                when exercising?
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExerciseAngina("no")}
                  className="flex-1 h-[52px] rounded-[16px] flex-row items-center justify-center border"
                  style={
                    exerciseAngina === "no"
                      ? { backgroundColor: "#ecfdf5", borderColor: "#10b981" }
                      : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[14px]"
                    style={{
                      color: exerciseAngina === "no" ? "#047857" : "#64748b",
                    }}
                  >
                    No, I do not
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExerciseAngina("yes")}
                  className="flex-1 h-[52px] rounded-[16px] flex-row items-center justify-center border"
                  style={
                    exerciseAngina === "yes"
                      ? { backgroundColor: "#fff1f2", borderColor: "#f43f5e" }
                      : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[14px]"
                    style={{
                      color: exerciseAngina === "yes" ? "#be123c" : "#64748b",
                    }}
                  >
                    Yes, I do
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Final Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCompleteOnboarding}
              // Require only the symptoms to be filled to proceed. Numerics can be null.
              disabled={!chestPainType || !exerciseAngina}
              className="w-full h-14 rounded-[20px] flex-row justify-center items-center shadow-sm"
              style={{
                backgroundColor: chestPainType && exerciseAngina ? "#1e4ed8" : "#cbd5e1",
              }}
            >
              <MaterialCommunityIcons
                name="heart-pulse"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-bold text-[16px] ml-2">
                Complete Baseline
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Branding */}
          <View className="mt-2 mb-4">
            <Text className="text-center text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
              CTU - MAIN CAMPUS • CAPSTONE 2026
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
