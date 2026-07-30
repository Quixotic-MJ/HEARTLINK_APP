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
import { useUser } from "../../contexts/UserContext";
import { Feather } from "../../lib/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
  password: z.string().min(1, "Please enter your password."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const base_url = process.env.EXPO_PUBLIC_API_URL;

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


// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();
  const { setUserId } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);
    setIsLoading(true);

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
              pathname: "/(baseline)/health_goals",
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
    } finally {
      setIsLoading(false);
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
        {/* ── Heading ── */}
        <View className="mb-8 mt-2">
          <Text className="text-3xl font-semibold text-foreground tracking-tight leading-tight mb-2" accessibilityRole="header">
            Welcome{"\n"}back.
          </Text>
          <Text className="text-sm text-muted-foreground leading-relaxed">
            Log in to access your cardiovascular dashboard.
          </Text>
        </View>

        {/* ── Card ── */}
        <View className="bg-card rounded-3xl border border-border px-5 py-7 gap-5">
          
          {/* Identifier Section */}
          <InputField
            control={control}
            name="identifier"
            label="Email or Phone number"
            icon="user"
            placeholder="john@example.com or +63..."
            keyboardType="default"
            autoComplete="username"
            textContentType="username"
          />

          {/* Password Section */}
          <View>
            <View className="gap-2">
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
              <TouchableOpacity
                className="self-end -mt-1 py-2 pl-4"
                onPress={() => router.push("/(auth)/forgot-password")}
                accessible={true}
                accessibilityRole="link"
                accessibilityLabel="Forgot your password?"
              >
                <Text className="text-xs font-semibold text-primary">
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {globalError && (
            <View className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex-row items-center gap-2 mt-1 mb-2" accessible={true} accessibilityRole="alert">
              <Feather name="alert-triangle" size={16} className="text-destructive" />
              <Text className="text-destructive text-xs flex-1 font-medium">
                {globalError}
              </Text>
            </View>
          )}

          {/* Submit */}
          <PrimaryButton
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            label="Log in"
            icon="log-in"
          />
        </View>

        {/* ── Mode toggle ── */}
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => router.push("/(auth)/register")}
          className="flex-row justify-center items-center py-4 mb-2 gap-1.5 mt-8"
          accessible={true}
          accessibilityRole="link"
          accessibilityLabel="Don't have an account? Sign up"
        >
          <Text className="text-sm text-muted-foreground">
            Don't have an account?
          </Text>
          <Text className="text-sm font-semibold text-foreground">
            Sign up
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
