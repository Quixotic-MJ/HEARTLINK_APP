import React, { createContext, useContext, useState, useRef } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const queue = useRef<ToastOptions[]>([]);
  const isAnimating = useRef(false);
  
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  const processQueue = () => {
    if (isAnimating.current || queue.current.length === 0) return;
    
    isAnimating.current = true;
    const nextToast = queue.current.shift()!;
    setToast(nextToast);

    // Show toast
    translateY.value = withSpring(Math.max(insets.top, 20) + 10, {
      damping: 12,
      stiffness: 250,
      mass: 0.8,
    });
    opacity.value = withTiming(1, { duration: 150 });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        nextToast.type === "error" 
          ? Haptics.NotificationFeedbackType.Error 
          : Haptics.NotificationFeedbackType.Success
      );
    }

    const duration = nextToast.duration || 3000;

    // Hide toast after duration
    setTimeout(() => {
      translateY.value = withTiming(-150, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(handleHideComplete)();
        }
      });
    }, duration);
  };

  const handleHideComplete = () => {
    setToast(null);
    isAnimating.current = false;
    processQueue();
  };

  const showToast = (options: ToastOptions) => {
    queue.current.push(options);
    processQueue();
  };

  const getIcon = () => {
    if (!toast) return null;
    switch (toast.type) {
      case "success": return <Feather name="check-circle" size={22} color="#10b981" />;
      case "error": return <Feather name="alert-circle" size={22} color="#ef4444" />;
      case "info":
      default: return <Feather name="info" size={22} color="#3b82f6" />;
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 20,
              right: 20,
              zIndex: 9999,
            },
            animatedStyle,
          ]}
        >
          <View 
            className="bg-white dark:bg-slate-900 rounded-2xl flex-row items-center p-4 shadow-xl border border-slate-200 dark:border-slate-800"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View className="mr-3">{getIcon()}</View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">
                {toast.title}
              </Text>
              {toast.message && (
                <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {toast.message}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
