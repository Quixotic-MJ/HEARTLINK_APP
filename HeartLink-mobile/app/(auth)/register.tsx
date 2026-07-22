import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
import "../../global.css";
import { Feather } from "../../lib/icons";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

type FormErrors = {
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

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

// ─── Input Field ──────────────────────────────────────────────────────────────

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  rightElement,
  leftElement,
  autoComplete,
  textContentType,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  autoComplete?: any;
  textContentType?: any;
}) {
  const hasError = !!error;
  return (
    <View className="mb-4">
      <View
        className={`w-full rounded-2xl flex-row items-center px-4 min-h-[52px] border ${
          hasError
            ? "border-destructive/40 bg-destructive/10"
            : "border-border bg-background"
        }`}
      >
        <Feather
          name={icon as any}
          size={18}
          className={hasError ? "text-destructive" : "text-muted-foreground"}
        />
        {leftElement}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          textContentType={textContentType}
          className="flex-1 ml-3 text-sm text-foreground py-3.5"
        />
        {rightElement}
      </View>
      {hasError && (
        <View className="flex-row items-center gap-1.5 mt-2 ml-1" accessible={true} accessibilityRole="alert">
          <Feather name="alert-circle" size={12} className="text-destructive" />
          <Text className="text-xs text-destructive font-medium">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Register Screen ──────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validateForm = () => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) newErrors.email = "Email address is required.";
    else if (!emailRegex.test(email))
      newErrors.email = "Please enter a valid email address.";

    if (!phone || phone.length < 10)
      newErrors.phone = "Please enter a valid 10-digit phone number.";

    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters.";
    else if (!/(?=.*[a-z])/.test(password))
      newErrors.password = "Password must contain a lowercase letter.";
    else if (!/(?=.*[A-Z])/.test(password))
      newErrors.password = "Password must contain an uppercase letter.";
    else if (!/(?=.*\d)/.test(password))
      newErrors.password = "Password must contain a number.";

    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    let normalizedPhone = phone;
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
          email: email,
          phone: normalizedPhone,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push({ pathname: "/(auth)/verify-otp", params: { phone: normalizedPhone } });
      } else {
        if (data.detail === "duplicate phone number") {
          setErrors({ phone: "This phone number is already registered." });
        } else if (data.detail === "duplicate email") {
          setErrors({ email: "This email address is already registered." });
        } else if (data.detail && typeof data.detail === "string") {
          setErrors({ general: data.detail });
        } else {
          setErrors({ general: "An error occurred. Please try again." });
        }
      }
    } catch (error) {
      console.log(error);
      setErrors({ general: "An error occurred. Please check your connection." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top"]}
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
          className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center mr-3"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={18} className="text-foreground" />
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
          {errors.general && (
            <View className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2" accessible={true} accessibilityRole="alert">
              <Feather name="alert-triangle" size={16} className="text-destructive" />
              <Text className="text-destructive text-xs flex-1 font-medium">
                {errors.general}
              </Text>
            </View>
          )}

          {/* ── Fields ── */}

          {/* Email */}
          <InputField
            icon="mail"
            placeholder="Email address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              clearError("email");
            }}
            error={errors.email}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {/* Phone */}
          <InputField
            icon="phone"
            placeholder="912 345 6789"
            value={phone}
            onChangeText={(t) => {
              setPhone(t.replace(/[^0-9]/g, ""));
              clearError("phone");
            }}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            leftElement={
              <View className="flex-row items-center border-r border-border pr-3 ml-2 mr-0 self-stretch py-2 my-2">
                <Text className="text-sm font-semibold text-foreground">
                  +63
                </Text>
              </View>
            }
          />

          {/* Password */}
          <InputField
            icon="lock"
            placeholder="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearError("password");
            }}
            error={errors.password}
            secureTextEntry={!showPassword}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-2 -mr-2"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  className="text-muted-foreground"
                />
              </TouchableOpacity>
            }
          />

          {/* Confirm password */}
          <InputField
            icon="shield"
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              clearError("confirmPassword");
            }}
            error={errors.confirmPassword}
            secureTextEntry={!showConfirmPassword}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-2 -mr-2"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <Feather
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={18}
                  className="text-muted-foreground"
                />
              </TouchableOpacity>
            }
          />

          {/* Password hint */}
          <View className="flex-row items-center gap-2 mb-7 -mt-2 ml-1" accessible={true} accessibilityRole="text" accessibilityLabel="Password requirement: Minimum 8 characters required.">
            <Feather name="info" size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground font-medium">
              Minimum 8 characters required.
            </Text>
          </View>

          {/* Submit */}
          <PrimaryButton
            onPress={handleSubmit}
            isLoading={isSubmitting}
            label="Send verification code"
            icon="send"
          />

          {/* Login link */}
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={() => router.replace("/(auth)/login")}
            className="flex-row justify-center items-center gap-1.5 mt-6 pt-2"
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

        {/* Footer */}
        <Text className="text-center text-[10px] tracking-widest text-muted-foreground opacity-60 mt-auto pt-8 uppercase" importantForAccessibility="no">
          CTU — Main Campus · Capstone 2026
        </Text>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
