import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../global.css";

// ─── Splash Screen ───────────────────────────────────────────────────────────

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const iconFade  = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const tagFade   = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let navTimer: ReturnType<typeof setTimeout>;

    // Stage 1: Screen fades in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (!isMounted.current) return;
      // Stage 2: Icon and Wordmark pop in
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
      ]).start();

      // Stage 3: Navigate after hold
      navTimer = setTimeout(() => {
        if (isMounted.current) {
          router.replace("/onboarding");
        }
      }, 3000);
    });

    return () => {
      isMounted.current = false;
      if (navTimer) clearTimeout(navTimer);
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#080e1c" }} edges={["top", "bottom"]}>
      <StatusBar style="light" />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* ── Centre content ── */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>

          {/* Minimalist Heart Icon */}
          <Animated.View style={{ opacity: iconFade, transform: [{ scale: iconScale }], marginBottom: 24 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
              <Feather name="heart" size={34} color="#0f172a" />
            </View>
          </Animated.View>

          {/* Wordmark */}
          <Animated.View style={{ opacity: iconFade, transform: [{ scale: iconScale }], marginBottom: 8 }}>
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "300", letterSpacing: -1.5, textAlign: "center" }}>
              Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: tagFade }}>
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", textAlign: "center" }}>
              Cardiovascular well-being
            </Text>
          </Animated.View>

        </View>

      </Animated.View>
    </SafeAreaView>
  );
}