import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDs } from "../../components/onboarding/useDs";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote } from "../../components/onboarding/QuestionLayout";
import { DsTextField } from "../../components/onboarding/Controls";
import { PageHeader } from "../../components/family/FamilyBits";
import { useToast } from "../../contexts/ToastContext";
import { useFollow } from "../../hooks/useFamily";
import { cleanCode, showCode } from "../../services/family";

// HL-087: enter the code a family member sent, to follow their readings.

const schema = z.object({
  code: z.string().transform(cleanCode).pipe(z.string().length(6, "The code has 6 letters and numbers, like K7M-Q2P.")),
});

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export default function FollowScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const follow = useFollow();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  const onSubmit = ({ code }: FormOut) => {
    setServerError(null);
    follow.mutate(code, {
      onSuccess: (p) => {
        showToast({ title: `You now follow ${p.name}`, message: "You'll be told if they log a reading at an emergency level.", type: "success" });
        router.replace({ pathname: "/(family)/[patientId]", params: { patientId: p.id } });
      },
      onError: (e) => setServerError(e.message),
    });
  };

  const error = formState.errors.code?.message ?? serverError;

  return (
    <DsScreen
      header={<PageHeader title="Follow a family member" onBack={() => router.back()} />}
      footer={<DsButton label="Follow" onPress={handleSubmit(onSubmit)} loading={follow.isPending} />}
    >
      <IconBadge icon="account-heart-outline" tint="peach" />
      <Text style={{ marginTop: 18, fontSize: 24, lineHeight: 30, fontWeight: "600", color: c.ink }}>Enter their code</Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 23, color: c.slate }}>
        Your family member makes it in their HeartLink app under Settings › Family sharing. It works once, for 24 hours.
      </Text>

      <View style={{ marginTop: 24, gap: 8 }}>
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <DsTextField
              label="Invite code"
              large
              value={showCode(cleanCode(field.value))}
              onChangeText={(t) => {
                setServerError(null);
                field.onChange(cleanCode(t));
              }}
              onBlur={field.onBlur}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="K7M-Q2P"
              maxLength={7}
              hasError={!!error}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 14, lineHeight: 20, color: c.danger }}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: 24 }}>
        <InfoNote text="You'll see their latest readings and 30-day charts, and get a notification about an emergency-level reading. You can't change anything, and they can remove you at any time." />
      </View>
    </DsScreen>
  );
}
