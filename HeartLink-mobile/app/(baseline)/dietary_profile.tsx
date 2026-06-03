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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function BiometricsStep3Screen() {
  const router = useRouter();
  
  // Form State
  const [sodiumFrequency, setSodiumFrequency] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [showOtherAllergy, setShowOtherAllergy] = useState(false);
  const [otherAllergy, setOtherAllergy] = useState("");
  const [dietaryPractice, setDietaryPractice] = useState("None");

  // Data Constants
  const commonAllergies = [
    "Dairy",
    "Peanuts",
    "Shellfish",
    "Tree Nuts",
    "Eggs",
    "Gluten",
  ];
  const practices = [
    "None",
    "Halal",
    "Kosher",
    "Vegan",
    "Vegetarian",
    "Low-Carb / Keto",
  ];

  // Handlers
  const toggleAllergy = (allergy) => {
    if (allergies.includes(allergy)) {
      setAllergies(allergies.filter((a) => a !== allergy));
    } else {
      setAllergies([...allergies, allergy]);
    }
  };

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        console.log("Cannot go back");
      }
    } catch (error) {
      console.log("Back navigation error:", error);
    }
  };

  const handleNextStep = () => {
    // Validate required fields
    if (!sodiumFrequency) {
      Alert.alert("Missing Information", "Please select your high-sodium or fried food intake frequency.");
      return;
    }

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
    
    // Safe navigation
    try {
      router.push("/(baseline)/clinical_biometrics");
    } catch (error) {
      console.log("Navigation error:", error);
      Alert.alert(
        "Navigation Error",
        "Unable to proceed to the next step. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f7fb]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="flex-row items-center px-6 pt-2 pb-2 z-10">
        <TouchableOpacity
          onPress={handleBack}
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
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 120,
            paddingTop: 16,
          }}
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
                This allows us to personalize your cardiovascular stability
                score and tailor heart-healthy meal insights.
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
                  className="p-4 rounded-[20px] flex-row items-center border"
                  style={
                    sodiumFrequency === "rarely"
                      ? { backgroundColor: "rgba(236,253,245,0.5)", borderColor: "#10b981" }
                      : { backgroundColor: "#ffffff", borderColor: "#f1f5f9" }
                  }
                >
                  <View
                    className="w-11 h-11 rounded-[12px] items-center justify-center mr-4"
                    style={{
                      backgroundColor: sodiumFrequency === "rarely" ? "#10b981" : "#f1f5f9",
                    }}
                  >
                    <Feather
                      name="shield"
                      size={18}
                      color={sodiumFrequency === "rarely" ? "white" : "#64748b"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-[14px] mb-0.5"
                      style={{
                        color: sodiumFrequency === "rarely" ? "#047857" : "#0f172a",
                      }}
                    >
                      Rarely
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      0-1 times per week
                    </Text>
                  </View>
                  {sodiumFrequency === "rarely" && (
                    <Feather name="check-circle" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>

                {/* Occasionally */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency("occasionally")}
                  className="p-4 rounded-[20px] flex-row items-center border"
                  style={
                    sodiumFrequency === "occasionally"
                      ? { backgroundColor: "rgba(239,246,255,0.5)", borderColor: "#1e4ed8" }
                      : { backgroundColor: "#ffffff", borderColor: "#f1f5f9" }
                  }
                >
                  <View
                    className="w-11 h-11 rounded-[12px] items-center justify-center mr-4"
                    style={{
                      backgroundColor: sodiumFrequency === "occasionally" ? "#1e4ed8" : "#f1f5f9",
                    }}
                  >
                    <Feather
                      name="activity"
                      size={18}
                      color={
                        sodiumFrequency === "occasionally" ? "white" : "#64748b"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-[14px] mb-0.5"
                      style={{
                        color: sodiumFrequency === "occasionally" ? "#1e4ed8" : "#0f172a",
                      }}
                    >
                      Occasionally
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      2-4 times per week
                    </Text>
                  </View>
                  {sodiumFrequency === "occasionally" && (
                    <Feather name="check-circle" size={20} color="#1e4ed8" />
                  )}
                </TouchableOpacity>

                {/* Frequently */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency("frequently")}
                  className="p-4 rounded-[20px] flex-row items-center border"
                  style={
                    sodiumFrequency === "frequently"
                      ? { backgroundColor: "rgba(255,241,242,0.5)", borderColor: "#f43f5e" }
                      : { backgroundColor: "#ffffff", borderColor: "#f1f5f9" }
                  }
                >
                  <View
                    className="w-11 h-11 rounded-[12px] items-center justify-center mr-4"
                    style={{
                      backgroundColor: sodiumFrequency === "frequently" ? "#f43f5e" : "#f1f5f9",
                    }}
                  >
                    <Feather
                      name="alert-triangle"
                      size={18}
                      color={
                        sodiumFrequency === "frequently" ? "white" : "#64748b"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-[14px] mb-0.5"
                      style={{
                        color: sodiumFrequency === "frequently" ? "#be123c" : "#0f172a",
                      }}
                    >
                      Frequently
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      5+ times per week
                    </Text>
                  </View>
                  {sodiumFrequency === "frequently" && (
                    <Feather name="check-circle" size={20} color="#f43f5e" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Food Allergies */}
            <View className="mb-10">
              <View className="flex-row items-center justify-between mb-3 pr-2">
                <Text className="text-[13px] font-bold text-slate-900 ml-1">
                  Food Allergies
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Multi-Select
                </Text>
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
                      className="px-4 py-2.5 rounded-[12px] border mb-1"
                      style={
                        isSelected
                          ? { backgroundColor: "#1e4ed8", borderColor: "#1e4ed8" }
                          : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                      }
                    >
                      <Text
                        className="font-bold text-[13px]"
                        style={{
                          color: isSelected ? "#ffffff" : "#475569",
                        }}
                      >
                        {allergy}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* 'Other' Pill */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowOtherAllergy(!showOtherAllergy)}
                  className="px-4 py-2.5 rounded-[12px] border mb-1"
                  style={
                    showOtherAllergy
                      ? { backgroundColor: "#1e293b", borderColor: "#1e293b" }
                      : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-bold text-[13px]"
                    style={{
                      color: showOtherAllergy ? "#ffffff" : "#475569",
                    }}
                  >
                    {showOtherAllergy ? "Remove Other" : "Other +"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic 'Other' Text Input */}
              {showOtherAllergy && (
                <View className="mt-4 h-[52px] bg-slate-50 border border-slate-200 rounded-[16px] flex-row items-center px-4">
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color="#94a3b8"
                  />
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
                <Text className="text-[13px] font-bold text-slate-900 ml-1">
                  Dietary Preferences
                </Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Single-Select
                </Text>
              </View>

              {/* Flex-Wrap Grid for Pills */}
              <View className="flex-row flex-wrap gap-2">
                {practices.map((practice) => (
                  <TouchableOpacity
                    key={practice}
                    activeOpacity={0.7}
                    onPress={() => setDietaryPractice(practice)}
                    className="px-4 py-2.5 rounded-[12px] border mb-1"
                    style={
                      dietaryPractice === practice
                        ? { backgroundColor: "#ecfdf5", borderColor: "#10b981" }
                        : { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                    }
                  >
                    <Text
                      className="font-bold text-[13px]"
                      style={{
                        color: dietaryPractice === practice ? "#047857" : "#475569",
                      }}
                    >
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
              className="w-full h-[52px] mt-2 rounded-full flex-row justify-center items-center shadow-sm"
              style={{
                backgroundColor: sodiumFrequency ? "#1e4ed8" : "#cbd5e1",
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