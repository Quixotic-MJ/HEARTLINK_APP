import React, { useState, useCallback } from "react";
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
import { ds, DsColors } from "../../constants/theme";
import { useDs } from "../onboarding/useDs";

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

// Design-system colours: a pastel icon badge, and a red (delete) or blue confirm button.
// The red keeps its light-mode shade in dark mode so white text stays readable.
const VARIANT_CONFIG = {
  destructive: {
    iconBg: (c: DsColors) => c.rose,
    iconColor: (c: DsColors) => c.danger,
    defaultIcon: "alert-triangle" as keyof typeof Feather.glyphMap,
    confirmBg: (_c: DsColors) => ds.light.danger,
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  warning: {
    iconBg: (c: DsColors) => c.yellow,
    iconColor: (c: DsColors) => c.warmText,
    defaultIcon: "alert-circle" as keyof typeof Feather.glyphMap,
    confirmBg: (c: DsColors) => c.primary,
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  info: {
    iconBg: (c: DsColors) => c.tint,
    iconColor: (c: DsColors) => c.onTint,
    defaultIcon: "info" as keyof typeof Feather.glyphMap,
    confirmBg: (c: DsColors) => c.primary,
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
  const { c } = useDs();
  
  const config = VARIANT_CONFIG[variant];
  const resolvedIcon = icon || config.defaultIcon;

  const [isLoading, setIsLoading] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const slideY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0.9);

  // Reset state each time the dialog opens (noticed during render, not in an effect)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setIsLoading(false);
      setTypedValue("");
    }
  }

  const animateIn = useCallback(() => {
    // Haptic feedback on show
    if (config.haptic) {
      Haptics.notificationAsync(config.haptic);
    }

    backdropOpacity.set(withTiming(1, { duration: 250 }));

    if (mode === "bottom-sheet") {
      slideY.set(withSpring(0, {
        damping: 22,
        stiffness: 260,
        mass: 0.8,
      }));
    } else {
      scale.set(withSpring(1, {
        damping: 18,
        stiffness: 200,
        mass: 0.7,
      }));
    }
  }, [mode, backdropOpacity, slideY, scale, config.haptic]);

  const animateOut = useCallback(
    (callback: () => void) => {
      backdropOpacity.set(withTiming(0, { duration: 200 }));
      
      if (mode === "bottom-sheet") {
        slideY.set(withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) runOnJS(callback)();
        }));
      } else {
        scale.set(withTiming(0.9, { duration: 180 }, (finished) => {
          if (finished) runOnJS(callback)();
        }));
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
        className="items-center justify-center self-center mb-4"
        style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: config.iconBg(c) }}
      >
        <Feather name={resolvedIcon} size={24} color={config.iconColor(c)} />
      </View>

      {/* Title */}
      <Text
        className="text-center mb-2"
        style={{ fontSize: 20, fontWeight: "600", color: c.ink }}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {/* Message */}
      <Text className="text-center mb-6 px-2" style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
        {message}
      </Text>

      {/* Typed Confirmation Input */}
      {typedConfirmation && (
        <View className="mb-5 px-1">
          <Text className="mb-2 text-center" style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>
            Type{" "}
            <Text style={{ fontWeight: "700", color: c.ink }}>
              {typedConfirmation}
            </Text>{" "}
            to confirm
          </Text>
          <TextInput
            className="px-4 text-center"
            style={{ height: 48, borderWidth: 1.5, borderColor: c.hairlineStrong, borderRadius: 8, fontSize: 16, fontWeight: "500", color: c.ink, backgroundColor: c.canvas }}
            value={typedValue}
            onChangeText={setTypedValue}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={typedConfirmation}
            placeholderTextColor={c.steel}
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
          className="w-full items-center justify-center"
          style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong }}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          accessibilityHint="Dismisses this dialog without taking action"
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>
            {cancelLabel}
          </Text>
        </TouchableOpacity>

        {/* Confirm — destructive/primary */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleConfirm}
          disabled={!isConfirmEnabled}
          className="w-full items-center flex-row justify-center gap-2"
          style={{ height: 48, borderRadius: 8, backgroundColor: isConfirmEnabled || isLoading ? config.confirmBg(c) : c.hairline }}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          accessibilityHint={`Confirms the ${variant} action`}
        >
          {isLoading && <ActivityIndicator size="small" color={c.onPrimary} />}
          <Text
            style={{ fontSize: 15, fontWeight: "500", color: isConfirmEnabled || isLoading ? c.onPrimary : c.steel }}
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
                backgroundColor: "rgba(15,15,15,0.55)",
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
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: Platform.OS === "ios" ? 40 : 24 + insets.bottom,
                backgroundColor: c.canvas,
              },
              sheetStyle
            ]}
          >
            {/* Drag Handle */}
            <View className="w-10 h-1 rounded-full self-center mt-3 mb-5" style={{ backgroundColor: c.hairlineStrong }} />

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
              { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,15,15,0.55)" },
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
                borderRadius: 16,
                backgroundColor: c.canvas,
              },
              cardStyle
            ]}
            className="overflow-hidden"
          >
            <View className="pt-7 pb-5 px-6">{dialogContent}</View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
