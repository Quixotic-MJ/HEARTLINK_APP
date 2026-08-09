import React from "react";
import { View, Text, ScrollView, TextInput, Platform, UIManager, LayoutAnimation } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import { Colors } from "../../constants/theme";
import AnimatedButton from "../../components/ui/AnimatedButton";
import Animated, { FadeInUp, FadeOutUp, LinearTransition, FadeInDown } from "react-native-reanimated";

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
        <View key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i < current ? Colors.light.tint : "#e2e8f0" }} />
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
  
  const insets = useSafeAreaInsets();
  const activeBg = Colors[isDark ? "dark" : "light"].tint;
  const activeText = isDark ? "#11181C" : "#ffffff";

  const isReady = 
    (!data.vigorous_activity || (data.vigorous_days && data.vigorous_minutes)) &&
    (!data.moderate_activity || (data.moderate_days && data.moderate_minutes)) &&
    (!data.walk_bike_transport || (data.walk_bike_days && data.walk_bike_minutes)) &&
    data.sedentary_hours;

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/step3_sleep_smoking", params });
  };

  const renderToggle = (label: string, value: boolean, onChange: (val: boolean) => void) => {
    return (
      <View className="flex-row bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-4">
        <AnimatedButton onPress={() => onChange(true)} className="flex-1 items-center justify-center py-3 rounded-lg" style={value ? { backgroundColor: activeBg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}>
          <Text className="text-[14px] font-semibold" style={{ color: value ? activeText : "#64748b" }}>Yes</Text>
        </AnimatedButton>
        <AnimatedButton onPress={() => onChange(false)} className="flex-1 items-center justify-center py-3 rounded-lg" style={!value ? { backgroundColor: activeBg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}>
          <Text className="text-[14px] font-semibold" style={{ color: !value ? activeText : "#64748b" }}>No</Text>
        </AnimatedButton>
      </View>
    );
  };

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
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 2 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Physical Activity</Text>
          </View>
        </View>
        <StepProgress current={2} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Vigorous */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <FieldLabel title="Vigorous Activity" subtitle="e.g., running, heavy lifting, intense sports that cause heavy sweating or large increases in breathing." />
          {renderToggle("vigorous", data.vigorous_activity, (val) => updateData({ vigorous_activity: val }))}
          {data.vigorous_activity && (
            <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
              {renderDaysMins(data.vigorous_days, (t: string) => updateData({ vigorous_days: t }), data.vigorous_minutes, (t: string) => updateData({ vigorous_minutes: t }))}
            </Animated.View>
          )}
        </Animated.View>

        {/* Moderate */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <FieldLabel title="Moderate Activity" subtitle="e.g., brisk walking, carrying light loads, cycling at a regular pace." />
          {renderToggle("moderate", data.moderate_activity, (val) => updateData({ moderate_activity: val }))}
          {data.moderate_activity && (
            <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
              {renderDaysMins(data.moderate_days, (t: string) => updateData({ moderate_days: t }), data.moderate_minutes, (t: string) => updateData({ moderate_minutes: t }))}
            </Animated.View>
          )}
        </Animated.View>
        
        {/* Walk/Bike */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <FieldLabel title="Walking or Bicycling for Transport" subtitle="Do you walk or use a bicycle for at least 10 minutes continuously to get to and from places?" />
          {renderToggle("walk_bike", data.walk_bike_transport, (val) => updateData({ walk_bike_transport: val }))}
          {data.walk_bike_transport && (
            <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
              {renderDaysMins(data.walk_bike_days, (t: string) => updateData({ walk_bike_days: t }), data.walk_bike_minutes, (t: string) => updateData({ walk_bike_minutes: t }))}
            </Animated.View>
          )}
        </Animated.View>

        {/* Sedentary */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <FieldLabel title="Sedentary Time" subtitle="On a typical day, how much time do you spend sitting or reclining (excluding sleep)?" />
          <View className="flex-col gap-2 mt-2">
            {[
              { val: "<2h", label: "Less than 2 hours", desc: "Active lifestyle, rarely sitting" },
              { val: "2-4h", label: "2 to 4 hours", desc: "Moderate sitting with regular movement" },
              { val: "4-6h", label: "4 to 6 hours", desc: "Average daily sitting" },
              { val: "6-8h", label: "6 to 8 hours", desc: "Prolonged sitting, like a desk job" },
              { val: "8+h", label: "More than 8 hours", desc: "Highly sedentary lifestyle" }
            ].map((opt) => {
              const isActive = data.sedentary_hours === opt.val;
              return (
              <AnimatedButton
                key={opt.val} onPress={() => updateData({ sedentary_hours: opt.val })}
                className="px-4 py-4 rounded-xl border"
                style={{
                  backgroundColor: isActive ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
                  borderColor: isActive ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
                }}
              >
                <Text className="font-medium text-[15px]" style={{ color: isActive ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{opt.label}</Text>
                <Text className="text-[13px] mt-1" style={{ color: isActive ? activeText : "#64748b" }}>{opt.desc}</Text>
              </AnimatedButton>
            )})}
          </View>
        </Animated.View>

      </ScrollView>

      <View 
        className="px-5 pt-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <AnimatedButton
          onPress={handleNext} disabled={!isReady}
          className="h-[54px] rounded-2xl items-center justify-center flex-row"
          style={{ backgroundColor: isReady ? activeBg : (isDark ? "#1e293b" : "#e2e8f0") }}
        >
          <Text className="text-[16px] font-bold" style={{ color: isReady ? activeText : "#94a3b8" }}>Next Step</Text>
          <Feather name="arrow-right" size={18} color={isReady ? activeText : "#94a3b8"} style={{ marginLeft: 8 }} />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
