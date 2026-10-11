import React from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";

export function SimpleHeader({ title = "", showBack = true }: { title?: string, showBack?: boolean }) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === "dark" ? Colors.dark : Colors.light;

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
          className="absolute left-4 w-11 h-11 items-center justify-center rounded-full bg-surface-alt"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={palette.text} />
        </TouchableOpacity>
      )}
      <Text className="text-base font-semibold text-text">
        {title}
      </Text>
    </View>
  );
}
