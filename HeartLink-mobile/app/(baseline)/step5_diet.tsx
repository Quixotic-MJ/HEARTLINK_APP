import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import { Colors } from "../../constants/theme";
import AnimatedButton from "../../components/ui/AnimatedButton";

function FieldLabel({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <View className="mb-3 mt-4">
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

export default function Step5Diet() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  const activeBg = Colors[isDark ? "dark" : "light"].tint;
  const activeText = isDark ? "#11181C" : "#ffffff";

  const isReady = data.diet_level && data.fried_food_freq && data.salty_food_freq && data.fruit_veg_servings;

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/step6_health", params });
  };

  const OptionCards = ({ options, value, onChange }: { options: any[], value: string, onChange: (val: string) => void }) => (
    <View className="flex-col gap-2">
      {options.map((opt) => {
        const isActive = value === opt.val;
        return (
        <AnimatedButton
          key={opt.val} onPress={() => onChange(opt.val)}
          className="px-4 py-4 rounded-xl border"
          style={{
            backgroundColor: isActive ? activeBg : (isDark ? "#0f172a" : "#ffffff"),
            borderColor: isActive ? activeBg : (isDark ? "#1e293b" : "#e2e8f0")
          }}
        >
          <Text className="font-medium text-[15px]" style={{ color: isActive ? activeText : (isDark ? "#cbd5e1" : "#334155") }}>{opt.label}</Text>
          {opt.desc && <Text className="text-[13px] mt-1" style={{ color: isActive ? activeText : "#64748b" }}>{opt.desc}</Text>}
        </AnimatedButton>
      )})}
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
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">Step 5 of 6</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Diet Habits</Text>
          </View>
        </View>
        <StepProgress current={5} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <FieldLabel title="Daily Eating Profile" subtitle="How would you describe your typical daily eating?" />
        <OptionCards
          value={data.diet_level}
          onChange={(val) => updateData({ diet_level: val })}
          options={[
            { val: "light", label: "Light", desc: "~1200 - 1500 calories" },
            { val: "average", label: "Average", desc: "~1500 - 2000 calories" },
            { val: "heavy", label: "Heavy", desc: "~2000 - 2500 calories" },
            { val: "very_heavy", label: "Very Heavy", desc: "2500+ calories" },
          ]}
        />

        <FieldLabel title="High-Fat Foods" subtitle="How often do you eat fried food, fast food, or high-fat meals?" />
        <OptionCards
          value={data.fried_food_freq}
          onChange={(val) => updateData({ fried_food_freq: val })}
          options={[
            { val: "rarely", label: "Rarely", desc: "0-1 times a week" },
            { val: "sometimes", label: "Sometimes", desc: "2-3 times a week" },
            { val: "often", label: "Often", desc: "4-5 times a week" },
            { val: "daily", label: "Daily", desc: "Almost every day" },
          ]}
        />

        <FieldLabel title="Sodium & Processed Foods" subtitle="How often do you eat salty or processed foods?" />
        <OptionCards
          value={data.salty_food_freq}
          onChange={(val) => updateData({ salty_food_freq: val })}
          options={[
            { val: "rarely", label: "Rarely", desc: "0-1 times a week" },
            { val: "sometimes", label: "Sometimes", desc: "2-3 times a week" },
            { val: "often", label: "Often", desc: "4-5 times a week" },
            { val: "daily", label: "Daily", desc: "Almost every day" },
          ]}
        />

        <FieldLabel title="Fruits & Vegetables" subtitle="How many servings of fruits and vegetables do you eat daily?" />
        <OptionCards
          value={data.fruit_veg_servings}
          onChange={(val) => updateData({ fruit_veg_servings: val })}
          options={[
            { val: "0-1", label: "0 to 1 servings", desc: "Very low intake" },
            { val: "2-3", label: "2 to 3 servings", desc: "Below recommended daily intake" },
            { val: "4-5", label: "4 to 5 servings", desc: "Recommended daily intake" },
            { val: "6+", label: "6 or more servings", desc: "High intake" },
          ]}
        />

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
