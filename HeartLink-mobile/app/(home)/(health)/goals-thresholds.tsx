import { useColorScheme } from "nativewind";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function GoalsThresholdsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const { userId, token } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sodium, setSodium] = useState("1500");
  const [fluidLimit, setFluidLimit] = useState("2000");
  const [activeMins, setActiveMins] = useState("30");
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const effectiveToken = token || "";
        const response = await fetch(`${base_url}/api/analytics/${userId}`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const result = await response.json();
        if (result.thresholds) {
          const t = result.thresholds;
          setSodium(t.sodium_limit_mg.toString());
          if (t.fluid_limit_ml) setFluidLimit(t.fluid_limit_ml.toString());
          setActiveMins(t.active_minutes_goal.toString());
          setSystolic(t.systolic_threshold.toString());
          setDiastolic(t.diastolic_threshold.toString());
        }
      } catch (e) {
        console.error("Failed to load targets & limits:", e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchThresholds();
  }, [userId, token]);

  const handleSave = async () => {
    const sod = parseInt(sodium, 10) || 0;
    const act = parseInt(activeMins, 10) || 0;
    const sys = parseInt(systolic, 10) || 0;
    const dia = parseInt(diastolic, 10) || 0;
    const fl = parseInt(fluidLimit, 10) || 0;

    // Validation
    if (sod < 500 || sod > 5000) return showToast({ title: "Invalid Sodium", message: "Sodium limit must be between 500mg and 5,000mg.", type: "error" });
    if (act < 0 || act > 300) return showToast({ title: "Invalid Activity", message: "Movement goal must be between 0 and 300 active minutes.", type: "error" });
    if (sys < 80 || sys > 200) return showToast({ title: "Invalid Systolic", message: "Systolic target must be between 80 and 200 mmHg.", type: "error" });
    if (dia < 40 || dia > 130) return showToast({ title: "Invalid Diastolic", message: "Diastolic target must be between 40 and 130 mmHg.", type: "error" });
    if (fl < 500 || fl > 5000) return showToast({ title: "Invalid Fluid Limit", message: "Fluid limit must be between 500ml and 5,000ml.", type: "error" });

    setSaving(true);
    try {
      const effectiveToken = token || "";
      const response = await fetch(`${base_url}/api/analytics/${userId}/thresholds`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          sodium_limit_mg: sod,
          fluid_limit_ml: fl,
          active_minutes_goal: act,
          systolic_threshold: sys,
          diastolic_threshold: dia,
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        showToast({ title: "Targets Saved", message: "Your health targets and daily limits have been updated.", type: "success" });
        router.back();
      } else {
        showToast({ title: "Save Failed", message: result.detail || "Could not save health targets.", type: "error" });
      }
    } catch (e) {
      console.error(e);
      showToast({ title: "Network Error", message: "Failed to connect to server. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-slate-900 dark:text-white tracking-tight">
          Health Targets & Limits
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-36" showsVerticalScrollIndicator={false}>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Customize your daily lifestyle targets and clinical limits. These numbers help calibrate your daily stability analysis.
          </Text>
          
          {/* ── 1. Sodium Intake Limit ── */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">
                  Sodium Intake Limit
                </Text>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily maximum sodium budget
                </Text>
              </View>
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-emerald-50 dark:bg-emerald-950/40">
                <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#059669" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13 mb-3">
              <TextInput
                className="flex-1 text-[16px] text-slate-900 dark:text-white font-semibold"
                placeholder="1500"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={sodium}
                onChangeText={setSodium}
              />
              <Text className="text-[14px] text-slate-400 font-bold ml-2">mg / day</Text>
            </View>
            
            <View className="flex-row items-start pr-2">
              <Feather name="info" size={13} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                The American Heart Association recommends staying under 1,500mg daily for optimal blood pressure management.
              </Text>
            </View>
          </View>

          {/* ── 2. Daily Fluid Limit ── */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">
                  Daily Fluid Limit
                </Text>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily fluid intake restriction
                </Text>
              </View>
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-blue-50 dark:bg-blue-950/40">
                <Feather name="droplet" size={18} color="#2563eb" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13 mb-3">
              <TextInput
                className="flex-1 text-[16px] text-slate-900 dark:text-white font-semibold"
                placeholder="2000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={fluidLimit}
                onChangeText={setFluidLimit}
              />
              <Text className="text-[14px] text-slate-400 font-bold ml-2">ml / day</Text>
            </View>

            <View className="flex-row items-start pr-2">
              <Feather name="info" size={13} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                Fluid restriction helps prevent fluid buildup and manages symptoms in cardiovascular care.
              </Text>
            </View>
          </View>

          {/* ── 3. Daily Movement Goal ── */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">
                  Daily Movement Goal
                </Text>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Active physical exercise minutes
                </Text>
              </View>
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-emerald-50 dark:bg-emerald-950/40">
                <Feather name="activity" size={18} color="#16a34a" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 h-13 mb-3">
              <TextInput
                className="flex-1 text-[16px] text-slate-900 dark:text-white font-semibold"
                placeholder="30"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={activeMins}
                onChangeText={setActiveMins}
              />
              <Text className="text-[14px] text-slate-400 font-bold ml-2">mins / day</Text>
            </View>

            <View className="flex-row items-start pr-2">
              <Feather name="info" size={13} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                Target minutes of daily activity including walking, light exercise, and heart-safe rehab routines.
              </Text>
            </View>
          </View>

          {/* ── 4. Target Blood Pressure ── */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 mb-4 shadow-sm shadow-slate-100 dark:shadow-none">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-[16px] font-semibold text-slate-900 dark:text-white">
                  Target Blood Pressure
                </Text>
                <Text className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Personal blood pressure target
                </Text>
              </View>
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-red-50 dark:bg-red-950/40">
                <MaterialCommunityIcons name="heart-pulse" size={20} color="#dc2626" />
              </View>
            </View>
            
            <View className="flex-row items-center gap-3 mb-2">
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 h-13 flex-row items-center justify-center">
                <TextInput
                  className="w-full text-[16px] text-slate-900 dark:text-white font-semibold text-center"
                  placeholder="120"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
              </View>
              <Text className="text-[22px] text-slate-300 dark:text-slate-600 font-light">/</Text>
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 h-13 flex-row items-center justify-center">
                <TextInput
                  className="w-full text-[16px] text-slate-900 dark:text-white font-semibold text-center"
                  placeholder="80"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={diastolic}
                  onChangeText={setDiastolic}
                />
              </View>
            </View>
            
            <View className="flex-row justify-between px-2 mb-3">
              <Text className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex-1 text-center">Systolic (mmHg)</Text>
              <View className="w-6" />
              <Text className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex-1 text-center">Diastolic (mmHg)</Text>
            </View>

            <View className="flex-row items-start pr-2">
              <Feather name="info" size={13} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                Set the target recommended by your doctor or care provider. Typical healthy resting blood pressure is around 120/80 mmHg.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Action Footer */}
      <View 
        className="px-5 pt-3.5 border-t border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 absolute bottom-0 w-full"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity 
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Save Changes to health targets and limits"
          className="h-13 rounded-2xl items-center justify-center flex-row gap-2 bg-slate-900 dark:bg-blue-600"
          style={{ opacity: saving ? 0.8 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text className="text-white font-semibold text-[15px]">Save Targets & Limits</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
