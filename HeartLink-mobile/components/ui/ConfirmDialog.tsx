import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  runOnJS 
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmDialogVariant = "destructive" | "warning" | "info";
export type ConfirmDialogMode = "bottom-sheet" | "centered";

export interface ConfirmDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;

  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;

  variant?: ConfirmDialogVariant;
  mode?: ConfirmDialogMode;
  icon?: keyof typeof Feather.glyphMap;

  /** If set, user must type this exact string to enable the confirm button */
  typedConfirmation?: string;
}

// ─── Variant Config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG = {
  destructive: {
    iconBg: { light: Colors.light.dangerTint, dark: Colors.dark.dangerTint },
    iconColor: { light: Colors.light.dangerMid, dark: Colors.dark.dangerMid },
    defaultIcon: "alert-triangle" as keyof typeof Feather.glyphMap,
    confirmBg: { light: Colors.light.dangerSolid, dark: Colors.dark.dangerSolid },
    confirmText: { light: Colors.light.onDanger, dark: Colors.dark.onDanger },
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  warning: {
    iconBg: { light: Colors.light.warningTint, dark: Colors.dark.warningTint },
    iconColor: { light: Colors.light.warningMid, dark: Colors.dark.warningMid },
    defaultIcon: "alert-circle" as keyof typeof Feather.glyphMap,
    confirmBg: { light: Colors.light.warningSolid, dark: Colors.dark.warningSolid },
    confirmText: { light: Colors.light.onWarning, dark: Colors.dark.onWarning },
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  info: {
    iconBg: { light: Colors.light.blueTint, dark: Colors.dark.blueTint },
    iconColor: { light: Colors.light.blueMid, dark: Colors.dark.blueMid },
    defaultIcon: "info" as keyof typeof Feather.glyphMap,
    confirmBg: { light: Colors.light.primary, dark: Colors.dark.primary },
    confirmText: { light: Colors.light.onPrimary, dark: Colors.dark.onPrimary },
    haptic: null,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmDialog({
  visible,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  mode = "bottom-sheet",
  icon,
  typedConfirmation,
}: ConfirmDialogProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeMode = isDark ? "dark" : "light";
  
  const config = VARIANT_CONFIG[variant];
  const resolvedIcon = icon || config.defaultIcon;

  const [isLoading, setIsLoading] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const slideY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0.9);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setIsLoading(false);
      setTypedValue("");
    }
  }, [visible]);

  const animateIn = useCallback(() => {
    // Haptic feedback on show
    if (config.haptic) {
      Haptics.notificationAsync(config.haptic);
    }

    backdropOpacity.value = withTiming(1, { duration: 250 });

    if (mode === "bottom-sheet") {
      slideY.value = withSpring(0, {
        damping: 22,
        stiffness: 260,
        mass: 0.8,
      });
    } else {
      scale.value = withSpring(1, {
        damping: 18,
        stiffness: 200,
        mass: 0.7,
      });
    }
  }, [mode, backdropOpacity, slideY, scale, config.haptic]);

  const animateOut = useCallback(
    (callback: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      
      if (mode === "bottom-sheet") {
        slideY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) runOnJS(callback)();
        });
      } else {
        scale.value = withTiming(0.9, { duration: 180 }, (finished) => {
          if (finished) runOnJS(callback)();
        });
      }
    },
    [mode, backdropOpacity, slideY, scale]
  );

  const handleCancel = useCallback(() => {
    if (isLoading) return;
    animateOut(onCancel);
  }, [isLoading, animateOut, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (isLoading) return;
    if (typedConfirmation && typedValue !== typedConfirmation) return;

    setIsLoading(true);
    try {
      await onConfirm();
    } catch (e) {
      console.error("ConfirmDialog onConfirm error:", e);
    } finally {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isLoading, typedConfirmation, typedValue, onConfirm]);

  const isConfirmEnabled =
    !isLoading && (!typedConfirmation || typedValue === typedConfirmation);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));
  
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: backdropOpacity.value,
  }));

  // ─── Shared Content ───────────────────────────────────────────────────────

  const dialogContent = (
    <>
      {/* Icon */}
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center self-center mb-4"
      >
        <Feather name={resolvedIcon} size={26} color={config.iconColor[themeMode]} />
      </View>

      {/* Title */}
      <Text
        className="text-[18px] font-semibold text-text text-center mb-2"
        accessibilityRole="header"
      >
        {title}
      </Text>

      {/* Message */}
      <Text className="text-[13px] text-text-soft text-center leading-relaxed mb-6 px-2">
        {message}
      </Text>

      {/* Typed Confirmation Input */}
      {typedConfirmation && (
        <View className="mb-5 px-1">
          <Text className="text-[12px] font-medium text-text-soft mb-2 text-center">
            Type{" "}
            <Text className="font-bold text-danger-text">
              {typedConfirmation}
            </Text>{" "}
            to confirm
          </Text>
          <TextInput
            className="border border-border rounded-xl px-4 py-3 text-[15px] text-text text-center font-medium bg-surface-alt"
            value={typedValue}
            onChangeText={setTypedValue}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={typedConfirmation}
            placeholderTextColor={isDark ? "#8692A0" : "#676F78"}
            editable={!isLoading}
          />
        </View>
      )}

      {/* Buttons */}
      <View className="gap-2.5">
        {/* Cancel — safe default, always on top */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCancel}
          disabled={isLoading}
          className="w-full py-4 min-h-[48px] rounded-xl items-center border border-border"
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          accessibilityHint="Dismisses this dialog without taking action"
        >
          <Text className="text-[14px] font-medium text-text-soft">
            {cancelLabel}
          </Text>
        </TouchableOpacity>

        {/* Confirm — destructive/primary */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleConfirm}
          disabled={!isConfirmEnabled}
          className="w-full py-4 min-h-[48px] rounded-xl items-center flex-row justify-center gap-2"
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          accessibilityHint={`Confirms the ${variant} action`}
        >
          {isLoading && <ActivityIndicator size="small" color={config.confirmText[themeMode]} />}
          <Text
            className="text-[14px] font-semibold"
          >
            {confirmLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ─── Bottom Sheet Mode ────────────────────────────────────────────────────

  if (mode === "bottom-sheet") {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onShow={animateIn}
        onRequestClose={handleCancel}
      >
        <View style={{ flex: 1 }} accessible accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {/* Backdrop */}
          <Animated.View
            style={[
              {
                flex: 1,
                backgroundColor: "rgba(15,23,42,0.45)",
              },
              backdropStyle
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={handleCancel} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingBottom: Platform.OS === "ios" ? 40 : 24 + insets.bottom,
              },
              sheetStyle
            ]}
            className="bg-surface border-t border-border"
          >
            {/* Drag Handle */}
            <View className="w-10 h-1 bg-border-strong rounded-full self-center mt-3 mb-5" />

            <View className="px-6 pb-2">{dialogContent}</View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ─── Centered Modal Mode ──────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 }}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {/* Backdrop — NOT dismissible for centered destructive modals */}
          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.5)" },
              backdropStyle
            ]}
          >
            {variant !== "destructive" && (
              <Pressable style={{ flex: 1 }} onPress={handleCancel} />
            )}
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              {
                width: "100%",
                maxWidth: 360,
              },
              cardStyle
            ]}
            className="bg-surface rounded-3xl overflow-hidden shadow-sm"
          >
            <View className="pt-7 pb-5 px-6">{dialogContent}</View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
