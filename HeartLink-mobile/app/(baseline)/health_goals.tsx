import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  icon,
  title,
  description,
  isSelected,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 flex-row items-center border"
      style={{
        borderColor: isSelected ? "#1e4ed8" : "#e2e8f0",
        backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
      }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-4"
        style={{
          backgroundColor: isSelected ? "#dbeafe" : "#f8fafc",
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isSelected ? "#1e4ed8" : "#94a3b8"}
        />
      </View>
      <View className="flex-1">
        <Text
          className="text-[15px] font-bold mb-1"
          style={{ color: isSelected ? "#1e3a8a" : "#0f172a" }}
        >
          {title}
        </Text>
        <Text className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </Text>
      </View>
      {isSelected && (
        <View className="ml-2 w-5 h-5 rounded-full bg-blue-600 items-center justify-center">
          <Feather name="check" size={12} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Step Progress ────────────────────────────────────────────────────────────

function AnimatedStep({ isActive, isCompleted }: { isActive: boolean; isCompleted: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      flex: withSpring(isActive ? 3 : 1, { damping: 15, stiffness: 150 }),
      backgroundColor: withTiming(
        isActive || isCompleted ? "#0f172a" : "#e2e8f0",
        { duration: 300 }
      ),
    };
  });

  return (
    <Animated.View
      className="h-1.5 rounded-full mx-0.5"
      style={animatedStyle}
    />
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center w-full">
      {Array.from({ length: total }).map((_, i) => (
        <AnimatedStep
          key={i}
          isActive={i + 1 === current}
          isCompleted={i + 1 < current}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HealthGoalsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user_id } = useLocalSearchParams();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const goals = [
    {
      id: "bp",
      icon: "heart-pulse",
      title: "Manage High Blood Pressure",
      description:
        "Tracking systolic and diastolic trends with personalized salt-intake alerts.",
    },
    {
      id: "cholesterol",
      icon: "water-outline",
      title: "Manage Cholesterol Levels",
      description:
        "Optimizing HDL/LDL balance through heart-healthy dietary guidance.",
    },
    {
      id: "recovery",
      icon: "hospital-box-outline",
      title: "Post-Surgery / Cardiac Recovery",
      description: "Guided rehabilitation and mild physical activity routines.",
    },
    {
      id: "prevention",
      icon: "shield-check-outline",
      title: "Preventive Heart Health",
      description:
        "Proactive monitoring of diet and lifestyle to maintain cardiovascular wellness.",
    },
  ] as const;

  const isReady = selectedGoals.length > 0;

  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const handleNext = () => {
    console.log("Selected Goals:", selectedGoals);
    router.push({
      pathname: "/core_biometrics",
      params: { user_id: user_id as string, health_goals: JSON.stringify(selectedGoals) },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
              Step 1 of 5
            </Text>
          </View>
        </View>
        {/* We use 5 steps now conceptually or keep it separate. We'll show 1/5 visually here */}
        <StepProgress current={1} total={5} />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Page title */}
        <View className="mb-6 mt-2">
          <Text className="text-[26px] font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            What is your main focus?
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
            We will tailor your dashboard based on your goals. Select the options
            that apply to your heart health journey.
          </Text>
        </View>

        {/* ── Goals List ── */}
        <View className="mb-6">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              icon={goal.icon}
              title={goal.title}
              description={goal.description}
              isSelected={selectedGoals.includes(goal.id)}
              onPress={() => toggleGoal(goal.id)}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          disabled={!isReady}
          className="w-full rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-8"
          style={{ backgroundColor: isReady ? "#0f172a" : "#e2e8f0" }}
        >
          <Text
            className="text-[15px] font-medium"
            style={{ color: isReady ? "#ffffff" : "#94a3b8" }}
          >
            Continue
          </Text>
          <Feather
            name="arrow-right"
            size={16}
            color={isReady ? "#ffffff" : "#94a3b8"}
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
