import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function RecipeDetailsScreen() {
  const router = useRouter(); 

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/70 items-center justify-center mr-4"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[12px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
            Recipe
          </Text>
        </View>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center border border-slate-200/70">
           <Feather name="bookmark" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
        
        {/* Title & Image area */}
        <View className="px-5 pt-6 pb-6">
           <Text className="text-[32px] font-bold text-slate-900 leading-tight mb-4">
             Grilled Lemon Herb Chicken Salad
           </Text>
           <View className="flex-row items-center mb-6">
              <View className="bg-slate-100 px-3 py-1.5 rounded-full mr-2">
                 <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Low Sodium</Text>
              </View>
              <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                 <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High Protein</Text>
              </View>
           </View>

           {/* Placeholder for Recipe Image */}
           <View className="w-full h-56 bg-slate-100 rounded-3xl overflow-hidden mb-6 border border-slate-200 items-center justify-center">
              <MaterialCommunityIcons name="food-variant" size={48} color="#cbd5e1" />
           </View>
        </View>

        {/* ── Heart Benefit ── */}
        <View className="px-5 mb-8">
           <View className="bg-blue-50 rounded-3xl p-5 border border-blue-100 relative overflow-hidden">
              <View className="absolute -right-4 -top-4 opacity-10">
                 <MaterialCommunityIcons name="heart-pulse" size={100} color="#1e4ed8" />
              </View>
              <View className="flex-row items-center mb-2">
                 <MaterialCommunityIcons name="shield-check" size={18} color="#1e4ed8" />
                 <Text className="text-[14px] font-bold text-[#1e4ed8] ml-2">Heart Benefit</Text>
              </View>
              <Text className="text-[13px] text-blue-900 leading-relaxed font-medium">
                 Why it's good: Lemon juice replaces salt for flavor, keeping sodium low. High in lean protein to support muscle health without saturated fat.
              </Text>
           </View>
        </View>

        {/* ── Macros ── */}
        <View className="px-5 mb-8 flex-row justify-between">
           <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 mr-3 items-center">
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Calories</Text>
              <View className="flex-row items-baseline">
                 <Text className="text-[20px] font-bold text-slate-900">350</Text>
                 <Text className="text-[10px] font-bold text-slate-500 ml-1">kcal</Text>
              </View>
           </View>
           <View className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-4 mr-3 items-center">
              <Text className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">Sodium</Text>
              <View className="flex-row items-baseline">
                 <Text className="text-[20px] font-bold text-red-900">140</Text>
                 <Text className="text-[10px] font-bold text-red-700 ml-1">mg</Text>
              </View>
           </View>
           <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center">
              <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fat</Text>
              <View className="flex-row items-baseline">
                 <Text className="text-[20px] font-bold text-slate-900">12</Text>
                 <Text className="text-[10px] font-bold text-slate-500 ml-1">g</Text>
              </View>
           </View>
        </View>

        {/* ── Ingredients ── */}
        <View className="px-5">
           <Text className="text-[18px] font-bold text-slate-900 mb-4">Ingredients</Text>
           
           <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <View className="flex-row items-center mb-3">
                 <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-3" />
                 <Text className="text-[14px] text-slate-700 font-medium">Chicken breast (Halal)</Text>
              </View>
              <View className="flex-row items-center mb-3">
                 <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-3" />
                 <Text className="text-[14px] text-slate-700 font-medium">Mixed baby greens</Text>
              </View>
              <View className="flex-row items-center mb-3">
                 <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-3" />
                 <Text className="text-[14px] text-slate-700 font-medium">Extra virgin olive oil</Text>
              </View>
              <View className="flex-row items-center">
                 <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-3" />
                 <Text className="text-[14px] text-slate-700 font-medium">Fresh lemon zest & juice</Text>
              </View>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
