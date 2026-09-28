import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export interface CardioExerciseActiveProps {
  routine: any;
  onFinish: () => void;
  onClose: () => void;
  onSymptoms: () => void;
}

export function CardioExerciseActive({
  routine,
  onFinish,
  onClose,
  onSymptoms
}: CardioExerciseActiveProps) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const totalSeconds = (routine?.duration_minutes || routine?.duration || 20) * 60;
  const calPerHour = routine?.calories ? (routine.calories / (totalSeconds / 3600)) : 300; // rough est
  
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentCalories = Math.floor((calPerHour / 3600) * elapsedSeconds);
  const distanceKm = ((1 / 12.5) * (elapsedSeconds / 60)).toFixed(2); // assuming 12.5 min/km pace

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
             <Feather name="x" size={20} color={theme.ink} />
           </TouchableOpacity>
           
           {/* Title */}
           <View className="flex-1 px-4">
             <Text className="text-slate-900 font-bold text-[16px]" numberOfLines={1}>
               {routine?.title || "20-Minute Neighborhood Walk"}
             </Text>
             <Text className="text-slate-500 font-medium text-[13px]">
               {routine?.type || "Cardio"} - {routine?.intensity || "Low"} Intensity
             </Text>
           </View>
           
           {/* Sound Toggle */}
           <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center">
             <Feather name="volume-2" size={18} color={theme.ink} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-10 pb-32">
        {/* Main Timer Circle */}
        <View className="items-center mb-10">
          <View className="w-56 h-56 rounded-full border-[6px] border-slate-100 items-center justify-center relative">
            {/* Mock progress indicator on the top */}
            <View className="absolute -top-[6px] w-3 h-3 rounded-full bg-sky-500" />
            
            <Text className="text-slate-900 text-[48px] font-bold tracking-wider">{formatTime(elapsedSeconds)}</Text>
            <Text className="text-slate-500 text-[14px]">of {routine?.duration_minutes || routine?.duration || 20}:00 goal</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between px-6 mb-10 gap-3">
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 items-center justify-center shadow-sm shadow-slate-100">
            <Text className="text-slate-900 text-[18px] font-bold mb-1">12.5</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">Pace /km</Text>
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 items-center justify-center shadow-sm shadow-slate-100">
            <Text className="text-slate-900 text-[18px] font-bold mb-1">{distanceKm}</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">km</Text>
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 items-center justify-center shadow-sm shadow-slate-100">
            <Text className="text-slate-900 text-[18px] font-bold mb-1">{currentCalories}</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">kcal est.</Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-6 mb-10">
          <TouchableOpacity className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="flag" size={20} color={theme.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30"
          >
            {isPlaying ? (
               <View className="flex-row gap-1">
                 <View className="w-1.5 h-5 bg-white rounded-full" />
                 <View className="w-1.5 h-5 bg-white rounded-full" />
               </View>
            ) : (
               <Feather name="play" size={24} color="#fff" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Feather name="map-pin" size={20} color={theme.textSoft} />
          </TouchableOpacity>
        </View>

        {/* Instructions Collapsible */}
        <View className="px-6 mb-6">
          <View className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
            <TouchableOpacity 
              onPress={() => setShowInstructions(!showInstructions)}
              className="flex-row justify-between items-center p-5"
            >
              <Text className="text-slate-900 font-bold text-[15px]">How to perform</Text>
              <Feather name={showInstructions ? "chevron-up" : "chevron-down"} size={20} color={theme.ink} />
            </TouchableOpacity>
            
            {showInstructions && (
              <View className="px-5 pb-5">
                {routine?.steps && routine.steps.length > 0 ? (
                  routine.steps.map((step: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: 16 }}>
                      <Text style={{ color: theme.sky, fontWeight: 'bold', marginRight: 12 }}>{idx + 1}.</Text>
                      <Text style={{ flex: 1, color: '#475569', fontSize: 14, lineHeight: 22 }}>
                        {typeof step === 'string' ? step.trim() : (step.instruction || '').trim()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View className="flex-row mb-4">
                      <Text className="text-sky-500 font-bold mr-3">1.</Text>
                      <Text className="flex-1 text-slate-600 text-[14px] leading-relaxed">Warm up with light stretching.</Text>
                    </View>
                    <View className="flex-row mb-4">
                      <Text className="text-sky-500 font-bold mr-3">2.</Text>
                      <Text className="flex-1 text-slate-600 text-[14px] leading-relaxed">Walk at a comfortable, conversational pace.</Text>
                    </View>
                    <View className="flex-row mb-2">
                      <Text className="text-sky-500 font-bold mr-3">3.</Text>
                      <Text className="flex-1 text-slate-600 text-[14px] leading-relaxed">Cool down with a slower pace near the end.</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Finish Button */}
        <View className="px-6 mb-6">
          <TouchableOpacity 
            onPress={onFinish}
            className="w-full py-4 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/20"
          >
            <Text className="text-white font-bold tracking-wide text-[16px]">FINISH ACTIVITY</Text>
          </TouchableOpacity>
        </View>

        {/* Symptoms Link */}
        <TouchableOpacity onPress={onSymptoms} className="items-center pb-8">
          <Text className="text-slate-500 underline font-medium text-[14px]">Feeling unwell? End session</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
