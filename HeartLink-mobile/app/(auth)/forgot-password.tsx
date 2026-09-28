import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useToast } from "../../contexts/ToastContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import { SimpleHeader } from "../../components/ui/SimpleHeader";
import { Button } from "../../components/ui/Button";
import { theme } from "../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL;

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
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
      const response = await fetch(`${base_url}/api/auth/forgot-password`, {
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
    <SafeAreaView className="flex-1 bg-[#EDF1EF] dark:bg-[#0A0F0E]" edges={["top", "bottom"]}>
      <StatusBar style="auto" />

      {/* Header */}
      <SimpleHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Heading ── */}
          <View className="mb-6 px-1">
            <Text className="text-3xl sm:text-4xl font-bold text-text tracking-tight leading-tight mb-2" accessibilityRole="header">
              Forgot password?
            </Text>
            <Text className="text-sm sm:text-base text-text-soft leading-relaxed font-medium">
              Enter your email or phone number to receive instructions for recovering your account.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-surface dark:bg-[#101615] rounded-2xl border border-border px-5 py-6 gap-4 shadow-sm shadow-slate-100 dark:shadow-none">
            {generalError && (
              <View className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 flex-row items-center gap-2.5" accessible={true} accessibilityRole="alert">
                <Feather name="alert-triangle" size={16} color={theme.danger} />
                <Text className="text-red-600 dark:text-red-400 text-xs sm:text-sm flex-1 font-medium leading-snug">
                  {generalError}
                </Text>
              </View>
            )}

            {/* Identifier Section */}
            <View>
              <InputField
                control={control}
                name="identifier"
                label="Email or Phone Number"
                icon="user"
                placeholder="Enter your email or phone number"
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>

            {/* Submit */}
            <View className="mt-1">
              <Button
                onPress={handleSubmit(onSubmit)}
                isLoading={isSubmitting}
                loadingText="Sending request..."
                label="Reset Password"
                icon="unlock"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
