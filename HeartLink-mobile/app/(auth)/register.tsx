import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming 
} from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import "../../global.css";
import { Feather } from "@expo/vector-icons";
import HeartLogo from "../../components/ui/HeartLogo";
import { InputField } from "../../components/ui/InputField";
import { Button } from "../../components/ui/Button";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Validation Schema ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().min(1, "Please fill out this field.").email("Enter a valid email address (e.g., name@example.com)."),
  phone: z
    .string()
    .min(1, "Please fill out this field.")
    .refine(
      (val) => val.replace(/\D/g, "").length === 10,
      "Enter a valid 10-digit phone number (e.g., 912-345-6789)."
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/(?=.*[a-z])/, "Password must contain a lowercase letter.")
    .regex(/(?=.*[A-Z])/, "Password must contain an uppercase letter.")
    .regex(/(?=.*\d)/, "Password must include at least one number."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
}).refine(data => data.password === data.confirmPassword, {
  message: "The passwords don't match yet. Please check again.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Register Screen ──────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Micro-interactions
  const errorShake = useSharedValue(0);
  const eyeScale = useSharedValue(1);
  const confirmEyeScale = useSharedValue(1);

  const passwordValue = watch("password") || "";

  useEffect(() => {
    if (generalError) {
      errorShake.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [generalError]);

  const errorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const eyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeScale.value }],
  }));

  const confirmEyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmEyeScale.value }],
  }));

  const togglePasswordVisibility = () => {
    eyeScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withTiming(1.15, { duration: 100 }),
      withTiming(1, { duration: 80 })
    );
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    confirmEyeScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withTiming(1.15, { duration: 100 }),
      withTiming(1, { duration: 80 })
    );
    setShowConfirmPassword((prev) => !prev);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setGeneralError(null);

    const rawDigits = data.phone.replace(/\D/g, "");
    let normalizedPhone = rawDigits;
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    normalizedPhone = `+63${normalizedPhone}`;

    try {
      const response = await fetch(`${base_url}/api/auth/request-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          phone: normalizedPhone,
          password: data.password,
        }),
      });

      const resData = await response.json();

      if (response.ok) {
        router.push({ pathname: "/(auth)/verify-otp", params: { phone: normalizedPhone } });
      } else {
        const detail = (typeof resData.detail === "string" ? resData.detail : "").toLowerCase();
        if (detail.includes("phone") && (detail.includes("already registered") || detail.includes("duplicate"))) {
          setError("phone", { type: "server", message: "This phone number is already registered. Please log in." });
        } else if (detail.includes("email") && (detail.includes("already registered") || detail.includes("duplicate"))) {
          setError("email", { type: "server", message: "This email address is already registered. Please log in." });
        } else if (resData.detail && typeof resData.detail === "string") {
          setGeneralError(resData.detail);
        } else {
          setGeneralError("An error occurred. Please try again.");
        }
      }
    } catch (error) {
      console.log(error);
      setGeneralError("Unable to connect to the server. Please check your connection.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EDF1EF]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding");
            }
          }}
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.delay(100)} className="mb-6 px-1">
            <Text className="text-3xl sm:text-4xl font-semibold text-[#152131] tracking-tight leading-tight mb-2">
              Create your account.
            </Text>
            <Text className="text-sm sm:text-base text-[#5C6B66] leading-relaxed">
              Securely track and nurture your cardiovascular wellness.
            </Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View 
            entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)} 
            className="bg-white rounded-2xl border border-[#DCE3DF] px-5 py-6 gap-3.5 shadow-sm"
          >
            {/* General Error Banner */}
            {generalError && (
              <Animated.View 
                style={errorAnimatedStyle}
                className="bg-[#A93226]/10 border border-[#A93226]/30 rounded-xl p-3.5 flex-row items-center gap-2.5"
                accessible={true}
                accessibilityRole="alert"
              >
                <Feather name="alert-triangle" size={16} color="#A93226" />
                <Text className="text-[#A93226] text-xs sm:text-sm font-medium flex-1 leading-snug">
                  {generalError}
                </Text>
              </Animated.View>
            )}

            {/* Email Field */}
            <InputField
              control={control}
              name="email"
              label="Email Address"
              icon="mail"
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              editable={!isSubmitting}
              onChangeText={(text) => {
                setValue("email", text, { shouldValidate: false, shouldDirty: true });
                if (errors.email) {
                  clearErrors("email");
                }
              }}
            />

            {/* Phone Field */}
            <InputField
              control={control}
              name="phone"
              label="Phone Number"
              icon="phone"
              placeholder="912-345-6789"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={12}
              editable={!isSubmitting}
              onChangeText={(text) => {
                setValue("phone", formatPhoneNumber(text), { shouldValidate: false, shouldDirty: true });
                if (errors.phone) {
                  clearErrors("phone");
                }
              }}
              leftElement={
                <View className="flex-row items-center border-r border-[#DCE3DF] pr-2.5 mr-2 self-stretch py-2 my-1">
                  <Text className="text-sm sm:text-base font-semibold text-[#152131]">
                    +63
                  </Text>
                </View>
              }
            />

            {/* Password Field */}
            <InputField
              control={control}
              name="password"
              label="Password"
              icon="lock"
              placeholder="Create a password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isSubmitting}
              onChangeText={(text) => {
                setValue("password", text, { shouldValidate: false, shouldDirty: true });
                if (errors.password) {
                  clearErrors("password");
                }
              }}
              rightElement={
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  className="p-2 -mr-2"
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Animated.View style={eyeAnimatedStyle}>
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#5C6B66"
                    />
                  </Animated.View>
                </TouchableOpacity>
              }
            />

            {/* Confirm Password Field */}
            <InputField
              control={control}
              name="confirmPassword"
              label="Confirm Password"
              icon="shield"
              placeholder="Confirm your password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              editable={!isSubmitting}
              onChangeText={(text) => {
                setValue("confirmPassword", text, { shouldValidate: false, shouldDirty: true });
                if (errors.confirmPassword) {
                  clearErrors("confirmPassword");
                }
              }}
              rightElement={
                <TouchableOpacity
                  onPress={toggleConfirmPasswordVisibility}
                  className="p-2 -mr-2"
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <Animated.View style={confirmEyeAnimatedStyle}>
                    <Feather
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#5C6B66"
                    />
                  </Animated.View>
                </TouchableOpacity>
              }
            />

            {/* Password Validation Hints */}
            <View className="mb-1 ml-1 pt-1 gap-2">
              <View className="flex-row items-center gap-2">
                <Feather 
                  name={passwordValue.length >= 8 ? "check-circle" : "circle"} 
                  size={14} 
                  color={passwordValue.length >= 8 ? "#1B6E63" : "#8D9B96"} 
                />
                <Text className={`text-xs sm:text-[13px] ${passwordValue.length >= 8 ? "text-[#152131] font-medium" : "text-[#5C6B66]"}`}>
                  At least 8 characters
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Feather 
                  name={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "check-circle" : "circle"} 
                  size={14} 
                  color={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "#1B6E63" : "#8D9B96"} 
                />
                <Text className={`text-xs sm:text-[13px] ${/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "text-[#152131] font-medium" : "text-[#5C6B66]"}`}>
                  Uppercase &amp; lowercase letter
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Feather 
                  name={/(?=.*\d)/.test(passwordValue) ? "check-circle" : "circle"} 
                  size={14} 
                  color={/(?=.*\d)/.test(passwordValue) ? "#1B6E63" : "#8D9B96"} 
                />
                <Text className={`text-xs sm:text-[13px] ${/(?=.*\d)/.test(passwordValue) ? "text-[#152131] font-medium" : "text-[#5C6B66]"}`}>
                  At least one number
                </Text>
              </View>
            </View>

            {/* Submit */}
            <View className="mt-1">
              <Button
                onPress={handleSubmit(onSubmit)}
                isLoading={isSubmitting}
                loadingText="Sending code..."
                label="Send verification code"
                icon="send"
              />
            </View>
          </Animated.View>

          {/* ── Mode toggle ── */}
          <Animated.View entering={FadeInDown.delay(300).springify().damping(12).stiffness(90)}>
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => router.replace("/(auth)/login")}
              className="flex-row justify-center items-center py-5 gap-1.5 mt-4"
              accessible={true}
              accessibilityRole="button"
            >
              <Text className="text-sm text-[#5C6B66]">
                Already have an account?
              </Text>
              <Text className="text-sm font-semibold text-[#152131]">
                Log in
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
