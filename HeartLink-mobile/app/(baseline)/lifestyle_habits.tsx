import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useToast } from "../../contexts/ToastContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import '../../global.css'

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

export default function BiometricsStep2Screen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user_id } = useLocalSearchParams();
  const { showToast } = useToast();
  const base_url = process.env.EXPO_PUBLIC_API_URL;

  // Lifestyle State
  const [smokingStatus, setSmokingStatus] = useState(null); // 'never', 'former', 'current'
  const [sleepHours, setSleepHours] = useState(7); // Default to 7 hours
  const [familyHistory, setFamilyHistory] = useState(false); // Yes/No Toggle
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from existing lifestyle baseline data
  React.useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch(`${base_url}/api/users/${user_id}/profile`);
        if (!res.ok) return;
        const data = await res.json();
        const lifestyle = data?.baselines?.lifestyle;
        if (!lifestyle) return;
        if (lifestyle.smoking_status) setSmokingStatus(lifestyle.smoking_status);
        if (lifestyle.avg_sleep_hours) setSleepHours(lifestyle.avg_sleep_hours);
        if (lifestyle.family_history !== undefined) setFamilyHistory(lifestyle.family_history);
      } catch (e) {
        // Silently fail — fields stay at defaults
      }
    }
    if (user_id) loadExisting();
  }, [user_id]);

  // Custom Stepper Logic
  const incrementSleep = () => setSleepHours((prev) => Math.min(prev + 1, 12));
  const decrementSleep = () => setSleepHours((prev) => Math.max(prev - 1, 3));

  const handleNextStep = async () => {
    const payload = {
      smoking_status: smokingStatus,
      avg_sleep_hours: sleepHours,
      family_history: familyHistory,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${base_url}/api/users/${user_id}/baseline/lifestyle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Lifestyle saved:", data.message);
        router.push({
          pathname: "/dietary_profile",
          params: { user_id: user_id as string },
        });
      } else {
        showToast({ title: "Error", message: data.detail || "Failed to save lifestyle data", type: "error" });
      }
    } catch (error) {
      console.log("Lifestyle save error:", error);
      showToast({ title: "Error", message: "Could not connect to server", type: "error" });
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
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 3 of 5
            </Text>
          </View>
        </View>
        <StepProgress current={3} total={5} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerClassName="px-5 pb-12 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Page title */}
          <View className="mb-6">
            <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-1.5">
              Lifestyle & Habits
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              These daily routines play a crucial role in predicting your cardiovascular adaptation and stability.
            </Text>
          </View>

          {/* 1. Smoking / Vaping Status */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 leading-snug">
              Smoking / Vaping Status
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSmokingStatus("never")}
                className="flex-1 py-2.5 rounded-xl items-center border"
                style={
                  smokingStatus === "never"
                    ? { backgroundColor: "#eaf3de", borderColor: "#c0dd97" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: smokingStatus === "never" ? "#3b6d11" : "#64748b" }}
                >
                  Never
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSmokingStatus("former")}
                className="flex-1 py-2.5 rounded-xl items-center border"
                style={
                  smokingStatus === "former"
                    ? { backgroundColor: "#faeeda", borderColor: "#f3d39a" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: smokingStatus === "former" ? "#854f0b" : "#64748b" }}
                >
                  Former
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSmokingStatus("current")}
                className="flex-1 py-2.5 rounded-xl items-center border"
                style={
                  smokingStatus === "current"
                    ? { backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[13px]"
                  style={{ color: smokingStatus === "current" ? "#a32d2d" : "#64748b" }}
                >
                  Currently
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Sleep Duration Stepper */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-4 leading-snug">
              Average Sleep Duration
            </Text>
            
            <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={decrementSleep}
                disabled={sleepHours <= 3}
                className="w-12 h-12 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70"
                style={{ opacity: sleepHours <= 3 ? 0.5 : 1 }}
              >
                <Feather name="minus" size={20} color="#0f172a" />
              </TouchableOpacity>

              <View className="items-center justify-center">
                <Text className="text-[24px] font-bold text-slate-900 dark:text-white">
                  {sleepHours}
                </Text>
                <Text className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Hours / Night
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={incrementSleep}
                disabled={sleepHours >= 12}
                className="w-12 h-12 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70"
                style={{ opacity: sleepHours >= 12 ? 0.5 : 1 }}
              >
                <Feather name="plus" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Family History Toggle */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center mb-1">
                  <MaterialCommunityIcons name="heart-multiple-outline" size={16} color="#0f172a" />
                  <Text className="text-[14px] font-medium text-slate-900 dark:text-white ml-2">
                    Family History
                  </Text>
                </View>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Has any immediate family member been diagnosed with heart disease?
                </Text>
              </View>
              
              <Switch
                trackColor={{ false: "#e2e8f0", true: "#0f172a" }}
                thumbColor={Platform.OS === 'ios' ? "#ffffff" : (familyHistory ? "#ffffff" : "#ffffff")}
                ios_backgroundColor="#e2e8f0"
                onValueChange={setFamilyHistory}
                value={familyHistory}
              />
            </View>
          </View>
          {/* Next button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNextStep}
            disabled={!smokingStatus || isSubmitting}
            className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2 mt-4"
            style={{ backgroundColor: smokingStatus ? "#0f172a" : "#e2e8f0", opacity: isSubmitting ? 0.8 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: smokingStatus ? "#fff" : "#94a3b8" }}
                >
                  Next step
                </Text>
                <Feather name="arrow-right" size={15} color={smokingStatus ? "#fff" : "#94a3b8"} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}