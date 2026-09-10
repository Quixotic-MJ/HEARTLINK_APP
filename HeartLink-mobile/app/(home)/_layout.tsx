import { useEffect } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { Stack } from "expo-router";
import "../../global.css";

export default function HomeLayout() {
  const { colorScheme } = useColorScheme();

  // Mirror the auth layout: transparent + translucent status bar so the
  // system bar shows app background instead of a black band on Android.
  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(profile)/profile"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="(profile)/notifications"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="(settings)/settings"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      </Stack>
    </>
  );
}
