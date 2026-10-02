import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, AccessibilityInfo, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export interface StretchingExerciseActiveProps {
  routine: any;
  onFinish: () => void;
  onClose: () => void;
  onSymptoms: () => void;
}

export function StretchingExerciseActive({
  routine,
  onFinish,
  onClose,
  onSymptoms
}: StretchingExerciseActiveProps) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const steps = routine?.steps || [];
  const totalSeconds = steps.length > 0 
    ? steps.reduce((acc: number, s: any) => acc + (s.duration_seconds || 30), 0)
    : (routine?.duration_minutes || routine?.duration || 10) * 60;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && elapsedSeconds < totalSeconds) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (elapsedSeconds >= totalSeconds) {
      setIsPlaying(false);
      onFinish();
    }
    return () => clearInterval(interval);
  }, [isPlaying, elapsedSeconds, totalSeconds, onFinish]);

  let currentStepIndex = 0;
  let currentStepElapsed = 0;
  
  if (steps.length > 0) {
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      const d = steps[i].duration_seconds || 30;
      if (elapsedSeconds < acc + d) {
        currentStepIndex = i;
        currentStepElapsed = elapsedSeconds - acc;
        break;
      }
      acc += d;
      // Handle edge case where we are at the very end
      if (i === steps.length - 1) {
        currentStepIndex = i;
      }
    }
  }

  const totalSteps = steps.length || 1;
  const currentStep = steps[currentStepIndex] || null;
  const stepDuration = currentStep?.duration_seconds || 30;
  const timeRemainingInStep = Math.max(0, stepDuration - currentStepElapsed);
  
  const stepTitle = currentStep 
    ? (typeof currentStep === 'string' ? "Stretch Pose" : currentStep.instruction || "Standing calf stretch")
    : "Standing calf stretch";
    
  const stepHint = currentStep && typeof currentStep === 'object' && currentStep.details
    ? currentStep.details
    : "Keep your back heel flat on the floor. Lean forward slightly.";
    
  const progressPercent = reduceMotion 
    ? (elapsedSeconds >= totalSeconds ? 100 : 0)
    : Math.min(100, (elapsedSeconds / totalSeconds) * 100);

  const handleNext = () => {
    setElapsedSeconds(prev => Math.min(prev + timeRemainingInStep, totalSeconds));
  };

  const handlePrev = () => {
    if (currentStepElapsed > 2) {
      setElapsedSeconds(prev => Math.max(0, prev - currentStepElapsed));
    } else if (currentStepIndex > 0) {
      const prevStepDur = steps[currentStepIndex - 1]?.duration_seconds || 30;
      setElapsedSeconds(prev => Math.max(0, prev - currentStepElapsed - prevStepDur));
    } else {
      setElapsedSeconds(0);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* HEADER SECTION */}
      <View 
        className="w-full relative bg-surface" 
        style={{ paddingTop: Math.max(insets.top, 10) }}
      >
        <View className="flex-row items-center px-4 pb-4">
           {/* Close Button */}
           <TouchableOpacity 
             onPress={onClose} 
             className="w-10 h-10 rounded-full bg-surface-alt items-center justify-center"
             accessibilityLabel="Close"
             accessibilityRole="button"
           >
             <Feather name="x" size={20} color={theme.ink} />
           </TouchableOpacity>
           
           {/* Title */}
           <View className="flex-1 px-4">
             <Text className="text-text font-bold text-[16px]" numberOfLines={1}>
               {routine?.title || "Full Body Stretch"}
             </Text>
             <Text className="text-text-soft font-medium text-[13px]">
               Pose {currentStepIndex + 1} of {totalSteps}
             </Text>
           </View>
           
           {/* Info Toggle */}
           <TouchableOpacity 
             onPress={() => Alert.alert("Pose Info", stepHint)}
             className="w-10 h-10 rounded-full bg-surface-alt items-center justify-center"
             accessibilityLabel="View pose info"
             accessibilityRole="button"
           >
             <Feather name="info" size={18} color={theme.ink} />
           </TouchableOpacity>
        </View>
        
        {/* Progress Bar */}
        <View className="w-full h-1 bg-surface-alt">
          <View className="h-full bg-teal rounded-r-full" style={{ width: `${progressPercent}%` }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-6 pb-32">
        {/* Media Placeholder */}
        <View className="px-5 mb-8">
          <View className="w-full bg-sky-100 rounded-[24px] items-center justify-center overflow-hidden border border-sky-200" style={{ aspectRatio: 16/9 }}>
             {routine?.guideImages?.[currentStepIndex] || routine?.image ? (
                <Image 
                  source={{ uri: routine?.guideImages?.[currentStepIndex] || routine?.image }} 
                  className="w-full h-full" 
                  resizeMode="cover" 
                />
             ) : (
                <View className="items-center justify-center opacity-70">
                   <Feather name="activity" size={48} color={theme.skyMid} />
                </View>
             )}
          </View>
        </View>

        {/* Info Area */}
        <View className="items-center px-6 mb-8">
          <Text className="text-text text-[22px] font-bold text-center mb-4">{stepTitle}</Text>
          
          <View className="flex-row items-baseline justify-center mb-8 gap-2">
            <Text className="text-teal text-[48px] font-medium tracking-tight">{timeRemainingInStep}</Text>
            <Text className="text-text-soft font-bold text-[14px]">sec hold</Text>
          </View>

          {/* Hint Card */}
          <View className="w-full bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <Text className="text-text-soft text-[14px] leading-relaxed font-medium">
              {stepHint}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-8 mb-12">
          <TouchableOpacity 
            onPress={handlePrev}
            className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center"
            accessibilityLabel="Previous pose"
            accessibilityRole="button"
          >
            <Feather name="rewind" size={20} color={theme.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-teal items-center justify-center shadow-lg shadow-teal/30"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            accessibilityRole="button"
          >
            {isPlaying ? (
               <View className="flex-row gap-1">
                 <View className="w-1.5 h-6 bg-white rounded-full" />
                 <View className="w-1.5 h-6 bg-white rounded-full" />
               </View>
            ) : (
               <Feather name="play" size={28} color="#fff" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleNext}
            className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center"
            accessibilityLabel="Next pose"
            accessibilityRole="button"
          >
            <Feather name="fast-forward" size={20} color={theme.textSoft} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View 
        className="absolute bottom-0 w-full bg-white/95 pt-4 pb-2 border-t border-border items-center justify-center"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity onPress={onSymptoms} className="py-3 px-6 mb-2">
          <Text className="text-[14px] font-medium text-text-soft underline">
            Feeling unwell? End session
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
