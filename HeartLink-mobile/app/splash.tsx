import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "../components/ui/HeartLogo";
import "../global.css";

// ─── Splash Screen ───────────────────────────────────────────────────────────

export default function SplashScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId, isLoading } = useUser();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const iconFade  = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const tagFade   = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const [animationFinished, setAnimationFinished] = React.useState(false);

  useEffect(() => {
    isMounted.current = true;

    // Stage 1: Screen fades in, then Stage 2: Icon and Wordmark pop in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(iconFade, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tagFade, {
          toValue: 1,
          duration: 500,
          delay: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ]).start(() => {
      if (!isMounted.current) return;
      setAnimationFinished(true);
    });

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Trigger navigation if data loads after animation finishes
  useEffect(() => {
    if (animationFinished && !isLoading) {
      if (userId) {
        // Returning user — go to dashboard
        router.replace("/(home)/(tabs)/dashboard");
      } else {
        // New user — go to onboarding
        router.replace("/onboarding");
      }
    }
  }, [animationFinished, isLoading, userId]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* ── Centre content ── */}
        <View className="flex-1 items-center justify-center px-5">

          {/* Two-Tone Folded Heart Icon */}
          <Animated.View style={{ opacity: iconFade, transform: [{ scale: iconScale }], marginBottom: 20 }}>
            <HeartLogo size={72} />
          </Animated.View>

          {/* Wordmark */}
          <Animated.View style={{ opacity: iconFade, transform: [{ scale: iconScale }], marginBottom: 8 }}>
            <Text className="text-foreground text-4xl tracking-tight text-center font-semibold">
              HeartLink<Text className="text-sm text-muted-foreground font-normal">™</Text>
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: tagFade }}>
            <Text className="text-muted-foreground opacity-60 text-[11px] tracking-widest uppercase text-center">
              Cardiovascular well-being
            </Text>
          </Animated.View>

        </View>
      </Animated.View>
    </SafeAreaView>
  );
}