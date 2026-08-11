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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
      >
        <Pressable
          className="bg-white dark:bg-slate-900 rounded-t-[32px] px-6 pt-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom + 20, 48) }}
        >
          {/* Close Button */}
          {onBack && (
            <TouchableOpacity 
              onPress={onBack}
              className="absolute top-4 right-4 w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <MaterialCommunityIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Icon */}
          <View className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 items-center justify-center self-center mb-5">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={32}
              color="#dc2626"
            />
          </View>

          <Text className="text-[24px] font-bold text-slate-900 dark:text-white text-center mb-3 tracking-tight">
            Safety Check
          </Text>
          <Text className="text-[15px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-8 px-2">
            Did you experience any chest discomfort, shortness of breath, or
            dizziness during this routine?
          </Text>

          {/* No symptoms */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSafe}
            disabled={isSubmitting}
            className="rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm shadow-slate-100"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <MaterialCommunityIcons name="check-circle" size={20} color="#16a34a" />
            )}
            <Text className="text-slate-900 dark:text-white font-bold text-[16px]">
              {isSubmitting ? "Logging..." : "No, I feel great"}
            </Text>
          </TouchableOpacity>

          {/* Symptoms */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSymptoms}
            disabled={isSubmitting}
            className="rounded-2xl py-4 items-center flex-row justify-center gap-2 bg-red-600 dark:bg-red-700 shadow-md shadow-red-200 dark:shadow-none"
          >
            <MaterialCommunityIcons name="alert" size={20} color="#ffffff" />
            <Text className="text-white font-bold text-[16px]">
              Yes, I felt symptoms
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
