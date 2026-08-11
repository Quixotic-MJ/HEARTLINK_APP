import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface CompletionCheckSheetProps {
  visible: boolean;
  onOk: () => void | Promise<void>;
  onSymptoms: () => void | Promise<void>;
  onBack: () => void;
}

export function CompletionCheckSheet({
  visible,
  onOk,
  onSymptoms,
  onBack,
}: CompletionCheckSheetProps) {
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
          <View className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/50 items-center justify-center self-center mb-5">
            <Feather
              name="check-circle"
              size={32}
              color="#0d9488"
            />
          </View>

          <Text className="text-[24px] font-bold text-slate-900 dark:text-white text-center mb-3 tracking-tight">
            How was the exercise?
          </Text>
          <Text className="text-[15px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-8 px-4">
            Did you feel okay during this routine, or did you experience any discomfort?
          </Text>

          {/* I FEEL OK */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOk}
            className="rounded-2xl py-4.5 items-center mb-3 flex-row justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm shadow-slate-100"
          >
            <MaterialCommunityIcons name="thumb-up-outline" size={20} color="#16a34a" />
            <Text className="text-slate-900 dark:text-white font-bold text-[16px]">
              I FEEL OK
            </Text>
          </TouchableOpacity>

          {/* I DON'T FEEL WELL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            className="rounded-2xl py-4.5 items-center flex-row justify-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50"
          >
            <MaterialCommunityIcons name="alert" size={20} color="#dc2626" />
            <Text className="text-red-600 dark:text-red-400 font-bold text-[16px]">
              I DON'T FEEL WELL
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
