import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export default function GoalsThresholdsScreen() {
  const router = useRouter();
  
  const [sodium, setSodium] = useState("1500");
  const [activeMins, setActiveMins] = useState("30");
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");

  const handleSave = () => {
    Alert.alert("Success", "Your goals and thresholds have been updated.");
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* ── Top bar ── */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-3 mb-2">
        <Text className="text-[22px] font-medium text-slate-900 dark:text-white dark:text-slate-900 tracking-tight">
          Goals & Thresholds
        </Text>
        <Text className="text-[13px] text-slate-400 mt-0.5">
          Set your daily clinical targets
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-5 pb-24" showsVerticalScrollIndicator={false}>
          
          {/* ── Dietary Target ── */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug mb-0.5">
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
                className="flex-1 text-[15px] text-slate-900 dark:text-white dark:text-slate-900 font-medium"
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

          {/* ── Activity Target ── */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug mb-0.5">
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
                className="flex-1 text-[15px] text-slate-900 dark:text-white dark:text-slate-900 font-medium"
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
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug mb-0.5">
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
            
            <View className="flex-row items-center gap-3">
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 flex-row items-center">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white dark:text-slate-900 font-medium text-center"
                  placeholder="120"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
              </View>
              <Text className="text-[20px] text-slate-300 font-light">/</Text>
              <View className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl px-4 py-3 flex-row items-center">
                <TextInput
                  className="flex-1 text-[15px] text-slate-900 dark:text-white dark:text-slate-900 font-medium text-center"
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
      <View className="px-5 py-4 border-t border-slate-200 dark:border-slate-800/50 pb-8 bg-slate-50 dark:bg-slate-950">
        <TouchableOpacity 
          activeOpacity={0.85}
          onPress={handleSave}
          className="py-3.5 rounded-xl items-center justify-center flex-row gap-2 border"
          style={{ backgroundColor: "#0f172a", borderColor: "#0f172a" }}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text className="text-white dark:text-slate-900 font-medium text-[14px]">Save Changes</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
