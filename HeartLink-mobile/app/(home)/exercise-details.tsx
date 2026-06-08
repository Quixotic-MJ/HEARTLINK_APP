import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ExerciseDetailsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4 border-b border-slate-200/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/70 items-center justify-center mr-4 shadow-sm shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[12px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            Exercise
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Title area */}
        <View className="mb-6">
           <Text className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
             Your Daily Action Plan
           </Text>
           <Text className="text-[13px] text-slate-500 mt-2 font-medium">
             Precision health strategies tailored for today.
           </Text>
        </View>

        {/* CSS Status Banner */}
        <View className="bg-blue-50 border border-blue-100 rounded-3xl p-5 mb-8">
           <View className="flex-row items-center mb-2">
              <View className="bg-[#1e4ed8] px-2 py-1 rounded-md mr-2">
                 <Text className="text-[10px] font-bold text-white uppercase tracking-widest">Active Plan</Text>
              </View>
              <Text className="text-[12px] font-bold text-[#1e4ed8]">CSS Score: 85 (Stable)</Text>
           </View>
           <Text className="text-[14px] text-slate-900 font-medium leading-relaxed mb-4">
              Based on your current CSS (85 - Stable), here are your personalized recommendations for today.
           </Text>
           <View className="w-12 h-12 bg-[#1e4ed8] rounded-2xl items-center justify-center">
              <Text className="text-[18px] font-bold text-white">85</Text>
              <Text className="text-[8px] font-bold text-blue-200 -mt-1 uppercase">Score</Text>
           </View>
        </View>

        <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center mb-6 px-4">
           Note: These are lifestyle suggestions, not medical prescriptions. Always listen to your body.
        </Text>

        {/* Exercise Card */}
        <View className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm shadow-slate-200/50">
           {/* Image Placeholder */}
           <View className="w-full h-48 bg-slate-100 items-center justify-center relative">
              <MaterialCommunityIcons name="yoga" size={48} color="#94a3b8" />
              <View className="absolute bottom-3 left-3 bg-white/90 px-3 py-1 rounded-full">
                 <Text className="text-[10px] font-bold text-slate-900 uppercase">Beginner</Text>
              </View>
           </View>
           
           <View className="p-5">
              <View className="flex-row items-center justify-between mb-3">
                 <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="chair-school" size={20} color="#0f172a" />
                 </View>
                 <View className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                    <Text className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest">Recommended</Text>
                 </View>
              </View>

              <Text className="text-[22px] font-bold text-slate-900 mb-1">
                 15-Minute Chair Yoga
              </Text>

              <View className="flex-row items-center mb-4">
                 <Text className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mr-3">Low Impact</Text>
                 <Text className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Improves Circulation</Text>
              </View>

              <Text className="text-[14px] text-slate-600 leading-relaxed font-medium italic mb-6">
                 "A gentle routine designed to improve blood flow without overexerting the heart. Stay seated and keep your breathing steady."
              </Text>

              <TouchableOpacity className="bg-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center">
                 <Text className="text-[14px] font-bold text-white mr-2">Begin Session</Text>
                 <Feather name="play" size={14} color="#fff" />
              </TouchableOpacity>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
