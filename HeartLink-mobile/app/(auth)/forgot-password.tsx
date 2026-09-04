import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
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
import HeartLogo from "../../components/ui/HeartLogo";

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
    <SafeAreaView className="flex-1 bg-[#EDF1EF]" edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-[#DCE3DF] items-center justify-center shadow-xs"
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
            <Text className="text-3xl sm:text-4xl font-semibold text-[#152131] tracking-tight leading-tight mb-2" accessibilityRole="header">
              Forgot password?
            </Text>
            <Text className="text-sm sm:text-base text-[#5C6B66] leading-relaxed">
              Enter your email or phone number to receive instructions for recovering your account.
            </Text>
          </View>

          {/* ── Card ── */}
          <View className="bg-white rounded-2xl border border-[#DCE3DF] px-5 py-6 gap-4 shadow-sm">
            {generalError && (
              <View className="bg-[#A93226]/10 border border-[#A93226]/30 rounded-xl p-3.5 flex-row items-center gap-2.5" accessible={true} accessibilityRole="alert">
                <Feather name="alert-triangle" size={16} color="#A93226" />
                <Text className="text-[#A93226] text-xs sm:text-sm flex-1 font-medium leading-snug">
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
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`w-full bg-[#E8532E] rounded-2xl py-4 flex-row justify-center items-center gap-2 mt-1 shadow-sm ${isSubmitting ? 'opacity-80' : ''}`}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Reset Password"
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-sm font-semibold tracking-wide">
                    Sending request...
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="unlock" size={16} color="#ffffff" />
                  <Text className="text-white text-sm font-semibold tracking-wide">
                    Reset Password
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
