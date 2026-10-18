import React, { useState } from "react";
import { View, Text } from "react-native";
import { useToast } from "../../contexts/ToastContext";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import { DsScreen, InfoNote } from "../../components/onboarding/QuestionLayout";
import { apiFetch } from "../../lib/api";
import { useDs } from "../../components/onboarding/useDs";const forgotPasswordSchema = z.object({
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
      header={<SetupHeader onBack={() => router.back()} />}
      footer={<DsButton label="Send reset instructions" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />}
    >
      <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: c.tint, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Feather name="key" size={20} color={c.charcoal} />
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
        Forgot password?
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8, marginBottom: 24 }}>
        Enter your email or phone number and we&apos;ll send you a way to reset it.
      </Text>

      <View style={{ gap: 16 }}>
        {generalError && (
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.rose }}
            accessible={true}
            accessibilityRole="alert"
          >
            <Feather name="alert-triangle" size={16} color={c.danger} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.ink }}>{generalError}</Text>
          </View>
        )}

        <InputField
          look="ds"
          control={control}
          name="identifier"
          label="Email or phone number"
          placeholder="Enter your email or phone number"
          keyboardType="default"
          autoCapitalize="none"
          forceLight={false}
        />

        <InfoNote text="If this account is registered, the instructions arrive in a few minutes." />
      </View>
    </DsScreen>
  );
}
