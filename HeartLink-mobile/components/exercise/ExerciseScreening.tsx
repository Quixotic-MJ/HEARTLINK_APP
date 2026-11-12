import React, { useState } from "react";
import { Text, View } from "react-native";
import * as z from "zod";
import { Feather } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { CheckList, DsTextField, YesNo } from "../onboarding/Controls";
import { DsScreen, InfoNote } from "../onboarding/QuestionLayout";
import { useDs } from "../onboarding/useDs";
import { useToast } from "../../contexts/ToastContext";
import { useExerciseScreening } from "../../hooks/useExerciseScreening";
import {
  DECLARATION,
  NEEDED_TEXT,
  PAGE_ONE,
  PAGE_ONE_LISTS,
  PageOneId,
  ParqForm,
  ParqSection,
  PREGNANT_QUESTION,
  RESULT_TEXT,
  ScreeningStatus,
  SECTIONS,
  UNWELL_QUESTION,
} from "../../constants/exerciseScreening";
import { parqText } from "../../constants/parqWording";

type Step = "page1" | "follow_ups" | "finish";

// Each step is complete only when every question on it has an answer (zod, not hand-written checks)
const page1Schema = z.object(Object.fromEntries(PAGE_ONE.map((q) => [q, z.boolean()])) as Record<PageOneId, z.ZodBoolean>);
const sectionsSchema = z.object(
  Object.fromEntries(
    SECTIONS.map(({ n, follow_ups }) => [
      n,
      z
        .object({ present: z.boolean(), answers: z.record(z.string(), z.boolean().nullable()) })
        .refine((s) => !s.present || follow_ups.every((l) => typeof s.answers[l] === "boolean")),
    ]),
  ),
);
const finishSchema = z.object({ pregnant: z.boolean(), unwell: z.boolean(), declared: z.literal(true) });

function Question({ number, text, value, onChange }: { number: string; text: string; value: boolean | null | undefined; onChange: (v: boolean) => void }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, lineHeight: 23, fontWeight: "600", color: c.ink }}>{`${number} ${text}`}</Text>
      <YesNo value={value ?? undefined} onChange={onChange} accessibilityLabel={`${number} ${text}`} />
    </View>
  );
}

function Heading({ title, sub }: { title: string; sub?: string }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
        {title}
      </Text>
      {sub ? <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>{sub}</Text> : null}
    </View>
  );
}

/**
 * HL-122 to HL-124: the exercise safety check, used in setup, before a workout and from Settings. Since 2026-11-12 the
 * whole PAR-Q+ is answered here, in its official wording (constants/parqWording.ts), and every answer is saved; the
 * server works out what the form shows. The result decides which exercises are offered, never the score. It's a
 * screening, not a diagnosis.
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
  const [step, setStep] = useState<Step>("page1");
  const [page1, setPage1] = useState<Partial<Record<PageOneId, boolean>>>({});
  const [sections, setSections] = useState<Record<string, ParqSection>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pregnant, setPregnant] = useState<boolean | undefined>(undefined);
  const [unwell, setUnwell] = useState<boolean | undefined>(undefined);
  const [declared, setDeclared] = useState(false);
  const [result, setResult] = useState<ScreeningStatus | null>(null);

  const anyYes = PAGE_ONE.some((q) => page1[q] === true);
  const page1Done = page1Schema.safeParse(page1).success;
  const sectionsDone = sectionsSchema.safeParse(sections).success;
  const finishDone = finishSchema.safeParse({ pregnant, unwell, declared }).success;
  const followUpYes = SECTIONS.some(({ n }) => sections[n]?.present && Object.values(sections[n].answers).some((v) => v === true));

  const setSection = (n: string, change: Partial<ParqSection>) =>
    setSections((all) => {
      const before: ParqSection = all[n] ?? { present: null, answers: {} };
      return { ...all, [n]: { ...before, ...change } };
    });

  const submit = () => {
    const form: ParqForm = {
      page1: page1 as Record<PageOneId, boolean>,
      ...(anyYes
        ? {
            sections: Object.fromEntries(
              SECTIONS.map(({ n }) => [
                n,
                { present: !!sections[n]?.present, answers: sections[n]?.present ? (sections[n].answers as Record<string, boolean>) : null },
              ]),
            ),
          }
        : {}),
      notes: Object.fromEntries(Object.entries(notes).filter(([, v]) => v.trim())),
    };
    save.mutate(
      { parq_form: form, pregnant: !!pregnant, unwell: !!unwell, declared: true },
      {
        onSuccess: setResult,
        onError: () => showToast({ title: "Couldn't save", message: "Check your connection and try again.", type: "error" }),
      },
    );
  };

  if (result) {
    const text = result.state && result.state !== "needed" ? RESULT_TEXT[result.state] : RESULT_TEXT.locked;
    // The form's own recommendations for this outcome (page 1 if all NO, page 4 after the follow-ups)
    const official = !anyYes ? parqText("p1.all_no") : followUpYes ? parqText("p4.any_yes") : parqText("p4.all_no");
    return (
      <DsScreen header={header} footer={<DsButton label={doneLabel} onPress={onDone} />}>
        <View style={{ gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: text.ok ? c.mint : c.rose }}>
            <Feather name={text.ok ? "check" : "alert-triangle"} size={24} color={c.charcoal} />
          </View>
          <Heading title={text.title} sub={text.body} />
          <InfoNote title="What the PAR-Q+ says" text={official} icon="file-text" />
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.steel }}>
            This is a safety check, not a diagnosis, and it doesn&apos;t change your scores. Do it again in Settings if your health changes.
          </Text>
        </View>
      </DsScreen>
    );
  }

  const footerNote = <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>{parqText("copyright")}</Text>;

  if (step === "page1") {
    return (
      <DsScreen
        key="page1"
        header={header}
        footer={<DsButton label="Next" onPress={() => setStep(anyYes ? "follow_ups" : "finish")} disabled={!page1Done} />}
      >
        <View style={{ gap: 22 }}>
          <Heading title="Exercise safety check" sub="The PAR-Q+, page 1 of 3. It decides which exercises the app offers, never your scores." />
          {reason && NEEDED_TEXT[reason] ? <InfoNote title="Why we're asking" text={NEEDED_TEXT[reason]} icon="refresh-cw" /> : null}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: c.ink }}>{parqText("title")}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{parqText("intro")}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{parqText("page1_instructions")}</Text>
          </View>
          {PAGE_ONE.map((q, i) => {
            const listId = PAGE_ONE_LISTS[q];
            return (
              <View key={q} style={{ gap: 10 }}>
                <Question number={`${i + 1}.`} text={parqText(`p1.${q}`)} value={page1[q]} onChange={(v) => setPage1((p) => ({ ...p, [q]: v }))} />
                {listId && page1[q] ? (
                  <DsTextField
                    label={parqText(listId)}
                    optional
                    value={notes[listId] ?? ""}
                    onChangeText={(t) => setNotes((all) => ({ ...all, [listId]: t }))}
                    maxLength={300}
                  />
                ) : null}
              </View>
            );
          })}
          {footerNote}
        </View>
      </DsScreen>
    );
  }

  if (step === "follow_ups") {
    return (
      <DsScreen
        key="follow_ups"
        header={header}
        footer={
          <View style={{ gap: 8 }}>
            <DsButton label="Next" onPress={() => setStep("finish")} disabled={!sectionsDone} />
            <DsButton label="Back to page 1" variant="quiet" onPress={() => setStep("page1")} />
          </View>
        }
      >
        <View style={{ gap: 22 }}>
          <Heading title="Follow-up questions" sub="The PAR-Q+, pages 2 and 3. Answer the questions under a condition only if you have it." />
          <InfoNote text={parqText("p1.any_yes")} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: c.ink }}>{parqText("follow_up_title")}</Text>
          {SECTIONS.map(({ n, follow_ups, label }) => {
            const s = sections[n];
            return (
              <View key={n} style={{ gap: 14, padding: 14, borderWidth: 1, borderColor: c.hairline, borderRadius: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }}>{`${n} of ${SECTIONS.length} · ${label}`}</Text>
                <Question number={`${n}.`} text={parqText(`s${n}`)} value={s?.present} onChange={(v) => setSection(n, { present: v })} />
                {s?.present
                  ? follow_ups.map((l) => (
                      <Question
                        key={l}
                        number={`${n}${l}.`}
                        text={parqText(`s${n}.${l}`)}
                        value={s.answers[l]}
                        onChange={(v) => setSection(n, { answers: { ...s.answers, [l]: v } })}
                      />
                    ))
                  : null}
              </View>
            );
          })}
          <DsTextField
            label={parqText("conditions_list")}
            optional
            value={notes.conditions_list ?? ""}
            onChangeText={(t) => setNotes((all) => ({ ...all, conditions_list: t }))}
            maxLength={300}
          />
          {footerNote}
        </View>
      </DsScreen>
    );
  }

  return (
    <DsScreen
      key="finish"
      header={header}
      footer={
        <View style={{ gap: 8 }}>
          <DsButton label="Save my answers" onPress={submit} disabled={!finishDone} loading={save.isPending} />
          <DsButton label="Back" variant="quiet" onPress={() => setStep(anyYes ? "follow_ups" : "page1")} />
        </View>
      }
    >
      <View style={{ gap: 22 }}>
        <Heading title="Almost done" sub="Two quick questions, then the PAR-Q+ declaration." />
        <InfoNote text={parqText(anyYes ? "p4.delay" : "delay")} icon="clock" />
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{PREGNANT_QUESTION}</Text>
          <YesNo value={pregnant} onChange={setPregnant} accessibilityLabel={PREGNANT_QUESTION} />
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{UNWELL_QUESTION}</Text>
          <YesNo value={unwell} onChange={setUnwell} accessibilityLabel={UNWELL_QUESTION} />
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>Declaration</Text>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: c.charcoal }}>{parqText("declaration")}</Text>
          <CheckList
            options={[{ value: "declared", label: DECLARATION }]}
            selected={declared ? ["declared"] : []}
            onToggle={() => setDeclared((d) => !d)}
            accessibilityLabel="Declaration"
          />
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.steel }}>{parqText("terms")}</Text>
        {footerNote}
      </View>
    </DsScreen>
  );
}
