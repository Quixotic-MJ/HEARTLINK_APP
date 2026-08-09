import React from "react";
import { View, Text, ScrollView, Platform, UIManager, LayoutAnimation } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import { Colors } from "../../constants/theme";
import AnimatedButton from "../../components/ui/AnimatedButton";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";

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

export default function Step3SleepSmoking() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  const activeBg = Colors[isDark ? "dark" : "light"].tint;
  const activeText = isDark ? "#11181C" : "#ffffff";

  const isReady = data.sleep_hours && (!data.ever_smoked || data.smoke_now);

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/step4_alcohol", params });
  };

  const renderToggle = (value: boolean, onChange: (val: boolean) => void) => {
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 3 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Sleep & Smoking</Text>
          </View>
        </View>
        <StepProgress current={3} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Sleep */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <FieldLabel title="Sleep Duration" subtitle="On average, how many hours of sleep do you get in a 24-hour period?" />
          <View className="flex-col gap-2 mt-2">
            {[
              { val: "5", label: "Less than 5 hours", desc: "Significantly below recommended sleep" },
              { val: "5-6", label: "5 to 6 hours", desc: "Slightly below average sleep duration" },
              { val: "7-8", label: "7 to 8 hours", desc: "Recommended optimal sleep for adults" },
              { val: "9", label: "9 hours or more", desc: "Above average or extended sleep" }
            ].map((opt) => {
              const isActive = data.sleep_hours === opt.val;
              return (
              <AnimatedButton
                key={opt.val} onPress={() => updateData({ sleep_hours: opt.val })}
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

        {/* Smoking */}
        <Animated.View layout={LinearTransition} className="mb-2">
          <FieldLabel title="Smoking History" subtitle="Have you smoked at least 100 cigarettes in your entire life?" />
          {renderToggle(data.ever_smoked, (val) => updateData({ ever_smoked: val, smoke_now: val ? undefined : 'Not at all' }))}
        </Animated.View>

        {data.ever_smoked && (
          <Animated.View entering={FadeInUp} exiting={FadeOutUp} className="mb-6">
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
              <FieldLabel title="Current Smoking Status" subtitle="Do you currently smoke?" />
              <View className="flex-col gap-2">
                {["Every day", "Some days", "Not at all"].map((opt) => {
                  const isActive = data.smoke_now === opt;
                  return (
                  <AnimatedButton
                    key={opt} onPress={() => updateData({ smoke_now: opt })}
                    className="px-4 py-4 rounded-xl border"
                    style={{
                      backgroundColor: isActive ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
                      borderColor: isActive ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
                    }}
                  >
                    <Text className="font-medium" style={{ color: isActive ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{opt}</Text>
                  </AnimatedButton>
                )})}
              </View>
            </View>
          </Animated.View>
        )}

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
