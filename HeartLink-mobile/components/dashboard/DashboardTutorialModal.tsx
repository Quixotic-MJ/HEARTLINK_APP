import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import Reanimated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  targetArea: "score" | "vitals" | "missions" | "summary";
  badgeText: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "step-1",
    title: "Your Heart Health Score",
    description:
      "This is your real-time cardiovascular stability score (0–100). It dynamically adapts based on your blood pressure, salt intake, exercise, and sleep.",
    icon: "activity",
    targetArea: "score",
    badgeText: "Step 1 of 4 • Core Metric",
  },
  {
    id: "step-2",
    title: "Live Vitals & Blood Pressure",
    description:
      "Track your latest blood pressure and pulse rate. Tap either card anytime to log a new reading with our calm medical guidance.",
    icon: "heart",
    targetArea: "vitals",
    badgeText: "Step 2 of 4 • Daily Check",
  },
  {
    id: "step-3",
    title: "Today's 4 Heart Missions",
    description:
      "Protect your heart with 4 daily pillars: Morning blood pressure check, DOST-FNRI salt budget (2,000 mg), 30 mins cardio, and restful sleep.",
    icon: "check-circle",
    targetArea: "missions",
    badgeText: "Step 3 of 4 • Habit Hub",
  },
  {
    id: "step-4",
    title: "Doctor Consultation Summary",
    description:
      "When visiting your cardiologist or clinic, tap this card to generate a clean 1-page PDF summary of your 30-day vitals and salt balance.",
    icon: "file-text",
    targetArea: "summary",
    badgeText: "Step 4 of 4 • Clinical Export",
  },
];

interface DashboardTutorialModalProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export function DashboardTutorialModal({
  visible,
  onClose,
  isDark = false,
}: DashboardTutorialModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Dimmed Dark Backdrop ── */}
      <View className="flex-1 bg-black/65 justify-center items-center px-6">
        {/* ── Floating Tooltip Card ── */}
        <Reanimated.View
          entering={FadeIn.duration(240)}
          key={step.id}
          className="w-full max-w-sm bg-white dark:bg-[#1A2634] rounded-3xl p-6 border border-white/20 dark:border-slate-700 shadow-2xl"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header Row: Badge & Skip Button */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B6E63]/10 dark:bg-[#1B6E63]/25 border border-[#1B6E63]/20">
              <Feather name={step.icon} size={11} color={isDark ? "#4FA79A" : "#1B6E63"} />
              <Text className="text-[10.5px] font-bold text-[#1B6E63] dark:text-[#4FA79A] uppercase tracking-wider">
                {step.badgeText}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleComplete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="py-1 px-2"
            >
              <Text className="text-[12px] font-semibold text-[#5C6B66] dark:text-slate-400">
                Skip Tour
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title & Description */}
          <Text className="text-[19px] font-bold text-[#152131] dark:text-white tracking-tight mb-2">
            {step.title}
          </Text>
          <Text className="text-[13.5px] text-[#5C6B66] dark:text-slate-300 leading-relaxed mb-6 font-medium">
            {step.description}
          </Text>

          {/* Bottom Bar: Dots Pagination & Navigation Actions */}
          <View className="flex-row items-center justify-between pt-2 border-t border-[#DCE3DF]/70 dark:border-slate-800">
            {/* Step Dots (Active dot is elongated pill) */}
            <View className="flex-row items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <View
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? "w-6 bg-[#1B6E63] dark:bg-[#4FA79A]"
                        : "w-2 bg-[#DCE3DF] dark:bg-slate-700"
                    }`}
                  />
                );
              })}
            </View>

            {/* Back & Next Buttons */}
            <View className="flex-row items-center gap-2">
              {currentStepIndex > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBack}
                  className="px-3 py-2 rounded-xl bg-[#EDF1EF] dark:bg-slate-800"
                >
                  <Text className="text-[12px] font-bold text-[#5C6B66] dark:text-slate-300">
                    Back
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#1B6E63] flex-row items-center gap-1.5 shadow-xs"
              >
                <Text className="text-[13px] font-bold text-white">
                  {isLastStep ? "Got it! 🎉" : "Next"}
                </Text>
                {!isLastStep && <Feather name="chevron-right" size={14} color="#ffffff" />}
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
