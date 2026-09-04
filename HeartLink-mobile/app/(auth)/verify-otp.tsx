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
import HeartLogo from "../../components/ui/HeartLogo";

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
    <SafeAreaView className="flex-1 bg-[#EDF1EF]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-[#DCE3DF] items-center justify-center shadow-xs"
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={18} color="#152131" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <HeartLogo size={22} />
          <Text className="text-base text-[#152131] font-semibold tracking-tight">
            HeartLink
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
          <Animated.View entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)} className="bg-white rounded-2xl border border-[#DCE3DF] px-5 py-7 gap-5 shadow-sm mt-4">
            {/* Icon + heading */}
            <View className="items-center mb-2">
              <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-[#E8532E]/15 border border-[#E8532E]/25">
                <Feather name="smartphone" size={24} color="#E8532E" />
              </View>
              <Text className="text-2xl font-semibold text-[#152131] tracking-tight mb-2 text-center">
                Verify your account
              </Text>
              <Text className="text-sm text-[#5C6B66] text-center leading-relaxed px-2">
                We've sent a 6-digit code to <Text className="font-semibold text-[#152131]">{(phone as string) || "+63 912 345 6789"}</Text>.
              </Text>
            </View>

            {/* ── OTP boxes ── */}
            <View className="flex-row justify-between gap-2 my-2">
              {otp.map((digit, index) => {
                const isFilled = digit !== "";
                const boxBorder = isFilled ? "#152131" : "#DCE3DF";
                const boxBg = isFilled ? "#FFFFFF" : "#F8FAF9";

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
                    className="flex-1 aspect-square rounded-xl border text-center text-2xl font-semibold text-[#152131] p-0"
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
                className="bg-[#A93226]/10 border border-[#A93226]/30 rounded-xl p-3.5 flex-row items-center gap-2 mt-1 mb-1"
                accessible={true}
                accessibilityRole="alert"
              >
                <Feather name="alert-triangle" size={16} color="#A93226" />
                <Text className="text-[#A93226] text-xs font-medium flex-1">
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
                <Text className="text-sm text-[#5C6B66]">
                  Resend code in <Text className="font-semibold text-[#152131]">{formatTime(timer)}</Text>
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
                    <ActivityIndicator size="small" color="#E8532E" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} color="#E8532E" />
                      <Text className="text-sm font-semibold text-[#E8532E]">
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
