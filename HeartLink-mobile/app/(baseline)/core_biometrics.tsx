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

export default function BiometricsStep1Screen() {
  const router = useRouter();

  // Biometric State
  const [age, setAge] = useState("");
  const [sex, setSex] = useState(null); // 'male' or 'female'
  const [unitSystem, setUnitSystem] = useState("metric"); // 'metric' or 'imperial'

  // Metric State
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Imperial State
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");

  const handleNextStep = () => {
    // 1. Data Normalization (Convert Imperial to Metric for the backend)
    let finalHeightCm = heightCm;
    let finalWeightKg = weightKg;

    if (unitSystem === "imperial") {
      const totalInches =
        parseInt(heightFt || 0) * 12 + parseInt(heightIn || 0);
      finalHeightCm = (totalInches * 2.54).toFixed(2);
      finalWeightKg = (parseFloat(weightLbs || 0) * 0.453592).toFixed(2);
    }

    const payload = {
      age: parseInt(age),
      sex,
      height_cm: parseFloat(finalHeightCm),
      weight_kg: parseFloat(finalWeightKg),
    };

    console.log("Saving Baseline Biometrics:", payload);
    router.push("/lifestyle_habits");
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
            Step 1 of 4
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
            <View className="mb-8">
              <Text className="text-[26px] font-black text-slate-900 tracking-tight mb-2">
                Core Biometrics
              </Text>
              <Text className="text-[14px] text-slate-500 font-medium leading-relaxed pr-4">
                Let's establish your cardiovascular baseline. This data ensures
                your tracking algorithms are accurate.
              </Text>
            </View>

            {/* 1. Age Input */}
            <View className="mb-6">
              <Text className="text-[13px] font-bold text-slate-900 mb-2 ml-1">
                Biological Age
              </Text>
              <View className="w-1/2 h-[52px] bg-white border border-slate-200 rounded-[16px] flex-row items-center px-4">
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={3}
                  className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                />
                <Text className="text-[13px] font-medium text-slate-400">
                  Years
                </Text>
              </View>
            </View>

            {/* 2. Sex Segmented Control */}
            <View className="mb-8">
              <Text className="text-[13px] font-bold text-slate-900 mb-2 ml-1">
                Biological Sex
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSex("male")}
                  className="flex-1 h-[52px] rounded-[16px] flex-row items-center justify-center border"
                  style={
                    sex === "male"
                      ? { backgroundColor: "#eff6ff", borderColor: "#1e4ed8" }
                      : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  <MaterialCommunityIcons
                    name="gender-male"
                    size={20}
                    color={sex === "male" ? "#1e4ed8" : "#94a3b8"}
                  />
                  <Text
                    className="ml-2 font-bold text-[14px]"
                    style={{ color: sex === "male" ? "#1e4ed8" : "#64748b" }}
                  >
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSex("female")}
                  className="flex-1 h-[52px] rounded-[16px] flex-row items-center justify-center border"
                  style={
                    sex === "female"
                      ? { backgroundColor: "#fff1f2", borderColor: "#f43f5e" }
                      : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                  }
                >
                  <MaterialCommunityIcons
                    name="gender-female"
                    size={20}
                    color={sex === "female" ? "#f43f5e" : "#94a3b8"}
                  />
                  <Text
                    className="ml-2 font-bold text-[14px]"
                    style={{ color: sex === "female" ? "#f43f5e" : "#64748b" }}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Height & Weight Section */}
            <View className="mb-8 bg-slate-50/50 p-4 rounded-[24px] border border-slate-100">
              {/* Unit Toggle */}
              <View className="flex-row bg-slate-200/60 p-1 rounded-[14px] mb-6">
                <TouchableOpacity
                  onPress={() => setUnitSystem("metric")}
                  className="flex-1 py-2 rounded-[10px] items-center"
                  style={
                    unitSystem === "metric"
                      ? { backgroundColor: "#ffffff", shadowColor: "#cbd5e1", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }
                      : {}
                  }
                >
                  <Text
                    className="text-[12px] font-bold"
                    style={{ color: unitSystem === "metric" ? "#0f172a" : "#64748b" }}
                  >
                    Metric (cm/kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setUnitSystem("imperial")}
                  className="flex-1 py-2 rounded-[10px] items-center"
                  style={
                    unitSystem === "imperial"
                      ? { backgroundColor: "#ffffff", shadowColor: "#cbd5e1", shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }
                      : {}
                  }
                >
                  <Text
                    className="text-[12px] font-bold"
                    style={{ color: unitSystem === "imperial" ? "#0f172a" : "#64748b" }}
                  >
                    Imperial (ft/lbs)
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4">
                {/* Height Input(s) */}
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Height
                  </Text>

                  {unitSystem === "metric" ? (
                    <View className="h-[52px] bg-white border border-slate-200 rounded-[16px] flex-row items-center px-4">
                      <TextInput
                        value={heightCm}
                        onChangeText={setHeightCm}
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        keyboardType="decimal-pad"
                        maxLength={5}
                        className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                      />
                      <Text className="text-[13px] font-medium text-slate-400">
                        cm
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row gap-2">
                      <View className="flex-1 h-[52px] bg-white border border-slate-200 rounded-[16px] flex-row items-center px-3">
                        <TextInput
                          value={heightFt}
                          onChangeText={setHeightFt}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                          keyboardType="number-pad"
                          maxLength={1}
                          className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                        />
                        <Text className="text-[13px] font-medium text-slate-400">
                          ft
                        </Text>
                      </View>
                      <View className="flex-1 h-[52px] bg-white border border-slate-200 rounded-[16px] flex-row items-center px-3">
                        <TextInput
                          value={heightIn}
                          onChangeText={setHeightIn}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                          keyboardType="number-pad"
                          maxLength={2}
                          className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                        />
                        <Text className="text-[13px] font-medium text-slate-400">
                          in
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Weight Input */}
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-slate-700 mb-2 ml-1">
                    Weight
                  </Text>
                  <View className="h-[52px] bg-white border border-slate-200 rounded-[16px] flex-row items-center px-4">
                    <TextInput
                      value={unitSystem === "metric" ? weightKg : weightLbs}
                      onChangeText={
                        unitSystem === "metric" ? setWeightKg : setWeightLbs
                      }
                      placeholder="0.0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      maxLength={5}
                      className="flex-1 text-[16px] text-slate-900 font-bold h-full"
                    />
                    <Text className="text-[13px] font-medium text-slate-400">
                      {unitSystem === "metric" ? "kg" : "lbs"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNextStep}
              disabled={!age || !sex}
              className="w-full h-[52px] rounded-full flex-row justify-center items-center shadow-sm"
              style={{
                backgroundColor: age && sex ? "#1e4ed8" : "#cbd5e1",
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
