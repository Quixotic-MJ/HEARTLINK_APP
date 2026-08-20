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

export default function Step4Alcohol() {
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

    if (data.ever_drank) {
      if (!data.drink_frequency) {
        errors.push("drink_frequency");
        showToast({ title: "Frequency Required", message: "Please select how often you drink alcohol.", type: "error" });
        setErrorFields(errors);
        return;
      }

      if (data.drink_frequency !== "Never") {
        if (!data.drinks_per_occasion) {
          errors.push("drinks_per_occasion");
          showToast({ title: "Drinks per Occasion Required", message: "Please select your typical number of drinks.", type: "error" });
          setErrorFields(errors);
          return;
        }

        if (!data.binge_drinking_freq) {
          errors.push("binge_drinking_freq");
          showToast({ title: "Occasion Frequency Required", message: "Please select your heavy drinking frequency.", type: "error" });
          setErrorFields(errors);
          return;
        }
      }
    }

    setErrorFields([]);
    router.push({ pathname: "/(baseline)/step5_diet", params });
  };

  const renderToggle = (value: boolean, onChange: (val: boolean) => void) => {
    return (
      <View className="flex-row bg-border/30 dark:bg-slate-800/50 p-1 rounded-xl">
        <AnimatedButton 
          onPress={() => onChange(true)} 
          accessibilityRole="radio"
          accessibilityState={{ selected: value }}
          accessibilityLabel={`Drink alcohol Yes, ${value ? "selected" : "not selected"}`}
          className="flex-1 items-center justify-center py-2.5 rounded-lg overflow-hidden"
        >
          <View className={`absolute inset-0 ${value ? "bg-primary shadow-sm" : "bg-transparent"}`} />
          <Text className={`text-[14px] font-semibold relative z-10 ${value ? "text-primary-foreground" : "text-muted-foreground"}`}>Yes</Text>
        </AnimatedButton>
        <AnimatedButton 
          onPress={() => onChange(false)} 
          accessibilityRole="radio"
          accessibilityState={{ selected: !value }}
          accessibilityLabel={`Drink alcohol No, ${!value ? "selected" : "not selected"}`}
          className="flex-1 items-center justify-center py-2.5 rounded-lg overflow-hidden"
        >
          <View className={`absolute inset-0 ${!value ? "bg-primary shadow-sm" : "bg-transparent"}`} />
          <Text className={`text-[14px] font-semibold relative z-10 ${!value ? "text-primary-foreground" : "text-muted-foreground"}`}>No</Text>
        </AnimatedButton>
      </View>
    );
  };

  const showDependentQuestions = data.ever_drank && data.drink_frequency && data.drink_frequency !== "Never";

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
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">Step 4 of 6</Text>
            <Text className="text-xl font-bold text-foreground mt-0.5">Alcohol Habits</Text>
          </View>
        </View>
        <StepProgress current={4} total={6} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 32 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Gateway Question */}
        <Animated.View layout={LinearTransition} className="mb-6">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">Do you drink alcohol?</Text>
          <Text className="text-[13px] text-muted-foreground mt-0.5 mb-2.5">
            Beer, wine, or spirits
          </Text>
          {renderToggle(data.ever_drank, (val) => {
            setErrorFields([]);
            updateData({ 
              ever_drank: val, 
              drink_frequency: val ? undefined : "Never", 
              drinks_per_occasion: undefined, 
              binge_drinking_freq: undefined 
            });
          })}
        </Animated.View>

        {data.ever_drank && (
          <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
            {/* Frequency */}
            <Animated.View layout={LinearTransition} className="mb-6">
              <Text className="text-[16px] font-bold text-foreground tracking-tight">
                How often do you drink? *
              </Text>
              <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
                In an average month or year
              </Text>

              <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("drink_frequency") ? "border border-destructive bg-destructive/5" : ""}`}>
                {[
                  { val: "Never", label: "Never" },
                  { val: "Monthly or less", label: "Monthly or less" },
                  { val: "2-4x/month", label: "2 to 4 times a month" },
                  { val: "2-3x/week", label: "2 to 3 times a week" },
                  { val: "4+/week", label: "4 or more times a week" }
                ].map((opt) => {
                  const isActive = data.drink_frequency === opt.val;
                  return (
                    <AnimatedButton
                      key={opt.val} 
                      onPress={() => {
                        setErrorFields((prev) => prev.filter((f) => f !== "drink_frequency"));
                        if (opt.val === "Never") {
                          updateData({ 
                            drink_frequency: opt.val, 
                            drinks_per_occasion: undefined, 
                            binge_drinking_freq: undefined 
                          });
                        } else {
                          updateData({ drink_frequency: opt.val });
                        }
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

            {showDependentQuestions && (
              <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
                {/* Drinks per occasion */}
                <Animated.View layout={LinearTransition} className="mb-6">
                  <Text className="text-[16px] font-bold text-foreground tracking-tight">
                    How many drinks do you usually have? *
                  </Text>
                  <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
                    1 drink ≈ 1 bottle of beer, 1 glass of wine, or 1 shot
                  </Text>

                  <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("drinks_per_occasion") ? "border border-destructive bg-destructive/5" : ""}`}>
                    {[
                      { val: "1-2", label: "1 or 2 drinks" },
                      { val: "3-4", label: "3 or 4 drinks" },
                      { val: "5+", label: "5 or more drinks" }
                    ].map((opt) => {
                      const isActive = data.drinks_per_occasion === opt.val;
                      return (
                        <AnimatedButton
                          key={opt.val} 
                          onPress={() => {
                            setErrorFields((prev) => prev.filter((f) => f !== "drinks_per_occasion"));
                            updateData({ drinks_per_occasion: opt.val });
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
                
                {/* Heavy drinking frequency */}
                <Animated.View layout={LinearTransition} className="mb-2">
                  <Text className="text-[16px] font-bold text-foreground tracking-tight">
                    How often do you have several drinks in one sitting? *
                  </Text>
                  <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
                    6 or more drinks on a single occasion
                  </Text>

                  <View className={`flex-col gap-2 p-1 rounded-2xl ${errorFields.includes("binge_drinking_freq") ? "border border-destructive bg-destructive/5" : ""}`}>
                    {[
                      { val: "Never", label: "Never" },
                      { val: "Monthly or less", label: "Monthly or less" },
                      { val: "2-4x/month", label: "2 to 4 times a month" },
                      { val: "2-3x/week", label: "2 to 3 times a week" },
                      { val: "4+/week", label: "4 or more times a week" }
                    ].map((opt) => {
                      const isActive = data.binge_drinking_freq === opt.val;
                      return (
                        <AnimatedButton
                          key={opt.val} 
                          onPress={() => {
                            setErrorFields((prev) => prev.filter((f) => f !== "binge_drinking_freq"));
                            updateData({ binge_drinking_freq: opt.val });
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
              </Animated.View>
            )}
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
          accessibilityLabel="Proceed to step 5"
          className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
        >
          <Text className="text-[16px] font-bold text-primary-foreground">Next Step</Text>
          <Feather name="arrow-right" size={18} color="#ffffff" className="ml-2" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}
