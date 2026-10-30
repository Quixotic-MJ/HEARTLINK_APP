import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useToast } from "../../contexts/ToastContext";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import { DsScreen, InfoNote } from "../../components/onboarding/QuestionLayout";
import { apiFetch } from "../../lib/api";
import { useDs } from "../../components/onboarding/useDs";

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { c } = useDs();

  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: "",
    },
    mode: "onTouched",
  });

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorShake = useSharedValue(0);

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

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setGeneralError(null);
    setIsSubmitting(true);

    let finalIdentifier = data.identifier.trim();
    if (/^\d+$/.test(finalIdentifier)) {
      if (finalIdentifier.startsWith("0")) {
        finalIdentifier = finalIdentifier.substring(1);
      }
      if (!finalIdentifier.startsWith("+63")) {
        finalIdentifier = `+63${finalIdentifier}`;
      }
    }

    try {
      const response = await apiFetch(`/api/auth/forgot-password`, {
        auth: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: finalIdentifier }),
      });
      const resData = await response.json();

      if (response.ok) {
        showToast({ title: "Link Sent", message: "If this account is registered, you will receive reset instructions shortly.", type: "success" });
        setTimeout(() => router.back(), 1500);
      } else {
        setGeneralError(resData.detail || "Account not found.");
      }
    } catch (err) {
      console.log(err);
      setGeneralError("An error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DsScreen
      header={<SetupHeader title="Reset password" onBack={() => router.back()} />}
      footer={
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
          <DsButton
            label="Send reset instructions"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            icon={<Feather name="mail" size={16} color="#FFFFFF" />}
          />
          <View className="flex-row justify-center items-center mt-2">
            <Text style={{ fontSize: 14, color: c.slate }}>Remembered your password? </Text>
            <DsButton label="Log in" variant="link" block={false} onPress={() => router.back()} />
          </View>
        </Animated.View>
      }
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: c.tint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Feather name="key" size={22} color={c.primary} />
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
          Forgot password?
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6, marginBottom: 28 }}>
          Enter your email or phone number and we&apos;ll send you instructions to reset your password.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ gap: 16 }}>
        {generalError && (
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
            <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: "#991B1B", fontWeight: "500" }}>{generalError}</Text>
          </Animated.View>
        )}

        <InputField
          look="ds"
          control={control}
          name="identifier"
          label="Email or mobile number"
          placeholder="name@example.com or 912 345 6789"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          forceLight={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit(onSubmit)}
          editable={!isSubmitting}
        />

        <InfoNote text="If this account is registered, the reset instructions will arrive in a few minutes." />
      </Animated.View>
    </DsScreen>
  );
}
