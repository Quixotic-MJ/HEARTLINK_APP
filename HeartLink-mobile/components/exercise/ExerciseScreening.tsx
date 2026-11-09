import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Feather } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { CheckList, ChoiceList, YesNo } from "../onboarding/Controls";
import { DsScreen, InfoNote } from "../onboarding/QuestionLayout";
import { useDs } from "../onboarding/useDs";
import { useToast } from "../../contexts/ToastContext";
import { useExerciseScreening } from "../../hooks/useExerciseScreening";
import {
  DECLARATION,
  EXTRA_CHECK,
  NEEDED_TEXT,
  PARQ_PDF_URL,
  PARQ_RESULTS,
  PARQ_VERSION,
  PREGNANT_QUESTION,
  RESULT_TEXT,
  ScreeningAnswers,
  ScreeningStatus,
  UNWELL_QUESTION,
} from "../../constants/exerciseScreening";

const schema = z
  .object({
    parq_result: z.enum(["all_no", "cleared_by_follow_ups", "follow_up_yes"]),
    extra_check_yes: z.boolean().nullable(),
    pregnant: z.boolean(),
    unwell: z.boolean(),
    declared: z.literal(true),
  })
  .refine((a) => a.parq_result === "all_no" || a.extra_check_yes !== null, { path: ["extra_check_yes"] });

type Values = z.input<typeof schema>;

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: "600", color: c.ink }}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * HL-122 to HL-124: the exercise safety check, used in setup, before a workout and from Settings. The person fills in the
 * official PAR-Q+ (opened, unchanged) and records what it showed. The result decides which exercises are offered, and
 * never the score. It's a screening, not a diagnosis.
 */
export function ExerciseScreening({
  header,
  doneLabel = "Done",
  onDone,
  reason,
}: {
  header?: React.ReactNode;
  doneLabel?: string;
  onDone: () => void;
  /** Why it's being asked again, if it is. */
  reason?: string | null;
}) {
  const { c } = useDs();
  const { showToast } = useToast();
  const { save } = useExerciseScreening();
  const [result, setResult] = useState<ScreeningStatus | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { extra_check_yes: null, pregnant: undefined as unknown as boolean, unwell: undefined as unknown as boolean },
  });
  const values = useWatch({ control });
  const pick = (name: keyof Values) => (value: unknown) => setValue(name, value as never, { shouldValidate: true });

  const submit = handleSubmit((v) => {
    const answers: ScreeningAnswers = {
      parq_result: v.parq_result,
      extra_check_yes: v.parq_result === "all_no" ? null : v.extra_check_yes,
      pregnant: v.pregnant,
      unwell: v.unwell,
      declared: true,
    };
    save.mutate(answers, {
      onSuccess: setResult,
      onError: () => showToast({ title: "Couldn't save", message: "Check your connection and try again.", type: "error" }),
    });
  });

  if (result) {
    const text = result.state && result.state !== "needed" ? RESULT_TEXT[result.state] : RESULT_TEXT.locked;
    return (
      <DsScreen header={header} footer={<DsButton label={doneLabel} onPress={onDone} />}>
        <View style={{ gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: text.ok ? c.mint : c.rose }}>
            <Feather name={text.ok ? "check" : "alert-triangle"} size={24} color={c.charcoal} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
            {text.title}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{text.body}</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.steel }}>
            This is a safety check, not a diagnosis, and it doesn&apos;t change your Heart score. Do it again in Settings if your health changes.
          </Text>
        </View>
      </DsScreen>
    );
  }

  const pageOneYes = !!values.parq_result && values.parq_result !== "all_no";

  return (
    <DsScreen
      header={header}
      footer={<DsButton label="Save my answers" onPress={submit} disabled={!formState.isValid} loading={save.isPending} />}
    >
      <View style={{ gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
            Exercise safety check
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
            Before you exercise, please fill in the PAR-Q+, the international standard form for checking that physical activity is safe for you. It decides which exercises the app offers. It doesn&apos;t change your Heart score.
          </Text>
        </View>

        {reason && NEEDED_TEXT[reason] ? <InfoNote title="Why we're asking" text={NEEDED_TEXT[reason]} icon="refresh-cw" /> : null}

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>1. Fill in the PAR-Q+</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>
            {`It opens the official ${PARQ_VERSION} form. Answer page 1, and the follow-up pages if it asks you to. Then come back here.`}
          </Text>
          <DsButton label="Open the PAR-Q+ form" variant="secondary" icon={<Feather name="external-link" size={17} color={c.ink} />} onPress={() => Linking.openURL(PARQ_PDF_URL)} />
        </View>

        <Question title="2. What did your PAR-Q+ show?">
          <ChoiceList options={PARQ_RESULTS} value={values.parq_result} onChange={pick("parq_result")} accessibilityLabel="What did your PAR-Q+ show?" />
        </Question>

        {pageOneYes ? (
          <Question title={EXTRA_CHECK}>
            <YesNo value={values.extra_check_yes ?? undefined} onChange={pick("extra_check_yes")} accessibilityLabel={EXTRA_CHECK} />
          </Question>
        ) : null}

        <Question title={PREGNANT_QUESTION}>
          <YesNo value={values.pregnant} onChange={pick("pregnant")} accessibilityLabel={PREGNANT_QUESTION} />
        </Question>

        <Question title={UNWELL_QUESTION}>
          <YesNo value={values.unwell} onChange={pick("unwell")} accessibilityLabel={UNWELL_QUESTION} />
        </Question>

        <CheckList
          options={[{ value: "declared", label: DECLARATION }]}
          selected={values.declared ? ["declared"] : []}
          onToggle={() => pick("declared")(values.declared ? (false as never) : true)}
          accessibilityLabel="Declaration"
        />

        <Text style={{ fontSize: 13, lineHeight: 19, color: c.steel }}>
          PAR-Q+ © the PAR-Q+ Collaboration. This is a safety check, not a diagnosis.
        </Text>
      </View>
    </DsScreen>
  );
}
