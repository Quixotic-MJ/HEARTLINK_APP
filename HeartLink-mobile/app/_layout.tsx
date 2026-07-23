import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OfflineBanner from "../components/OfflineBanner";
import "../global.css";
import { UserProvider, useUser } from "../contexts/UserContext";

function RootLayoutNav() {
  const { userId, user, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    // segments.length === 0 means we are at the root index.tsx
    const inOnboarding = segments.length === 0 || segments[0] === "onboarding" || segments[0] === "index";
    const inBaseline = segments[0] === "(baseline)";

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
            pathname: "/(baseline)/health_goals",
            params: { user_id: userId },
          });
        }
      }
    }
  }, [userId, user, isLoading, segments]);

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
    <UserProvider>
      <RootLayoutNav />
    </UserProvider>
  );
}
