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

import Svg, { Defs, Mask, Rect, Path, G } from "react-native-svg";
import { theme } from "../../constants/theme";

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
      "Your daily cardiovascular snapshot. Keep this in the 'Stable' zone by completing your daily tasks.",
    icon: "activity",
    targetArea: "score",
    badgeText: "Step 1 of 4 • Core Metric",
  },
  {
    id: "step-2",
    title: "Daily Heart Missions",
    description:
      "Your personalized goals. We break down exactly what you need to do today, like checking your blood pressure or taking a walk.",
    icon: "target",
    targetArea: "missions",
    badgeText: "Step 2 of 4 • What to do",
  },
  {
    id: "step-3",
    title: "The Quick Log Cards",
    description:
      "Tap the blue or orange '+' buttons on these cards anytime to instantly log your meals or vitals. This powers your Heart Score.",
    icon: "plus-circle",
    targetArea: "vitals",
    badgeText: "Step 3 of 4 • How to use",
  },
  {
    id: "step-4",
    title: "AI Insights & Trends",
    description:
      "As you log, our AI will generate clinical insights and spot trends to help you understand your heart better.",
    icon: "trending-up",
    targetArea: "summary",
    badgeText: "Step 4 of 4 • The Value",
  },
];

interface DashboardTutorialModalProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
  targetLayouts?: Record<string, { x: number; y: number; width: number; height: number }>;
  onStepChange?: (stepIndex: number) => void;
}

export function DashboardTutorialModal({
  visible,
  onClose,
  isDark = false,
  targetLayouts,
  onStepChange,
}: DashboardTutorialModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const step = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const currentLayout = targetLayouts?.[step.targetArea];

  // Hardcoded fallback for Score Ring if layouts aren't passed
  const isFirstStep = currentStepIndex === 0;

  let fallbackTx = 16;
  let fallbackTy = 0;
  let fallbackTw = screenWidth - 32;
  let fallbackTh = 0;

  if (currentStepIndex === 0) { // Score
    fallbackTy = 130;
    fallbackTh = 350;
  } else if (currentStepIndex === 1) { // Missions
    fallbackTy = 150; // Adjusted for scrolling
    fallbackTh = 140;
  } else if (currentStepIndex === 2) { // Quick Log
    fallbackTy = 150; // Adjusted for scrolling
    fallbackTh = 160;
  } else { // Insights
    fallbackTy = 150; // Adjusted for scrolling
    fallbackTh = 80;
  }

  const tx = currentLayout?.x ?? fallbackTx;
  const ty = currentLayout?.y ?? fallbackTy;
  const tw = currentLayout?.width ?? fallbackTw;
  const th = currentLayout?.height ?? fallbackTh;

  const arrowSpace = (screenHeight - 280) - (ty + th);
  const showArrow = arrowSpace > 20;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = currentStepIndex + 1;
      setCurrentStepIndex(nextStep);
      onStepChange?.(nextStep);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex > 0) {
      const prevStep = currentStepIndex - 1;
      setCurrentStepIndex(prevStep);
      onStepChange?.(prevStep);
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
      <View style={{ flex: 1 }}>
        {/* ── Spotlight SVG Mask ── */}
        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
          <Defs>
            <Mask id="spotlightMask">
              <Rect x="0" y="0" width="100%" height="100%" fill="white" />
              <Rect x={tx} y={ty} width={tw} height={th} rx={24} fill="black" />
            </Mask>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#spotlightMask)" />

          {/* Connective Line / Pointer */}
          {showArrow && (
            <G>
              <Path
                d={`M ${screenWidth / 2} ${ty + th + Math.min(arrowSpace, 60)} L ${screenWidth / 2} ${ty + th + 15}`}
                stroke="white"
                strokeWidth="2"
                strokeDasharray="6, 6"
                fill="none"
                opacity={0.9}
              />
              {/* Arrowhead */}
              <Path
                d={`M ${screenWidth / 2 - 8} ${ty + th + 25} L ${screenWidth / 2} ${ty + th + 15} L ${screenWidth / 2 + 8} ${ty + th + 25}`}
                stroke="white"
                strokeWidth="2.5"
                fill="none"
              />
            </G>
          )}
        </Svg>

        {/* ── UI Layer ── */}
        <View className="flex-1 justify-end" pointerEvents="box-none">
          {/* ── Floating Tooltip Card ── */}
          <Reanimated.View
            entering={FadeIn.duration(240)}
            key={step.id}
            className="w-full bg-surface dark:bg-surface-alt border-t border-white/20 dark:border-slate-700 shadow-2xl rounded-t-[32px] px-6 pt-6 pb-12"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header Row: Badge & Skip Button */}
            <View className="flex-row items-center justify-between mb-3.5 w-full">
              <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-mid/10 dark:bg-sky/20 border border-sky-mid/20 dark:border-sky/20 flex-shrink mr-2">
                <Feather name={step.icon} size={11} color={isDark ? "#38bdf8" : "#0284c7"} />
                <Text
                  className="text-[10.5px] font-bold text-sky-mid dark:text-sky uppercase tracking-wider flex-shrink"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {step.badgeText}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleComplete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="py-1 flex-shrink-0"
              >
                <Text className="text-[12px] font-semibold text-text-soft dark:text-text-muted">
                  Skip Tour
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title & Description */}
            <Text className="text-[19px] font-bold text-text dark:text-white tracking-tight mb-2">
              {step.title}
            </Text>
            <Text className="text-[13.5px] text-text-soft dark:text-slate-300 leading-relaxed mb-6 font-medium">
              {step.description}
            </Text>

            {/* Bottom Bar: Dots Pagination & Navigation Actions */}
            <View className="flex-row items-center justify-between pt-2 border-t border-border/70 dark:border-slate-800">
              {/* Step Dots (Active dot is elongated pill) */}
              <View className="flex-row items-center gap-1.5">
                {TUTORIAL_STEPS.map((_, idx) => {
                  const isActive = idx === currentStepIndex;
                  return (
                    <View
                      key={idx}
                      className={`h-2 rounded-full transition-all ${isActive
                          ? "w-6 bg-sky dark:bg-sky"
                          : "w-2 bg-border dark:bg-slate-700"
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
                    className="px-3 py-2 mr-2"
                  >
                    <Text className="text-[14px] font-bold text-text-soft dark:text-slate-300">
                      &lt; Back
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-sky flex-row items-center gap-1.5 shadow-xs"
                >
                  <Text className="text-[13px] font-bold text-white">
                    {isLastStep ? "Got it!" : "Next"}
                  </Text>
                  {!isLastStep && <Feather name="chevron-right" size={14} color={theme.onPrimary} />}
                </TouchableOpacity>
              </View>
            </View>
          </Reanimated.View>
        </View>
      </View>
    </Modal>
  );
}
