import React, { useState, useEffect } from "react";
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const totalSeconds = (routine?.duration_minutes || routine?.duration || 10) * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;
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
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const steps = routine?.steps || [];
  let currentStepIdx = 0;
  let currentStepElapsed = 0;
  
  if (steps.length > 0) {
    // Breathing routines typically loop. We calculate the total cycle length.
    const cycleLength = steps.reduce((acc: number, s: any) => acc + (s.duration_seconds || 5), 0);
    const cycleElapsed = elapsedSeconds % (cycleLength || 1);
    
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      const d = steps[i].duration_seconds || 5;
      if (cycleElapsed < acc + d) {
        currentStepIdx = i;
        currentStepElapsed = cycleElapsed - acc;
        break;
      }
      acc += d;
    }
  }

  const currentStep = steps[currentStepIdx] || { instruction: "Breathe deeply" };
  const stepDuration = currentStep.duration_seconds || 5;
  const stepRemaining = stepDuration - currentStepElapsed;
  const progressPercent = Math.min(100, (elapsedSeconds / totalSeconds) * 100);

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
               {routine?.name || routine?.title || "Breathing Exercise"}
             </Text>
             <Text className="text-slate-500 font-medium text-[13px]">
               {formatTime(elapsedSeconds)} of {formatTime(totalSeconds)}
             </Text>
           </View>
           
           {/* Sound Toggle */}
           <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center">
             <Feather name="volume-2" size={18} color="#0f172a" />
           </TouchableOpacity>
        </View>
        
        {/* Progress Bar */}
        <View className="w-full h-1 bg-slate-200">
          <View className="h-full bg-sky-500 rounded-r-full" style={{ width: `${progressPercent}%` }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pt-12 pb-32">
        {/* Main Circle */}
        <View className="items-center mb-8">
          <View className="w-32 h-32 rounded-full bg-sky-100 items-center justify-center mb-6">
            <View className="w-24 h-24 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30">
              <Text className="text-white text-4xl font-bold">{Math.max(1, stepRemaining)}</Text>
            </View>
          </View>

          <Text className="text-slate-900 text-[18px] font-bold mb-1 px-4 text-center">
            {currentStep.instruction || "Focus on your breath"}
          </Text>
          <Text className="text-slate-500 text-[13px]">
            Step {currentStepIdx + 1} of {Math.max(1, steps.length)}
          </Text>
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
            Cycle Steps
          </Text>
          
          {steps.map((step: any, idx: number) => {
            const isCompleted = idx < currentStepIdx;
            const isActive = idx === currentStepIdx;
            
            if (isActive) {
              return (
                <View key={idx} style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{idx + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: 'bold', color: '#0369a1' }}>
                    {step.instruction || `Step ${idx + 1}`}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0284c7' }}>
                    {step.duration_seconds || 5}s
                  </Text>
                </View>
              );
            }
            
            if (isCompleted) {
              return (
                <View key={idx} style={{ backgroundColor: 'white', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#64748b' }}>
                    {step.instruction || `Step ${idx + 1}`}
                  </Text>
                </View>
              );
            }
            
            return (
              <View key={idx} style={{ backgroundColor: 'white', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ color: '#475569', fontSize: 12, fontWeight: 'bold' }}>{idx + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#475569' }}>
                  {step.instruction || `Step ${idx + 1}`}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8' }}>
                  {step.duration_seconds || 5}s
                </Text>
              </View>
            );
          })}
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
      </View>
    </View>
  );
}
