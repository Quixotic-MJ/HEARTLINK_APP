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

export default function Step4Alcohol() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();

  const isReady = 
    (!data.ever_drank || (data.drink_frequency && data.drink_frequency !== "Never" ? (data.drinks_per_occasion && data.binge_drinking_freq) : true));

  const handleNext = () => {
    router.push({ pathname: "/(baseline)/step5_diet", params });
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
            <Text className="text-[11px] text-muted-foreground uppercase tracking-wide">Step 4 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Alcohol Usage</Text>
          </View>
        </View>
        <StepProgress current={4} total={6} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <Animated.View layout={LinearTransition} className="mb-6">
          <FieldLabel title="Alcohol Consumption" subtitle="Have you ever had at least one alcoholic drink?" />
          {renderToggle(data.ever_drank, (val) => updateData({ ever_drank: val, drink_frequency: val ? undefined : 'Never', drinks_per_occasion: undefined, binge_drinking_freq: undefined }))}
        </Animated.View>

        {data.ever_drank && (
          <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
            <View className="mb-6 bg-card rounded-2xl p-4 border border-border">
              <FieldLabel title="Drinking Frequency" subtitle="How often do you have a drink containing alcohol?" />
              <View className="flex-col gap-2 mt-2">
                {[
                  { val: "Never", label: "Never", desc: "I do not drink alcohol" },
                  { val: "Monthly or less", label: "Monthly or less", desc: "Rare occasional drinking" },
                  { val: "2-4x/month", label: "2 to 4 times a month", desc: "About once a week" },
                  { val: "2-3x/week", label: "2 to 3 times a week", desc: "Regular moderate drinking" },
                  { val: "4+/week", label: "4 or more times a week", desc: "Frequent drinking" }
                ].map((opt) => {
                  const isActive = data.drink_frequency === opt.val;
                  return (
                  <AnimatedButton
                    key={opt.val} onPress={() => updateData({ drink_frequency: opt.val })}
                    className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
                  >
                    <Text className={`font-medium text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                    <Text className={`text-[13px] mt-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
                  </AnimatedButton>
                )})}
              </View>
            </View>

            <View className="mb-6 bg-card rounded-2xl p-4 border border-border">
              <FieldLabel title="Drinks per Occasion" subtitle="How many drinks containing alcohol do you have on a typical day when you are drinking?" />
              <View className="flex-col gap-2 mt-2">
                {[
                  { val: "1-2", label: "1 or 2 drinks", desc: "Light drinking" },
                  { val: "3-4", label: "3 or 4 drinks", desc: "Moderate drinking" },
                  { val: "5+", label: "5 or more drinks", desc: "Heavy drinking" }
                ].map((opt) => {
                  const isActive = data.drinks_per_occasion === opt.val;
                  return (
                  <AnimatedButton
                    key={opt.val} onPress={() => updateData({ drinks_per_occasion: opt.val })}
                    className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
                  >
                    <Text className={`font-medium text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                    <Text className={`text-[13px] mt-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
                  </AnimatedButton>
                )})}
              </View>
            </View>
            
            <View className="mb-6 bg-card rounded-2xl p-4 border border-border">
              <FieldLabel title="Binge Drinking" subtitle="How often do you have six or more drinks on one occasion?" />
              <View className="flex-col gap-2 mt-2">
                {[
                  { val: "Never", label: "Never", desc: "I never have 6+ drinks on one occasion" },
                  { val: "Monthly or less", label: "Monthly or less", desc: "Very rare binge drinking" },
                  { val: "2-4x/month", label: "2 to 4 times a month", desc: "About once a week" },
                  { val: "2-3x/week", label: "2 to 3 times a week", desc: "Multiple times a week" },
                  { val: "4+/week", label: "4 or more times a week", desc: "Frequent binge drinking" }
                ].map((opt) => {
                  const isActive = data.binge_drinking_freq === opt.val;
                  return (
                  <AnimatedButton
                    key={opt.val} onPress={() => updateData({ binge_drinking_freq: opt.val })}
                    className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
                  >
                    <Text className={`font-medium text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                    <Text className={`text-[13px] mt-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
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
