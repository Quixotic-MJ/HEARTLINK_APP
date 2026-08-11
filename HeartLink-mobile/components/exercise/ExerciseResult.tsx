import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

export interface ExerciseResultProps {
  routine: any;
  sessionDurationSeconds: number;
  onDone: () => void;
}

export function ExerciseResult({ routine, sessionDurationSeconds, onDone }: ExerciseResultProps) {
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) {
      return `${m} min ${s} sec`;
    }
    return `${s} sec`;
  };

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-24 h-24 rounded-full items-center justify-center mb-6 bg-green-100 border-4 border-green-50 shadow-sm">
        <Feather name="check" size={48} color="#16a34a" />
      </View>
      
      <Text className="text-[28px] font-bold text-slate-900 mb-2">Exercise Complete</Text>
      <Text className="text-[20px] font-semibold text-slate-600 mb-8">{routine?.title || "Movement"}</Text>
      
      <View className="bg-slate-50 border border-slate-100 rounded-2xl p-6 w-full items-center mb-10 shadow-sm shadow-slate-100/50">
        <Text className="text-[15px] font-bold text-slate-400 uppercase tracking-widest mb-2">Session Duration</Text>
        <Text className="text-[28px] font-bold text-slate-800">{formatTime(sessionDurationSeconds)}</Text>
      </View>
      
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onDone}
        className="w-full py-4 rounded-full items-center justify-center bg-slate-900 shadow-sm"
      >
        <Text className="text-white text-[16px] font-bold tracking-wide">DONE</Text>
      </TouchableOpacity>
    </View>
  );
}
