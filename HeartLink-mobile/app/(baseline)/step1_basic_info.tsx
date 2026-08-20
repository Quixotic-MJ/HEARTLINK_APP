import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../../contexts/ToastContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColorScheme } from "nativewind";
import { useBaseline } from "../../contexts/BaselineContext";
import AnimatedButton from "../../components/ui/AnimatedButton";
import StepProgress from "../../components/ui/StepProgress";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

// ─── Clean Form Input with Focus Glow & Error Shake ───────────────────────────

interface BaseInputProps {
  label: string;
  isOptional?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onBlur?: () => void;
  unit?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  maxLength?: number;
  hasError?: boolean;
  isDark?: boolean;
}

function FormInput({
  label,
  isOptional = false,
  value,
  onChangeText,
  placeholder,
  onBlur,
  unit,
  keyboardType = "default",
  maxLength,
  hasError = false,
  isDark = false,
}: BaseInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const shakeAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withTiming(isFocused ? 1 : 0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isFocused]);

  useEffect(() => {
    if (hasError) {
      shakeAnim.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = hasError
      ? "#ef4444"
      : isFocused
      ? isDark
        ? "#3b82f6"
        : "#2563eb"
      : isDark
      ? "#334155"
      : "#e2e8f0";

    return {
      borderColor,
      transform: [{ translateX: shakeAnim.value }],
      shadowColor: hasError
        ? "#ef4444"
        : isFocused
        ? isDark
          ? "#3b82f6"
          : "#2563eb"
        : "transparent",
      shadowOpacity: hasError ? 0.2 : focusAnim.value * 0.16,
      shadowRadius: focusAnim.value * 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: hasError ? 2 : focusAnim.value * 2,
    };
  });

  return (
    <View className="mb-4">
      {/* Field Label & Optional Indicator */}
      <View className="flex-row items-center justify-between mb-1.5 ml-0.5">
        <Text className="text-[13px] font-semibold text-foreground">
          {label}
        </Text>
        {isOptional && (
          <Text className="text-[12px] font-medium text-muted-foreground">
            Optional
          </Text>
        )}
      </View>

      <Animated.View
        style={[animatedContainerStyle]}
        className="h-[52px] rounded-xl border bg-card dark:bg-slate-900 justify-center px-3.5"
      >
        <View className="flex-row items-center h-full">
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              if (onBlur) onBlur();
            }}
            keyboardType={keyboardType}
            maxLength={maxLength}
            className="flex-1 text-[15px] font-medium text-foreground py-0 h-full"
          />
          {unit && (
            <Text className="text-[13px] text-muted-foreground ml-1 font-semibold">
              {unit}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Date of Birth Selector ───────────────────────────────────────────────────

function FormDatePicker({
  label,
  value,
  onPress,
  placeholder = "Select your birth date",
  hasError = false,
  isDark = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  hasError?: boolean;
  isDark?: boolean;
}) {
  const shakeAnim = useSharedValue(0);

  useEffect(() => {
    if (hasError) {
      shakeAnim.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
    borderColor: hasError
      ? "#ef4444"
      : isDark
      ? "#334155"
      : "#e2e8f0",
  }));

  return (
    <View className="mb-4">
      <Text className="text-[13px] font-semibold text-foreground mb-1.5 ml-0.5">
        {label}
      </Text>

      <Animated.View
        style={animatedStyle}
        className="h-[52px] rounded-xl border bg-card dark:bg-slate-900 justify-center px-3.5"
      >
        <AnimatedButton
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${
            value ? new Date(value).toLocaleDateString() : "not set"
          }`}
          className="h-full justify-center"
        >
          <View className="flex-row items-center">
            <Feather
              name="calendar"
              size={18}
              color={hasError ? "#ef4444" : isDark ? "#94a3b8" : "#64748b"}
            />
            <Text
              className={`text-[15px] ml-3 ${
                hasError
                  ? "text-red-500 font-medium"
                  : value
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground font-medium"
              }`}
            >
              {value
                ? new Date(value).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : placeholder}
            </Text>
          </View>
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

// ─── Segmented Sex Toggle ─────────────────────────────────────────────────────

function SegmentedSexToggle({
  label,
  value,
  onChange,
  hasError = false,
}: {
  label: string;
  value: string;
  onChange: (val: "male" | "female") => void;
  hasError?: boolean;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useSharedValue(value === "female" ? 1 : value === "male" ? 0 : -1);
  const pressScale = useSharedValue(1);
  const shakeAnim = useSharedValue(0);
  const pillOpacity = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    if (value === "male") {
      slideAnim.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      pillOpacity.value = withTiming(1, { duration: 150 });
    } else if (value === "female") {
      slideAnim.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      pillOpacity.value = withTiming(1, { duration: 150 });
    } else {
      pillOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [value]);

  useEffect(() => {
    if (hasError) {
      shakeAnim.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasError]);

  const pillWidth = containerWidth > 0 ? (containerWidth - 8) / 2 : 0;

  const animatedSliderStyle = useAnimatedStyle(() => {
    const slidePos = slideAnim.value === -1 ? 0 : slideAnim.value;
    return {
      transform: [{ translateX: slidePos * pillWidth }],
      opacity: pillOpacity.value,
    };
  });

  const animatedPressStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }, { translateX: shakeAnim.value }],
      borderColor: hasError ? "#ef4444" : "rgba(226, 232, 240, 0.6)",
    };
  });

  const handlePressIn = () => {
    pressScale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 120 });
  };

  return (
    <View className="mb-4">
      <Text className="text-[13px] font-semibold text-foreground mb-1.5 ml-0.5">
        {label}
      </Text>

      <Animated.View
        style={animatedPressStyle}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        className="h-[52px] p-1 rounded-xl border flex-row relative border-border/60 bg-border/30 dark:bg-slate-800/40"
      >
        {/* Sliding Highlight Pill */}
        {pillWidth > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 4,
                left: 4,
                width: pillWidth,
                bottom: 4,
              },
              animatedSliderStyle,
            ]}
            className="bg-primary rounded-lg shadow-sm"
          />
        )}

        {/* Male Button */}
        <Pressable
          onPress={() => onChange("male")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === "male" }}
          accessibilityLabel={`Sex at birth male, ${
            value === "male" ? "selected" : "not selected"
          }`}
          className="flex-1 items-center justify-center rounded-lg z-10"
        >
          <Text
            className={`text-[14px] font-semibold capitalize ${
              value === "male"
                ? "text-white dark:text-white"
                : "text-muted-foreground"
            }`}
          >
            Male
          </Text>
        </Pressable>

        {/* Female Button */}
        <Pressable
          onPress={() => onChange("female")}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === "female" }}
          accessibilityLabel={`Sex at birth female, ${
            value === "female" ? "selected" : "not selected"
          }`}
          className="flex-1 items-center justify-center rounded-lg z-10"
        >
          <Text
            className={`text-[14px] font-semibold capitalize ${
              value === "female"
                ? "text-white dark:text-white"
                : "text-muted-foreground"
            }`}
          >
            Female
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main Step 1 Component ────────────────────────────────────────────────────

export default function Step1BasicInfo() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const { data, updateData } = useBaseline();

  const insets = useSafeAreaInsets();

  // Local state to prevent global context thrashing on rapid keystrokes
  const [localFirstName, setLocalFirstName] = useState(data.first_name || "");
  const [localLastName, setLocalLastName] = useState(data.last_name || "");
  const [localHeight, setLocalHeight] = useState(data.height_cm || "");
  const [localWeight, setLocalWeight] = useState(data.weight_kg || "");
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animation values for button states
  const btnScale = useSharedValue(1);
  const btnOpacityAnim = useSharedValue(1);

  // Load existing user profile on mount
  useEffect(() => {
    async function loadExisting() {
      const base_url = process.env.EXPO_PUBLIC_API_URL;
      if (!params.user_id) return;
      if (data.first_name || data.height_cm || data.weight_kg) return;
      try {
        const res = await fetch(`${base_url}/api/users/${params.user_id}/profile`);
        if (!res.ok) return;
        const json = await res.json();
        const p = json?.profile;
        if (p) {
          const fetchedFirstName = p.first_name || "";
          const fetchedLastName = p.last_name || "";
          const fetchedHeight = p.height_cm ? String(p.height_cm) : "";
          const fetchedWeight = p.weight_kg ? String(p.weight_kg) : "";

          setLocalFirstName(fetchedFirstName);
          setLocalLastName(fetchedLastName);
          setLocalHeight(fetchedHeight);
          setLocalWeight(fetchedWeight);

          updateData({
            first_name: fetchedFirstName,
            last_name: fetchedLastName,
            date_of_birth: p.date_of_birth || "",
            sex: p.sex || "",
            height_cm: fetchedHeight,
            weight_kg: fetchedWeight,
          });
        }
      } catch (e) {}
    }
    loadExisting();
  }, [params.user_id]);

  // Keep local state in sync if data in context changes
  useEffect(() => {
    if (data.first_name) setLocalFirstName(data.first_name);
    if (data.last_name) setLocalLastName(data.last_name);
    if (data.height_cm) setLocalHeight(data.height_cm);
    if (data.weight_kg) setLocalWeight(data.weight_kg);
  }, [data.first_name, data.last_name, data.height_cm, data.weight_kg]);

  const handleNext = () => {
    const errors: string[] = [];
    if (!localFirstName.trim()) errors.push("first_name");
    if (!data.date_of_birth) errors.push("date_of_birth");
    if (!data.sex) errors.push("sex");
    
    const h = parseFloat(localHeight);
    const w = parseFloat(localWeight);
    
    if (!localHeight.trim() || isNaN(h) || h < 50 || h > 300) errors.push("height");
    if (!localWeight.trim() || isNaN(w) || w < 20 || w > 400) errors.push("weight");

    if (errors.length > 0) {
      setErrorFields(errors);
      showToast({
        title: "Missing Information",
        message: "Please complete all required fields correctly.",
        type: "error",
      });
      return;
    }

    setErrorFields([]);
    updateData({
      first_name: localFirstName.trim(),
      last_name: localLastName.trim(),
      height_cm: localHeight.trim(),
      weight_kg: localWeight.trim(),
    });

    router.push({ pathname: "/(baseline)/step2_activity", params });
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: btnOpacityAnim.value,
    transform: [{ scale: btnScale.value }],
  }));

  const handleBtnPressIn = () => {
    btnScale.value = withTiming(0.98, { duration: 100 });
  };

  const handleBtnPressOut = () => {
    btnScale.value = withTiming(1.0, { duration: 100 });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="px-5 pt-4 pb-2.5">
        <View className="flex-row items-center mb-3">
          <AnimatedButton
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center mr-3"
          >
            <Feather
              name="arrow-left"
              size={18}
              color={isDark ? "#f8fafc" : "#0f172a"}
            />
          </AnimatedButton>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Step 1 of 6
            </Text>
            <Text
              className="text-xl font-bold text-foreground mt-0.5"
              numberOfLines={1}
            >
              Tell us about yourself
            </Text>
          </View>
          <View className="w-9 h-9 rounded-full items-center justify-center border border-primary/20 bg-primary/10 ml-2">
            <Feather
              name="heart"
              size={17}
              color={isDark ? "#60a5fa" : "#2563eb"}
            />
          </View>
        </View>
        <StepProgress current={1} total={6} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1">
            {/* Subtitle */}
            <Text className="text-[14px] text-muted-foreground mb-6 leading-5">
              Your answers help personalize your health insights.
            </Text>

            {/* First Name */}
            <FormInput
              label="First name"
              value={localFirstName}
              onChangeText={(t) => {
                setLocalFirstName(t);
                setErrorFields((prev) => prev.filter((f) => f !== "first_name"));
              }}
              onBlur={() => updateData({ first_name: localFirstName.trim() })}
              placeholder="Enter your first name"
              hasError={errorFields.includes("first_name")}
              isDark={isDark}
            />

            {/* Last Name (Optional) */}
            <FormInput
              label="Last name"
              isOptional={true}
              value={localLastName}
              onChangeText={(t) => setLocalLastName(t)}
              onBlur={() => updateData({ last_name: localLastName.trim() })}
              placeholder="Enter your last name"
              isDark={isDark}
            />

            {/* Date of Birth */}
            <FormDatePicker
              label="Date of birth"
              value={data.date_of_birth}
              placeholder="Select your birth date"
              onPress={() => {
                setErrorFields((prev) =>
                  prev.filter((f) => f !== "date_of_birth")
                );
                setShowDatePicker(true);
              }}
              hasError={errorFields.includes("date_of_birth")}
              isDark={isDark}
            />

            {showDatePicker && (
              <DateTimePicker
                value={
                  data.date_of_birth
                    ? new Date(data.date_of_birth)
                    : new Date(1995, 0, 1)
                }
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date)
                    updateData({
                      date_of_birth: date.toISOString().split("T")[0],
                    });
                }}
              />
            )}

            {/* Biological Sex Toggle */}
            <SegmentedSexToggle
              label="Sex at birth"
              value={data.sex}
              onChange={(val) => {
                setErrorFields((prev) => prev.filter((f) => f !== "sex"));
                updateData({ sex: val });
              }}
              hasError={errorFields.includes("sex")}
            />

            {/* Height & Weight Measurements */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormInput
                  label="Height"
                  value={localHeight}
                  onChangeText={(t) => {
                    setLocalHeight(t);
                    setErrorFields((prev) =>
                      prev.filter((f) => f !== "height")
                    );
                  }}
                  onBlur={() => updateData({ height_cm: localHeight.trim() })}
                  placeholder="170"
                  unit="cm"
                  keyboardType="numeric"
                  maxLength={3}
                  hasError={errorFields.includes("height")}
                  isDark={isDark}
                />
              </View>

              <View className="flex-1">
                <FormInput
                  label="Weight"
                  value={localWeight}
                  onChangeText={(t) => {
                    setLocalWeight(t);
                    setErrorFields((prev) =>
                      prev.filter((f) => f !== "weight")
                    );
                  }}
                  onBlur={() => updateData({ weight_kg: localWeight.trim() })}
                  placeholder="65"
                  unit="kg"
                  keyboardType="numeric"
                  maxLength={3}
                  hasError={errorFields.includes("weight")}
                  isDark={isDark}
                />
              </View>
            </View>

            {/* Privacy Trust Note */}
            <View className="mt-4 mb-2 flex-row items-center justify-center opacity-80">
              <Feather
                name="shield"
                size={13}
                color={isDark ? "#64748b" : "#94a3b8"}
              />
              <Text className="text-[12px] text-muted-foreground ml-1.5">
                Your health data is private and securely encrypted
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Anchored Bottom CTA */}
      <View
        className="px-5 pt-3.5 bg-card dark:bg-slate-900 border-t border-border/80 shadow-md"
        style={{
          paddingBottom: Math.max(insets.bottom + 16, 32),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Animated.View style={animatedButtonStyle}>
          <Pressable
            onPress={handleNext}
            onPressIn={handleBtnPressIn}
            onPressOut={handleBtnPressOut}
            accessibilityRole="button"
            accessibilityLabel="Proceed to next step"
            className="h-[52px] rounded-2xl items-center justify-center flex-row shadow-sm bg-primary"
          >
            <Text className="text-[16px] font-bold text-primary-foreground">
              Next Step
            </Text>
            <Feather
              name="arrow-right"
              size={18}
              color="#ffffff"
              className="ml-2"
            />
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
