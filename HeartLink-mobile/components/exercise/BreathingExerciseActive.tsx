import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export interface BreathingExerciseActiveProps {
  routine: any;
  onFinish: () => void;
  onClose: () => void;
  onSymptoms: () => void;
}

export function BreathingExerciseActive({
  routine,
  onFinish,
  onClose,
  onSymptoms
}: BreathingExerciseActiveProps) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);

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
               {routine?.title || "Basal Paced Breathing"}
             </Text>
             <Text className="text-slate-500 font-medium text-[13px]">
               2:21 of {routine?.duration || "10"}:00
             </Text>
           </View>
           
           {/* Sound Toggle */}
           <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center">
             <Feather name="volume-2" size={18} color="#0f172a" />
           </TouchableOpacity>
        </View>
        
        {/* Progress Bar */}
        <View className="w-full h-1 bg-slate-200">
          <View className="h-full bg-sky-500 w-1/4 rounded-r-full" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-12 pb-32">
        {/* Main Circle */}
        <View className="items-center mb-8">
          <View className="w-32 h-32 rounded-full bg-sky-100 items-center justify-center mb-6">
            <View className="w-24 h-24 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30">
              <Text className="text-white text-4xl font-bold">2</Text>
            </View>
          </View>

          <Text className="text-slate-900 text-[18px] font-bold mb-1">Cycle 11 of 20</Text>
          <Text className="text-slate-500 text-[13px]">Step 2 of 4</Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-8 mb-12">
          <TouchableOpacity className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="rewind" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-sky-500 items-center justify-center shadow-md shadow-sky-500/20"
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

        {/* Steps List */}
        <View className="px-6">
          <Text className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            This Cycle
          </Text>
          
          <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center shadow-sm shadow-slate-100">
            <View className="w-6 h-6 rounded-full bg-sky-500 items-center justify-center mr-4">
              <Feather name="check" size={14} color="#fff" />
            </View>
            <Text className="flex-1 text-[14px] font-medium text-slate-600">Sit comfortably, upright</Text>
          </View>
          
          <View className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-3 flex-row items-center">
            <View className="w-6 h-6 rounded-full bg-sky-500 items-center justify-center mr-4">
              <Text className="text-white text-[12px] font-bold">2</Text>
            </View>
            <Text className="flex-1 text-[14px] font-bold text-sky-700">Inhale through the nose</Text>
            <Text className="text-[12px] font-bold text-sky-600">4s</Text>
          </View>
          
          <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center shadow-sm shadow-slate-100">
            <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center mr-4">
              <Text className="text-slate-600 text-[12px] font-bold">3</Text>
            </View>
            <Text className="flex-1 text-[14px] font-medium text-slate-600">Hold gently</Text>
            <Text className="text-[12px] font-medium text-slate-400">3s</Text>
          </View>
          
          <View className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row items-center shadow-sm shadow-slate-100">
            <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center mr-4">
              <Text className="text-slate-600 text-[12px] font-bold">4</Text>
            </View>
            <Text className="flex-1 text-[14px] font-medium text-slate-600">Exhale through the mouth</Text>
            <Text className="text-[12px] font-medium text-slate-400">6s</Text>
          </View>
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
