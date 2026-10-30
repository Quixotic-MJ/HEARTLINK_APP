import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
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
import { isSessionTokens } from "../../services/SessionService";
import { Feather } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import HeartLogo from "../../components/ui/HeartLogo";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { apiFetch } from "../../lib/api";

const loginSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
  password: z.string().min(1, "Please enter your password."),
});

type LoginFormData = z.infer<typeof loginSchema>;
// ─── Auth Screen ──────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();
  const { setUserId } = useUser();
  const { c } = useDs();

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

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

  // Configure Android system bars to match the white design-system background
  useEffect(() => {
    if (Platform.OS === "android") {
      SystemUI.setBackgroundColorAsync(c.canvas).catch(() => { });
      NavigationBar.setStyle("light");
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setTranslucent(true);
    }
  }, [c.canvas]);

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
      const response = await apiFetch(`/api/auth/login`, {
        auth: false,
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
        await setUserId(resData.user_id, resData.token, isSessionTokens(resData) ? resData : null);

        // Fetch profile to check onboarding status for correct routing
        try {
          const profileRes = await apiFetch(`/api/users/${resData.user_id}/profile`, {
            headers: {
              "Authorization": `Bearer ${resData.token || ""}`,
            },
          });
          const profileData = await profileRes.json();
          const onboardingStatus = profileData?.profile?.onboarding_status;

          if (profileData?.profile?.account_kind === "family") {
            // HL-087: an account that only follows family members
            router.replace("/(family)");
          } else if (onboardingStatus === "complete") {
            router.replace("/(home)/(tabs)/dashboard");
          } else {
            // Unfinished set-up: the set-up map shows which parts are already done.
            router.replace("/(baseline)/plan");
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
    <>
      <NavigationBar style="auto" />
      <DsScreen
        header={
          <View className="flex-row items-center justify-between px-6 pt-3 pb-2">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <HeartLogo size={26} />
              <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.4, color: c.ink }}>HeartLink</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: c.tint,
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        }
        footer={
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
            <DsButton
              label="Log in"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
            />
            <View className="flex-row justify-center items-center mt-2">
              <Text style={{ fontSize: 14, color: c.slate }}>Don&apos;t have an account? </Text>
              <DsButton label="Sign up" variant="link" block={false} onPress={() => router.push("/(auth)/register")} />
            </View>
          </Animated.View>
        }
      >
        {/* ── Heading ── */}
        <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: 8, marginBottom: 28 }}>
          <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
            Sign in to check your daily score, telemetry, and routine.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ gap: 16 }}>
          <InputField
            look="ds"
            control={control}
            name="identifier"
            label="Email or phone number"
            placeholder="name@example.com or 912 345 6789"
            keyboardType="email-address"
            autoComplete="username"
            textContentType="username"
            autoCapitalize="none"
            forceLight={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isSubmitting}
            onChangeText={(text) => {
              setValue("identifier", formatIdentifier(text), { shouldValidate: true });
            }}
          />

          <View>
            <InputField
              look="ds"
              control={control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              forceLight={false}
              inputRef={passwordRef}
              returnKeyType="done"
              onSubmitEditing={() => handleSubmit(onSubmit)()}
              editable={!isSubmitting}
              rightElement={
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Animated.View style={eyeAnimatedStyle}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={showPassword ? c.primary : c.slate} />
                  </Animated.View>
                </TouchableOpacity>
              }
            />
            <View style={{ alignItems: "flex-end", marginTop: 4 }}>
              <DsButton
                label="Forgot your password?"
                variant="link"
                block={false}
                onPress={() => router.push("/(auth)/forgot-password")}
              />
            </View>
          </View>

          {/* Error Message with Shake Animation */}
          {globalError && (
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
              <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: "#991B1B", fontWeight: "500" }}>{globalError}</Text>
            </Animated.View>
          )}
        </Animated.View>
      </DsScreen>
    </>
  );
}
