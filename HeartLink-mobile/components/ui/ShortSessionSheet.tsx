import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";
import { theme } from "../../constants/theme";

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-end"
      >
        <Pressable
          className="bg-surface rounded-t-[32px] px-6 pt-6 border-t border-border shadow-2xl"
        >
          {/* Close Button */}
          <TouchableOpacity 
            onPress={onBack}
            className="absolute top-5 right-5 w-10 h-10 items-center justify-center rounded-full bg-surface-alt z-10"
          >
            <MaterialCommunityIcons name="close" size={20} color={theme.textSoft} />
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-16 h-16 rounded-3xl bg-warning-tint border border-warning/50 items-center justify-center self-center mb-5">
            <Feather
              name="clock"
              size={32}
              color={theme.warningMid}
            />
          </View>

          <Text className="text-[24px] font-bold text-text text-center mb-3 tracking-tight">
            Short Exercise Session
          </Text>
          <Text className="text-[15px] text-text-soft text-center leading-relaxed mb-8 px-4">
            Your workout was only <Text className="font-bold text-ink dark:text-on-ink">{seconds} seconds</Text> (under 30s). Would you like to record this exercise to your history or discard it?
          </Text>

          {/* SAVE ANYWAY */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSaveAnyway}
            className="rounded-2xl py-4.5 items-center mb-3 flex-row justify-center gap-2 border border-border bg-surface shadow-sm shadow-slate-100"
          >
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={theme.blueMid} />
            <Text className="text-text font-bold text-[16px]">
              SAVE ANYWAY
            </Text>
          </TouchableOpacity>

          {/* DISCARD */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onDiscard}
            className="rounded-2xl py-4.5 items-center flex-row justify-center gap-2 bg-danger-tint border border-danger/20"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.dangerMid} />
            <Text className="text-danger-text font-bold text-[16px]">
              DISCARD SESSION
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
