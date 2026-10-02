import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";
import { theme } from "../../constants/theme";

export interface SafetyCheckSheetProps {
  visible: boolean;
  onSafe: () => void | Promise<void>;
  onSymptoms: () => void | Promise<void>;
  onBack?: () => void;
  isSubmitting?: boolean;
}

export function SafetyCheckSheet({
  visible,
  onSafe,
  onSymptoms,
  onBack,
  isSubmitting = false,
}: SafetyCheckSheetProps) {
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
          className="bg-surface rounded-t-[32px] px-6 pt-5 border-t border-border shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {/* Close Button */}
          {onBack && (
            <TouchableOpacity 
              onPress={onBack}
              className="absolute top-4 right-4 w-10 h-10 items-center justify-center rounded-full bg-surface-alt"
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.textSoft} />
            </TouchableOpacity>
          )}

          {/* Icon */}
          <View className="w-16 h-16 rounded-3xl bg-danger-tint border border-danger/50 items-center justify-center self-center mb-5">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={32}
              color={theme.dangerMid}
            />
          </View>

          <Text className="text-[24px] font-bold text-text text-center mb-3 tracking-tight">
            Safety Check
          </Text>
          <Text className="text-[15px] text-text-soft text-center leading-relaxed mb-8 px-2">
            Did you experience any chest discomfort, shortness of breath, or
            dizziness during this routine?
          </Text>

          {/* No symptoms */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSafe}
            disabled={isSubmitting}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-border bg-surface shadow-sm shadow-slate-100"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.ink} />
            ) : (
              <MaterialCommunityIcons name="check-circle" size={20} color={theme.successMid} />
            )}
            <Text className="text-text font-bold text-[16px]">
              {isSubmitting ? "Logging..." : "No, I feel great"}
            </Text>
          </TouchableOpacity>

          {/* Symptoms */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            disabled={isSubmitting}
            className="rounded-2xl py-4 items-center flex-row justify-center gap-2 bg-danger-solid shadow-md shadow-red-200 dark:shadow-none"
          >
            <MaterialCommunityIcons name="alert" size={20} color={theme.onDanger} />
            <Text className="text-on-danger font-bold text-[16px]">
              Yes, I felt symptoms
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
