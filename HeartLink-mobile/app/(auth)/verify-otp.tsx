import { useColorScheme } from "nativewind";
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
import "../../global.css";
import { useUser } from "../../contexts/UserContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export default function OTPVerificationScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { setUserId } = useUser();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    setError(null);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    setError(null);

    try {
      if (code.length === 6) {
        setIsVerifying(true);

        const response = await fetch(`${base_url}/api/auth/verify-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: code,
            phone: phone,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await setUserId(data.user_id);
          setIsVerifying(false);
          router.replace({
            pathname: "/(auth)/verification-success",
            params: { phone, user_id: data.user_id },
          });
        } else {
          setIsVerifying(false);
          setError(data.detail || "Invalid Verification Code.");
        }
      }
    } catch (err) {
      console.log(err);
      setIsVerifying(false);
      setError("An error occurred. Please check your connection.");
    }
  };

  const handleResend = async () => {
    if (canResend) {
      setIsResending(true);
      setError(null);
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
          inputRefs.current[0]?.focus();
        } else {
          setError(data.detail || "Failed to resend verification code.");
        }
      } catch (err) {
        console.log(err);
        setError("An error occurred. Please check your connection.");
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
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Feather name="heart" size={13} color="#0f172a" />
          </View>
          <Text
            className="text-[16px] text-slate-900 dark:text-white tracking-tight"
            style={{ fontWeight: "300" }}
          >
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerClassName="flex-grow justify-center px-5 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Card ── */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 px-6 py-7">
            {/* Icon + heading */}
            <View className="items-center mb-7">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-5 border border-slate-200 dark:border-slate-800/70"
                style={{ backgroundColor: "#e6f1fb" }}
              >
                <Feather name="smartphone" size={26} color="#185fa5" />
              </View>
              <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-2 text-center">
                Verify your account
              </Text>
              <Text className="text-[13px] text-slate-400 text-center leading-relaxed px-2">
                We've sent a one-time password to your phone number.
              </Text>
              <View className="flex-row items-center gap-1.5 mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-3 py-1.5 rounded-xl">
                <Feather name="phone" size={12} color="#64748b" />
                <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  {(phone as string) || "+63 912 345 6789"}
                </Text>
              </View>
            </View>

            {/* ── OTP boxes ── */}
            <View className="flex-row justify-between gap-2 mb-7">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    backgroundColor: digit !== "" ? "#e6f1fb" : "#f8fafc",
                    borderWidth: 1.5,
                    borderColor: digit !== "" ? "#185fa5" : "#e2e8f0",
                    borderRadius: 14,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: "500",
                    color: "#0f172a",
                    padding: 0,
                    textAlignVertical: "center",
                    ...(Platform.OS === "android"
                      ? { includeFontPadding: false }
                      : {}),
                  }}
                />
              ))}
            </View>

            {/* Progress indicator */}
            <View className="flex-row gap-1 mb-4">
              {otp.map((digit, i) => (
                <View
                  key={i}
                  className="flex-1 h-1 rounded-full"
                  style={{
                    backgroundColor: digit !== "" ? "#185fa5" : "#e2e8f0",
                  }}
                />
              ))}
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex-row items-center gap-2 mb-4">
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 text-[13px] flex-1">
                  {error}
                </Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVerify}
              disabled={isVerifying || !isComplete}
              className="w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2 mb-5"
              style={{ backgroundColor: isComplete ? "#0f172a" : "#e2e8f0" }}
            >
              {isVerifying ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Feather
                    name="check-circle"
                    size={15}
                    color={isComplete ? "#fff" : "#94a3b8"}
                  />
                  <Text
                    className="text-[14px] font-medium"
                    style={{ color: isComplete ? "#fff" : "#94a3b8" }}
                  >
                    Verify & proceed
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <View className="items-center">
              {timer > 0 ? (
                <Text className="text-[13px] text-slate-400">
                  Resend code in <Text className="font-semibold text-slate-700 dark:text-slate-300">{formatTime(timer)}</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  className="flex-row items-center gap-1.5"
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#185fa5" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={13} color="#185fa5" />
                      <Text className="text-[13px] font-medium text-sky-600 dark:text-sky-400">
                        Resend code
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
