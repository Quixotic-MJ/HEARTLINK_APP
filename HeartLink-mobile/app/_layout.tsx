import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { LogBox, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import * as SystemUI from "expo-system-ui";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
import { AppErrorScreen } from "../components/ui/AppErrorScreen";
import { installGlobalErrorLogging } from "../services/errorLog";

// HL-024: Expo Router shows this instead of a blank/red screen when any screen crashes.
export const ErrorBoundary = AppErrorScreen;

installGlobalErrorLogging();

// Keep the native splash up until the saved theme preference is applied, so the
// first JS frame doesn't render in the system theme and then flip.
SplashScreen.preventAutoHideAsync().catch(() => {});

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Suppress known upstream React 19 / Expo Router deep link resolution warning
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

function RootLayoutNav() {
  const { userId, user, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  // Listen for system broadcasts
  useBroadcastListener();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const secondSegment = segments[1] as string | undefined;

    // 1. Splash screen: let splash.tsx finish its animations and navigate
    const isSplash =
      (segments as string[]).length === 0 ||
      firstSegment === "index" ||
      firstSegment === "splash";
    if (isSplash) return;

    // 2. Screens after the score is saved: onboarding is already "complete" by then, but
    //    these finish the set-up (score, first reading, reminders, day one) and navigate on.
    const AFTER_SCORE = ["score", "first-reading", "reminders", "day-one"];
    const isAfterScore =
      firstSegment === "(baseline)" && !!secondSegment && AFTER_SCORE.includes(secondSegment);
    if (isAfterScore) return;

    const inAuthGroup = firstSegment === "(auth)";
    const inOnboarding = firstSegment === "onboarding";
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
          router.replace("/(baseline)/plan");
        }
      }
    }
  }, [userId, user, isLoading, segments]);

  // Removed manual useFonts hook to prevent ExpoAsset download errors over tunnel.
  // Modern Expo Router natively bundles @expo/vector-icons.
  
  return (
    <>

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

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '../lib/react-query';
import { ds, DARK_MODE_ENABLED } from '../constants/theme';

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [prefLoaded, setPrefLoaded] = useState(false);
  const [targetScheme, setTargetScheme] = useState<"light" | "dark" | null>(null);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  // Latched: once shown, later theme changes from Settings must not unmount the app.
  const [hasShown, setHasShown] = useState(false);

  // NativeWind only switches scheme once the native Appearance change event comes
  // back, so rendering right after setColorScheme() still shows the system scheme
  // for a few frames. Hold the native splash until NativeWind reports the saved one.
  const themeReady =
    prefLoaded && (targetScheme === null || colorScheme === targetScheme || waitTimedOut);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === "android") {
      SystemUI.setBackgroundColorAsync(ds.light.canvas).catch(() => {});
    }

    AsyncStorage.getItem("theme_preference")
      .then((stored) => {
        if (!mounted) return;
        // While dark mode is unfinished the app always runs light, whatever the phone or the saved setting says.
        const pref = DARK_MODE_ENABLED ? stored : "light";
        if (pref === "light" || pref === "dark" || pref === "system") {
          setTimeout(() => {
            if (!mounted) return;
            setColorScheme(pref);
            if (Platform.OS === "android") {
              SystemUI.setBackgroundColorAsync(pref === "dark" ? ds.dark.canvas : ds.light.canvas).catch(() => {});
            }
            if (pref !== "system") setTargetScheme(pref);
            setPrefLoaded(true);
          }, 0);
        } else {
          setPrefLoaded(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (!DARK_MODE_ENABLED) setColorScheme("light");
        setPrefLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Never hold the splash indefinitely if the scheme change doesn't arrive.
  useEffect(() => {
    if (!prefLoaded || themeReady || hasShown) return;
    const timer = setTimeout(() => setWaitTimedOut(true), 1000);
    return () => clearTimeout(timer);
  }, [prefLoaded, themeReady, hasShown]);

  // Adjust-state-during-render pattern, so the latch takes effect in the same render.
  if (themeReady && !hasShown) setHasShown(true);

  useEffect(() => {
    if (hasShown) SplashScreen.hideAsync().catch(() => {});
  }, [hasShown]);

  if (!hasShown && !themeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <UserProvider>
          <BaselineProvider>
            <ToastProvider>
              <RootLayoutNav />
            </ToastProvider>
          </BaselineProvider>
        </UserProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
