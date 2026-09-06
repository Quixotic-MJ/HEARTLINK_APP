import React, { useEffect } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { NavigationBar } from "expo-navigation-bar";
import "../../global.css";

export default function AuthLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      SystemUI.setBackgroundColorAsync("#EDF1EF").catch(() => {});
      NavigationBar.setStyle("light");
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <NavigationBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right", // Premium native slide-in animation
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-otp" />
        <Stack.Screen name="verification-success" />
      </Stack>
    </>
  );
}
