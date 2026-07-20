import { Stack } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Import your global CSS here so it applies to the entire app
import "../global.css";
import { UserProvider } from "../contexts/UserContext";

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("theme_preference").then((pref) => {
      if (!mounted) return;
      if (pref === "light" || pref === "dark" || pref === "system") {
        setTimeout(() => {
          setColorScheme(pref);
        }, 0);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserProvider>
      <Stack
        screenOptions={{
        // Hides the default header for all screens so your custom UI shines
        headerShown: false,
        // Optional: Gives a nice native cross-fade/slide animation between screens
        animation: "fade_from_bottom",
      }}
    >
      {/* This maps to your index.tsx file. 
        Expo Router automatically finds it, but explicitly declaring it 
        allows you to pass specific options if needed later.
      */}
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />

      {/* As you build out the app based on your commented code, 
        your auth group will automatically be handled by Expo Router, 
        but you can explicitly define it here if you want to tweak its behavior.
      */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(baseline)" options={{ headerShown: false }} />
    </Stack>
    </UserProvider>
  );
}
