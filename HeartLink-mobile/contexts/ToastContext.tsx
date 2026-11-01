import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { View, Text, Pressable, Platform, PanResponder } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useDs } from "../components/onboarding/useDs";
import { playSound } from "../services/sounds";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextData {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextData>({ showToast: () => {} });

// Smooth monotonic cubic easing — zero bounce, zero oscillation
const ENTER_EASING = Easing.out(Easing.cubic);
const EXIT_EASING = Easing.in(Easing.cubic);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const queue = useRef<ToastOptions[]>([]);
  const isAnimating = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { c, isDark } = useDs();
  const insets = useSafeAreaInsets();
  const insetsTopRef = useRef(insets.top);
  insetsTopRef.current = insets.top;

  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const processQueueRef = useRef<() => void>(() => {});

  const handleHideComplete = useCallback(() => {
    setToast(null);
    isAnimating.current = false;
    pressScale.value = 1;
    processQueueRef.current();
  }, [pressScale]);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    translateY.value = withTiming(-140, { duration: 200, easing: EXIT_EASING });
    opacity.value = withTiming(0, { duration: 180, easing: EXIT_EASING }, (finished) => {
      if (finished) {
        runOnJS(handleHideComplete)();
      }
    });
  }, [translateY, opacity, handleHideComplete]);

  const processQueue = useCallback(() => {
    if (isAnimating.current || queue.current.length === 0) return;

    isAnimating.current = true;
    const nextToast = queue.current.shift()!;
    setToast(nextToast);

    const targetY = Math.max(insetsTopRef.current, 20) + 8;
    translateY.value = -140;
    opacity.value = 0;
    pressScale.value = 1;

    translateY.value = withTiming(targetY, {
      duration: 260,
      easing: ENTER_EASING,
    });
    opacity.value = withTiming(1, {
      duration: 200,
      easing: ENTER_EASING,
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        nextToast.type === "error"
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }

    const duration = nextToast.duration || 4000;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      dismissToast();
    }, duration);
  }, [translateY, opacity, pressScale, dismissToast]);

  processQueueRef.current = processQueue;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (options.type === "success" || options.type === undefined) {
        playSound("notify");
      }
      queue.current.push(options);
      processQueue();
    },
    [processQueue]
  );

  // Swipe-up to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy < -6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy < -10 || gestureState.vy < -0.3) {
          dismissToast();
        }
      },
    })
  ).current;

  const getCategoryTheme = (type?: ToastType) => {
    switch (type) {
      case "error":
        return {
          icon: "alert-circle" as const,
          iconColor: isDark ? "#F87171" : "#DC2626",
          badgeBg: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2",
          badgeBorder: isDark ? "rgba(239, 68, 68, 0.35)" : "#FECACA",
        };
      case "info":
        return {
          icon: "info" as const,
          iconColor: isDark ? "#60A5FA" : "#2563EB",
          badgeBg: isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF",
          badgeBorder: isDark ? "rgba(59, 130, 246, 0.35)" : "#BFDBFE",
        };
      case "success":
      default:
        return {
          icon: "check-circle" as const,
          iconColor: isDark ? "#34D399" : "#059669",
          badgeBg: isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5",
          badgeBorder: isDark ? "rgba(16, 185, 129, 0.35)" : "#A7F3D0",
        };
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: pressScale.value },
    ],
    opacity: opacity.value,
  }));

  const themeConfig = getCategoryTheme(toast?.type);
  const hasMessage = Boolean(toast?.message);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            {
              position: "absolute",
              top: 0,
              left: 16,
              right: 16,
              zIndex: 99999,
            },
            animatedStyle,
          ]}
        >
          <Pressable
            onPressIn={() => {
              pressScale.value = withTiming(0.98, { duration: 100, easing: ENTER_EASING });
            }}
            onPressOut={() => {
              pressScale.value = withTiming(1, { duration: 140, easing: ENTER_EASING });
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              dismissToast();
            }}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ""}. Tap to dismiss.`}
          >
            {/* Plain View holds all card styles — NativeWind v4 strips function styles on Pressable */}
            <View
              style={{
                backgroundColor: isDark ? c.surface : c.canvas,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: hasMessage ? "flex-start" : "center",
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: isDark ? c.hairline : "#E2E8F0",
                ...Platform.select({
                  ios: {
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.45 : 0.12,
                    shadowRadius: 20,
                  },
                  android: { elevation: 8 },
                }),
              }}
            >
              {/* Category Icon Badge */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: themeConfig.badgeBg,
                  borderWidth: 1,
                  borderColor: themeConfig.badgeBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Feather
                  name={themeConfig.icon}
                  size={18}
                  color={themeConfig.iconColor}
                />
              </View>

              {/* Content Text */}
              <View style={{ flex: 1, justifyContent: "center", paddingRight: 8 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14.5,
                    fontWeight: "700",
                    color: c.ink,
                    letterSpacing: -0.2,
                    lineHeight: 19,
                  }}
                >
                  {toast.title}
                </Text>
                {toast.message ? (
                  <Text
                    numberOfLines={4}
                    style={{
                      fontSize: 13,
                      lineHeight: 18.5,
                      fontWeight: "400",
                      color: c.slate,
                      marginTop: 2,
                      letterSpacing: -0.1,
                    }}
                  >
                    {toast.message}
                  </Text>
                ) : null}
              </View>

              {/* Dismiss X Icon */}
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: hasMessage ? 1 : 0,
                }}
              >
                <Feather name="x" size={13} color={c.steel} />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
