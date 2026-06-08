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
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-5 pt-4 pb-2 z-10">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 -ml-2 mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Lifestyle & Habits
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">
            Step 2 of 4 • Daily routines
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pb-32 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header Info */}
          <Text className="text-[13px] text-slate-500 font-medium leading-relaxed mb-5">
            These daily routines play a crucial role in predicting your cardiovascular adaptation and stability.
          </Text>

          {/* 1. Smoking / Vaping Status */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-4 leading-snug">
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
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 mb-4 leading-snug">
              Average Sleep Duration
            </Text>
            
            <View className="flex-row items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-xl">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={decrementSleep}
                disabled={sleepHours <= 3}
                className="w-12 h-12 rounded-lg items-center justify-center bg-white border border-slate-200/70"
                style={{ opacity: sleepHours <= 3 ? 0.5 : 1 }}
              >
                <Feather name="minus" size={20} color="#0f172a" />
              </TouchableOpacity>

              <View className="items-center justify-center">
                <Text className="text-[24px] font-bold text-slate-900">
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
                className="w-12 h-12 rounded-lg items-center justify-center bg-white border border-slate-200/70"
                style={{ opacity: sleepHours >= 12 ? 0.5 : 1 }}
              >
                <Feather name="plus" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Family History Toggle */}
          <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mb-5">
            <View className="flex-row items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center mb-1">
                  <MaterialCommunityIcons name="heart-multiple-outline" size={16} color="#0f172a" />
                  <Text className="text-[14px] font-medium text-slate-900 ml-2">
                    Family History
                  </Text>
                </View>
                <Text className="text-[12px] text-slate-500 leading-relaxed">
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200/70 px-5 pt-3 pb-8">
         <TouchableOpacity
           activeOpacity={0.8}
           onPress={handleNextStep}
           disabled={!smokingStatus}
           className="w-full py-3.5 rounded-xl flex-row justify-center items-center"
           style={{
             backgroundColor: smokingStatus ? "#0f172a" : "#e2e8f0",
           }}
         >
           <Text className="font-medium text-[14px] mr-2" style={{ color: smokingStatus ? "#fff" : "#94a3b8" }}>
             Next step
           </Text>
           <Feather name="arrow-right" size={16} color={smokingStatus ? "#fff" : "#94a3b8"} />
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}