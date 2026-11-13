import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../../components/ui/InputField";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import CodeBoxes, { CODE_LENGTH } from "../../components/auth/CodeBoxes";
import PasswordRuleTags from "../../components/auth/PasswordRuleTags";
import { useToast } from "../../contexts/ToastContext";
import { apiFetch } from "../../lib/api";
import { meetsPasswordRules } from "../../lib/passwordRules";

// Forgot password, step 2: the 6-digit code from the email and the new password. Step 1 is forgot-password.tsx.

const RESEND_SECONDS = 60;

const resetSchema = z
  .object({
    newPassword: z.string().refine(meetsPasswordRules, "Your new password doesn't meet every rule yet."),
    confirmPassword: z.string().min(1, "Type your new password again."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "The two passwords don't match.",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

const detailText = (body: unknown, fallback: string) => {
  const detail = (body as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" ? detail : fallback;
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ identifier?: string }>();
  const identifier = typeof params.identifier === "string" ? params.identifier : "";

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const newPassword = watch("newPassword") || "";
  const confirmPassword = watch("confirmPassword") || "";
  const codeComplete = code.join("").length === CODE_LENGTH;
  const canSave = codeComplete && meetsPasswordRules(newPassword) && confirmPassword.length > 0;

  const onSubmit = async (data: ResetFormValues) => {
    setError(null);
    try {
      const res = await apiFetch("/api/auth/password-reset/confirm", {
        auth: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code: code.join(""), new_password: data.newPassword }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        showToast({ title: "Password changed", message: "Log in with your new password.", type: "success" });
        router.dismissTo("/(auth)/login");
        return;
      }
      if (res.status === 429) {
        setError("Too many tries. Wait a minute, then try again.");
      } else if (res.status === 422) {
        setError("Check the code and that your new password meets every rule.");
      } else {
        setError(detailText(body, "That didn't work. Check the code and try again."));
      }
    } catch {
      setError("Couldn't reach HeartLink. Check your connection and try again.");
    }
  };

  const resend = async () => {
    setIsResending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/password-reset/request", {
        auth: false,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setTimer(RESEND_SECONDS);
        setCode(Array(CODE_LENGTH).fill(""));
        showToast({ title: "New code sent", message: "The old code no longer works.", type: "info" });
      } else {
        setError(
          res.status === 429 ? "Too many tries. Wait a minute, then try again." : detailText(body, "Couldn't send a new code. Try again in a minute.")
        );
      }
    } catch {
      setError("Couldn't reach HeartLink. Check your connection and try again.");
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const busy = isSubmitting;

  return (
    <DsScreen
      header={<SetupHeader title="Reset password" onBack={() => router.back()} />}
      footer={
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
          <DsButton
            label="Set new password"
            onPress={handleSubmit(onSubmit)}
            loading={busy}
            disabled={!canSave || busy}
            icon={<Feather name="check" size={16} color={!canSave || busy ? c.steel : "#FFFFFF"} />}
          />
          <Text style={{ fontSize: 12, color: c.slate, textAlign: "center", marginTop: 4 }}>
            Codes expire after 10 minutes.
          </Text>
        </Animated.View>
      }
    >
      <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 24 }}>
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
          <Feather name="mail" size={22} color={c.primary} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
          Enter the code
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
          If an account matches <Text style={{ fontWeight: "600", color: c.ink }}>{identifier || "what you entered"}</Text>, we
          emailed a 6-digit code to its email address.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)}>
        <CodeBoxes
          digits={code}
          onChange={(next) => {
            setError(null);
            setCode(next);
          }}
          hasError={!!error}
          editable={!busy}
        />

        <View className="flex-row items-center" style={{ gap: 6, marginTop: 12, minHeight: 44 }}>
          <Text style={{ fontSize: 14, color: c.slate }}>Didn&apos;t get it? Check spam, or</Text>
          {timer > 0 ? (
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }}>resend in {formatTime(timer)}</Text>
          ) : isResending ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <TouchableOpacity
              onPress={resend}
              style={{ height: 44, justifyContent: "center", paddingHorizontal: 4 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.primary }}>resend code</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 16, marginTop: 16 }}>
          <View>
            <InputField
              look="ds"
              control={control}
              name="newPassword"
              label="New password"
              accessibilityLabel="New password"
              placeholder="Create a strong password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="newPassword"
              autoComplete="new-password"
              forceLight={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              editable={!busy}
              onChangeText={(text) => setValue("newPassword", text, { shouldDirty: true })}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide passwords" : "Show passwords"}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={showPassword ? c.primary : c.slate} />
                </TouchableOpacity>
              }
            />
            <PasswordRuleTags password={newPassword} />
          </View>

          <InputField
            look="ds"
            control={control}
            name="confirmPassword"
            label="Type it again"
            accessibilityLabel="Type the new password again"
            placeholder="The same new password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            forceLight={false}
            inputRef={confirmRef}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSave) handleSubmit(onSubmit)();
            }}
            editable={!busy}
            onChangeText={(text) => setValue("confirmPassword", text, { shouldDirty: true })}
          />
        </View>

        {error && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 12,
              backgroundColor: c.rose,
              borderWidth: 1,
              borderColor: c.hairline,
              marginTop: 16,
            }}
            accessible={true}
            accessibilityRole="alert"
          >
            <View
              style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="alert-triangle" size={15} color={c.danger} />
            </View>
            <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: c.ink, fontWeight: "500" }}>{error}</Text>
          </View>
        )}
      </Animated.View>
    </DsScreen>
  );
}
