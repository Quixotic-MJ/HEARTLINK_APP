import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useToast } from "../../contexts/ToastContext";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";

export default function Step3SleepSmoking() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();
  
  const insets = useSafeAreaInsets();
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const handleNext = () => {
    const errors: string[] = [];

    if (!data.sleep_hours) {
      errors.push("sleep_hours");
      showToast({ title: "Sleep Duration Required", message: "Please select your typical nightly sleep duration.", type: "error" });
      setErrorFields(errors);
      return;
    }

    if (data.ever_smoked && !data.smoke_now) {
      errors.push("smoke_now");
      showToast({ title: "Smoking Status Required", message: "Please select your current smoking status.", type: "error" });
      setErrorFields(errors);
      return;
    }

    setErrorFields([]);
    router.push({ pathname: "/(baseline)/step4_alcohol", params });
  };

  const renderToggle = (value: boolean, onChange: (val: boolean) => void) => {
    return (
      <View className="flex-row bg-border/30 dark:bg-slate-800/50 p-1 rounded-xl">
        <AnimatedButton 
          onPress={() => onChange(true)} 
          accessibilityRole="radio"
          accessibilityState={{ selected: value }}
          accessibilityLabel={`Smoked regularly Yes, ${value ? "selected" : "not selected"}`}
          className="flex-1 items-center justify-center py-2.5 rounded-lg overflow-hidden"
        >
          <View className={`absolute inset-0 ${value ? "bg-primary shadow-sm" : "bg-transparent"}`} />
          <Text className={`text-[14px] font-semibold relative z-10 ${value ? "text-primary-foreground" : "text-muted-foreground"}`}>Yes</Text>
        </AnimatedButton>
        <AnimatedButton 
          onPress={() => onChange(false)} 
          accessibilityRole="radio"
          accessibilityState={{ selected: !value }}
          accessibilityLabel={`Smoked regularly No, ${!value ? "selected" : "not selected"}`}
          className="flex-1 items-center justify-center py-2.5 rounded-lg overflow-hidden"
        >
          <View className={`absolute inset-0 ${!value ? "bg-primary shadow-sm" : "bg-transparent"}`} />
          <Text className={`text-[14px] font-semibold relative z-10 ${!value ? "text-primary-foreground" : "text-muted-foreground"}`}>No</Text>
        </AnimatedButton>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-3">
          <AnimatedButton 
            onPress={() => router.back()} 
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">Step 3 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Sleep & Smoking</Text>
          </View>
        </View>
        <StepProgress current={3} total={6} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 32 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Sleep Duration */}
        <Animated.View layout={LinearTransition} className="mb-7">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">
            How much do you usually sleep? *
          </Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
            Average nightly sleep
          </Text>

          <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("sleep_hours") ? "border border-destructive bg-destructive/5" : ""}`}>
            {[
              { val: "5", label: "Less than 5 hours" },
              { val: "5-6", label: "5–6 hours" },
              { val: "7-8", label: "7–8 hours" },
              { val: "9", label: "9+ hours" }
            ].map((opt) => {
              const isActive = data.sleep_hours === opt.val;
              return (
                <AnimatedButton
                  key={opt.val} 
                  onPress={() => {
                    setErrorFields((prev) => prev.filter((f) => f !== "sleep_hours"));
                    updateData({ sleep_hours: opt.val });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${opt.label}, ${isActive ? "selected" : "not selected"}`}
                  className="px-4 py-3.5 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                >
                  <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                  <Text className={`font-semibold text-[15px] relative z-10 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                    {opt.label}
                  </Text>
                  {isActive && <Feather name="check" size={18} color="#ffffff" className="relative z-10" />}
                </AnimatedButton>
              );
            })}
          </View>
        </Animated.View>

        {/* Smoking History */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">Smoking history</Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-2.5">
            Have you smoked regularly before? (about 100 cigarettes / 5 packs)
          </Text>
          {renderToggle(data.ever_smoked, (val) => {
            setErrorFields((prev) => prev.filter((f) => f !== "smoke_now"));
            updateData({ ever_smoked: val, smoke_now: val ? undefined : "Not at all" });
          })}
        </Animated.View>

        {/* Current Smoking Status (Conditional) */}
        {data.ever_smoked && (
          <Animated.View entering={FadeInUp} exiting={FadeOutUp} layout={LinearTransition} className="mb-2">
            <Text className="text-[16px] font-bold text-foreground tracking-tight">Do you smoke now? *</Text>
            <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
              Your current smoking routine
            </Text>

            <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("smoke_now") ? "border border-destructive bg-destructive/5" : ""}`}>
              {[
                { val: "Every day", label: "Every day" },
                { val: "Some days", label: "Some days" },
                { val: "Not at all", label: "Not at all" }
              ].map((opt) => {
                const isActive = data.smoke_now === opt.val;
                return (
                  <AnimatedButton
                    key={opt.val} 
                    onPress={() => {
                      setErrorFields((prev) => prev.filter((f) => f !== "smoke_now"));
                      updateData({ smoke_now: opt.val });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${opt.label}, ${isActive ? "selected" : "not selected"}`}
                    className="px-4 py-3.5 rounded-xl border-0 overflow-hidden flex-row items-center justify-between"
                  >
                    <View className={`absolute inset-0 border rounded-xl ${isActive ? "bg-primary border-primary shadow-sm" : "bg-card dark:bg-slate-900 border-border/80 dark:border-slate-800"}`} />
                    <Text className={`font-semibold text-[15px] relative z-10 ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                      {opt.label}
                    </Text>
                    {isActive && <Feather name="check" size={18} color="#ffffff" className="relative z-10" />}
                  </AnimatedButton>
                );
              })}
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Bottom CTA */}
      <View 
        className="px-5 pt-3.5 bg-card dark:bg-slate-900 border-t border-border"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <AnimatedButton
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Proceed to step 4"
          className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
        >
          <Text className="text-[16px] font-bold text-primary-foreground">Next Step</Text>
          <Feather name="arrow-right" size={18} color="#ffffff" className="ml-2" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
