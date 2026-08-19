import React from "react";
import { View, Text, ScrollView, Platform, UIManager, LayoutAnimation } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";

function FieldLabel({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <View className="mb-3">
      <Text className="text-[15px] font-bold text-foreground">{title}</Text>
      {subtitle && <Text className="text-[13px] text-muted-foreground mt-1">{subtitle}</Text>}
    </View>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} className={`flex-1 h-1 rounded-full ${i < current ? "bg-primary" : "bg-border"}`} />
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

  const isReady = data.sleep_hours && (!data.ever_smoked || data.smoke_now);

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/step4_alcohol", params });
  };

  const renderToggle = (value: boolean, onChange: (val: boolean) => void) => {
    return (
      <View className="flex-row bg-border/40 p-1 rounded-xl mb-4">
        <AnimatedButton 
          onPress={() => onChange(true)} 
          className={`flex-1 items-center justify-center py-3 rounded-lg ${value ? "bg-primary shadow-sm" : "bg-transparent"}`}
        >
          <Text className={`text-[14px] font-semibold ${value ? "text-primary-foreground" : "text-muted-foreground"}`}>Yes</Text>
        </AnimatedButton>
        <AnimatedButton 
          onPress={() => onChange(false)} 
          className={`flex-1 items-center justify-center py-3 rounded-lg ${!value ? "bg-primary shadow-sm" : "bg-transparent"}`}
        >
          <Text className={`text-[14px] font-semibold ${!value ? "text-primary-foreground" : "text-muted-foreground"}`}>No</Text>
        </AnimatedButton>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} className="text-foreground" />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-muted-foreground uppercase tracking-wide">Step 3 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Sleep & Smoking</Text>
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
                className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
              >
                <Text className={`font-medium text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                <Text className={`text-[13px] mt-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
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
            <View className="bg-card rounded-2xl p-4 border border-border">
              <FieldLabel title="Current Smoking Status" subtitle="Do you currently smoke?" />
              <View className="flex-col gap-2">
                {["Every day", "Some days", "Not at all"].map((opt) => {
                  const isActive = data.smoke_now === opt;
                  return (
                  <AnimatedButton
                    key={opt} onPress={() => updateData({ smoke_now: opt })}
                    className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
                  >
                    <Text className={`font-medium ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt}</Text>
                  </AnimatedButton>
                )})}
              </View>
            </View>
          </Animated.View>
        )}

      </ScrollView>

      <View 
        className="px-5 pt-4 bg-card border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <AnimatedButton
          onPress={handleNext} disabled={!isReady}
          className={`h-[54px] rounded-2xl items-center justify-center flex-row shadow-sm ${isReady ? "bg-primary" : "bg-muted/30"}`}
        >
          <Text className={`text-[16px] font-bold ${isReady ? "text-primary-foreground" : "text-muted"}`}>Next Step</Text>
          <Feather name="arrow-right" size={18} className={isReady ? "text-primary-foreground ml-2" : "text-muted ml-2"} />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
