import React from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../constants/theme";

export function SimpleHeader({ title = "", showBack = true }: { title?: string, showBack?: boolean }) {
  const router = useRouter();

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 16 : 8,
      paddingBottom: 8,
      height: 56,
      backgroundColor: "transparent",
    }}>
      {showBack && (
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 w-10 h-10 items-center justify-center rounded-full bg-surface-alt"
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>
      )}
      <Text className="text-base font-semibold text-text">
        {title}
      </Text>
    </View>
  );
}
