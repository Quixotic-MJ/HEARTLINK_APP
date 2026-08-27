import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OfflineBanner from "../components/OfflineBanner";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserProvider, useUser } from "../contexts/UserContext";
import { ToastProvider } from "../contexts/ToastContext";
import { BaselineProvider } from "../contexts/BaselineContext";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useBroadcastListener } from "../hooks/useBroadcastListener";
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function RootLayoutNav() {
  const { userId, user, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // Listen for system broadcasts
  useBroadcastListener();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    // segments.length === 0 means we are at the root index.tsx
    const inOnboarding =
      (segments as string[]).length === 0 ||
      firstSegment === "onboarding" ||
      firstSegment === "index";
    const inBaseline = firstSegment === "(baseline)";

    if (!userId && !inAuthGroup && !inOnboarding) {
      // Redirect to login if user is not logged in and trying to access protected screen
      router.replace("/(auth)/login");
    } else if (userId) {
      // If user profile hasn't loaded yet (offline/error), don't redirect
      if (!user) return;

      const isOnboardingComplete = user.onboarding_status === "complete";

      if (isOnboardingComplete) {
        // If onboarding is complete, redirect away from auth/onboarding/baseline to dashboard
        if (inAuthGroup || inOnboarding || inBaseline) {
          router.replace("/(home)/(tabs)/dashboard");
        }
      } else {
        // If onboarding is not complete, redirect to baseline (allow staying in auth for success screen)
        if (!inBaseline && !inAuthGroup) {
          router.replace({
            pathname: "/(baseline)/step1_basic_info",
            params: { user_id: userId },
          });
        }
      }
    }
  }, [userId, user, isLoading, segments]);

  // Removed manual useFonts hook to prevent ExpoAsset download errors over tunnel.
  // Modern Expo Router natively bundles @expo/vector-icons.
  
  return (
    <>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(baseline)" options={{ headerShown: false }} />
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <BaselineProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </BaselineProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
