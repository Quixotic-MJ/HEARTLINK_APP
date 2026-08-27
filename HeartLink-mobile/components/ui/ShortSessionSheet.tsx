import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ShortSessionSheetProps {
  visible: boolean;
  seconds: number;
  onSaveAnyway: () => void | Promise<void>;
  onDiscard: () => void;
  onBack: () => void;
}

export function ShortSessionSheet({
  visible,
  seconds,
  onSaveAnyway,
  onDiscard,
  onBack,
}: ShortSessionSheetProps) {
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
              name="clock"
              size={32}
              color="#d97706"
            />
          </View>

          <Text className="text-[24px] font-bold text-slate-900 dark:text-white text-center mb-3 tracking-tight">
            Short Exercise Session
          </Text>
          <Text className="text-[15px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-8 px-4">
            Your workout was only <Text className="font-bold text-slate-800 dark:text-slate-200">{seconds} seconds</Text> (under 30s). Would you like to record this exercise to your history or discard it?
          </Text>

          {/* SAVE ANYWAY */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSaveAnyway}
            className="rounded-2xl py-4.5 items-center mb-3 flex-row justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm shadow-slate-100"
          >
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#0284c7" />
            <Text className="text-slate-900 dark:text-white font-bold text-[16px]">
              SAVE ANYWAY
            </Text>
          </TouchableOpacity>

          {/* DISCARD */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onDiscard}
            className="rounded-2xl py-4.5 items-center flex-row justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#e11d48" />
            <Text className="text-rose-600 dark:text-rose-400 font-bold text-[16px]">
              DISCARD SESSION
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
