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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Input Component ─────────────────────────────────────────────────────────

function MetricInput({
  value,
  onChangeText,
  placeholder,
  unit,
  maxLength = 3,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  unit?: string;
  maxLength?: number;
}) {
  return (
    <View
      className="flex-1 bg-slate-50 rounded-xl flex-row items-center px-3 border border-slate-200"
      style={{ height: 50 }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType="number-pad"
        maxLength={maxLength}
        className="flex-1 text-[16px] font-bold text-slate-900 h-full"
      />
      {unit && (
        <Text className="text-[12px] text-slate-400 font-medium ml-1">
          {unit}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DailyBiometricsScreen() {
  const router = useRouter();

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");

  const handleSave = () => {
    if (!systolic && !diastolic && !heartRate && !weight) {
      Alert.alert("Notice", "Please enter at least one metric to save.");
      return;
    }
    Alert.alert("Saved", "Today's biometrics have been recorded.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900">
            Symptom Log
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pb-12 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator equivalent (visual only) */}
          <View className="flex-row items-center mb-6">
            <Text className="text-[10px] uppercase font-bold tracking-wider text-slate-400 w-24">
              Daily Log: Step 1 of 3
            </Text>
            <View className="flex-1 h-1.5 bg-slate-200 rounded-full mx-3 overflow-hidden">
              <View className="w-1/3 h-full bg-[#1e4ed8] rounded-full" />
            </View>
            <Text className="text-[12px] font-bold text-[#1e4ed8]">33%</Text>
          </View>

          {/* Heading */}
          <View className="mb-6">
            <Text className="text-[26px] font-bold text-slate-900 tracking-tight">
              Today's Biometrics
            </Text>
            <Text className="text-[14px] text-slate-500 mt-1 leading-relaxed">
              Let's record your numbers for today.
            </Text>
          </View>

          {/* ── Blood Pressure ── */}
          <View className="mb-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100/50">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons name="heart" size={20} color="#dc2626" />
              <Text className="text-[15px] font-bold text-slate-800 ml-2">
                What is your current Blood Pressure?
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Systolic
                </Text>
                <MetricInput
                  value={systolic}
                  onChangeText={setSystolic}
                  placeholder="120"
                  unit="mmHg"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Diastolic
                </Text>
                <MetricInput
                  value={diastolic}
                  onChangeText={setDiastolic}
                  placeholder="80"
                  unit="mmHg"
                />
              </View>
            </View>
          </View>

          {/* ── Heart Rate ── */}
          <View className="mb-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100/50">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons
                name="heart-pulse"
                size={20}
                color="#1e4ed8"
              />
              <Text className="text-[15px] font-bold text-slate-800 ml-2">
                What is your resting Heart Rate right now?
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <MetricInput
                  value={heartRate}
                  onChangeText={setHeartRate}
                  placeholder="72"
                  unit="BPM"
                />
              </View>
              <View className="w-14 h-12 bg-blue-50 rounded-xl items-center justify-center border border-blue-100">
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={20}
                  color="#1e4ed8"
                />
              </View>
            </View>
          </View>

          {/* ── Weight ── */}
          <View className="mb-8 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100/50">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons
                name="scale-bathroom"
                size={20}
                color="#0f172a"
              />
              <Text className="text-[15px] font-bold text-slate-800 ml-2">
                How much did you weigh this morning?
              </Text>
            </View>
            <MetricInput
              value={weight}
              onChangeText={setWeight}
              placeholder="70.5"
              unit="kg"
              maxLength={5}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="w-full bg-[#1e4ed8] rounded-2xl py-4 flex-row justify-center items-center shadow-md shadow-blue-500/20"
          >
            <Text className="text-white text-[15px] font-bold">
              Save Biometrics
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
