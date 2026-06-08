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

// ─── Measure Input ────────────────────────────────────────────────────────────

function MeasureInput({
  value,
  onChangeText,
  placeholder = "0",
  unit,
  maxLength,
  keyboardType = "decimal-pad",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  unit: string;
  maxLength?: number;
  keyboardType?: any;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-xl flex-row items-center px-3.5"
      style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50 }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        keyboardType={keyboardType}
        maxLength={maxLength}
        className="flex-1 text-[16px] font-medium text-slate-900 h-full"
      />
      <Text className="text-[13px] text-slate-400 ml-1">{unit}</Text>
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function FieldLabel({ title }: { title: string }) {
  return (
    <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 ml-0.5">
      {title}
    </Text>
  );
}

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BiometricsStep1Screen() {
  const router = useRouter();

  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");

  const isReady = !!age && !!sex;

  const handleNext = () => {
    let finalHeightCm = heightCm;
    let finalWeightKg = weightKg;
    if (unitSystem === "imperial") {
      const totalIn = parseInt(heightFt || "0") * 12 + parseInt(heightIn || "0");
      finalHeightCm = (totalIn * 2.54).toFixed(2);
      finalWeightKg = (parseFloat(weightLbs || "0") * 0.453592).toFixed(2);
    }
    console.log("Biometrics:", { age, sex, height_cm: finalHeightCm, weight_kg: finalWeightKg });
    router.push("/lifestyle_habits");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 1 of 4
            </Text>
          </View>
        </View>
        <StepProgress current={1} total={4} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerClassName="px-5 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Page title */}
          <View className="mb-6">
            <Text className="text-[24px] font-medium text-slate-900 tracking-tight mb-1.5">
              Core biometrics
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              This data ensures your tracking algorithms are calibrated to your body.
            </Text>
          </View>

          {/* ── Age ── */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-3">
            <FieldLabel title="Biological age" />
            <View className="flex-row items-center gap-3">
              <View
                className="bg-slate-50 rounded-xl flex-row items-center px-3.5"
                style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50, width: 120 }}
              >
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  maxLength={3}
                  className="flex-1 text-[18px] font-medium text-slate-900 h-full"
                />
                <Text className="text-[13px] text-slate-400">yrs</Text>
              </View>
              <Text className="text-[12px] text-slate-400 flex-1 leading-relaxed">
                Used to calibrate risk thresholds for your age group.
              </Text>
            </View>
          </View>

          {/* ── Sex ── */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-3">
            <FieldLabel title="Biological sex" />
            <View className="flex-row gap-3">
              {/* Male — dynamic bg/border via style */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setSex("male")}
                className="flex-1 h-[52px] rounded-xl flex-row items-center justify-center border gap-2"
                style={{
                  backgroundColor: sex === "male" ? "#e6f1fb" : "#f8fafc",
                  borderColor: sex === "male" ? "#185fa5" : "#e2e8f0",
                }}
              >
                <MaterialCommunityIcons
                  name="gender-male"
                  size={18}
                  color={sex === "male" ? "#185fa5" : "#94a3b8"}
                />
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: sex === "male" ? "#185fa5" : "#64748b" }}
                >
                  Male
                </Text>
              </TouchableOpacity>

              {/* Female — dynamic bg/border via style */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setSex("female")}
                className="flex-1 h-[52px] rounded-xl flex-row items-center justify-center border gap-2"
                style={{
                  backgroundColor: sex === "female" ? "#fcebeb" : "#f8fafc",
                  borderColor: sex === "female" ? "#a32d2d" : "#e2e8f0",
                }}
              >
                <MaterialCommunityIcons
                  name="gender-female"
                  size={18}
                  color={sex === "female" ? "#a32d2d" : "#94a3b8"}
                />
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: sex === "female" ? "#a32d2d" : "#64748b" }}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Height & Weight ── */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-6">
            {/* Unit toggle */}
            <View className="flex-row bg-slate-100 rounded-xl p-1 mb-5 border border-slate-200/70">
              {(["metric", "imperial"] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setUnitSystem(u)}
                  className="flex-1 py-2 rounded-lg items-center"
                  style={
                    unitSystem === u
                      ? { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#e2e8f0" }
                      : undefined
                  }
                >
                  <Text
                    className="text-[12px] font-medium"
                    style={{ color: unitSystem === u ? "#0f172a" : "#94a3b8" }}
                  >
                    {u === "metric" ? "Metric (cm / kg)" : "Imperial (ft / lbs)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              {/* Height */}
              <View className="flex-1">
                <FieldLabel title="Height" />
                {unitSystem === "metric" ? (
                  <MeasureInput value={heightCm} onChangeText={setHeightCm} unit="cm" maxLength={5} />
                ) : (
                  <View className="flex-row gap-2">
                    <MeasureInput value={heightFt} onChangeText={setHeightFt} unit="ft" maxLength={1} keyboardType="number-pad" />
                    <MeasureInput value={heightIn} onChangeText={setHeightIn} unit="in" maxLength={2} keyboardType="number-pad" />
                  </View>
                )}
              </View>

              {/* Weight */}
              <View className="flex-1">
                <FieldLabel title="Weight" />
                <MeasureInput
                  value={unitSystem === "metric" ? weightKg : weightLbs}
                  onChangeText={unitSystem === "metric" ? setWeightKg : setWeightLbs}
                  placeholder="0.0"
                  unit={unitSystem === "metric" ? "kg" : "lbs"}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Helper note */}
            <View className="flex-row items-start gap-1.5 mt-3">
              <Feather name="info" size={11} color="#cbd5e1" style={{ marginTop: 1 }} />
              <Text className="text-[11px] text-slate-300 flex-1 leading-relaxed">
                Height and weight are used to compute your BMI baseline. Imperial values are auto-converted.
              </Text>
            </View>
          </View>

          {/* Next button — disabled state via style, not className */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            disabled={!isReady}
            className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
            style={{ backgroundColor: isReady ? "#0f172a" : "#e2e8f0" }}
          >
            <Text
              className="text-[14px] font-medium"
              style={{ color: isReady ? "#fff" : "#94a3b8" }}
            >
              Next step
            </Text>
            <Feather name="arrow-right" size={15} color={isReady ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}