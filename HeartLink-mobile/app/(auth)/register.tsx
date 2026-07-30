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
import "../../global.css";
import { Feather } from "../../lib/icons";
import { InputField } from "../../components/ui/InputField";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().min(1, "Email address is required.").email("Please enter a valid email address."),
  phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/(?=.*[a-z])/, "Password must contain a lowercase letter.")
    .regex(/(?=.*[A-Z])/, "Password must contain an uppercase letter.")
    .regex(/(?=.*\d)/, "Password must contain a number."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Animated Button ──────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PrimaryButton({
  onPress,
  isLoading,
  label,
  icon,
}: {
  onPress: () => void;
  isLoading: boolean;
  label: string;
  icon: string;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isLoading}
      style={animatedStyle}
      className={`w-full bg-primary rounded-2xl py-4 flex-row justify-center items-center gap-2 ${isLoading ? "opacity-80" : ""}`}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Feather name={icon as any} size={16} className="text-primary-foreground" />
          <Text className="text-primary-foreground text-sm font-semibold">
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

// Removed local InputField component in favor of centralized InputField component.


export default function RegisterScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValue = watch("password") || "";

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "bottom"]}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding");
            }
          }}
          className="p-2 -ml-2 mr-4"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full items-center justify-center border border-border bg-card" importantForAccessibility="no">
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

      <KeyboardAwareScrollView
        contentContainerClassName="flex-grow px-6 pt-4 pb-12"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 60}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── Card ── */}
        <View className="bg-card rounded-3xl border border-border px-5 py-7">
          {/* Heading */}
          <View className="mb-7">
            <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2" accessibilityRole="header">
              Create your account
            </Text>
            <Text className="text-sm text-muted-foreground leading-relaxed">
              Securely monitor your cardiovascular well-being.
            </Text>
          </View>

          {/* General Error */}
          {generalError && (
            <View className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2" accessible={true} accessibilityRole="alert">
              <Feather name="alert-triangle" size={16} className="text-destructive" />
              <Text className="text-destructive text-xs flex-1 font-medium">
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
              <View className="flex-row items-center border-r border-border pr-3 ml-2 mr-0 self-stretch py-2 my-2">
                <Text className="text-base font-semibold text-foreground">
                  +63
                </Text>
              </View>
            }
          />

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
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  className={isSubmitting ? "text-muted-foreground/50" : "text-muted-foreground"}
                />
              </TouchableOpacity>
            }
          />

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
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={isSubmitting}
              >
                <Feather
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={18}
                  className={isSubmitting ? "text-muted-foreground/50" : "text-muted-foreground"}
                />
              </TouchableOpacity>
            }
          />

          {/* Password hint */}
          <View className="mb-7 -mt-1 ml-1" accessible={true} accessibilityRole="text">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Feather name={passwordValue.length >= 8 ? "check-circle" : "circle"} size={14} className={passwordValue.length >= 8 ? "text-emerald-500" : "text-muted-foreground"} />
              <Text className={`text-sm ${passwordValue.length >= 8 ? "text-foreground" : "text-muted-foreground"}`}>At least 8 characters</Text>
            </View>
            <View className="flex-row items-center gap-2 mb-1.5">
              <Feather name={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "check-circle" : "circle"} size={14} className={/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "text-emerald-500" : "text-muted-foreground"} />
              <Text className={`text-sm ${/(?=.*[A-Z])/.test(passwordValue) && /(?=.*[a-z])/.test(passwordValue) ? "text-foreground" : "text-muted-foreground"}`}>Uppercase & lowercase letter</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name={/(?=.*\d)/.test(passwordValue) ? "check-circle" : "circle"} size={14} className={/(?=.*\d)/.test(passwordValue) ? "text-emerald-500" : "text-muted-foreground"} />
              <Text className={`text-sm ${/(?=.*\d)/.test(passwordValue) ? "text-foreground" : "text-muted-foreground"}`}>At least one number</Text>
            </View>
          </View>

          {/* Submit */}
          <PrimaryButton
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            label="Send verification code"
            icon="send"
          />

          {/* Login link */}
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => router.replace("/(auth)/login")}
            className="flex-row justify-center items-center gap-1.5 mt-6 pt-2 pb-4 mb-2"
            accessible={true}
            accessibilityRole="link"
            accessibilityLabel="Already have an account? Log in"
          >
            <Text className="text-sm text-muted-foreground">
              Already have an account?
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              Log in
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
