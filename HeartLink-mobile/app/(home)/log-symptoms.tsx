import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types & Constants ────────────────────────────────────────────────────────

type SymptomType =
  | "None (Feeling fine)"
  | "Chest Discomfort / Tightness"
  | "Shortness of Breath"
  | "Dizziness / Lightheadedness"
  | "Palpitations"
  | "Fatigue / Weakness";

type ContextType = "While resting" | "During physical activity" | "After eating";

const SYMPTOMS: SymptomType[] = [
  "None (Feeling fine)",
  "Chest Discomfort / Tightness",
  "Shortness of Breath",
  "Dizziness / Lightheadedness",
  "Palpitations",
  "Fatigue / Weakness",
];

const CONTEXTS: ContextType[] = [
  "While resting",
  "During physical activity",
  "After eating",
];

// ─── Helper Components ────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: any }) {
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-6">
      <MaterialCommunityIcons name={icon} size={18} color="#64748b" />
      <Text className="text-[15px] font-bold text-slate-900 tracking-tight">
        {title}
      </Text>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LogSymptomsScreen() {
  const router = useRouter();

  // State
  const [timestamp, setTimestamp] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>(["None (Feeling fine)"]);
  const [severity, setSeverity] = useState<number>(1);
  const [context, setContext] = useState<ContextType>("While resting");

  useEffect(() => {
    setTimestamp(new Date().toLocaleString());
  }, []);

  const hasRealSymptoms = !selectedSymptoms.includes("None (Feeling fine)") && selectedSymptoms.length > 0;

  // Toggle Symptom logic
  const toggleSymptom = (symp: SymptomType) => {
    if (symp === "None (Feeling fine)") {
      setSelectedSymptoms(["None (Feeling fine)"]);
      return;
    }

    let newSelected = selectedSymptoms.filter((s) => s !== "None (Feeling fine)");

    if (newSelected.includes(symp)) {
      newSelected = newSelected.filter((s) => s !== symp);
    } else {
      newSelected.push(symp);
    }

    if (newSelected.length === 0) {
      newSelected = ["None (Feeling fine)"];
    }

    setSelectedSymptoms(newSelected);
  };

  // Evaluate Emergency Escalation Logic
  const checkEmergency = () => {
    if (!hasRealSymptoms) return false;

    const chestSevere = selectedSymptoms.includes("Chest Discomfort / Tightness") && severity >= 7;
    const breathResting = selectedSymptoms.includes("Shortness of Breath") && context === "While resting";

    return chestSevere || breathResting;
  };

  const isEmergency = checkEmergency();

  const handleLocateCardiologist = () => {
    // Simulated action for opening maps
    const url = "https://www.google.com/maps/search/Cardiologist+in+Cebu+City";
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open map application.");
    });
  };

  const handleSubmit = () => {
    if (isEmergency) {
      Alert.alert(
        "Critical Log Submitted",
        "Your clinical indicators reflect an elevated risk. Please consider seeking medical attention immediately.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        "Health Log Submitted",
        "Your symptom log has been saved securely to your Weekly Wrap-Up.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-slate-50 z-10 border-b border-slate-200/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/70 items-center justify-center mr-3 shadow-sm shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[18px] font-bold text-slate-900 tracking-tight">
            Log Symptoms
          </Text>
          <Text className="text-[12px] text-slate-500 font-medium mt-0.5">
            {timestamp}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24 pt-2" showsVerticalScrollIndicator={false}>
        
        {/* Emergency Banner */}
        {isEmergency && (
          <View className="bg-red-500 rounded-3xl p-5 mb-2 mt-4 shadow-md shadow-red-600/30">
            <View className="flex-row items-center gap-2 mb-3">
              <Feather name="alert-triangle" size={24} color="#ffffff" />
              <Text className="text-[18px] font-bold text-white">ELEVATED RISK</Text>
            </View>
            <Text className="text-white/90 text-[14px] leading-snug font-medium mb-4">
              Your symptoms strongly suggest an acute cardiovascular event. Please seek immediate medical evaluation.
            </Text>
            <TouchableOpacity
              onPress={handleLocateCardiologist}
              className="bg-white py-3 rounded-xl flex-row items-center justify-center gap-2 shadow-sm shadow-black/10"
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="map-marker-radius" size={20} color="#dc2626" />
              <Text className="text-red-600 font-bold text-[15px]">Find Cardiologist in Cebu City</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Symptoms Checklist */}
        <SectionHeader title="What are you feeling?" icon="clipboard-list-outline" />
        <View className="flex-row flex-wrap">
          {SYMPTOMS.map((symp) => {
            const isSelected = selectedSymptoms.includes(symp);
            const isNone = symp === "None (Feeling fine)";
            
            return (
              <TouchableOpacity
                key={symp}
                activeOpacity={0.7}
                onPress={() => toggleSymptom(symp)}
                className={`px-4 py-3 rounded-xl border mr-2 mb-2 flex-row items-center gap-2 ${
                  isSelected 
                    ? isNone ? "bg-green-600 border-green-600" : "bg-blue-600 border-blue-600"
                    : "bg-white border-slate-200"
                }`}
                style={
                  isSelected
                    ? {
                        shadowColor: isNone ? "#16a34a" : "#2563eb",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 2,
                      }
                    : undefined
                }
              >
                {isSelected && (
                  <Feather name="check" size={16} color="#ffffff" />
                )}
                <Text
                  className={`text-[14px] font-medium ${
                    isSelected ? "text-white" : "text-slate-600"
                  }`}
                >
                  {symp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Conditional Severity Slider */}
        {hasRealSymptoms && (
          <View>
            <SectionHeader title="Severity Scale" icon="speedometer" />
            <Text className="text-[13px] text-slate-500 mb-4 px-1">
              On a scale of 1 to 10, how severe are these symptoms?
            </Text>
            
            <View className="bg-white rounded-3xl border border-slate-200/70 p-4 shadow-sm shadow-slate-100 mb-2">
              <View className="flex-row justify-between mb-4">
                <Text className="text-[12px] font-bold text-green-600 uppercase">1 - Mild</Text>
                <Text className="text-[12px] font-bold text-red-600 uppercase">10 - Severe</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
                {[1,2,3,4,5,6,7,8,9,10].map((num) => {
                  const isSelected = severity === num;
                  let colorClass = "bg-slate-100 border-slate-200 text-slate-600";
                  let selectedBg = "bg-blue-600 border-blue-600";
                  
                  if (num >= 7) selectedBg = "bg-red-600 border-red-600";
                  else if (num >= 4) selectedBg = "bg-amber-500 border-amber-500";
                  else selectedBg = "bg-green-600 border-green-600";

                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setSeverity(num)}
                      className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${
                        isSelected ? selectedBg : colorClass
                      }`}
                    >
                      <Text className={`text-[18px] font-bold ${isSelected ? 'text-white' : ''}`}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              <View className="items-center mt-5">
                <View className={`px-4 py-2 rounded-lg ${
                  severity >= 7 ? 'bg-red-50' : severity >= 4 ? 'bg-amber-50' : 'bg-green-50'
                }`}>
                  <Text className={`text-[14px] font-bold ${
                    severity >= 7 ? 'text-red-700' : severity >= 4 ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    Selected: {severity}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Context Selection */}
        <SectionHeader title="When did this happen?" icon="clock-time-four-outline" />
        <View className="flex-col gap-2">
          {CONTEXTS.map((ctx) => {
            const isSelected = context === ctx;
            return (
              <TouchableOpacity
                key={ctx}
                activeOpacity={0.7}
                onPress={() => setContext(ctx)}
                className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                  isSelected ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200/70"
                }`}
              >
                <Text className={`text-[15px] font-medium ${isSelected ? "text-white" : "text-slate-700"}`}>
                  {ctx}
                </Text>
                {isSelected && (
                  <View className="w-5 h-5 rounded-full bg-white items-center justify-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  </View>
                )}
                {!isSelected && (
                  <View className="w-5 h-5 rounded-full border-2 border-slate-300" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          className={`w-full rounded-2xl py-4 items-center mt-8 shadow-md ${
            isEmergency ? "bg-red-600 shadow-red-600/20" : "bg-[#1e4ed8] shadow-blue-600/20"
          }`}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-[16px]">
            Submit Health Log
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
