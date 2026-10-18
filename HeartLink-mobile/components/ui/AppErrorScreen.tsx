import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";
import type { ErrorBoundaryProps } from "expo-router";
import { Colors } from "../../constants/theme";
import { Button } from "./Button";
import { logAppError } from "../../services/errorLog";

/**
 * HL-024: shown instead of a blank or red screen when a screen crashes.
 * Rendered outside the app's providers, so it must not use Toast/User contexts.
 */
export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    logAppError(error, "error_boundary");
  }, [error]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View className="flex-1 bg-background justify-center px-8">
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="w-16 h-16 rounded-2xl bg-danger-tint border border-danger/20 items-center justify-center self-center mb-5">
        <Feather name="alert-triangle" size={28} color={theme.dangerText} />
      </View>
      <Text className="text-[20px] font-bold text-text text-center mb-2">
        Something went wrong
      </Text>
      <Text className="text-[14px] text-text-soft text-center leading-relaxed mb-8">
        HeartLink hit an unexpected problem on this screen. Your saved logs are safe. Tap Try again to reload it.
      </Text>
      {__DEV__ && (
        <Text className="text-[12px] text-text-muted text-center mb-6" selectable>
          {error.message}
        </Text>
      )}
      <Button label="Try again" icon="refresh-cw" isLoading={retrying} loadingText="Reloading…" onPress={handleRetry} />
    </View>
  );
}
