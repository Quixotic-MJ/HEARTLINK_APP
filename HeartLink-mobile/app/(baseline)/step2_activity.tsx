import React from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
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

export default function Step2Activity() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();

  const isReady = 
    (!data.vigorous_activity || (data.vigorous_days && data.vigorous_minutes)) &&
    (!data.moderate_activity || (data.moderate_days && data.moderate_minutes)) &&
    (!data.walk_bike_transport || (data.walk_bike_days && data.walk_bike_minutes)) &&
    data.sedentary_hours;

  const handleNext = () => {
    router.push({ pathname: "/step3_sleep_smoking", params });
  };

  const renderToggle = (label: string, value: boolean, onChange: (val: boolean) => void) => (
    <View className="flex-row bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-4">
      <TouchableOpacity onPress={() => onChange(true)} className={`flex-1 items-center justify-center py-3 rounded-lg ${value ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}>
        <Text className={`text-[14px] font-semibold ${value ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onChange(false)} className={`flex-1 items-center justify-center py-3 rounded-lg ${!value ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}>
        <Text className={`text-[14px] font-semibold ${!value ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>No</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDaysMins = (daysVal: any, daysChange: any, minsVal: any, minsChange: any) => (
    <View className="flex-row gap-4 mb-6">
      <View className="flex-1">
        <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 ml-0.5">Days / Week</Text>
        <TextInput
          value={daysVal} onChangeText={daysChange} placeholder="1-7" keyboardType="numeric" maxLength={1}
          className="bg-white dark:bg-slate-900 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 h-[50px] text-[16px] text-slate-900 dark:text-white"
        />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-2 ml-0.5">Minutes / Day</Text>
        <TextInput
          value={minsVal} onChangeText={minsChange} placeholder="e.g. 30" keyboardType="numeric" maxLength={3}
          className="bg-white dark:bg-slate-900 rounded-xl px-3.5 border border-slate-200 dark:border-slate-800 h-[50px] text-[16px] text-slate-900 dark:text-white"
        />
      </View>
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
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 2 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Physical Activity</Text>
          </View>
        </View>
        <StepProgress current={2} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Vigorous */}
        <View className="mb-2">
          <FieldLabel title="Vigorous Activity" subtitle="e.g., running, heavy lifting, intense sports that cause heavy sweating or large increases in breathing." />
          {renderToggle("vigorous", data.vigorous_activity, (val) => updateData({ vigorous_activity: val }))}
          {data.vigorous_activity && renderDaysMins(data.vigorous_days, (t: string) => updateData({ vigorous_days: t }), data.vigorous_minutes, (t: string) => updateData({ vigorous_minutes: t }))}
        </View>

        {/* Moderate */}
        <View className="mb-2">
          <FieldLabel title="Moderate Activity" subtitle="e.g., brisk walking, carrying light loads, cycling at a regular pace." />
          {renderToggle("moderate", data.moderate_activity, (val) => updateData({ moderate_activity: val }))}
          {data.moderate_activity && renderDaysMins(data.moderate_days, (t: string) => updateData({ moderate_days: t }), data.moderate_minutes, (t: string) => updateData({ moderate_minutes: t }))}
        </View>
        
        {/* Walk/Bike */}
        <View className="mb-2">
          <FieldLabel title="Walking or Bicycling for Transport" subtitle="Do you walk or use a bicycle for at least 10 minutes continuously to get to and from places?" />
          {renderToggle("walk_bike", data.walk_bike_transport, (val) => updateData({ walk_bike_transport: val }))}
          {data.walk_bike_transport && renderDaysMins(data.walk_bike_days, (t: string) => updateData({ walk_bike_days: t }), data.walk_bike_minutes, (t: string) => updateData({ walk_bike_minutes: t }))}
        </View>

        {/* Sedentary */}
        <View className="mb-6">
          <FieldLabel title="Sedentary Time" subtitle="On a typical day, how much time do you spend sitting or reclining (excluding sleep)?" />
          <View className="flex-row flex-wrap gap-2 mt-2">
            {["<2h", "2-4h", "4-6h", "6-8h", "8+h"].map((opt) => (
              <TouchableOpacity
                key={opt} onPress={() => updateData({ sedentary_hours: opt })}
                className={`px-4 py-3 rounded-xl border ${data.sedentary_hours === opt ? "bg-[#0f172a] border-[#0f172a]" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}
              >
                <Text className={`font-medium ${data.sedentary_hours === opt ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
