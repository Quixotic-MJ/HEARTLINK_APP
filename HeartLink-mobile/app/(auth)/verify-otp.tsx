import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import "../../global.css";
import { useUser } from "../../contexts/UserContext";
import { isSessionTokens } from "../../services/SessionService";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { apiFetch } from "../../lib/api";
import { useDs } from "../../components/onboarding/useDs";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const verifyOtpSchema = z.object({
  code: z.string().length(6, "Please enter the 6-digit verification code."),
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

// The server's expiry message names the old "Send verification code" button.
const friendlyVerifyError = (detail: string) =>
  /expired/i.test(detail)
    ? "This code has expired. Go back and tap Continue to get a new one."
    : detail;

export default function OTPVerificationScreen() {
  const router = useRouter();
  const { phone, email } = useLocalSearchParams();
  const { setUserId } = useUser();
  const { c } = useDs();

  const emailText = typeof email === "string" ? email : "";

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
  const [isResending, setIsResending] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Micro-interactions
  const errorShake = useSharedValue(0);

  const canResend = timer <= 0;
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((p) => p - 1), 1000);
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

    // A whole code pasted or filled in from the email: spread it across the boxes.
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
      const response = await apiFetch(`/api/auth/verify-code`, {
        auth: false,
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
        await setUserId(resData.user_id, resData.token, isSessionTokens(resData) ? resData : null);
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
        const response = await apiFetch(`/api/auth/resend-code`, {
          auth: false,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });

        const data = await response.json();

        if (response.ok) {
          setTimer(RESEND_SECONDS);
          applyOtp(Array(CODE_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
        } else {
          setGeneralError(
            typeof data.detail === "string" ? friendlyVerifyError(data.detail) : "Couldn't resend the code. Try again in a minute."
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
    <DsScreen
      header={
        <View>
          <SetupHeader title="Step 2 of 2" onBack={() => router.back()} />
          <View className="flex-row px-6 pt-1 pb-2" style={{ gap: 6 }} accessible={true} accessibilityLabel="Step 2 of 2: confirm your email">
            <View style={{ flex: 1, height: 4, borderRadius: 9999, backgroundColor: c.primary }} />
            <View style={{ flex: 1, height: 4, borderRadius: 9999, backgroundColor: c.primary }} />
          </View>
        </View>
      }
      footer={
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
          <DsButton
            label="Verify and create account"
            onPress={handleSubmit(onSubmit)}
            loading={isVerifying}
            disabled={!isComplete || isVerifying}
            icon={<Feather name="check" size={16} color={!isComplete || isVerifying ? c.steel : "#FFFFFF"} />}
          />
          <Text style={{ fontSize: 12, color: c.slate, textAlign: "center", marginTop: 4 }}>
            Codes expire after 10 minutes.
          </Text>
        </Animated.View>
      }
    >
      {/* ── Heading ── */}
      <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 24 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: c.tint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Feather name="mail" size={22} color={c.primary} />
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
          Enter the code
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
          We emailed a 6-digit verification code to{" "}
          <Text style={{ fontWeight: "600", color: c.ink }}>{emailText || "your email"}</Text>.
        </Text>

        <View className="flex-row items-center mt-2">
          <Text style={{ fontSize: 13.5, color: c.slate }}>Wrong address? </Text>
          <DsButton label="Edit email" variant="link" block={false} onPress={() => router.back()} />
        </View>
      </Animated.View>

      {/* ── OTP boxes ── */}
      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={[errorAnimatedStyle, { flexDirection: "row", gap: 8 }]}>
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
              style={{
                flex: 1,
                height: 56,
                borderRadius: 10,
                textAlign: "center",
                fontSize: 24,
                fontWeight: "700",
                color: c.ink,
                padding: 0,
                backgroundColor: hasError
                  ? "#FEF2F2"
                  : isFocused
                  ? c.tint
                  : digit
                  ? c.surfaceAlt
                  : c.canvas,
                borderWidth: isFocused || hasError ? 2 : 1.5,
                borderColor: hasError
                  ? c.danger
                  : isFocused
                  ? c.primary
                  : digit
                  ? c.hairlineStrong
                  : c.hairline,
                textAlignVertical: "center",
                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
              }}
            />
          );
        })}
      </Animated.View>

      {/* ── Resend row ── */}
      <View className="flex-row items-center" style={{ gap: 6, marginTop: 20, minHeight: 44 }}>
        <Text style={{ fontSize: 14, color: c.slate }}>Didn&apos;t get the code?</Text>
        {!canResend ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: c.surfaceAlt,
              borderWidth: 1,
              borderColor: c.hairline,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }}>
              Resend in {formatTime(timer)}
            </Text>
          </View>
        ) : isResending ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            style={{ height: 44, justifyContent: "center", paddingHorizontal: 4 }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.primary }}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {hasError && (
        <Animated.View
          style={[
            errorAnimatedStyle,
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 12,
              backgroundColor: c.rose,
              borderWidth: 1,
              borderColor: "#FECACA",
              marginTop: 16,
            },
          ]}
          accessible={true}
          accessibilityRole="alert"
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#FEE2E2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="alert-triangle" size={15} color={c.danger} />
          </View>
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: "#991B1B", fontWeight: "500" }}>
            {generalError || errors.code?.message}
          </Text>
        </Animated.View>
      )}
    </DsScreen>
  );
}
