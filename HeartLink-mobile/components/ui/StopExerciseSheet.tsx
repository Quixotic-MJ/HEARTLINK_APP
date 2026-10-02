import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";
import { theme } from "../../constants/theme";

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
          <View className="w-16 h-16 rounded-3xl bg-warning-tint border border-warning/50 items-center justify-center self-center mb-5">
            <Feather
              name="alert-circle"
              size={32}
              color={theme.warningMid}
            />
          </View>

          <Text className="text-[24px] font-bold text-text text-center mb-3 tracking-tight">
            Why are you stopping?
          </Text>
          <Text className="text-[15px] text-text-soft text-center leading-relaxed mb-8 px-4">
            It's okay to take a break. Let us know why so we can help keep you safe.
          </Text>

          {/* I DON'T FEEL WELL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-danger/20 bg-danger-tint shadow-sm"
          >
            <Feather name="activity" size={18} color={theme.dangerMid} />
            <Text className="text-[15px] font-bold text-danger-text">
              I DON'T FEEL WELL
            </Text>
          </TouchableOpacity>

          {/* I'M TIRED */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onTired}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-border bg-surface shadow-sm"
          >
            <Text className="text-[15px] font-bold text-text">
              I'M TIRED
            </Text>
          </TouchableOpacity>

          {/* JUST CHECKING */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onJustChecking}
            className="py-3 items-center mb-2 flex-row justify-center"
          >
            <Text className="text-[14px] font-medium text-text-soft underline">
              Just checking the exercise
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
