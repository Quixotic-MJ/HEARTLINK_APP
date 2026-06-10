import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ROUTINES } from "./(tabs)/exercises";

export default function ExerciseDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Find routine or fallback to first one if undefined
  const routine = ROUTINES.find(r => r.id === id) || ROUTINES[0];
  const insets = useSafeAreaInsets();

  const [timeLeft, setTimeLeft] = useState(routine.duration * 60);
  const [isActive, setIsActive] = useState(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowSafetyCheck(true);
      if (interval) clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSafetySafe = () => {
    setShowSafetyCheck(false);
    // Return to exercises tab
    router.push("/(home)/(tabs)/exercises");
  };

  const handleSafetySymptoms = () => {
    setShowSafetyCheck(false);
    router.push("/(home)/log-symptoms");
  };

  // Helper for placeholder icon based on type
  const getIllustrationIcon = () => {
    if (routine.type === "Breathing") return "wind";
    if (routine.type === "Stationary") return "yoga";
    return "run-fast";
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{ paddingTop: Math.max(insets.top, 20) }} className="flex-row items-center px-5 pb-4 bg-slate-50 dark:bg-slate-950 z-10 absolute top-0 left-0 right-0">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-100 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-4 shadow-sm shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            Guided Routine
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 20) + 60, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Placeholder Illustration */}
        <View className="items-center mt-6 mb-8">
           <View className="w-56 h-56 bg-blue-50 rounded-full items-center justify-center border-4 border-white shadow-sm shadow-slate-200">
              <MaterialCommunityIcons name={getIllustrationIcon()} size={120} color="#1e4ed8" />
           </View>
        </View>

        {/* Title area */}
        <View className="mb-8 px-5 items-center">
           <Text className="text-[28px] font-bold text-slate-900 dark:text-white dark:text-slate-900 tracking-tight text-center leading-tight mb-2">
             {routine.title}
           </Text>
           <Text className="text-[14px] text-slate-500 dark:text-slate-400 font-medium text-center px-4 leading-relaxed">
             {routine.goal}
           </Text>
        </View>

        {/* Timer Display */}
        <View className="items-center mb-10">
           <Text className="text-[72px] font-medium text-slate-900 dark:text-white dark:text-slate-900 tracking-tighter" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(timeLeft)}
           </Text>
           <Text className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mt-2">Time Remaining</Text>
        </View>
        
      </ScrollView>

      {/* Bottom Sticky Button */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 dark:bg-slate-100 border-t border-slate-100 dark:border-slate-800 px-5 pt-5 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
         <TouchableOpacity 
           activeOpacity={0.8}
           onPress={toggleTimer}
           className={`w-full py-4 rounded-2xl items-center justify-center flex-row shadow-sm ${isActive ? 'bg-red-50 border border-red-100' : 'bg-[#1e4ed8] shadow-blue-500/30'}`}
         >
           {isActive ? (
             <>
                <Feather name="pause" size={20} color="#b91c1c" className="mr-2" />
                <Text className="text-red-700 text-[18px] font-bold">Pause Routine</Text>
             </>
           ) : (
             <>
                <Feather name="play" size={20} color={timeLeft < routine.duration * 60 ? "#1e4ed8" : "white"} className="mr-2" />
                <Text className={`${timeLeft < routine.duration * 60 ? 'text-[#1e4ed8]' : 'text-white dark:text-slate-900'} text-[18px] font-bold`}>
                  {timeLeft < routine.duration * 60 ? "Resume Routine" : "Start Routine"}
                </Text>
             </>
           )}
         </TouchableOpacity>
      </View>

      {/* Safety Check Bottom Sheet Modal */}
      <Modal visible={showSafetyCheck} transparent animationType="fade">
        <View className="flex-1 bg-slate-900 dark:bg-slate-100/40 justify-end">
          <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-t-3xl p-6 pb-12 shadow-xl border-t border-slate-200 dark:border-slate-800">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <Text className="text-[20px] font-bold text-slate-900 dark:text-white dark:text-slate-900 mb-2 text-center">Great job! Quick safety check.</Text>
            <Text className="text-[15px] text-slate-500 dark:text-slate-400 text-center mb-8 leading-relaxed px-2">Did you experience any chest discomfort or dizziness during this routine?</Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySafe}
              className="bg-blue-50 border border-blue-100 py-4 rounded-xl items-center mb-3 flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">👍</Text>
              <Text className="text-[#1e4ed8] font-bold text-[16px]">No, I feel great</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSafetySymptoms}
              className="bg-red-50 border border-red-100 py-4 rounded-xl items-center flex-row justify-center"
            >
              <Text className="text-[20px] mr-2">⚠️</Text>
              <Text className="text-red-700 font-bold text-[16px]">Yes, I felt symptoms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
