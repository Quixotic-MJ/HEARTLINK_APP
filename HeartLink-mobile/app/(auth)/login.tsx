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
import { useColorScheme } from "nativewind";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import "../../global.css";
import { useUser } from "../../contexts/UserContext";
import { Feather } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import { Button } from "../../components/ui/Button";
import AnimatedButton from "../../components/ui/AnimatedButton";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
  password: z.string().min(1, "Please enter your password."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Animated Button ──────────────────────────────────────────────────────────

// Removed local PrimaryButton in favor of centralized Button component

// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { setUserId } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);

    let finalIdentifier = data.identifier.trim().toLowerCase();
    if (/^\d+$/.test(finalIdentifier)) {
      if (finalIdentifier.startsWith("0")) {
        finalIdentifier = finalIdentifier.substring(1);
      }
      finalIdentifier = `+63${finalIdentifier}`;
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <AnimatedButton onPress={() => {
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

      <View className="flex-grow px-5 pt-4 pb-12">
        {/* ── Heading ── */}
        <View className="mb-8 mt-2 px-1">
          <Text className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
            Welcome{"\n"}back.
          </Text>
          <Text className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Log in to access your cardiovascular dashboard.
          </Text>
        </View>

        {/* ── Card ── */}
        <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 px-5 py-7 gap-5" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          
          {/* Identifier Section */}
          <InputField
            control={control}
            name="identifier"
            label="Email or Phone number"
            icon="user"
            placeholder="email or phone"
            keyboardType="default"
            autoComplete="username"
            textContentType="username"
          />

          {/* Password Section */}
          <View>
            <InputField
                control={control}
                name="password"
                label="Password"
                icon="lock"
                placeholder="Password"
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((p) => !p)}
                    className="p-2 -mr-2"
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color={isDark ? "#94a3b8" : "#64748b"}
                    />
                  </TouchableOpacity>
                }
              />
            <TouchableOpacity
              className="self-end py-2 pl-4 -mt-2"
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text className="text-xs font-semibold text-rose-500">
                Forgot your password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {globalError && (
            <View className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex-row items-center gap-2 mt-1 mb-2">
              <Feather name="alert-triangle" size={16} color="#f43f5e" />
              <Text className="text-rose-600 dark:text-rose-400 text-xs flex-1 font-medium">
                {globalError}
              </Text>
            </View>
          )}

          {/* Submit */}
          <Button
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            loadingText="Logging in..."
            label="Log in"
            icon="log-in"
          />
        </View>

        {/* ── Mode toggle ── */}
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => router.push("/(auth)/register")}
          className="flex-row justify-center items-center py-4 mb-2 gap-1.5 mt-8"
        >
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?
          </Text>
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
