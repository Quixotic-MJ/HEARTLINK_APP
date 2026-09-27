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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming
} from "react-native-reanimated";
import "../../global.css";
import { useUser } from "../../contexts/UserContext";
import { Button } from "../../components/ui/Button";
import { SimpleHeader } from "../../components/ui/SimpleHeader";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const verifyOtpSchema = z.object({
  code: z.string().length(6, "Please enter the 6-digit verification code."),
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

export default function OTPVerificationScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { setUserId } = useUser();

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

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(30);
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

  const handleOtpChange = (value: string, index: number) => {
    setGeneralError(null);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setValue("code", newOtp.join(""));
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
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
        setGeneralError(resData.detail || "Invalid Verification Code.");
      }
    } catch (err) {
      console.log(err);
      setIsVerifying(false);
      setGeneralError("An error occurred. Please check your connection.");
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
          setTimer(30);
          setCanResend(false);
          setOtp(["", "", "", "", "", ""]);
          setValue("code", "");
          inputRefs.current[0]?.focus();
        } else {
          setGeneralError(data.detail || "Failed to resend verification code.");
        }
      } catch (err) {
        console.log(err);
        setGeneralError("An error occurred. Please check your connection.");
      } finally {
        setIsResending(false);
      }
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isComplete = otp.join("").length === 6;

  return (
    <SafeAreaView className="flex-1 bg-[#EDF1EF] dark:bg-[#0A0F0E]" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      {/* ── Top Bar ── */}
      <SimpleHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Card ── */}
          <Animated.View entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)} className="bg-white dark:bg-[#101615] rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-7 gap-5 shadow-sm shadow-slate-100 dark:shadow-none mt-4">
            {/* Icon + heading */}
            <View className="items-center mb-2">
              <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50">
                <Feather name="smartphone" size={24} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 text-center">
                Verify your account
              </Text>
              <Text className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed px-2 font-medium">
                We've sent a 6-digit code to <Text className="font-bold text-slate-900 dark:text-white">{(phone as string) || "+63 912 345 6789"}</Text>.
              </Text>
            </View>

            {/* ── OTP boxes ── */}
            <View className="flex-row justify-between gap-2 my-2">
              {otp.map((digit, index) => {
                const isFilled = digit !== "";
                // Only provide inline background for iOS/Android overrides, rest in classNames
                return (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    className={`flex-1 aspect-square rounded-xl border text-center text-2xl font-semibold p-0 ${
                      isFilled 
                        ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                    }`}
                    style={
                      Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : { textAlignVertical: "center" }
                    }
                  />
                );
              })}
            </View>

            {/* Error Message with Shake Animation */}
            {(generalError || errors.code) && (
              <Animated.View
                style={errorAnimatedStyle}
                className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 flex-row items-center gap-2 mt-1 mb-1"
                accessible={true}
                accessibilityRole="alert"
              >
                <Feather name="alert-triangle" size={16} className="text-red-600 dark:text-red-400" />
                <Text className="text-red-600 dark:text-red-400 text-xs font-medium flex-1">
                  {generalError || errors.code?.message}
                </Text>
              </Animated.View>
            )}

            {/* Submit */}
            <Button
              onPress={handleSubmit(onSubmit)}
              isLoading={isVerifying}
              disabled={!isComplete || isVerifying}
              loadingText="Verifying..."
              label="Verify & proceed"
              icon="check-circle"
            />

            {/* Resend Code */}
            <View className="items-center mt-3">
              {timer > 0 ? (
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Resend code in <Text className="font-bold text-slate-900 dark:text-white">{formatTime(timer)}</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  className="flex-row items-center gap-1.5 py-2 px-4"
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#2E9AE8" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} className="text-blue-500 dark:text-blue-400" />
                      <Text className="text-sm font-bold text-blue-500 dark:text-blue-400">
                        Resend code
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
