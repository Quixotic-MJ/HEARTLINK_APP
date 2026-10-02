import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";
import { theme } from "../../constants/theme";

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={onBack}
      >
        <Pressable
          className="bg-surface rounded-t-[32px] px-6 pt-6 border-t border-border shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Close Button */}
          <TouchableOpacity 
            onPress={onBack}
            className="absolute top-5 right-5 w-10 h-10 items-center justify-center rounded-full bg-surface-alt z-10"
          >
            <MaterialCommunityIcons name="close" size={20} color={theme.textSoft} />
          </TouchableOpacity>

          {/* Icon */}
          <View className="w-16 h-16 rounded-3xl bg-teal-tint border border-teal-text/20 items-center justify-center self-center mb-5">
            <Feather
              name="check-circle"
              size={32}
              color={theme.tealText}
            />
          </View>

          <Text className="text-[24px] font-bold text-text text-center mb-3 tracking-tight">
            How was the exercise?
          </Text>
          <Text className="text-[15px] text-text-soft text-center leading-relaxed mb-8 px-4">
            Did you feel okay during this routine, or did you experience any discomfort?
          </Text>

          {/* I FEEL OK */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOk}
            className="rounded-2xl py-4.5 items-center mb-3 flex-row justify-center gap-2 border border-border bg-surface shadow-sm shadow-slate-100"
          >
            <MaterialCommunityIcons name="thumb-up-outline" size={20} color={theme.successMid} />
            <Text className="text-text font-bold text-[16px]">
              I FEEL OK
            </Text>
          </TouchableOpacity>

          {/* I DON'T FEEL WELL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            className="rounded-2xl py-4.5 items-center flex-row justify-center gap-2 bg-danger-tint border border-danger/20"
          >
            <MaterialCommunityIcons name="alert" size={20} color={theme.dangerMid} />
            <Text className="text-danger-text font-bold text-[16px]">
              I DON'T FEEL WELL
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
