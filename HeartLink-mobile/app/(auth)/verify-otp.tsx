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
      className="flex-1 bg-background"
      edges={["top", "bottom"]}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-4"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card">
            <Feather name="heart" size={14} className="text-foreground" />
          </View>
          <Text
            className="text-base text-foreground tracking-tight"
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
          <View className="bg-card rounded-3xl border border-border px-5 py-7 gap-5">
            {/* Icon + heading */}
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-primary/10 border border-primary/20"
              >
                <Feather name="smartphone" size={26} className="text-primary" />
              </View>
              <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2 text-center" accessibilityRole="header">
                Verify your account
              </Text>
              <Text className="text-sm text-muted-foreground text-center leading-relaxed px-2">
                We've sent a 6-digit code to <Text className="font-semibold text-foreground">{(phone as string) || "+63 912 345 6789"}</Text>.
              </Text>
            </View>

            {/* ── OTP boxes ── */}
            <View className="flex-row justify-between gap-2 mb-2">
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
                  className={`flex-1 aspect-square rounded-2xl border-2 text-center text-2xl font-semibold p-0 ${
                    digit !== "" 
                      ? "border-primary bg-primary/10 text-foreground" 
                      : "border-border bg-background text-foreground"
                  }`}
                  style={Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : { textAlignVertical: "center" }}
                />
              ))}
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex-row items-center gap-2 mt-1 mb-1" accessible={true} accessibilityRole="alert">
                <Feather name="alert-triangle" size={16} className="text-destructive" />
                <Text className="text-destructive text-sm flex-1 font-medium">
                  {error}
                </Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVerify}
              disabled={isVerifying || !isComplete}
              className={`w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 mb-2 ${(!isComplete || isVerifying) ? 'opacity-50' : ''}`}
            >
              {isVerifying ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground text-sm font-semibold">
                    Verify & proceed
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <View className="items-center mt-2">
              {timer > 0 ? (
                <Text className="text-sm text-muted-foreground">
                  Resend code in <Text className="font-semibold text-foreground">{formatTime(timer)}</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  className="flex-row items-center gap-1.5 py-2 px-4"
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} className="text-primary" />
                      <Text className="text-sm font-semibold text-primary">
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
