import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";

export function CustomAlertModal({
  visible,
  onClose,
  title,
  message,
  icon,
  iconBg,
  iconColor,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  actions: { label: string; onPress: () => void; primary?: boolean }[];
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 28,
        }}
      >
        <View
          className="bg-white dark:bg-slate-900 rounded-3xl w-full overflow-hidden border border-transparent dark:border-slate-800"
          style={{ maxWidth: 360 }}
        >
          <View className="items-center pt-7 pb-4 px-6">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: iconBg }}
            >
              <Feather name={icon as any} size={26} color={iconColor} />
            </View>
            <Text className="text-[18px] font-semibold text-slate-900 dark:text-white text-center mb-2">
              {title}
            </Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              {message}
            </Text>
          </View>
          <View className="px-5 pb-5 gap-2">
            {actions.map((action, i) => {
              const primaryBg = isDark ? "#2563eb" : "#0f172a";
              const secondaryBorder = isDark ? "#334155" : "#e2e8f0";
              const textColor = action.primary
                ? "#ffffff"
                : isDark
                ? "#cbd5e1"
                : "#64748b";

              return (
                <TouchableOpacity
                  key={i}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  className="w-full py-3.5 rounded-xl items-center"
                  style={{
                    backgroundColor: action.primary ? primaryBg : "transparent",
                    borderWidth: action.primary ? 0 : 1,
                    borderColor: action.primary ? "transparent" : secondaryBorder,
                  }}
                >
                  <Text
                    className="text-[14px] font-medium"
                    style={{ color: textColor }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
