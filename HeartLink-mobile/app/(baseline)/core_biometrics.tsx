import { useColorScheme } from "nativewind";
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
import DateTimePicker from "@react-native-community/datetimepicker";

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
      className="flex-1 bg-white dark:bg-slate-900 rounded-xl flex-row items-center px-3.5"
      style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50 }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        keyboardType={keyboardType}
        maxLength={maxLength}
        className="flex-1 text-[16px] font-medium text-slate-900 dark:text-white h-full"
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user_id, health_goals } = useLocalSearchParams();
  const base_url = process.env.EXPO_PUBLIC_API_URL;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from existing profile data
  React.useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`${base_url}/api/users/${user_id}/profile`);
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.profile;
        if (!p) return;
        if (p.first_name) setFirstName(p.first_name);
        if (p.last_name) setLastName(p.last_name);
        if (p.date_of_birth) {
          try { setBirthDate(new Date(p.date_of_birth)); } catch {}
        }
        if (p.sex) setSex(p.sex);
        if (p.height_cm) setHeightCm(String(p.height_cm));
        if (p.weight_kg) setWeightKg(String(p.weight_kg));
      } catch (e) {
        // Silently fail — fields stay empty
      }
    }
    if (user_id) loadExisting();
  }, [user_id]);

  const isReady = !!firstName && !!birthDate && !!sex;

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleNext = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${base_url}/api/users/${user_id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: birthDate?.toISOString().split("T")[0],
          sex: sex,
          height_cm: parseFloat(heightCm) || 0,
          weight_kg: parseFloat(weightKg) || 0,
          health_goals: health_goals ? JSON.parse(health_goals as string) : [],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Profile saved:", data.message);
        router.push({
          pathname: "/lifestyle_habits",
          params: { user_id: user_id as string },
        });
      } else {
        Alert.alert("Error", data.detail || "Failed to save profile");
      }
    } catch (error) {
      console.log("Profile save error:", error);
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 2 of 5
            </Text>
          </View>
        </View>
        <StepProgress current={2} total={5} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerClassName="px-5 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Page title */}
          <View className="mb-6">
            <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-1.5">
              Core biometrics
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              This data ensures your tracking algorithms are calibrated to your body.
            </Text>
          </View>

          {/* ── Name ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FieldLabel title="First Name" />
                <View
                  className="bg-slate-50 dark:bg-slate-950 rounded-xl flex-row items-center px-3.5"
                  style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50 }}
                >
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="John"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 text-[16px] font-medium text-slate-900 dark:text-white h-full"
                  />
                </View>
              </View>
              <View className="flex-1">
                <FieldLabel title="Last Name (Optional)" />
                <View
                  className="bg-slate-50 dark:bg-slate-950 rounded-xl flex-row items-center px-3.5"
                  style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50 }}
                >
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 text-[16px] font-medium text-slate-900 dark:text-white h-full"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Date of Birth ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <FieldLabel title="Date of Birth" />
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                className="bg-slate-50 dark:bg-slate-950 rounded-xl flex-row items-center justify-between px-3.5"
                style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50, width: 150 }}
              >
                <Text className="text-[15px] font-medium" style={{ color: birthDate ? "#0f172a" : "#cbd5e1" }}>
                  {birthDate ? birthDate.toLocaleDateString() : "Select Date"}
                </Text>
                <Feather name="calendar" size={16} color="#94a3b8" />
              </TouchableOpacity>
              <Text className="text-[12px] text-slate-400 flex-1 leading-relaxed">
                Used to calibrate risk thresholds for your age group.
              </Text>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={birthDate || new Date()}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* ── Sex ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
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
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-6">
            <View className="flex-row gap-3">
              {/* Height */}
              <View className="flex-1">
                <FieldLabel title="Height" />
                <MeasureInput value={heightCm} onChangeText={setHeightCm} placeholder="170" unit="cm" maxLength={5} />
              </View>

              {/* Weight */}
              <View className="flex-1">
                <FieldLabel title="Weight" />
                <MeasureInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="65.0"
                  unit="kg"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Helper note */}
            <View className="flex-row items-start gap-1.5 mt-3">
              <Feather name="info" size={11} color="#cbd5e1" style={{ marginTop: 1 }} />
              <Text className="text-[11px] text-slate-300 flex-1 leading-relaxed">
                Height and weight are used to compute your BMI baseline.
              </Text>
            </View>
          </View>

          {/* Next button — disabled state via style, not className */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            disabled={!isReady || isSubmitting}
            className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2"
            style={{ backgroundColor: isReady ? "#0f172a" : "#e2e8f0", opacity: isSubmitting ? 0.8 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: isReady ? "#fff" : "#94a3b8" }}
                >
                  Next step
                </Text>
                <Feather name="arrow-right" size={15} color={isReady ? "#fff" : "#94a3b8"} />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}