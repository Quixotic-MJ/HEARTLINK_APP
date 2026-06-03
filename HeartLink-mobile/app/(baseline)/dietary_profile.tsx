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
import { router } from "expo-router";

export default function BiometricsStep3Screen() {
  // Form State
  const [sodiumFrequency, setSodiumFrequency] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [showOtherAllergy, setShowOtherAllergy] = useState(false);
  const [otherAllergy, setOtherAllergy] = useState("");
  const [dietaryPractice, setDietaryPractice] = useState("None");

  // Data Constants
  const commonAllergies = ["Dairy", "Peanuts", "Shellfish", "Tree Nuts", "Eggs", "Gluten"];
  const practices = ["None", "Halal", "Kosher", "Vegan", "Vegetarian", "Low-Carb / Keto"];

  // Handlers
  const toggleAllergy = (allergy) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter((a) => a !== allergy));
    } else {
      setAllergies([...allergies, allergy]);
    }
  };

  const handleNextStep = () => {
    const finalAllergies = [...allergies];
    if (showOtherAllergy && otherAllergy.trim() !== "") {
      finalAllergies.push(otherAllergy.trim());
    }

    const payload = {
      high_sodium_fried_frequency: sodiumFrequency,
      allergies: finalAllergies,
      dietary_practice: dietaryPractice,
    };

    console.log("Saving Dietary Baseline:", payload);
    router.push('/(baseline)/clinical_biometrics')
    // Add your navigation logic here to proceed to Step 4!
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-6 pt-2 pb-2 z-10">
        <TouchableOpacity 
          onPress={() => console.log("Back button pressed")} 
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color="#475569" />
        </TouchableOpacity>
        
        <View className="flex-1 items-center pr-8">
          <Text className="text-[14px] font-bold text-slate-400 tracking-widest uppercase">
            Step 3 of 4
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Main White Card Container */}
          <View className="bg-white mx-5 rounded-[32px] px-6 py-8 shadow-sm shadow-blue-900/5">
            
            {/* Header Text */}
            <View className="mb-8">
              <Text className="text-[26px] font-black text-slate-900 tracking-tight mb-2">
                Dietary Profile
              </Text>
              <Text className="text-[14px] text-slate-500 font-medium leading-relaxed pr-4">
                This allows us to personalize your cardiovascular stability score and tailor heart-healthy meal insights.
              </Text>
            </View>

            {/* 1. Dietary Habits */}
            <View className="mb-10">
              <Text className="text-[13px] font-bold text-slate-900 mb-3 ml-1">
                High-Sodium or Fried Food Intake
              </Text>
              <View className="space-y-3">
                {/* Rarely */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency("rarely")}
                  className={`p-4 rounded-[20px] flex-row items-center border transition-all ${
                    sodiumFrequency === "rarely" ? "bg-emerald-50/50 border-emerald-500" : "bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <View className={`w-11 h-11 rounded-[12px] items-center justify-center mr-4 ${sodiumFrequency === "rarely" ? "bg-emerald-500" : "bg-slate-100"}`}>
                    <Feather name="shield" size={18} color={sodiumFrequency === "rarely" ? "white" : "#64748b"} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-[14px] mb-0.5 ${sodiumFrequency === "rarely" ? "text-emerald-700" : "text-slate-900"}`}>Rarely</Text>
                    <Text className="text-[11px] text-slate-500">0-1 times per week</Text>
                  </View>
                  {sodiumFrequency === "rarely" && <Feather name="check-circle" size={20} color="#10b981" />}
                </TouchableOpacity>

                {/* Occasionally */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency("occasionally")}
                  className={`p-4 rounded-[20px] flex-row items-center border transition-all ${
                    sodiumFrequency === "occasionally" ? "bg-blue-50/50 border-[#1e4ed8]" : "bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <View className={`w-11 h-11 rounded-[12px] items-center justify-center mr-4 ${sodiumFrequency === "occasionally" ? "bg-[#1e4ed8]" : "bg-slate-100"}`}>
                    <Feather name="activity" size={18} color={sodiumFrequency === "occasionally" ? "white" : "#64748b"} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-[14px] mb-0.5 ${sodiumFrequency === "occasionally" ? "text-[#1e4ed8]" : "text-slate-900"}`}>Occasionally</Text>
                    <Text className="text-[11px] text-slate-500">2-4 times per week</Text>
                  </View>
                  {sodiumFrequency === "occasionally" && <Feather name="check-circle" size={20} color="#1e4ed8" />}
                </TouchableOpacity>

                {/* Frequently */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency("frequently")}
                  className={`p-4 rounded-[20px] flex-row items-center border transition-all ${
                    sodiumFrequency === "frequently" ? "bg-rose-50/50 border-rose-500" : "bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <View className={`w-11 h-11 rounded-[12px] items-center justify-center mr-4 ${sodiumFrequency === "frequently" ? "bg-rose-500" : "bg-slate-100"}`}>
                    <Feather name="alert-triangle" size={18} color={sodiumFrequency === "frequently" ? "white" : "#64748b"} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-[14px] mb-0.5 ${sodiumFrequency === "frequently" ? "text-rose-700" : "text-slate-900"}`}>Frequently</Text>
                    <Text className="text-[11px] text-slate-500">5+ times per week</Text>
                  </View>
                  {sodiumFrequency === "frequently" && <Feather name="check-circle" size={20} color="#f43f5e" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Food Allergies */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-3 pr-2">
                <Text className="text-[13px] font-bold text-slate-900 ml-1">Food Allergies</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Select</Text>
              </View>
              
              {/* Flex-Wrap Grid for Pills */}
              <View className="flex-row flex-wrap gap-2">
                {commonAllergies.map((allergy) => {
                  const isSelected = allergies.includes(allergy);
                  return (
                    <TouchableOpacity
                      key={allergy}
                      activeOpacity={0.7}
                      onPress={() => toggleAllergy(allergy)}
                      className={`px-4 py-2.5 rounded-[12px] border transition-all mb-1 ${
                        isSelected 
                          ? "bg-[#1e4ed8] border-[#1e4ed8] shadow-sm shadow-blue-900/20" 
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text className={`font-bold text-[13px] ${isSelected ? "text-white" : "text-slate-600"}`}>
                        {allergy}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                {/* 'Other' Pill */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowOtherAllergy(!showOtherAllergy)}
                  className={`px-4 py-2.5 rounded-[12px] border transition-all mb-1 ${
                    showOtherAllergy 
                      ? "bg-slate-800 border-slate-800 shadow-sm shadow-slate-900/20" 
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <Text className={`font-bold text-[13px] ${showOtherAllergy ? "text-white" : "text-slate-600"}`}>
                    {showOtherAllergy ? "Remove Other" : "Other +"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic 'Other' Text Input */}
              {showOtherAllergy && (
                <View className="mt-4 h-[52px] bg-slate-50 border border-slate-200 rounded-[16px] flex-row items-center px-4">
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#94a3b8" />
                  <TextInput
                    value={otherAllergy}
                    onChangeText={setOtherAllergy}
                    placeholder="E.g., Soy, Sesame..."
                    placeholderTextColor="#94a3b8"
                    className="flex-1 ml-3 text-[14px] text-slate-900 h-full font-medium"
                  />
                </View>
              )}
            </View>

            {/* 3. Dietary Preferences */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-3 pr-2">
                <Text className="text-[13px] font-bold text-slate-900 ml-1">Dietary Preferences</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Single-Select</Text>
              </View>
              
              {/* Flex-Wrap Grid for Pills */}
              <View className="flex-row flex-wrap gap-2">
                {practices.map((practice) => (
                  <TouchableOpacity
                    key={practice}
                    activeOpacity={0.7}
                    onPress={() => setDietaryPractice(practice)}
                    className={`px-4 py-2.5 rounded-[12px] border transition-all mb-1 ${
                      dietaryPractice === practice 
                        ? "bg-emerald-50 border-emerald-500 shadow-sm" 
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Text className={`font-bold text-[13px] ${dietaryPractice === practice ? "text-emerald-700" : "text-slate-600"}`}>
                      {practice}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNextStep}
              disabled={!sodiumFrequency}
              className={`w-full h-[52px] mt-2 rounded-full flex-row justify-center items-center shadow-sm transition-colors ${sodiumFrequency ? 'bg-[#1e4ed8] shadow-blue-900/20' : 'bg-slate-300'}`}
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