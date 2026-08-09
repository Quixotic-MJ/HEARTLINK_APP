import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useColorScheme } from "nativewind";
import "../../global.css";
import { Feather } from "@expo/vector-icons";
import { InputField } from "../../components/ui/InputField";
import { Button } from "../../components/ui/Button";
import AnimatedButton from "../../components/ui/AnimatedButton";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().min(1, "Please fill out this field.").email("Enter a valid email address (e.g., name@example.com)."),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number (e.g., 9123456789)."),
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

// ─── Animated Button ──────────────────────────────────────────────────────────

// Removed local PrimaryButton in favor of centralized Button component

// Removed local InputField component in favor of centralized InputField component.


export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const {
    control,
    handleSubmit,
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
    mode: "onTouched",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const passwordValue = watch("password") || "";

  const onSubmit = async (data: RegisterFormValues) => {
    setGeneralError(null);

    let normalizedPhone = data.phone;
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
        if (resData.detail === "duplicate phone number") {
          setError("phone", { type: "server", message: "This phone number is already registered." });
        } else if (resData.detail === "duplicate email") {
          setError("email", { type: "server", message: "This email address is already registered." });
        } else if (resData.detail && typeof resData.detail === "string") {
          setGeneralError(resData.detail);
        } else {
          setGeneralError("An error occurred. Please try again.");
        }
      }
    } catch (error) {
      console.log(error);
      setGeneralError("An error occurred. Please check your connection.");
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      edges={["top", "bottom"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 justify-between">
        <AnimatedButton
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding");
            }
          }}
          className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 border-slate-800/70 items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#f8fafc" : "#0f172a"} />
        </AnimatedButton>
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full items-center justify-center bg-rose-500/10">
            <Feather name="heart" size={13} color="#f43f5e" />
          </View>
          <Text className="text-[14px] text-slate-900 dark:text-white" style={{ fontWeight: "300" }}>
            Heart<Text style={{ fontWeight: "600" }}>Link.</Text>
          </Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="flex-grow px-5 pt-4 pb-12"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 60}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 px-5 py-7" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          {/* Heading */}
          <View className="mb-7">
            <Text className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Create your account
            </Text>
            <Text className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Securely monitor your cardiovascular well-being.
            </Text>
          </View>

          {/* General Error */}
          {generalError && (
            <View className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2">
              <Feather name="alert-triangle" size={16} color="#f43f5e" />
              <Text className="text-rose-600 dark:text-rose-400 text-xs flex-1 font-medium">
                {generalError}
              </Text>
            </View>
          )}

          {/* ── Fields ── */}

          {/* Email */}
          <InputField
            control={control}
            name="email"
            label="Email Address"
            icon="mail"
            placeholder="e.g. john@example.com"
            error={errors.email?.message}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!isSubmitting}
          />

          <View className="h-4" />

          {/* Phone */}
          <InputField
            control={control}
            name="phone"
            label="Phone Number"
            icon="phone"
            placeholder="912 345 6789"
            error={errors.phone?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!isSubmitting}
            leftElement={
              <View className="flex-row items-center border-r border-slate-200 dark:border-slate-700 pr-3 ml-2 mr-0 self-stretch py-2 my-2">
                <Text className="text-base font-semibold text-slate-900 dark:text-white">
                  +63
                </Text>
              </View>
            }
          />

          <View className="h-4" />

          {/* Password */}
          <InputField
            control={control}
            name="password"
            label="Password"
            icon="lock"
            placeholder="Create a strong password"
            error={errors.password?.message}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-2 -mr-2"
                disabled={isSubmitting}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  color={isDark ? (isSubmitting ? "#475569" : "#94a3b8") : (isSubmitting ? "#cbd5e1" : "#64748b")}
                />
              </TouchableOpacity>
            }
          />

          <View className="h-4" />

          {/* Confirm password */}
          <InputField
            control={control}
            name="confirmPassword"
            label="Confirm Password"
            icon="shield"
            placeholder="Confirm password"
            error={errors.confirmPassword?.message}
            secureTextEntry={!showConfirmPassword}
            editable={!isSubmitting}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-2 -mr-2"
                disabled={isSubmitting}
              >
                <Feather
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={18}
                  color={isDark ? (isSubmitting ? "#475569" : "#94a3b8") : (isSubmitting ? "#cbd5e1" : "#64748b")}
                />
              </TouchableOpacity>
            }
          />

          <View className="h-2" />

          {/* Password hint */}
          <View className="mb-7 ml-1">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Feather name={passwordValue.length >= 8 ? "check-circle" : "circle"} size={14} color={passwordValue.length >= 8 ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
              <Text className={`text-[13px] ${passwordValue.length >= 8 ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>At least 8 characters</Text>
            </View>
            <View className="flex-row items-center gap-2 mb-1.5">
              <Feather name={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "check-circle" : "circle"} size={14} color={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
              <Text className={`text-[13px] ${/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>Uppercase & lowercase letter</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name={/(?=.*\d)/.test(passwordValue) ? "check-circle" : "circle"} size={14} color={/(?=.*\d)/.test(passwordValue) ? "#10b981" : (isDark ? "#64748b" : "#94a3b8")} />
              <Text className={`text-[13px] ${/(?=.*\d)/.test(passwordValue) ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>At least one number</Text>
            </View>
          </View>

          {/* Submit */}
          <Button
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            loadingText="Sending..."
            label="Send verification code"
            icon="send"
          />

          {/* Login link */}
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => router.replace("/(auth)/login")}
            className="flex-row justify-center items-center gap-1.5 mt-6 pt-2 pb-4 mb-2"
          >
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?
            </Text>
            <Text className="text-sm font-bold text-slate-900 dark:text-white">
              Log in
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
