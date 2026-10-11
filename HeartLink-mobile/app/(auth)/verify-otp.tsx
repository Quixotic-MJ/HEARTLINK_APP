import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming
} from "react-native-reanimated";
import "../../global.css";
import { useUser } from "../../contexts/UserContext";
import { Button } from "../../components/ui/Button";
import { Colors } from "../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const verifyOtpSchema = z.object({
  code: z.string().length(6, "Please enter the 6-digit verification code."),
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

// "+639123456789" → "+63 912 345 6789"
const formatPhoneForDisplay = (value: string) => {
  const match = value.match(/^\+63(\d{3})(\d{3})(\d{4})$/);
  return match ? `+63 ${match[1]} ${match[2]} ${match[3]}` : value;
};

// The server's expiry message names the old "Send verification code" button.
const friendlyVerifyError = (detail: string) =>
  /expired/i.test(detail)
    ? "This code has expired. Go back and tap Continue to get a new one."
    : detail;

export default function OTPVerificationScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { setUserId } = useUser();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === "dark" ? Colors.dark : Colors.light;

  const phoneText = typeof phone === "string" ? phone : "";

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      code: "",
    },
    mode: "onSubmit",
  });

  const [otp, setOtp] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Micro-interactions
  const errorShake = useSharedValue(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (generalError || errors.code) {
      errorShake.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [generalError, errors.code]);

  const errorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const applyOtp = (next: string[]) => {
    setOtp(next);
    setValue("code", next.join(""));
  };

  const handleOtpChange = (value: string, index: number) => {
    setGeneralError(null);
    const digits = value.replace(/\D/g, "");

    // A whole code pasted or filled in from the SMS: spread it across the boxes.
    if (digits.length >= CODE_LENGTH) {
      applyOtp(digits.slice(0, CODE_LENGTH).split(""));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      return;
    }

    // Typing over a filled box keeps only the newest digit.
    const digit = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    applyOtp(newOtp);
    if (digit !== "" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async (data: VerifyOtpFormValues) => {
    setGeneralError(null);
    setIsVerifying(true);

    try {
      const response = await fetch(`${base_url}/api/auth/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.code,
          phone: phone,
        }),
      });

      const resData = await response.json();

      if (response.ok) {
        await setUserId(resData.user_id, resData.token);
        setIsVerifying(false);
        router.replace({
          pathname: "/(auth)/verification-success",
          params: { phone, user_id: resData.user_id },
        });
      } else {
        setIsVerifying(false);
        setGeneralError(
          typeof resData.detail === "string"
            ? friendlyVerifyError(resData.detail)
            : "That code didn't work. Check it and try again."
        );
      }
    } catch (err) {
      console.log(err);
      setIsVerifying(false);
      setGeneralError("Unable to connect to the server. Please check your connection.");
    }
  };

  const handleResend = async () => {
    if (canResend) {
      setIsResending(true);
      setGeneralError(null);
      try {
        const response = await fetch(`${base_url}/api/auth/resend-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });

        const data = await response.json();

        if (response.ok) {
          setTimer(RESEND_SECONDS);
          setCanResend(false);
          applyOtp(Array(CODE_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
        } else {
          setGeneralError(
            typeof data.detail === "string" ? data.detail : "Couldn't resend the code. Try again in a minute."
          );
        }
      } catch (err) {
        console.log(err);
        setGeneralError("Unable to connect to the server. Please check your connection.");
      } finally {
        setIsResending(false);
      }
    }
  };

  // 42 → "0:42"
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const isComplete = otp.join("").length === CODE_LENGTH;
  const hasError = !!(generalError || errors.code);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      {/* ── Top bar: back + step, both parts of the progress line filled ── */}
      <View className="px-6 pt-2">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-11 h-11 items-center justify-center rounded-full bg-surface border border-border"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text className="text-xs font-medium text-text-soft">Step 2 of 2</Text>
        </View>
        <View
          className="flex-row gap-1.5"
          accessible={true}
          accessibilityLabel="Step 2 of 2: confirm your number"
        >
          <View className="flex-1 h-1 rounded-full bg-primary" />
          <View className="flex-1 h-1 rounded-full bg-primary" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.duration(400)} className="mb-6">
            <View className="w-12 h-12 rounded-xl items-center justify-center mb-5 bg-blue-tint">
              <Feather name="smartphone" size={22} color={palette.blueText} />
            </View>
            <Text
              className="text-[28px] leading-[34px] font-extrabold text-text tracking-tight mb-2"
              accessibilityRole="header"
            >
              Enter the code
            </Text>
            <Text className="text-[15px] text-text-soft leading-[22px]">
              We sent a 6-digit code to{" "}
              <Text className="font-bold text-text">{formatPhoneForDisplay(phoneText)}</Text>.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.65}
              className="self-start py-1.5 pr-3"
              accessibilityRole="link"
              accessibilityLabel="Edit phone number"
            >
              <Text className="text-[15px] font-semibold text-primary underline">Edit</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── OTP boxes ── */}
          <Animated.View
            entering={FadeIn.delay(120).duration(400)}
            style={errorAnimatedStyle}
            className="flex-row gap-2"
          >
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              return (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
                  autoFocus={index === 0}
                  keyboardType="number-pad"
                  // Let the first box accept a whole code from SMS autofill or paste.
                  maxLength={index === 0 ? CODE_LENGTH : 2}
                  textContentType={index === 0 ? "oneTimeCode" : "none"}
                  autoComplete={index === 0 ? "sms-otp" : "off"}
                  selectTextOnFocus
                  editable={!isVerifying}
                  accessibilityLabel={`Digit ${index + 1} of ${CODE_LENGTH}`}
                  className="flex-1 aspect-square rounded-xl text-center text-2xl font-bold text-text p-0 bg-surface"
                  style={{
                    maxHeight: 56,
                    borderWidth: isFocused ? 1.5 : 1,
                    borderColor: hasError
                      ? palette.dangerMid
                      : isFocused
                      ? palette.primary
                      : palette.borderStrong,
                    textAlignVertical: "center",
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                />
              );
            })}
          </Animated.View>

          {/* ── Resend row ── */}
          <View className="flex-row items-center justify-between mt-4 min-h-[36px]">
            <Text className="text-sm text-text-soft">Didn't get it?</Text>
            {!canResend ? (
              <Text className="text-sm text-text-soft">
                Resend in <Text className="font-bold text-text">{formatTime(timer)}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                className="py-2 pl-3"
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Resend code"
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Text className="text-sm font-bold text-primary">Resend code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {hasError && (
            <View
              className="bg-danger-tint border border-danger/40 rounded-xl p-3.5 flex-row items-center gap-2.5 mt-3"
              accessible={true}
              accessibilityRole="alert"
            >
              <Feather name="alert-triangle" size={16} color={palette.dangerText} />
              <Text className="text-danger-text text-sm font-medium flex-1 leading-snug">
                {generalError || errors.code?.message}
              </Text>
            </View>
          )}

          {/* Pushes the actions to the bottom when there is spare height */}
          <View className="flex-1 min-h-[32px]" />

          {/* ── Actions ── */}
          <View>
            <Button
              onPress={handleSubmit(onSubmit)}
              isLoading={isVerifying}
              disabled={!isComplete || isVerifying}
              loadingText="Verifying..."
              label="Verify and create account"
            />
            <Text className="text-xs text-text-soft text-center mt-3">
              Codes expire after 10 minutes.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
