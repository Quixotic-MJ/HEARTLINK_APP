import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Animated, Easing, AccessibilityInfo, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import HeartLogo from "../components/ui/HeartLogo";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import "../global.css";
import { Colors, hues } from "../constants/theme";

const THEME = {
  light: {
    ink: Colors.light.ink,
    inkSoft: Colors.light.textSoft,
    paper: Colors.light.background,
    accent: Colors.light.blue,
    brandText: hues.sky,
    statusBar: "dark" as const,
  },
  dark: {
    ink: Colors.dark.ink,
    inkSoft: Colors.dark.textSoft,
    paper: Colors.dark.background,
    accent: Colors.dark.blue,
    brandText: hues.sky,
    statusBar: "light" as const,
  },
};

const MAX_LOAD_WAIT_MS = 4000;

// ─── Ambient glow blob ────────────────────────────────────────────────────────
function GlowBlob({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

// ─── Splash Screen ───────────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();
  const { userId, user, isLoading } = useUser();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme;
  const colors = THEME[scheme === "dark" ? "dark" : "light"];

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const isMounted = useRef(true);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasNavigated = useRef(false);

  const handleProceed = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (userId) {
      if (user && user.onboarding_status === "complete") {
        router.replace("/(home)/(tabs)/dashboard");
      } else {
        router.replace({
          pathname: "/(baseline)/step1_basic_info",
          params: { user_id: userId },
        });
      }
    } else {
      router.replace("/onboarding");
    }
  }, [router, userId, user]);

  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isActive) setReduceMotion(enabled);
    });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: reduceMotion ? 200 : 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (!isMounted.current) return;
      setAnimationFinished(true);
    });

    return () => {
      isMounted.current = false;
    };
  }, [fadeAnim, reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) setLoadTimedOut(true);
    }, MAX_LOAD_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationFinished && (!isLoading || loadTimedOut)) {
      handleProceed();
    }
  }, [animationFinished, isLoading, loadTimedOut, handleProceed]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top", "bottom"]}>
      <StatusBar style={colors.statusBar} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          
          {/* Ambient glow */}
          <View style={{ position: "absolute", opacity: 0.8 }}>
            <GlowBlob color={colors.accent} size={300} />
          </View>

          {/* Logo */}
          <View style={{ marginBottom: 16 }}>
            <HeartLogo size={120} />
          </View>

          {/* Wordmark */}
          <View style={{ marginBottom: 12, flexDirection: "row", alignItems: "flex-start" }}>
            <Text
              style={{
                color: colors.brandText,
                fontSize: 42,
                letterSpacing: -0.5,
                fontWeight: "700",
              }}
              accessibilityRole="header"
            >
              HeartLink
            </Text>
            <Text style={{ color: colors.brandText, fontSize: 14, fontWeight: "500", marginTop: 6, marginLeft: 2 }}>™</Text>
          </View>

          {/* Tagline */}
          <Text
            style={{
              color: colors.inkSoft,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Cardiovascular well-being
          </Text>
        </View>

        {/* Bottom loading indicator */}
        <View style={{ paddingBottom: 60, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}