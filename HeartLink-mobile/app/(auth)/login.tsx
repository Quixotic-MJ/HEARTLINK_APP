import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
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
import { Feather } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import { Button } from "../../components/ui/Button";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
  password: z.string().min(1, "Please enter your password."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { setUserId } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Reanimated Micro-interactions
  const eyeScale = useSharedValue(1);
  const errorShake = useSharedValue(0);

  const formatIdentifier = (text: string) => {
    const trimmed = text.trim();
    if (/^[\d-]+$/.test(trimmed)) {
      const digits = trimmed.replace(/\D/g, "").slice(0, 10);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return text;
  };

  const { control, handleSubmit, setValue, formState: { isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  // Trigger error shake animation when globalError updates
  useEffect(() => {
    if (globalError) {
      errorShake.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [globalError]);

  const errorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const eyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeScale.value }],
  }));

  const togglePasswordVisibility = () => {
    eyeScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withTiming(1.15, { duration: 100 }),
      withTiming(1, { duration: 80 })
    );
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);

    let finalIdentifier = data.identifier.trim().toLowerCase();
    const digitsOnly = finalIdentifier.replace(/\D/g, "");
    if (/^[\d-]+$/.test(finalIdentifier) && digitsOnly.length >= 7) {
      let p = digitsOnly;
      if (p.startsWith("0")) {
        p = p.substring(1);
      }
      finalIdentifier = `+63${p}`;
    }

    try {
      const response = await fetch(`${base_url}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: finalIdentifier,
          password: data.password,
        }),
      });
      const resData = await response.json();

      if (response.ok) {
        await setUserId(resData.user_id);

        // Fetch profile to check onboarding status for correct routing
        try {
          const profileRes = await fetch(`${base_url}/api/users/${resData.user_id}/profile`);
          const profileData = await profileRes.json();
          const onboardingStatus = profileData?.profile?.onboarding_status;

          if (onboardingStatus === "complete") {
            router.replace("/(home)/(tabs)/dashboard");
          } else {
            router.replace({
              pathname: "/(baseline)/step1_basic_info",
              params: { user_id: resData.user_id },
            });
          }
        } catch {
          // If profile fetch fails, default to dashboard — auth guard will handle it
          router.replace("/(home)/(tabs)/dashboard");
        }
      } else {
        setGlobalError(resData.detail || "Invalid email or password.");
      }
    } catch (error) {
      console.log(error);
      setGlobalError("An error occurred. Please check your connection.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* ── Top Bar ── */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding");
            }
          }} 
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
          {/* ── Heading ── */}
          <Animated.View entering={FadeIn.delay(100)} className="mb-6 mt-1 px-1">
            <Text className="text-3xl font-bold text-foreground tracking-tight leading-tight mb-1.5">
              Welcome back.
            </Text>
            <Text className="text-[14px] text-muted-foreground leading-relaxed">
              Sign in to check your daily health score.
            </Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="bg-card rounded-2xl border border-border px-5 py-7 gap-6 shadow-md">
            
            {/* Identifier Section */}
            <InputField
              control={control}
              name="identifier"
              label="Email or Phone number"
              icon="user"
              placeholder="e.g. name@example.com or 912-345-6789"
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              onChangeText={(text) => {
                setValue("identifier", formatIdentifier(text), { shouldValidate: true });
              }}
            />

            {/* Password Section */}
            <View className="gap-2.5">
              <InputField
                  control={control}
                  name="password"
                  label="Password"
                  icon="lock"
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  rightElement={
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="p-2 -mr-2"
                      activeOpacity={0.7}
                    >
                      <Animated.View style={eyeAnimatedStyle}>
                        <Feather
                          name={showPassword ? "eye" : "eye-off"}
                          size={18}
                          color={isDark ? "#94a3b8" : "#64748b"}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  }
                />
              <TouchableOpacity
                className="self-end py-2 px-1"
                onPress={() => router.push("/(auth)/forgot-password")}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-semibold text-primary">
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message with Shake Animation */}
            {globalError && (
              <Animated.View 
                style={errorAnimatedStyle}
                className="bg-destructive/15 border border-destructive/40 rounded-xl p-3.5 flex-row items-center gap-2 mt-1 mb-2"
              >
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text className="text-destructive text-xs flex-1 font-medium">
                  {globalError}
                </Text>
              </Animated.View>
            )}

            {/* Submit */}
            <View className="mt-1">
              <Button
                onPress={handleSubmit(onSubmit)}
                isLoading={isSubmitting}
                loadingText="Logging in..."
                label="Log in"
                icon="log-in"
              />
            </View>
          </Animated.View>

          {/* ── Mode toggle ── */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => router.push("/(auth)/register")}
              className="flex-row justify-center items-center py-4 mb-2 gap-1.5 mt-8"
            >
              <Text className="text-sm text-muted-foreground">
                Don't have an account?
              </Text>
              <Text className="text-sm font-bold text-primary">
                Sign up
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
