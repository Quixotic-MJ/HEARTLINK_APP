import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
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
import { InputField } from "../../components/ui/InputField";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { apiFetch } from "../../lib/api";
import { useDs } from "../../components/onboarding/useDs";// ─── Phone number ─────────────────────────────────────────────────────────────
// People type Philippine mobile numbers as "0912…" or "912…" (and sometimes
// paste "+63 912…"). Strip the prefix before counting, so no digit gets cut off.

const nationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
};

// ─── Validation Schema ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().min(1, "Please fill out this field.").email("Enter a valid email address (e.g., name@example.com)."),
  phone: z
    .string()
    .min(1, "Please fill out this field.")
    .refine(
      (val) => nationalDigits(val).length === 10,
      "Enter a valid 10-digit mobile number (e.g., 912 345 6789)."
    ),
  password: z
    .string()
    .min(16, "Password must be at least 16 characters.")
    .regex(/(?=.*[a-z])/, "Password must contain a lowercase letter.")
    .regex(/(?=.*[A-Z])/, "Password must contain an uppercase letter.")
    .regex(/(?=.*\d)/, "Password must include at least one number.")
    .regex(/(?=.*[^A-Za-z0-9\s])/, "Password must include at least one special character."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Password rules ───────────────────────────────────────────────────────────
// Same rules as the schema above, shown as tags that turn green as each is met.

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "16+ characters", test: (pw) => pw.length >= 16 },
  { label: "Upper & lowercase", test: (pw) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { label: "A number", test: (pw) => /\d/.test(pw) },
  { label: "A symbol (! # $)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

// Same links as Settings → About.
const openLegal = (path: "terms" | "privacy") => {
  Linking.openURL(`https://heartlink.com/${path}`);
};

// ─── Register Screen ──────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const { c } = useDs();

  const formatPhoneNumber = (value: string) => {
    const digits = nationalDigits(value).slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
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
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  // Keyboard "Next" moves through the fields in order.
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Micro-interactions
  const errorShake = useSharedValue(0);
  const eyeScale = useSharedValue(1);

  const emailValue = watch("email") || "";
  const phoneValue = watch("phone") || "";
  const passwordValue = watch("password") || "";
  const rulesMet = PASSWORD_RULES.filter((rule) => rule.test(passwordValue)).length;

  // Continue unlocks once every field is filled in; the email format is still
  // checked on submit so a typo gets a specific message.
  const canContinue =
    emailValue.trim().length > 0 &&
    nationalDigits(phoneValue).length === 10 &&
    rulesMet === PASSWORD_RULES.length;

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

  const togglePasswordVisibility = () => {
    eyeScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withTiming(1.15, { duration: 100 }),
      withTiming(1, { duration: 80 })
    );
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setGeneralError(null);

    const normalizedPhone = `+63${nationalDigits(data.phone)}`;

    try {
      const response = await apiFetch(`/api/auth/request-code`, {
        auth: false,
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
        let errorMsg = "Couldn't send the code. Check your details and try again.";
        if (Array.isArray(resData.detail)) {
            errorMsg = resData.detail[0].msg;
        } else if (typeof resData.detail === "string") {
            errorMsg = resData.detail;
        }
        errorMsg = errorMsg.replace(/^Value error,\s*/i, "");

        const detail = errorMsg.toLowerCase();
        if (detail.includes("phone") && (detail.includes("already registered") || detail.includes("duplicate"))) {
          setError("phone", { type: "server", message: "This phone number is already registered. Please log in." });
        } else if (detail.includes("email") && (detail.includes("already registered") || detail.includes("duplicate"))) {
          setError("email", { type: "server", message: "This email address is already registered. Please log in." });
        } else {
          setGeneralError(errorMsg);
        }
      }
    } catch (error) {
      console.log(error);
      setGeneralError("Unable to connect to the server. Please check your connection.");
    }
  };

  return (
    <DsScreen
      header={
        <View>
          <SetupHeader title="Step 1 of 2" onBack={() => router.back()} />
          <View className="flex-row px-6" style={{ gap: 4 }} accessible={true} accessibilityLabel="Step 1 of 2: your details">
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.hairlineSoft }} />
          </View>
        </View>
      }
      footer={
        <>
          <DsButton label="Continue" onPress={handleSubmit(onSubmit)} disabled={!canContinue} loading={isSubmitting} />
          <Text style={{ fontSize: 12, lineHeight: 18, color: c.steel, textAlign: "center", marginTop: 4 }}>
            By continuing you agree to our{" "}
            <Text style={{ color: c.link }} onPress={() => openLegal("terms")} accessibilityRole="link" accessibilityLabel="Terms, opens in browser">
              Terms
            </Text>
            {" "}and{" "}
            <Text style={{ color: c.link }} onPress={() => openLegal("privacy")} accessibilityRole="link" accessibilityLabel="Privacy Policy, opens in browser">
              Privacy Policy
            </Text>
            .
          </Text>
          <View className="flex-row justify-center items-center">
            <Text style={{ fontSize: 14, color: c.slate }}>Already have an account?</Text>
            <DsButton label="Log in" variant="link" block={false} onPress={() => router.replace("/(auth)/login")} />
          </View>
        </>
      }
    >
      {/* ── Heading ── */}
      <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 24 }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
          Create your account
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8 }}>
          Takes about a minute. We&apos;ll text a code to confirm your number.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(120).duration(400)} style={{ gap: 16 }}>
        {/* General Error Banner */}
        {generalError && (
          <Animated.View
            style={[errorAnimatedStyle, { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.rose }]}
            accessible={true}
            accessibilityRole="alert"
          >
            <Feather name="alert-triangle" size={16} color={c.danger} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.ink }}>{generalError}</Text>
          </Animated.View>
        )}

        <InputField
          look="ds"
          control={control}
          name="email"
          label="Email"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          forceLight={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
          editable={!isSubmitting}
          onChangeText={(text) => {
            setValue("email", text, { shouldValidate: false, shouldDirty: true });
            if (errors.email) {
              clearErrors("email");
            }
          }}
        />

        <InputField
          look="ds"
          control={control}
          name="phone"
          label="Mobile number"
          placeholder="912 345 6789"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={17}
          forceLight={false}
          inputRef={phoneRef}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!isSubmitting}
          onChangeText={(text) => {
            setValue("phone", formatPhoneNumber(text), { shouldValidate: false, shouldDirty: true });
            if (errors.phone) {
              clearErrors("phone");
            }
          }}
          leftElement={
            <View
              style={{ flexDirection: "row", alignItems: "center", alignSelf: "stretch", paddingRight: 12, marginRight: 12, borderRightWidth: 1, borderRightColor: c.hairline }}
              accessible={true}
              accessibilityLabel="Philippines, plus 63"
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>+63</Text>
            </View>
          }
        />

        <View>
          <InputField
            look="ds"
            control={control}
            name="password"
            label="Password"
            placeholder="Create a password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            forceLight={false}
            inputRef={passwordRef}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canContinue) handleSubmit(onSubmit)();
            }}
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
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}
                disabled={isSubmitting}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Animated.View style={eyeAnimatedStyle}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={c.slate} />
                </Animated.View>
              </TouchableOpacity>
            }
          />

          {/* Password rules as tags that turn green when met */}
          <View
            className="flex-row flex-wrap"
            style={{ gap: 6, marginTop: 10 }}
            accessible={true}
            accessibilityLabel={`Password rules, ${rulesMet} of 4 met. ${PASSWORD_RULES.map(
              (rule) => `${rule.label}: ${rule.test(passwordValue) ? "met" : "not met"}`
            ).join(". ")}.`}
          >
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(passwordValue);
              return (
                <View
                  key={rule.label}
                  className="flex-row items-center"
                  style={{ gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: met ? c.mint : c.surfaceAlt }}
                >
                  {met ? <Feather name="check" size={12} color={c.charcoal} /> : null}
                  <Text style={{ fontSize: 13, fontWeight: "600", color: met ? c.charcoal : c.slate }}>{rule.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </DsScreen>
  );
}
