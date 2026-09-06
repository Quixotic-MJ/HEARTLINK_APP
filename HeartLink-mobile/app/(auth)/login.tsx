import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { NavigationBar } from "expo-navigation-bar";
import { useRouter } from "expo-router";
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
import HeartLogo from "../../components/ui/HeartLogo";
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

  // Configure Android system bars to seamlessly match HeartLink paper background
  useEffect(() => {
    if (Platform.OS === "android") {
      SystemUI.setBackgroundColorAsync("#EDF1EF").catch(() => {});
      NavigationBar.setStyle("light");
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setTranslucent(true);
    }
  }, []);

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
        await setUserId(resData.user_id, resData.token);

        // Fetch profile to check onboarding status for correct routing
        try {
          const profileRes = await fetch(`${base_url}/api/users/${resData.user_id}/profile`, {
            headers: {
              "Authorization": `Bearer ${resData.token || ""}`,
            },
          });
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
      setGlobalError("Unable to connect to the server. Please check your connection.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#EDF1EF]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <NavigationBar style="light" />
      
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
              Welcome back.
            </Text>
            <Text className="text-sm sm:text-base text-[#5C6B66] leading-relaxed">
              Sign in to check your daily health stability score and routine.
            </Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View 
            entering={FadeInDown.delay(200).springify().damping(12).stiffness(90)} 
            className="bg-white rounded-2xl border border-[#DCE3DF] px-5 py-6 gap-4 shadow-sm"
          >
            {/* Inputs Section */}
            <View className="gap-3">
              {/* Identifier Section */}
              <InputField
                control={control}
                name="identifier"
                label="Email or Phone Number"
                icon="user"
                placeholder="Enter your email or phone number"
                keyboardType="email-address"
                autoComplete="username"
                textContentType="username"
                autoCapitalize="none"
                forceLight={true}
                onChangeText={(text) => {
                  setValue("identifier", formatIdentifier(text), { shouldValidate: true });
                }}
              />

              {/* Password Section */}
              <View className="gap-1.5">
                <InputField
                  control={control}
                  name="password"
                  label="Password"
                  icon="lock"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  forceLight={true}
                  rightElement={
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="p-2 -mr-2"
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      <Animated.View style={eyeAnimatedStyle}>
                        <Feather
                          name={showPassword ? "eye" : "eye-off"}
                          size={18}
                          color={showPassword ? "#152131" : "#5C6B66"}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  className="self-end py-1 px-1"
                  onPress={() => router.push("/(auth)/forgot-password")}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="link"
                >
                  <Text className="text-xs font-semibold text-[#E8532E]">
                    Forgot your password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message with Shake Animation */}
            {globalError && (
              <Animated.View 
                style={errorAnimatedStyle}
                className="bg-[#A93226]/10 border border-[#A93226]/30 rounded-xl p-3.5 flex-row items-center gap-2.5 my-1"
                accessible={true}
                accessibilityRole="alert"
              >
                <Feather name="alert-triangle" size={16} color="#A93226" />
                <Text className="text-[#A93226] text-xs sm:text-sm font-medium flex-1 leading-snug">
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
          <Animated.View entering={FadeInDown.delay(300).springify().damping(12).stiffness(90)}>
            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => router.push("/(auth)/register")}
              className="flex-row justify-center items-center py-5 gap-1.5 mt-4"
              accessible={true}
              accessibilityRole="button"
            >
              <Text className="text-sm text-[#5C6B66]">
                Don't have an account?
              </Text>
              <Text className="text-sm font-semibold text-[#152131]">
                Sign up
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
