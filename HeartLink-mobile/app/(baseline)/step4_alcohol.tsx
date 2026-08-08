import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";

function FieldLabel({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</Text>
      {subtitle && <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">{subtitle}</Text>}
    </View>
  );
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

export default function Step4Alcohol() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();

  const isReady = 
    (!data.ever_drank || (data.drink_frequency && data.drink_frequency !== "Never" ? (data.drinks_per_occasion && data.binge_drinking_freq) : true));

  const handleNext = () => {
    router.push({ pathname: "/step5_diet", params });
  };

  const renderToggle = (value: boolean, onChange: (val: boolean) => void) => (
    <View className="flex-row bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-4">
      <TouchableOpacity onPress={() => onChange(true)} className={`flex-1 items-center justify-center py-3 rounded-lg ${value ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}>
        <Text className={`text-[14px] font-semibold ${value ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onChange(false)} className={`flex-1 items-center justify-center py-3 rounded-lg ${!value ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}>
        <Text className={`text-[14px] font-semibold ${!value ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>No</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 4 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Alcohol Usage</Text>
          </View>
        </View>
        <StepProgress current={4} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <View className="mb-6">
          <FieldLabel title="Alcohol Consumption" subtitle="Have you ever had at least one alcoholic drink?" />
          {renderToggle(data.ever_drank, (val) => updateData({ ever_drank: val, drink_frequency: val ? undefined : 'Never', drinks_per_occasion: undefined, binge_drinking_freq: undefined }))}
        </View>

        {data.ever_drank && (
          <View className="mb-6">
            <FieldLabel title="Frequency" subtitle="In the past 12 months, how often did you drink?" />
            <View className="flex-col gap-2">
              {["Never", "Monthly or less", "2-4x/month", "2-3x/week", "4+/week"].map((opt) => (
                <TouchableOpacity
                  key={opt} onPress={() => updateData({ drink_frequency: opt })}
                  className={`px-4 py-4 rounded-xl border ${data.drink_frequency === opt ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
                >
                  <Text className={`font-medium ${data.drink_frequency === opt ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {data.ever_drank && data.drink_frequency && data.drink_frequency !== "Never" && (
          <>
            <View className="mb-6">
              <FieldLabel title="Drinks per Occasion" subtitle="On days when you drink, how many drinks do you usually have?" />
              <View className="flex-row gap-2">
                {["1-2", "3-4", "5+"].map((opt) => (
                  <TouchableOpacity
                    key={opt} onPress={() => updateData({ drinks_per_occasion: opt })}
                    className={`flex-1 py-4 rounded-xl items-center border ${data.drinks_per_occasion === opt ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
                  >
                    <Text className={`font-medium ${data.drinks_per_occasion === opt ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View className="mb-6">
              <FieldLabel title="Heavy Drinking" subtitle="In the past 12 months, how often did you have 4 or more drinks on a single occasion?" />
              <View className="flex-col gap-2">
                {["Never", "Monthly or less", "2-4x/month", "2-3x/week", "4+/week"].map((opt) => (
                  <TouchableOpacity
                    key={opt} onPress={() => updateData({ binge_drinking_freq: opt })}
                    className={`px-4 py-4 rounded-xl border ${data.binge_drinking_freq === opt ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
                  >
                    <Text className={`font-medium ${data.binge_drinking_freq === opt ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

      </ScrollView>

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
