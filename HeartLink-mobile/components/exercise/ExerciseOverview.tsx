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
}

export function ExerciseOverview({ routine, stepCount, onStart, onBack }: ExerciseOverviewProps) {
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
           activeOpacity={0.8}
           onPress={onStart}
           className="w-full py-4 rounded-full items-center justify-center bg-slate-900 shadow-sm"
         >
           <Text className="text-white text-[18px] font-bold tracking-wide">START EXERCISE</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}
