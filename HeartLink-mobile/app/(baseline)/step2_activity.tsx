import React from "react";
import { View, Text, ScrollView, TextInput, Platform, UIManager, LayoutAnimation } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import Animated, { FadeInUp, FadeOutUp, LinearTransition, FadeInDown } from "react-native-reanimated";

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

export default function Step2Activity() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();

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

  const renderDaysMins = (daysVal: any, daysChange: any, minsVal: any, minsChange: any) => (
    <View className="flex-row gap-4 mb-6">
      <View className="flex-1">
        <Text className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2 ml-0.5">Days / Week</Text>
        <TextInput
          value={daysVal} onChangeText={daysChange} placeholder="1-7" placeholderTextColor="#94a3b8" keyboardType="numeric" maxLength={1}
          className="bg-card rounded-xl px-3.5 border border-border min-h-[52px] text-[16px] text-foreground"
        />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2 ml-0.5">Minutes / Day</Text>
        <TextInput
          value={minsVal} onChangeText={minsChange} placeholder="e.g. 30" placeholderTextColor="#94a3b8" keyboardType="numeric" maxLength={3}
          className="bg-card rounded-xl px-3.5 border border-border min-h-[52px] text-[16px] text-foreground"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <AnimatedButton onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3">
            <Feather name="arrow-left" size={18} className="text-foreground" />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] text-muted-foreground uppercase tracking-wide">Step 2 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Physical Activity</Text>
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
                className={`px-4 py-4 rounded-xl border ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card border-border"}`}
              >
                <Text className={`font-medium text-[15px] ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{opt.label}</Text>
                <Text className={`text-[13px] mt-1 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</Text>
              </AnimatedButton>
            )})}
          </View>
        </Animated.View>

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
