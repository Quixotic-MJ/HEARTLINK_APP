import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export interface ExerciseOverviewProps {
  routine: any;
  stepCount: number;
  onStart: () => void;
  onBack: () => void;
  isLockedCritical?: boolean;
}

export function ExerciseOverview({
  routine,
  stepCount,
  onStart,
  onBack,
  isLockedCritical = false,
}: ExerciseOverviewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="w-full bg-slate-100 relative" style={{ height: width * 0.7 }}>
          <TouchableOpacity
            onPress={onBack}
            className="absolute z-10 w-10 h-10 rounded-full bg-white/50 backdrop-blur-md items-center justify-center"
            style={{ top: Math.max(insets.top, 10) + 10, left: 15 }}
          >
            <Feather name="arrow-left" size={20} color="#1e293b" />
          </TouchableOpacity>
          
          {routine.image ? (
            <Image source={{ uri: routine.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center bg-rose-50">
              <Feather name="activity" size={40} color="#f43f5e" />
            </View>
          )}
        </View>

        <View className="px-6 pt-6 bg-white flex-1 -mt-6 rounded-t-3xl">
          {isLockedCritical && (
            <View className="p-4 rounded-2xl flex-row gap-3 mb-5 bg-red-50 border border-red-200">
              <Feather name="alert-triangle" size={20} color="#DC2626" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-red-900 mb-1">
                  Active Workouts Paused: Critical Cardiac Strain
                </Text>
                <Text className="text-[13px] leading-relaxed font-medium text-red-700">
                  Active cardiovascular workouts are paused to protect your heart. Please rest seated or lying down comfortably and contact your attending care team or emergency services immediately.
                </Text>
              </View>
            </View>
          )}

          <Text className="text-[28px] font-bold text-slate-900 leading-tight mb-4">
            {routine.title}
          </Text>
          
          <View className="flex-row flex-wrap gap-2 mb-8">
            <View className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
              <Text className="text-[13px] font-bold text-rose-700">{routine.duration} min</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Text className="text-[13px] font-bold text-slate-700">{routine.intensity} Intensity</Text>
            </View>
            <View className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Text className="text-[13px] font-bold text-slate-700">{stepCount} movements</Text>
            </View>
          </View>
          
          {routine.goal ? (
            <>
              <Text className="text-[18px] font-semibold text-slate-900 mb-2">Why this movement?</Text>
              <Text className="text-[16px] text-slate-600 leading-relaxed mb-8">{routine.goal}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 w-full px-6 pt-4 pb-6 bg-white border-t border-slate-100">
         <TouchableOpacity 
           activeOpacity={isLockedCritical ? 1 : 0.8}
           disabled={isLockedCritical}
           onPress={onStart}
           className={`w-full py-4 rounded-full items-center justify-center shadow-sm ${
             isLockedCritical ? "bg-slate-300" : "bg-slate-900"
           }`}
         >
           <Text className={`font-bold tracking-wide ${
             isLockedCritical ? "text-slate-500 text-[15px]" : "text-white text-[18px]"
           }`}>
             {isLockedCritical ? "WORKOUT PAUSED (CRITICAL STRAIN)" : "START EXERCISE"}
           </Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
