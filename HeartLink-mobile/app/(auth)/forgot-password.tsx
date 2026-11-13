import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
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
import { formatPhoneIdentifier, isCompletePhone, isPhoneLike, normalizeIdentifier } from "../../lib/phone";
import { useDs } from "../../components/onboarding/useDs";

const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .min(1, "Please enter your email or phone number.")
    .refine(
      (val) => !isPhoneLike(val) || isCompletePhone(val),
      "Enter a complete mobile number (e.g., 0912 345 6789)."
    ),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { c } = useDs();

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ForgotPasswordFormValues>({
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

    // "0912…", "912…", "63912…" and "+63912…" all become "+63912…"; emails are lower-cased.
    const finalIdentifier = normalizeIdentifier(data.identifier);

    try {
      // Emails a 6-digit code to the account's address; the next screen takes the code and the new password
      const response = await apiFetch(`/api/auth/password-reset/request`, {
        auth: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: finalIdentifier }),
      });
      const resData = await response.json().catch(() => null);

      if (response.ok) {
        router.push({ pathname: "/(auth)/reset-password", params: { identifier: finalIdentifier } });
      } else if (response.status === 429) {
        setGeneralError("Too many tries. Wait a minute, then try again.");
      } else {
        setGeneralError(
          typeof resData?.detail === "string" ? resData.detail : "Couldn't send the code. Try again in a minute."
        );
      }
    } catch (err) {
      console.log(err);
      setGeneralError("Couldn't reach HeartLink. Check your connection and try again.");
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
            label="Send code"
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
          Enter the email or mobile number you log in with. We&apos;ll email you a 6-digit code to set a new password.
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
                borderColor: c.hairline,
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
                backgroundColor: c.canvas,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="alert-triangle" size={15} color={c.danger} />
            </View>
            <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: c.ink, fontWeight: "500" }}>{generalError}</Text>
          </Animated.View>
        )}

        <InputField
          look="ds"
          control={control}
          name="identifier"
          label="Email or mobile number"
          placeholder="name@example.com or 0912 345 6789"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          forceLight={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit(onSubmit)}
          editable={!isSubmitting}
          onChangeText={(text) => {
            setValue("identifier", formatPhoneIdentifier(text), { shouldValidate: !!errors.identifier, shouldDirty: true });
          }}
        />

        <InfoNote text="The code goes to the email address on your account, even if you enter your mobile number." />
      </Animated.View>
    </DsScreen>
  );
}
