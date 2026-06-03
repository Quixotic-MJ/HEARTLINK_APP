import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import '../../global.css'

export default function BiometricsStep2Screen() {
  const router = useRouter();

  // Lifestyle State
  const [smokingStatus, setSmokingStatus] = useState(null); // 'never', 'former', 'current'
  const [sleepHours, setSleepHours] = useState(7); // Default to 7 hours
  const [familyHistory, setFamilyHistory] = useState(false); // Yes/No Toggle

  // Custom Stepper Logic
  const incrementSleep = () => setSleepHours((prev) => Math.min(prev + 1, 12));
  const decrementSleep = () => setSleepHours((prev) => Math.max(prev - 1, 3));

  const handleNextStep = () => {
    // Formatting the payload for your rule-based engine
    const payload = {
      smoking_status: smokingStatus,
      average_sleep_hours: sleepHours,
      family_history_heart_disease: familyHistory,
    };

    console.log("Saving Lifestyle Data:", payload);
    router.push("/dietary_profile");
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
            Step 2 of 4
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-start pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Main White Card Container */}
          <View className="bg-white mx-5 rounded-[32px] px-6 py-8 shadow-sm shadow-blue-900/5">
            
            {/* Header Text */}
            <View className="mb-10">
              <Text className="text-[26px] font-black text-slate-900 tracking-tight mb-2">
                Lifestyle & Habits
              </Text>
              <Text className="text-[14px] text-slate-500 font-medium leading-relaxed pr-4">
                These daily routines play a crucial role in predicting your cardiovascular adaptation and stability.
              </Text>
            </View>

            {/* 1. Smoking / Vaping Status */}
            <View className="mb-10">
              <Text className="text-[13px] font-bold text-slate-900 mb-3 ml-1">Smoking / Vaping Status</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSmokingStatus("never")}
                  className="flex-1 py-3.5 rounded-[14px] items-center border"
                  style={
                    smokingStatus === "never"
                      ? { backgroundColor: "#eff6ff", borderColor: "#1e4ed8" }
                      : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[13px]"
                    style={{ color: smokingStatus === "never" ? "#1e4ed8" : "#64748b" }}
                  >
                    Never
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSmokingStatus("former")}
                  className="flex-1 py-3.5 rounded-[14px] items-center border"
                  style={
                    smokingStatus === "former"
                      ? { backgroundColor: "#fffbeb", borderColor: "#f59e0b" }
                      : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[13px]"
                    style={{ color: smokingStatus === "former" ? "#d97706" : "#64748b" }}
                  >
                    Former
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSmokingStatus("current")}
                  className="flex-1 py-3.5 rounded-[14px] items-center border"
                  style={
                    smokingStatus === "current"
                      ? { backgroundColor: "#fff1f2", borderColor: "#f43f5e" }
                      : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[13px]"
                    style={{ color: smokingStatus === "current" ? "#e11d48" : "#64748b" }}
                  >
                    Current
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Sleep Duration Stepper (Pure React Native) */}
            <View className="mb-10">
              <Text className="text-[13px] font-bold text-slate-900 mb-3 ml-1">Average Sleep Duration</Text>
              
              <View className="flex-row items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-[20px]">
                
                {/* Decrement Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={decrementSleep}
                  disabled={sleepHours <= 3}
                  className="w-14 h-14 rounded-[16px] items-center justify-center bg-white shadow-sm shadow-slate-200"
                  style={{ opacity: sleepHours <= 3 ? 0.5 : 1 }}
                >
                  <Feather name="minus" size={24} color="#475569" />
                </TouchableOpacity>

                {/* Value Display */}
                <View className="items-center justify-center">
                  <Text className="text-[28px] font-black text-[#1e4ed8]">
                    {sleepHours}
                  </Text>
                  <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Hours / Night
                  </Text>
                </View>

                {/* Increment Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={incrementSleep}
                  disabled={sleepHours >= 12}
                  className="w-14 h-14 rounded-[16px] items-center justify-center bg-white shadow-sm shadow-slate-200"
                  style={{ opacity: sleepHours >= 12 ? 0.5 : 1 }}
                >
                  <Feather name="plus" size={24} color="#475569" />
                </TouchableOpacity>

              </View>
            </View>

            {/* 3. Family History Toggle */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between bg-slate-50 border border-slate-100 p-5 rounded-[24px]">
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center mb-1">
                    <MaterialCommunityIcons name="heart-multiple-outline" size={18} color="#e11d48" />
                    <Text className="text-[13px] font-bold text-slate-900 ml-2">
                      Family History
                    </Text>
                  </View>
                  <Text className="text-[11px] text-slate-500 leading-relaxed">
                    Has any immediate family member been diagnosed with heart disease?
                  </Text>
                </View>
                
                {/* Standard Native Switch */}
                <Switch
                  trackColor={{ false: "#cbd5e1", true: "#1e4ed8" }}
                  thumbColor={Platform.OS === 'ios' ? "#ffffff" : (familyHistory ? "#ffffff" : "#f8fafc")}
                  ios_backgroundColor="#cbd5e1"
                  onValueChange={setFamilyHistory}
                  value={familyHistory}
                />
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNextStep}
              disabled={!smokingStatus}
              className="w-full h-[52px] rounded-full flex-row justify-center items-center shadow-sm"
              style={{
                backgroundColor: smokingStatus ? "#1e4ed8" : "#cbd5e1",
              }}
            >
              <Text className="text-white font-bold text-[15px] mr-2">
                Next Step
              </Text>
              <Feather name="arrow-right" size={18} color="white" />
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}