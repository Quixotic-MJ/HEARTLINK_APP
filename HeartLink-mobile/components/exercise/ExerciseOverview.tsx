import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export interface ExerciseOverviewProps {
  routine: any;
  stepCount: number;
  onStart: () => void;
  onBack: () => void;
  isLockedCritical?: boolean;
  hasRecentSevereSymptom?: boolean;
  onClearSymptomLock?: () => void;
}

export function ExerciseOverview({
  routine,
  stepCount,
  onStart,
  onBack,
  isLockedCritical = false,
  hasRecentSevereSymptom = false,
  onClearSymptomLock,
}: ExerciseOverviewProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"guide" | "video">("guide");

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Top Header / Image Area */}
        <View className="w-full bg-slate-100 relative" style={{ height: width * 0.6 }}>
          <TouchableOpacity
            onPress={onBack}
            className="absolute z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md items-center justify-center shadow-sm"
            style={{ top: 15, left: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#0f172a" />
          </TouchableOpacity>
          
          {routine.image ? (
            <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center opacity-50">
              <Feather name="activity" size={48} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="px-5 pt-6 bg-white flex-1 -mt-4 rounded-t-3xl">
          {isLockedCritical && (
            <View className="p-4 rounded-2xl flex-col mb-5 bg-red-50 border border-red-200">
              <View className="flex-row gap-3 mb-2">
                <Feather name="alert-triangle" size={20} color="#dc2626" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-red-900 mb-1">
                    Active Workouts Paused: Critical Cardiac Strain
                  </Text>
                  <Text className="text-[13px] leading-relaxed font-medium text-red-700">
                    Active cardiovascular workouts are paused to protect your heart. Please rest seated or lying down comfortably and contact your attending care team or emergency services immediately.
                  </Text>
                </View>
              </View>
              {hasRecentSevereSymptom && onClearSymptomLock && (
                <TouchableOpacity
                  onPress={onClearSymptomLock}
                  className="mt-2 w-full py-3 bg-red-100 rounded-xl items-center justify-center border border-red-300"
                >
                  <Text className="text-red-800 font-bold text-[14px]">I've been cleared to exercise</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Title */}
          <Text className="text-[26px] font-bold text-slate-900 leading-tight mb-2">
            {routine.title}
          </Text>
          
          {routine.description ? (
            <Text className="text-[14px] text-slate-600 mb-6 leading-relaxed font-medium">
              {routine.description}
            </Text>
          ) : null}
          
          {/* Tags */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            <View className="bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
              <Text className="text-[13px] font-bold text-red-600">{routine.duration} min</Text>
            </View>
            <View className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <Text className="text-[13px] font-bold text-emerald-600">{routine.intensity}</Text>
            </View>
            <View className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <Text className="text-[13px] font-bold text-slate-700">{stepCount} poses</Text>
            </View>
          </View>
          
          {/* Tabs */}
          <View className="flex-row bg-slate-100 rounded-full p-1 mb-6 self-start">
            <TouchableOpacity 
              onPress={() => setActiveTab("guide")}
              className="px-6 py-2 rounded-full"
              style={activeTab === "guide" ? { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : { backgroundColor: 'transparent' }}
            >
              <Text 
                className="text-[14px] font-bold"
                style={{ color: activeTab === "guide" ? "#0284c7" : "#64748b" }}
              >Guide</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab("video")}
              className="px-6 py-2 rounded-full"
              style={activeTab === "video" ? { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : { backgroundColor: 'transparent' }}
            >
              <Text 
                className="text-[14px] font-bold"
                style={{ color: activeTab === "video" ? "#0284c7" : "#64748b" }}
              >Video</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "guide" ? (
            <>
              {/* Description / Goal */}
              {routine.goal ? (
                <View className="mb-6">
                  <Text className="text-[12px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Why this movement?</Text>
                  <Text className="text-[14px] text-slate-700 leading-relaxed font-medium">{routine.goal}</Text>
                </View>
              ) : null}

              {/* What you'll need */}
              {routine.requirements && routine.requirements.length > 0 ? (
                <View className="mb-8">
                  <Text className="text-[12px] font-bold text-slate-400 mb-4 uppercase tracking-widest">What you'll need</Text>
                  <View className="flex-row gap-2 flex-wrap">
                    {routine.requirements.map((req: any, idx: number) => {
                      let iconName: keyof typeof Feather.glyphMap = "check-circle";
                      const label = typeof req === 'string' ? req : (req.name || '');
                      const lower = label.toLowerCase();
                      if (lower.includes('seat') || lower.includes('chair')) iconName = "box";
                      else if (lower.includes('equipment')) iconName = "wind";
                      else if (lower.includes('audio') || lower.includes('music')) iconName = "volume-2";
                      else if (lower.includes('mat')) iconName = "layout";
                      else if (lower.includes('water')) iconName = "droplet";
                      else if (lower.includes('weight') || lower.includes('dumbbell')) iconName = "target";
                      
                      return (
                        <View key={idx} className="flex-1 min-w-[30%] bg-slate-50 border border-slate-100 rounded-xl p-4 items-center justify-center">
                          <Feather name={iconName} size={24} color="#64748b" className="mb-2" />
                          <Text className="text-[12px] font-medium text-slate-600 text-center mt-2">{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Movements / How to perform */}
              <Text className="text-[12px] font-bold text-slate-400 mb-4 uppercase tracking-widest">How to perform</Text>
              <View className="gap-y-4">
                {routine.steps && routine.steps.length > 0 ? (
                  routine.steps.map((step: any, idx: number) => {
                    // Update to light blue theme
                    const bgColors = ["bg-sky-100", "bg-blue-100", "bg-cyan-100", "bg-sky-50", "bg-indigo-100"];
                    const iconColors = ["#0284c7", "#2563eb", "#0891b2", "#0ea5e9", "#4f46e5"];
                    const colorIdx = idx % bgColors.length;
                    
                    const stepText = (typeof step === 'string' ? step : (step.instruction || '')).toLowerCase();
                    let IconComponent: any = Feather;
                    let iconName = "activity";
                    
                    if (stepText.includes("walk")) {
                      IconComponent = FontAwesome5;
                      iconName = "walking";
                    } else if (stepText.includes("run") || stepText.includes("jog") || stepText.includes("warm")) {
                      IconComponent = FontAwesome5;
                      iconName = "running";
                    } else if (stepText.includes("cool") || stepText.includes("shoe")) {
                      IconComponent = FontAwesome5;
                      iconName = "shoe-prints";
                    } else if (stepText.includes("stretch") || stepText.includes("fold")) {
                      IconComponent = FontAwesome5;
                      iconName = "child";
                    } else {
                      const fallback = ["activity", "wind", "heart", "target"];
                      iconName = fallback[idx % fallback.length];
                    }
                    
                    return (
                      <View key={idx} className="mb-2 shadow-sm shadow-slate-100">
                        {/* Media Placeholder */}
                        <View className={`w-full h-40 ${bgColors[colorIdx]} rounded-t-2xl items-center justify-center border-t border-l border-r border-slate-100`}>
                           <IconComponent name={iconName} size={36} color={iconColors[colorIdx]} />
                        </View>
                        
                        {/* Step Details */}
                        <View className="bg-white rounded-b-2xl p-4 flex-row items-start border-b border-l border-r border-slate-100">
                          <View className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center mr-3 mt-1">
                            <Text className="text-[12px] font-bold text-slate-700">{idx + 1}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-[15px] font-bold text-slate-900 mb-1">
                              {typeof step === 'string' ? step.trim() : (step.instruction || `Step ${idx+1}`).trim()}
                            </Text>
                            {typeof step === 'object' && step.details ? (
                              <Text className="text-[13px] font-medium text-slate-500 leading-relaxed">
                                {step.details}
                              </Text>
                            ) : null}
                            {typeof step === 'object' && step.duration_minutes ? (
                               <Text className="text-[13px] font-medium text-slate-400 mt-1">
                                 Hold for {step.duration_minutes} min
                               </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text className="text-slate-500 italic">No movements listed.</Text>
                )}
              </View>
            </>
          ) : (
            <View className="flex-1 pb-4">
              {/* Video Player Placeholder */}
              <View className="w-full aspect-video bg-slate-900 rounded-2xl p-4 justify-between mb-4 border border-slate-800 relative overflow-hidden shadow-md">
                <View className="flex-row justify-end z-10">
                  <View className="bg-black/60 px-2 py-1 rounded">
                    <Text className="text-white text-[11px] font-bold">3:42</Text>
                  </View>
                </View>
                
                <View className="absolute inset-0 items-center justify-center z-10 pointer-events-none">
                  <View className="w-16 h-16 bg-white/90 rounded-full items-center justify-center shadow-lg" />
                </View>
                
                <View className="z-10">
                  <View className="w-full h-[3px] bg-slate-600 rounded-full mb-3">
                    <View className="w-0 h-full bg-sky-500 rounded-full" />
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white text-[12px] font-bold">0:00 / 3:42</Text>
                    <Feather name="maximize" size={16} color="#fff" />
                  </View>
                </View>
              </View>

              {/* Video Pills */}
              <View className="flex-row gap-2 mb-8">
                <View className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Text className="text-slate-700 text-[12px] font-bold">1x</Text>
                </View>
                <View className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Text className="text-slate-700 text-[12px] font-bold">CC: English</Text>
                </View>
                <View className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Text className="text-slate-700 text-[12px] font-bold">Instructor: Dr. Reyes</Text>
                </View>
              </View>

              <Text className="text-slate-900 font-bold text-[18px] mb-4">Jump to</Text>
              
              <View className="gap-2">
                 {routine.steps && routine.steps.length > 0 ? (
                   routine.steps.map((step: any, idx: number) => {
                     const mins = Math.floor((idx * 45) / 60);
                     const secs = (idx * 45) % 60;
                     const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                     return (
                       <TouchableOpacity key={idx} className="bg-white rounded-xl p-4 flex-row items-center border border-slate-100 shadow-sm shadow-slate-100/50">
                         <View className="w-10 h-10 bg-slate-100 rounded-lg mr-4" />
                         <Text className="flex-1 text-slate-900 font-bold text-[14px]">
                           {typeof step === 'string' ? step : (step.instruction || `Part ${idx+1}`)}
                         </Text>
                         <Text className="text-slate-500 text-[12px] font-medium">{timeStr}</Text>
                       </TouchableOpacity>
                     );
                   })
                 ) : (
                   <View className="bg-white rounded-xl p-4 flex-row items-center border border-slate-100 mb-2 shadow-sm shadow-slate-100/50">
                      <View className="w-10 h-10 bg-slate-100 rounded-lg mr-4" />
                      <Text className="flex-1 text-slate-900 font-bold text-[14px]">Warm-up stretch</Text>
                      <Text className="text-slate-500 text-[12px] font-medium">0:00</Text>
                   </View>
                 )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 w-full px-5 pt-4 pb-6 bg-white/95 border-t border-slate-100">
         <TouchableOpacity 
           activeOpacity={isLockedCritical ? 1 : 0.8}
           disabled={isLockedCritical}
           onPress={onStart}
           className="w-full py-4 rounded-full items-center justify-center shadow-lg shadow-sky-500/20"
           style={{ backgroundColor: isLockedCritical ? "#e2e8f0" : "#0ea5e9" }}
         >
           <Text 
             className="font-bold tracking-wide"
             style={{ color: isLockedCritical ? "#64748b" : "white", fontSize: isLockedCritical ? 15 : 16 }}
           >
             {isLockedCritical ? "WORKOUT PAUSED" : "START EXERCISE"}
           </Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
