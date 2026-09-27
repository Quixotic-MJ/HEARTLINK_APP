import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

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

  // Default step logic for mock purposes
  const currentStepIndex = 3; 
  const totalSteps = routine?.steps?.length || 4;
  const currentStep = routine?.steps?.[currentStepIndex] || null;
  const stepTitle = currentStep 
    ? (typeof currentStep === 'string' ? "Stretch Pose" : currentStep.instruction || "Standing calf stretch")
    : "Standing calf stretch";
    
  const stepHint = currentStep && typeof currentStep === 'object' && currentStep.details
    ? currentStep.details
    : "Keep your back heel flat on the floor. Lean forward slightly.";

  return (
    <View className="flex-1 bg-white">
      {/* HEADER SECTION */}
      <View 
        className="w-full relative bg-slate-50" 
        style={{ paddingTop: Math.max(insets.top, 10) }}
      >
        <View className="flex-row items-center px-4 pb-4">
           {/* Close Button */}
           <TouchableOpacity 
             onPress={onClose} 
             className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center"
           >
             <Feather name="x" size={20} color="#0f172a" />
           </TouchableOpacity>
           
           {/* Title */}
           <View className="flex-1 px-4">
             <Text className="text-slate-900 font-bold text-[16px]" numberOfLines={1}>
               {routine?.title || "Full Body Stretch"}
             </Text>
             <Text className="text-slate-500 font-medium text-[13px]">
               Pose {currentStepIndex + 1} of {totalSteps}
             </Text>
           </View>
           
           {/* Info Toggle */}
           <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center">
             <Feather name="info" size={18} color="#0f172a" />
           </TouchableOpacity>
        </View>
        
        {/* Progress Bar */}
        <View className="w-full h-1 bg-slate-200">
          <View className="h-full bg-sky-500 rounded-r-full" style={{ width: '80%' }} />
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
                   <Feather name="activity" size={48} color="#0284c7" />
                </View>
             )}
          </View>
        </View>

        {/* Info Area */}
        <View className="items-center px-6 mb-8">
          <Text className="text-slate-900 text-[22px] font-bold text-center mb-4">{stepTitle}</Text>
          
          <View className="flex-row items-baseline justify-center mb-8 gap-2">
            <Text className="text-sky-500 text-[48px] font-medium tracking-tight">22</Text>
            <Text className="text-slate-600 font-bold text-[14px]">sec hold</Text>
          </View>

          {/* Hint Card */}
          <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-100">
            <Text className="text-slate-600 text-[14px] leading-relaxed font-medium">
              {stepHint}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-8 mb-12">
          <TouchableOpacity className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="rewind" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30"
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
          <TouchableOpacity className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="fast-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View 
        className="absolute bottom-0 w-full bg-white/95 pt-4 pb-2 border-t border-slate-100 items-center justify-center"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity onPress={onSymptoms} className="py-3 px-6 mb-2">
          <Text className="text-[14px] font-medium text-slate-500 underline">
            Feeling unwell? End session
          </Text>
        </TouchableOpacity>

        {/* Hidden but functional finish trigger */}
        <TouchableOpacity onPress={onFinish} className="absolute right-6 bottom-8 w-12 h-12 bg-slate-100 rounded-full items-center justify-center">
          <Feather name="check" color="#64748b" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
