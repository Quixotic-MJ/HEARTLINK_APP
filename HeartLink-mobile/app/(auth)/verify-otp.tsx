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
import { useColorScheme } from "nativewind";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming 
} from "react-native-reanimated";
import "../../global.css";
import { useUser } from "../../contexts/UserContext";
import { Button } from "../../components/ui/Button";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const verifyOtpSchema = z.object({
  code: z.string().length(6, "Please enter the 6-digit verification code."),
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

export default function OTPVerificationScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
        await setUserId(resData.user_id);
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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Bar ── */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-card border border-border items-center justify-center"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card shadow-sm">
            <Feather name="heart" size={14} color={isDark ? "#f8fafc" : "#0f172a"} />
          </View>
          <Text className="text-[15px] text-foreground tracking-tight" style={{ fontWeight: "300" }}>
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

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
          <Animated.View entering={FadeInDown.delay(200).springify()} className="bg-card rounded-2xl border border-border px-5 py-7 gap-5 shadow-md mt-4">
            {/* Icon + heading */}
            <View className="items-center mb-2">
              <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-primary/10 border border-primary/20">
                <Feather name="smartphone" size={24} color={isDark ? "#3b82f6" : "#2563eb"} />
              </View>
              <Text className="text-2xl font-bold text-foreground tracking-tight mb-2 text-center">
                Verify your account
              </Text>
              <Text className="text-sm text-muted-foreground text-center leading-relaxed px-2">
                We've sent a 6-digit code to <Text className="font-semibold text-foreground">{(phone as string) || "+63 912 345 6789"}</Text>.
              </Text>
            </View>

            {/* ── OTP boxes ── */}
            <View className="flex-row justify-between gap-2 my-2">
              {otp.map((digit, index) => {
                const isFilled = digit !== "";
                const boxBorder = isFilled 
                  ? (isDark ? "#3b82f6" : "#2563eb") 
                  : (isDark ? "#334155" : "#e2e8f0");
                const boxBg = isFilled 
                  ? (isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(37, 99, 235, 0.06)") 
                  : (isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.9)");

                return (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    className="flex-1 aspect-square rounded-xl border text-center text-2xl font-semibold text-foreground p-0"
                    style={[
                      { borderColor: boxBorder, backgroundColor: boxBg },
                      Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : { textAlignVertical: "center" }
                    ]}
                  />
                );
              })}
            </View>

            {/* Error Message with Shake Animation */}
            {(generalError || errors.code) && (
              <Animated.View 
                style={errorAnimatedStyle}
                className="bg-destructive/15 border border-destructive/40 rounded-xl p-3.5 flex-row items-center gap-2 mt-1 mb-1"
              >
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-destructive text-xs flex-1 font-medium">
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
                <Text className="text-sm text-muted-foreground">
                  Resend code in <Text className="font-semibold text-foreground">{formatTime(timer)}</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  className="flex-row items-center gap-1.5 py-2 px-4"
                  activeOpacity={0.7}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={isDark ? "#3b82f6" : "#2563eb"} />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} color={isDark ? "#3b82f6" : "#2563eb"} />
                      <Text className="text-sm font-semibold text-primary">
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
