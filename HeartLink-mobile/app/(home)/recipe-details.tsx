import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { RECIPES } from "./(tabs)/recipes";

export default function RecipeDetailsScreen() {
  const router = useRouter(); 
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const recipe = RECIPES.find((r) => r.id === id) || RECIPES[0]; // fallback
  
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<"Ingredients" | "Instructions">("Ingredients");
  const [isSaved, setIsSaved] = useState(false); // Local toggle for the detail screen
  
  const currentSodium = recipe.nutrition.sodium * servingsMultiplier;
  const currentCalories = recipe.nutrition.calories * servingsMultiplier;
  const currentFiber = recipe.nutrition.fiber * servingsMultiplier;
  const currentPotassium = recipe.nutrition.potassium * servingsMultiplier;
  
  const isHighSodium = currentSodium >= 140;

  const handleLogMeal = () => {
    Alert.alert(
      "Meal logged!",
      "Sodium intake updated. Your Cardiovascular Stability Score has been recalculated.",
      [{ text: "OK", onPress: () => router.push("/(home)/(tabs)/dashboard") }]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header (Absolute position over scrollview) */}
      <View style={{ paddingTop: Math.max(insets.top, 20) }} className="flex-row items-center px-5 pb-4 bg-white/95 border-b border-slate-100 z-10 absolute top-0 left-0 right-0">
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
        <TouchableOpacity 
          onPress={() => setIsSaved(!isSaved)}
          className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center border border-slate-200/70"
        >
           <Feather name="heart" size={18} color={isSaved ? "#ef4444" : "#0f172a"} style={isSaved ? { fill: "#ef4444" } : {}} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 60, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Image */}
        <View className="w-full h-64 bg-slate-100">
           <Image source={{ uri: recipe.image }} className="w-full h-full" resizeMode="cover" />
        </View>

        {/* Title & Tags */}
        <View className="px-5 pt-6 pb-6">
           <Text className="text-[28px] font-bold text-slate-900 leading-tight mb-2">
             {recipe.title}
           </Text>
           <Text className="text-[15px] text-slate-500 mb-4">{recipe.subtitle}</Text>
           
           <View className="flex-row flex-wrap items-center mb-6 gap-2">
              {recipe.tags.map(tag => (
                <View key={tag} className="bg-slate-100 px-3 py-1.5 rounded-full">
                   <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tag}</Text>
                </View>
              ))}
           </View>

           {/* Servings Multiplier */}
           <View className="flex-row items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
             <View>
               <Text className="text-[14px] font-bold text-slate-900 mb-1">Servings</Text>
               <Text className="text-[12px] text-slate-500">Adjust to see exact macros</Text>
             </View>
             <View className="flex-row items-center gap-4 bg-white border border-slate-200 rounded-full px-2 py-1">
               <TouchableOpacity 
                 onPress={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                 className="w-8 h-8 items-center justify-center rounded-full bg-slate-50"
               >
                 <Feather name="minus" size={16} color="#0f172a" />
               </TouchableOpacity>
               <Text className="text-[16px] font-bold w-4 text-center">{servingsMultiplier}</Text>
               <TouchableOpacity 
                 onPress={() => setServingsMultiplier(servingsMultiplier + 1)}
                 className="w-8 h-8 items-center justify-center rounded-full bg-slate-50"
               >
                 <Feather name="plus" size={16} color="#0f172a" />
               </TouchableOpacity>
             </View>
           </View>
        </View>

        {/* ── Macros ── */}
        <View className="px-5 mb-6">
           <Text className="text-[18px] font-bold text-slate-900 mb-4">Nutrition Breakdown</Text>
           <View className="flex-row flex-wrap gap-3">
              <View className={`flex-1 min-w-[45%] rounded-2xl p-4 items-center border ${isHighSodium ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                 <Text className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isHighSodium ? 'text-red-500' : 'text-slate-400'}`}>Sodium</Text>
                 <View className="flex-row items-baseline">
                    <Text className={`text-[24px] font-bold ${isHighSodium ? 'text-red-900' : 'text-slate-900'}`}>{currentSodium}</Text>
                    <Text className={`text-[12px] font-bold ml-1 ${isHighSodium ? 'text-red-700' : 'text-slate-500'}`}>mg</Text>
                 </View>
              </View>
              <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center">
                 <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Calories</Text>
                 <View className="flex-row items-baseline">
                    <Text className="text-[24px] font-bold text-slate-900">{currentCalories}</Text>
                    <Text className="text-[12px] font-bold text-slate-500 ml-1">kcal</Text>
                 </View>
              </View>
              <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center">
                 <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fiber</Text>
                 <View className="flex-row items-baseline">
                    <Text className="text-[24px] font-bold text-slate-900">{currentFiber}</Text>
                    <Text className="text-[12px] font-bold text-slate-500 ml-1">g</Text>
                 </View>
              </View>
              <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center">
                 <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Potassium</Text>
                 <View className="flex-row items-baseline">
                    <Text className="text-[24px] font-bold text-slate-900">{currentPotassium}</Text>
                    <Text className="text-[12px] font-bold text-slate-500 ml-1">mg</Text>
                 </View>
              </View>
           </View>
           
           {isHighSodium && (
             <View className="mt-4 bg-red-50 p-4 rounded-xl border border-red-100 flex-row items-start gap-3">
               <Feather name="alert-triangle" size={18} color="#ef4444" className="mt-0.5" />
               <View className="flex-1">
                 <Text className="text-[14px] font-bold text-red-900 mb-1">High Sodium Warning</Text>
                 <Text className="text-[13px] text-red-800 leading-tight">Based on your baseline, this portion exceeds your recommended per-meal sodium limit.</Text>
               </View>
             </View>
           )}
        </View>

        {/* ── Tabs ── */}
        <View className="px-5 mt-2">
           <View className="flex-row bg-slate-100 p-1 rounded-xl mb-4">
             <TouchableOpacity 
               onPress={() => setActiveTab("Ingredients")}
               className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === "Ingredients" ? "bg-white shadow-sm" : ""}`}
             >
               <Text className={`text-[13px] font-bold ${activeTab === "Ingredients" ? "text-slate-900" : "text-slate-500"}`}>Ingredients</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={() => setActiveTab("Instructions")}
               className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === "Instructions" ? "bg-white shadow-sm" : ""}`}
             >
               <Text className={`text-[13px] font-bold ${activeTab === "Instructions" ? "text-slate-900" : "text-slate-500"}`}>Instructions</Text>
             </TouchableOpacity>
           </View>
           
           {activeTab === "Ingredients" ? (
             <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                {recipe.ingredients.map((ing, i) => (
                  <View key={i} className={`flex-row items-center py-3 ${i !== recipe.ingredients.length - 1 ? 'border-b border-slate-200/50' : ''}`}>
                     <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-4" />
                     <View className="flex-1 flex-row">
                       <Text className="text-[14px] text-slate-900 font-bold w-20">{ing.qty}</Text>
                       <Text className="text-[14px] text-slate-700 flex-1">{ing.item}</Text>
                     </View>
                  </View>
                ))}
             </View>
           ) : (
             <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                {recipe.steps.map((step, i) => (
                  <View key={i} className={`flex-row py-3 ${i !== recipe.steps.length - 1 ? 'border-b border-slate-200/50' : ''}`}>
                     <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center mr-3 mt-0.5">
                       <Text className="text-[12px] font-bold text-slate-600">{i + 1}</Text>
                     </View>
                     <Text className="text-[14px] text-slate-700 flex-1 leading-relaxed">{step}</Text>
                  </View>
                ))}
             </View>
           )}
        </View>

      </ScrollView>

      {/* ── Sticky Bottom Button ── */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 pt-4 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         <TouchableOpacity 
           activeOpacity={0.8}
           onPress={handleLogMeal}
           className="w-full bg-[#1e4ed8] py-4 rounded-xl items-center justify-center flex-row shadow-sm shadow-blue-500/30"
         >
           <Feather name="plus-circle" size={18} color="white" className="mr-2" />
           <Text className="text-white text-[16px] font-bold">Log This Meal</Text>
         </TouchableOpacity>
      </View>

    </View>
  );
}
