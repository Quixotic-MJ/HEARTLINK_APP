import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Animated, Easing, AccessibilityInfo, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import { isFamilyAccount } from "../services/family";
import HeartLogo from "../components/ui/HeartLogo";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import "../global.css";
import { Colors, ds, hues } from "../constants/theme";

// `paper` must match the expo-splash-screen backgroundColor in app.json so the
// native splash hands off to this screen without a colour flash. `brand` is the
// wordmark colour in the splash logo, so it stays as it is (the logo keeps its colours).
const THEME = {
  light: {
    inkSoft: ds.light.slate,
    paper: ds.light.canvas,
    brand: Colors.light.skyText,
    statusBar: "dark" as const,
  },
  dark: {
    inkSoft: ds.dark.slate,
    paper: ds.dark.canvas,
    brand: hues.sky,
    statusBar: "light" as const,
  },
};

const MAX_LOAD_WAIT_MS = 4000;
// Only show the spinner when loading is genuinely slow, to avoid a sub-second flash.
const SPINNER_DELAY_MS = 1500;

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
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const hasNavigated = useRef(false);

  const handleProceed = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (userId) {
      // If the profile hasn't loaded (slow network / timeout), go to the dashboard
      // rather than treating "not loaded yet" as "onboarding incomplete". The root
      // layout redirects to baseline once the profile arrives, if it's needed.
      if (isFamilyAccount(user)) {
        router.replace("/(family)");
      } else if (!user || user.onboarding_status === "complete") {
        router.replace("/(home)/(tabs)/dashboard");
      } else {
        router.replace("/(baseline)/plan");
      }
    } else {
      router.replace("/onboarding");
    }
  }, [router, userId, user]);

  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isActive) setReduceMotion(enabled);
      })
      .catch(() => {
        if (isActive) setReduceMotion(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Wait for the reduce-motion check so the fade only starts once.
    if (reduceMotion === null) return;
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (!isMounted.current) return;
      setAnimationFinished(true);
    });
  }, [fadeAnim, reduceMotion]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      if (isMounted.current) setLoadTimedOut(true);
    }, MAX_LOAD_WAIT_MS);
    const spinnerTimer = setTimeout(() => {
      if (isMounted.current) setShowSpinner(true);
    }, SPINNER_DELAY_MS);
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(spinnerTimer);
    };
  }, []);

  // With reduce motion on, the logo appears at once, so there is no fade to wait for
  const introDone = animationFinished || reduceMotion === true;
  useEffect(() => {
    if (introDone && (!isLoading || loadTimedOut)) {
      handleProceed();
    }
  }, [introDone, isLoading, loadTimedOut, handleProceed]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top", "bottom"]}>
      <StatusBar style={colors.statusBar} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        {/* Ambient glow */}
        <View style={{ position: "absolute", opacity: 0.8 }}>
          <GlowBlob color={colors.brand} size={300} />
        </View>

        {/* Logo + wordmark are visible from the first frame to match the native splash */}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel="HeartLink, cardiovascular well-being"
          style={{ alignItems: "center" }}
        >
          <View style={{ marginBottom: 16 }}>
            <HeartLogo size={120} />
          </View>

          <View style={{ marginBottom: 12, flexDirection: "row", alignItems: "flex-start" }}>
            <Text
              style={{
                color: colors.brand,
                fontSize: 42,
                letterSpacing: -0.5,
                fontWeight: "700",
              }}
            >
              HeartLink
            </Text>
            <Text style={{ color: colors.brand, fontSize: 14, fontWeight: "500", marginTop: 6, marginLeft: 2 }}>™</Text>
          </View>

          {/* Tagline fades in after the hand-off from the native splash */}
          <Animated.Text
            style={{
              opacity: fadeAnim,
              color: colors.inkSoft,
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Cardiovascular well-being
          </Animated.Text>
        </View>
      </View>

      {/* Bottom loading indicator (delayed; space is reserved so nothing shifts) */}
      <View style={{ height: 36, marginBottom: 60, alignItems: "center", justifyContent: "center" }}>
        {showSpinner && (
          <ActivityIndicator size="large" color={colors.brand} accessibilityLabel="Loading" />
        )}
      </View>
    </SafeAreaView>
  );
}