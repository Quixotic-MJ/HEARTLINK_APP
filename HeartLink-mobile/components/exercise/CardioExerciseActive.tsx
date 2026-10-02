import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, AccessibilityInfo, Alert } from "react-native";
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
  const [isMuted, setIsMuted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

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

  const currentPace = routine?.pace || 12.5;
  const currentCalories = Math.floor((calPerHour / 3600) * elapsedSeconds);
  const distanceKm = ((1 / currentPace) * (elapsedSeconds / 60)).toFixed(2);

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
               {routine?.title || "20-Minute Neighborhood Walk"}
             </Text>
             <Text className="text-text-soft font-medium text-[13px]">
               {routine?.type || "Cardio"} - {routine?.intensity || "Low"} Intensity
             </Text>
           </View>
           
           {/* Sound Toggle */}
           <TouchableOpacity 
             onPress={() => setIsMuted(!isMuted)}
             className="w-10 h-10 rounded-full bg-surface-alt items-center justify-center"
             accessibilityLabel={isMuted ? "Unmute sound" : "Toggle sound"}
             accessibilityRole="button"
           >
             <Feather name={isMuted ? "volume-x" : "volume-2"} size={18} color={theme.ink} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-10 pb-32">
        {/* Main Timer Circle */}
        <View className="items-center mb-10">
          <View className="w-56 h-56 rounded-full border-[6px] border-border items-center justify-center relative">
            {/* Mock progress indicator on the top */}
            <View 
              className="absolute w-3 h-3 rounded-full bg-primary" 
              style={{
                top: -6,
                transform: !reduceMotion ? [
                  { translateY: 112 },
                  { rotate: `${(elapsedSeconds / totalSeconds) * 360}deg` },
                  { translateY: -112 }
                ] : []
              }}
            />
            
            <Text className="text-text text-[48px] font-bold tracking-wider">{formatTime(elapsedSeconds)}</Text>
            <Text className="text-text-soft text-[14px]">of {routine?.duration_minutes || routine?.duration || 20}:00 goal</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between px-6 mb-10 gap-3">
          <View className="flex-1 bg-surface border border-border rounded-2xl py-4 items-center justify-center shadow-sm">
            <Text className="text-text text-[18px] font-bold mb-1">{currentPace}</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">Pace /km</Text>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-2xl py-4 items-center justify-center shadow-sm">
            <Text className="text-text text-[18px] font-bold mb-1">{distanceKm}</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">km</Text>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-2xl py-4 items-center justify-center shadow-sm">
            <Text className="text-text text-[18px] font-bold mb-1">{currentCalories}</Text>
            <Text className="text-slate-400 text-[11px] uppercase tracking-wider">kcal est.</Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-center gap-6 mb-10">
          <TouchableOpacity 
            onPress={() => Alert.alert("Lap Marked", `Lap marked at ${formatTime(elapsedSeconds)}`)}
            className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center"
            accessibilityLabel="Mark lap"
            accessibilityRole="button"
          >
            <Feather name="flag" size={20} color={theme.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/30"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            accessibilityRole="button"
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
          <TouchableOpacity 
            onPress={() => Alert.alert("Route Map", "Feature coming soon")}
            className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center"
            accessibilityLabel="View route"
            accessibilityRole="button"
          >
            <Feather name="map-pin" size={20} color={theme.textSoft} />
          </TouchableOpacity>
        </View>

        {/* Instructions Collapsible */}
        <View className="px-6 mb-6">
          <View className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <TouchableOpacity 
              onPress={() => setShowInstructions(!showInstructions)}
              className="flex-row justify-between items-center p-5"
              accessibilityLabel={showInstructions ? "Hide instructions" : "Show instructions"}
              accessibilityRole="button"
            >
              <Text className="text-text font-bold text-[15px]">How to perform</Text>
              <Feather name={showInstructions ? "chevron-up" : "chevron-down"} size={20} color={theme.ink} />
            </TouchableOpacity>
            
            {showInstructions && (
              <View className="px-5 pb-5">
                {routine?.steps && routine.steps.length > 0 ? (
                  routine.steps.map((step: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: 16 }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', marginRight: 12 }}>{idx + 1}.</Text>
                      <Text style={{ flex: 1, color: theme.textSoft, fontSize: 14, lineHeight: 22 }}>
                        {typeof step === 'string' ? step.trim() : (step.instruction || '').trim()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View className="flex-row mb-4">
                      <Text className="text-primary font-bold mr-3">1.</Text>
                      <Text className="flex-1 text-text-soft text-[14px] leading-relaxed">Warm up with light stretching.</Text>
                    </View>
                    <View className="flex-row mb-4">
                      <Text className="text-primary font-bold mr-3">2.</Text>
                      <Text className="flex-1 text-text-soft text-[14px] leading-relaxed">Walk at a comfortable, conversational pace.</Text>
                    </View>
                    <View className="flex-row mb-2">
                      <Text className="text-primary font-bold mr-3">3.</Text>
                      <Text className="flex-1 text-text-soft text-[14px] leading-relaxed">Cool down with a slower pace near the end.</Text>
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
            className="w-full py-4 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/20"
          >
            <Text className="text-white font-bold tracking-wide text-[16px]">FINISH ACTIVITY</Text>
          </TouchableOpacity>
        </View>

        {/* Symptoms Link */}
        <TouchableOpacity onPress={onSymptoms} className="items-center pb-8">
          <Text className="text-text-soft underline font-medium text-[14px]">Feeling unwell? End session</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
