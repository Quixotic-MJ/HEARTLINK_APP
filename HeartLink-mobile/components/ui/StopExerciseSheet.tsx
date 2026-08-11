import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface StopExerciseSheetProps {
  visible: boolean;
  onSymptoms: () => void;
  onTired: () => void;
  onJustChecking: () => void;
  onBack: () => void;
}

export function StopExerciseSheet({
  visible,
  onSymptoms,
  onTired,
  onJustChecking,
  onBack,
}: StopExerciseSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
      >
        <Pressable
          className="bg-white dark:bg-slate-900 rounded-t-[32px] px-6 pt-6 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom + 20, 48) }}
        >
          {/* Close Button */}
          <TouchableOpacity 
            onPress={onBack}
            className="absolute top-5 right-5 w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 z-10"
          >
            <MaterialCommunityIcons name="close" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 items-center justify-center self-center mb-5">
            <Feather
              name="alert-circle"
              size={32}
              color="#d97706"
            />
          </View>

          <Text className="text-[24px] font-bold text-slate-900 dark:text-white text-center mb-3 tracking-tight">
            Why are you stopping?
          </Text>
          <Text className="text-[15px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-8 px-4">
            It's okay to take a break. Let us know why so we can help keep you safe.
          </Text>

          {/* I DON'T FEEL WELL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 shadow-sm"
          >
            <Feather name="activity" size={18} color="#dc2626" />
            <Text className="text-[15px] font-bold text-red-600 dark:text-red-400">
              I DON'T FEEL WELL
            </Text>
          </TouchableOpacity>

          {/* I'M TIRED */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onTired}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
          >
            <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">
              I'M TIRED
            </Text>
          </TouchableOpacity>

          {/* JUST CHECKING */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onJustChecking}
            className="rounded-2xl py-4 items-center mb-4 flex-row justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
          >
            <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">
              JUST CHECKING THE EXERCISE
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
