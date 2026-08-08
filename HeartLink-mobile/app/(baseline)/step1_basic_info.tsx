import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../../contexts/ToastContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";

// Reusable components
function MeasureInput({ value, onChangeText, placeholder = "0", unit, maxLength }: any) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 rounded-xl flex-row items-center px-3.5" style={{ borderWidth: 1, borderColor: "#e2e8f0", height: 50 }}>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" maxLength={maxLength}
        className="flex-1 text-[16px] font-medium text-slate-900 dark:text-white h-full"
      />
      <Text className="text-[13px] text-slate-400 ml-1">{unit}</Text>
    </View>
  );
}

function FieldLabel({ title }: { title: string }) {
  return <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 ml-0.5">{title}</Text>;
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i < current ? "#0f172a" : "#e2e8f0" }} />
      ))}
    </View>
  );
}

export default function Step1BasicInfo() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load existing user profile on mount
  useEffect(() => {
    async function loadExisting() {
      const base_url = process.env.EXPO_PUBLIC_API_URL;
      if (!params.user_id) return;
      try {
        const res = await fetch(`${base_url}/api/users/${params.user_id}/profile`);
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.profile;
        if (p) {
          updateData({
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            date_of_birth: p.date_of_birth || '',
            sex: p.sex || '',
            height_cm: p.height_cm ? String(p.height_cm) : '',
            weight_kg: p.weight_kg ? String(p.weight_kg) : '',
          });
        }
      } catch (e) {}
    }
    loadExisting();
  }, [params.user_id]);

  const isReady = !!data.first_name && !!data.date_of_birth && !!data.sex && !!data.height_cm && !!data.weight_kg;

  const handleNext = () => {
    const h = parseFloat(data.height_cm);
    const w = parseFloat(data.weight_kg);
    if (isNaN(h) || h < 50 || h > 300) {
      showToast({ title: "Invalid Height", message: "Please enter a valid height (50-300 cm).", type: "error" });
      return;
    }
    if (isNaN(w) || w < 20 || w > 400) {
      showToast({ title: "Invalid Weight", message: "Please enter a valid weight (20-400 kg).", type: "error" });
      return;
    }
    router.push({ pathname: "/step2_activity", params });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 1 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Basic Information</Text>
          </View>
        </View>
        <StepProgress current={1} total={6} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          <View className="mb-6 flex-row gap-3">
            <View className="flex-1">
              <FieldLabel title="First Name" />
              <View className="bg-white dark:bg-slate-900 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 h-[50px] justify-center">
                <TextInput
                  value={data.first_name} onChangeText={(t) => updateData({ first_name: t })}
                  placeholder="John" placeholderTextColor="#cbd5e1"
                  className="text-[16px] font-medium text-slate-900 dark:text-white h-full"
                />
              </View>
            </View>
            <View className="flex-1">
              <FieldLabel title="Last Name" />
              <View className="bg-white dark:bg-slate-900 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 h-[50px] justify-center">
                <TextInput
                  value={data.last_name} onChangeText={(t) => updateData({ last_name: t })}
                  placeholder="Doe" placeholderTextColor="#cbd5e1"
                  className="text-[16px] font-medium text-slate-900 dark:text-white h-full"
                />
              </View>
            </View>
          </View>

          <View className="mb-6">
            <FieldLabel title="Date of Birth" />
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="bg-white dark:bg-slate-900 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 h-[50px] flex-row items-center"
            >
              <Feather name="calendar" size={18} color="#94a3b8" />
              <Text className={`text-[16px] font-medium ml-3 ${data.date_of_birth ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                {data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : "Select Date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={data.date_of_birth ? new Date(data.date_of_birth) : new Date(1990, 0, 1)}
                mode="date" display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) updateData({ date_of_birth: date.toISOString().split("T")[0] });
                }}
              />
            )}
          </View>

          <View className="mb-6">
            <FieldLabel title="Biological Sex" />
            <View className="flex-row bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
              {["male", "female"].map((s) => (
                <TouchableOpacity
                  key={s} onPress={() => updateData({ sex: s as any })}
                  className={`flex-1 items-center justify-center py-3 rounded-lg ${data.sex === s ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                >
                  <Text className={`text-[14px] font-semibold capitalize ${data.sex === s ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-8 flex-row gap-4">
            <View className="flex-1">
              <FieldLabel title="Height" />
              <MeasureInput value={data.height_cm} onChangeText={(t: string) => updateData({ height_cm: t })} unit="cm" maxLength={5} />
            </View>
            <View className="flex-1">
              <FieldLabel title="Weight" />
              <MeasureInput value={data.weight_kg} onChangeText={(t: string) => updateData({ weight_kg: t })} unit="kg" maxLength={5} />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View className="px-5 pb-8 pt-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <TouchableOpacity
          onPress={handleNext} disabled={!isReady}
          className={`h-[54px] rounded-2xl items-center justify-center flex-row ${isReady ? "bg-[#0f172a]" : "bg-slate-200 dark:bg-slate-800"}`}
        >
          <Text className={`text-[16px] font-bold ${isReady ? "text-white" : "text-slate-400"}`}>Next Step</Text>
          <Feather name="arrow-right" size={18} color={isReady ? "white" : "#94a3b8"} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
