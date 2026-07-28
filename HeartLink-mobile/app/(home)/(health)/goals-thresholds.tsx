import { useColorScheme } from "nativewind";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function GoalsThresholdsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { userId } = useUser();
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
        const response = await fetch(`${base_url}/api/analytics/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && result.data.thresholds) {
          const t = result.data.thresholds;
          setSodium(t.sodium_limit_mg.toString());
          if (t.fluid_limit_ml) setFluidLimit(t.fluid_limit_ml.toString());
          setActiveMins(t.active_minutes_goal.toString());
          setSystolic(t.systolic_threshold.toString());
          setDiastolic(t.diastolic_threshold.toString());
        }
      } catch (e) {
        console.error("Failed to load thresholds:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchThresholds();
  }, [userId]);

  const handleSave = async () => {
    const sod = parseInt(sodium) || 0;
    const act = parseInt(activeMins) || 0;
    const sys = parseInt(systolic) || 0;
    const dia = parseInt(diastolic) || 0;
    const fl = parseInt(fluidLimit) || 0;

    // Validation
    if (sod < 500 || sod > 5000) return Alert.alert("Invalid Input", "Sodium limit must be between 500mg and 5000mg.");
    if (act < 0 || act > 300) return Alert.alert("Invalid Input", "Active minutes must be between 0 and 300.");
    if (sys < 80 || sys > 200) return Alert.alert("Invalid Input", "Systolic BP target must be between 80 and 200.");
    if (dia < 40 || dia > 130) return Alert.alert("Invalid Input", "Diastolic BP target must be between 40 and 130.");
    if (fl < 500 || fl > 5000) return Alert.alert("Invalid Input", "Fluid limit must be between 500ml and 5000ml.");

    setSaving(true);
    try {
      const response = await fetch(`${base_url}/api/analytics/${userId}/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        Alert.alert("Success", "Your goals and thresholds have been updated.");
        router.back();
      } else {
        Alert.alert("Error", "Could not save thresholds.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* ── Top bar ── */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-3 mb-2">
        <Text className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">
          Goals & Thresholds
        </Text>
        <Text className="text-[13px] text-slate-400 mt-0.5">
          Set your daily clinical targets
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-36" showsVerticalScrollIndicator={false}>
          
          {/* ── Dietary Target ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white leading-snug mb-0.5">
                  Dietary Target
                </Text>
                <Text className="text-[12px] text-slate-400 leading-5">
                  Daily Sodium Limit
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-emerald-50">
                <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#059669" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-3">
              <TextInput
                className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                placeholder="1500"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={sodium}
                onChangeText={setSodium}
              />
              <Text className="text-[14px] text-slate-400 font-medium ml-2">mg</Text>
            </View>
            
            <View className="flex-row items-start pr-4">
              <Feather name="info" size={12} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                AHA recommends under 1,500mg for high blood pressure.
              </Text>
            </View>
          </View>

          {/* ── Fluid Intake Target ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white leading-snug mb-0.5">
                  Fluid Target
                </Text>
                <Text className="text-[12px] text-slate-400 leading-5">
                  Daily Fluid Limit
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-blue-50">
                <Feather name="droplet" size={16} color="#2563eb" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 mb-3">
              <TextInput
                className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                placeholder="2000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={fluidLimit}
                onChangeText={setFluidLimit}
              />
              <Text className="text-[14px] text-slate-400 font-medium ml-2">ml</Text>
            </View>

            <View className="flex-row items-start pr-4">
              <Feather name="info" size={12} color="#64748b" style={{ marginTop: 2, marginRight: 6 }} />
              <Text className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                Fluid restriction is often necessary for heart failure patients to prevent fluid buildup.
              </Text>
            </View>
          </View>

          {/* ── Activity Target ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white leading-snug mb-0.5">
                  Activity Target
                </Text>
                <Text className="text-[12px] text-slate-400 leading-5">
                  Daily Active Minutes
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-[#eaf3de]">
                <Feather name="activity" size={16} color="#3b6d11" />
              </View>
            </View>
            
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3">
              <TextInput
                className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium"
                placeholder="30"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={activeMins}
                onChangeText={setActiveMins}
              />
              <Text className="text-[14px] text-slate-400 font-medium ml-2">mins</Text>
            </View>
          </View>

          {/* ── Vitals Baseline ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white leading-snug mb-0.5">
                  Vitals Baseline
                </Text>
                <Text className="text-[12px] text-slate-400 leading-5">
                  Target Blood Pressure
                </Text>
              </View>
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-[#fcebeb]">
                <MaterialCommunityIcons name="heart-pulse" size={18} color="#a32d2d" />
              </View>
            </View>
            
            <View className="flex-row items-center gap-2">
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-3 flex-row items-center">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium text-center"
                  placeholder="120"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
              </View>
              <Text className="text-[20px] text-slate-300 font-light">/</Text>
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-2 py-3 flex-row items-center">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white font-medium text-center"
                  placeholder="80"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={diastolic}
                  onChangeText={setDiastolic}
                />
              </View>
            </View>
            <View className="flex-row justify-between px-2 mt-2">
               <Text className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex-1 text-center">Systolic</Text>
               <View className="w-3" />
               <Text className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex-1 text-center">Diastolic</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Action Footer ── */}
      <View 
        className="px-5 pt-4 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 absolute bottom-0 w-full"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity 
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
          className="py-3.5 rounded-xl items-center justify-center flex-row gap-2 border"
          style={{ backgroundColor: "#0f172a", borderColor: "#0f172a", opacity: saving ? 0.8 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={16} color="#fff" />
              <Text className="text-white font-medium text-[14px]">Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
