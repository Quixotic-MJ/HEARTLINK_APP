import { useColorScheme } from "nativewind";
import React, { useState } from "react";
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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../../global.css";
const base_url = process.env.EXPO_PUBLIC_API_URL;
// ─── Types ────────────────────────────────────────────────────────────────────

type FormErrors = {
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

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
        className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl flex-row items-center px-4"
        style={{
          borderWidth: 1,
          borderColor: hasError ? "#f7c1c1" : "#e2e8f0",
          height: 52,
        }}
      >
        <Feather
          name={icon as any}
          size={17}
          color={hasError ? "#a32d2d" : "#94a3b8"}
        />
        {leftElement}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          textContentType={textContentType}
          className="flex-1 ml-3 text-[14px] text-slate-900 dark:text-white h-full"
        />
        {rightElement}
      </View>
      {hasError && (
        <View className="flex-row items-center gap-1 mt-1.5 ml-1">
          <Feather name="alert-circle" size={11} color="#a32d2d" />
          <Text className="text-[11px]" style={{ color: "#a32d2d" }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Register Screen ──────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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

  // ─── Backend Endpoints ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Normalize phone to start with +63
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
        console.log(data.message);
        router.push({ pathname: "/verify-otp", params: { phone: normalizedPhone } });
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
            {/* Heading */}
            <View className="mb-6">
              <Text className="text-[24px] font-medium text-slate-900 dark:text-white tracking-tight mb-1.5">
                Create your account
              </Text>
              <Text className="text-[13px] text-slate-400 leading-relaxed">
                Securely monitor your cardiovascular well-being.
              </Text>
            </View>

            {/* General Error */}
            {errors.general && (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex-row items-center gap-2">
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 text-[13px] flex-1">
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
                <View
                  className="flex-row items-center border-r border-slate-200 dark:border-slate-800 pr-3 ml-2 mr-0"
                  style={{ height: 20 }}
                >
                  <Text className="text-[13px] font-medium text-slate-600">
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
                  className="p-1 ml-1"
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={16}
                    color="#94a3b8"
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
                  className="p-1 ml-1"
                >
                  <Feather
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={16}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              }
            />

            {/* Password hint */}
            <View className="flex-row items-center gap-1.5 mb-6 -mt-2 ml-1">
              <Feather name="info" size={11} color="#cbd5e1" />
              <Text className="text-[11px] text-slate-300">
                Minimum 8 characters required.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`w-full bg-slate-900 rounded-2xl py-3.5 items-center justify-center flex-row gap-2 mb-5 ${isSubmitting ? 'opacity-80' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#fff" />
                  <Text className="text-white text-[14px] font-medium">
                    Send verification code
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View className="flex-row justify-center items-center gap-1">
              <Text className="text-[13px] text-slate-400">
                Already have an account?
              </Text>
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => router.replace("/login")}
              >
                <Text className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <Text className="text-center text-[9px] tracking-widest text-slate-300 mt-6 uppercase">
            CTU — Main Campus · Capstone 2026
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
