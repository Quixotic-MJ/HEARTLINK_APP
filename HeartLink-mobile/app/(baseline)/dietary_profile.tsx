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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 z-10">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={handleBack}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 4 of 5
            </Text>
          </View>
        </View>
        <StepProgress current={4} total={5} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="px-5 pb-16 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Page title */}
          <View className="mb-6">
            <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-1.5">
              Dietary Profile
            </Text>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              This allows us to personalize your cardiovascular stability score and tailor heart-healthy meal insights.
            </Text>
          </View>

          {/* 1. Dietary Habits */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 mb-4 leading-snug">
              High-Sodium or Fried Food Intake
            </Text>
            
            <View className="space-y-2">
              {[
                {
                  id: "rarely",
                  label: "Rarely",
                  sub: "0-1 times per week",
                  icon: "shield",
                  color: "#3b6d11",
                  bg: "#eaf3de",
                  borderColor: "#c0dd97"
                },
                {
                  id: "occasionally",
                  label: "Occasionally",
                  sub: "2-4 times per week",
                  icon: "activity",
                  color: "#854f0b",
                  bg: "#faeeda",
                  borderColor: "#f3d39a"
                },
                {
                  id: "frequently",
                  label: "Frequently",
                  sub: "5+ times per week",
                  icon: "alert-triangle",
                  color: "#a32d2d",
                  bg: "#fcebeb",
                  borderColor: "#f7c1c1"
                }
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => setSodiumFrequency(item.id)}
                  className="p-3 rounded-xl border flex-row items-center mb-2"
                  style={
                    sodiumFrequency === item.id
                      ? { backgroundColor: item.bg, borderColor: item.borderColor }
                      : { backgroundColor: "#fff", borderColor: "#e2e8f0" }
                  }
                >
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center mr-3 border"
                    style={{
                      backgroundColor: sodiumFrequency === item.id ? item.color : "#f8fafc",
                      borderColor: sodiumFrequency === item.id ? item.color : "#e2e8f0"
                    }}
                  >
                    <Feather
                      name={item.icon}
                      size={18}
                      color={sodiumFrequency === item.id ? "#fff" : "#94a3b8"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-medium text-[14px] mb-0.5"
                      style={{
                        color: sodiumFrequency === item.id ? item.color : "#334155",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text className="text-[11px] text-slate-400">
                      {item.sub}
                    </Text>
                  </View>
                  {sodiumFrequency === item.id && (
                    <Feather name="check" size={18} color={item.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. Food Allergies */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug">
                Food Allergies
              </Text>
              <View className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                <Text className="text-[9px] uppercase tracking-wide text-slate-400">Multi-Select</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-1.5">
              {commonAllergies.map((allergy) => {
                const isSelected = allergies.includes(allergy);
                return (
                  <TouchableOpacity
                    key={allergy}
                    activeOpacity={0.7}
                    onPress={() => toggleAllergy(allergy)}
                    className="px-3 py-1.5 rounded-lg border mb-1"
                    style={
                      isSelected
                        ? { backgroundColor: "#0f172a", borderColor: "#0f172a" }
                        : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                    }
                  >
                    <Text
                      className="font-medium text-[12px]"
                      style={{ color: isSelected ? "#ffffff" : "#64748b" }}
                    >
                      {allergy}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowOtherAllergy(!showOtherAllergy)}
                className="px-3 py-1.5 rounded-lg border mb-1"
                style={
                  showOtherAllergy
                    ? { backgroundColor: "#334155", borderColor: "#334155" }
                    : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <Text
                  className="font-medium text-[12px]"
                  style={{ color: showOtherAllergy ? "#ffffff" : "#64748b" }}
                >
                  {showOtherAllergy ? "Remove Other" : "Other +"}
                </Text>
              </TouchableOpacity>
            </View>

            {showOtherAllergy && (
              <View className="mt-3 h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 rounded-xl flex-row items-center px-3">
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={otherAllergy}
                  onChangeText={setOtherAllergy}
                  placeholder="E.g., Soy, Sesame..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2 text-[13px] text-slate-900 dark:text-white dark:text-slate-900 h-full font-medium"
                />
              </View>
            )}
          </View>

          {/* 3. Dietary Preferences */}
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[15px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug">
                Dietary Preferences
              </Text>
              <View className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                <Text className="text-[9px] uppercase tracking-wide text-slate-400">Single-Select</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-1.5">
              {practices.map((practice) => (
                <TouchableOpacity
                  key={practice}
                  activeOpacity={0.7}
                  onPress={() => setDietaryPractice(practice)}
                  className="px-3 py-1.5 rounded-lg border mb-1"
                  style={
                    dietaryPractice === practice
                      ? { backgroundColor: "#eaf3de", borderColor: "#c0dd97" }
                      : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }
                  }
                >
                  <Text
                    className="font-medium text-[12px]"
                    style={{ color: dietaryPractice === practice ? "#3b6d11" : "#64748b" }}
                  >
                    {practice}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Next button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNextStep}
            disabled={!sodiumFrequency}
            className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2 mt-4"
            style={{ backgroundColor: sodiumFrequency ? "#0f172a" : "#e2e8f0" }}
          >
            <Text
              className="text-[14px] font-medium"
              style={{ color: sodiumFrequency ? "#fff" : "#94a3b8" }}
            >
              Next step
            </Text>
            <Feather name="arrow-right" size={15} color={sodiumFrequency ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}