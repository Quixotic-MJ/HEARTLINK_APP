import React, { useState } from "react";
import { Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import {
  bandColors,
  bandLabel,
  basisText,
  DISCLAIMER,
  HeartRisk,
  needsReading,
  percentText,
  pressureUsedText,
  PREVENT_PAPER_URL,
  RISK_BANDS,
  thirtyYearText,
  unavailableText,
} from "../../services/heartRisk";

const CARD = { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 } as const;

/**
 * HL-144: the Dashboard's Heart risk (lower is better), kept short so Today's mission stays on the first screen.
 * The number, its band and "Estimated" sit on one row; tapping it opens "About your heart risk" with the details.
 * Since 2026-11-12 (owner's choice) it's the third page of the swipe card, where the latest reading was.
 * People who set up before the three questions existed answer them in Settings › Health answers (owner's choice,
 * 2026-11-11), so the card only links there.
 */
export function HeartRiskCard({
  risk,
  onAddLabResults,
  onAnswerQuestions,
  onLogBloodPressure,
  framed = true,
}: {
  risk: HeartRisk | null;
  onAddLabResults: () => void;
  onAnswerQuestions: () => void;
  /** Opens the blood pressure log, for the "a reading gives a better estimate" note */
  onLogBloodPressure?: () => void;
  /** false inside the swipe card, which already draws the card (2026-11-12) */
  framed?: boolean;
}) {
  const { c } = useDs();
  // Inside the swipe card the page is as tall as the tallest page, so the risk sits in the middle of it
  const box = framed
    ? { ...CARD, borderColor: c.hairline, backgroundColor: c.canvas }
    : { flex: 1, gap: 10, justifyContent: "center" as const };
  const [about, setAbout] = useState(false);
  const openAbout = () => {
    Haptics.selectionAsync();
    setAbout(true);
  };
  const sheet = <AboutHeartRisk visible={about} risk={risk} onClose={() => setAbout(false)} onAddLabResults={onAddLabResults} />;

  if (risk && !risk.available && risk.reason === "questions") {
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onAnswerQuestions();
        }}
        accessibilityRole="button"
        accessibilityLabel="See your heart risk. Answer 3 yes or no questions in Settings."
        style={{ ...box, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" }}>
          <Feather name="heart" size={19} color={c.onTint} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>See your heart risk</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>Answer 3 yes/no questions in Settings</Text>
        </View>
        <Feather name="chevron-right" size={20} color={c.steel} />
      </TouchableOpacity>
    );
  }

  if (risk && risk.available) {
    const tag = bandColors(risk.band, c);
    return (
      <View style={box}>
        <TouchableOpacity
          onPress={openAbout}
          accessibilityRole="button"
          accessibilityLabel={`Heart risk ${percentText(risk.ascvd_10)}, ${bandLabel(risk.band)}${risk.kind === "estimated" ? ", estimated" : ""}. About your heart risk`}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.slate }}>Heart risk · next 10 years</Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Text style={{ fontSize: 30, fontWeight: "700", letterSpacing: -0.8, color: c.ink }}>{percentText(risk.ascvd_10)}</Text>
              <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "700", color: tag.fg }}>{bandLabel(risk.band)}</Text>
              </View>
              {risk.kind === "estimated" ? (
                <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: c.hairlineStrong }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.slate }}>Estimated</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={c.steel} />
        </TouchableOpacity>
        {needsReading(risk) ? (
          <View style={{ flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.surface }}>
            <Feather name="heart" size={16} color={c.charcoal} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                No blood pressure reading in the last 30 days, so this uses a typical value. A reading gives a better
                estimate.
              </Text>
              {onLogBloodPressure ? (
                <TouchableOpacity
                  onPress={onLogBloodPressure}
                  accessibilityRole="link"
                  style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: c.link }}>Log blood pressure</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
        {risk.note ? (
          <View style={{ flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.surface }}>
            <Feather name="message-circle" size={16} color={c.charcoal} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.charcoal }}>{risk.note}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>{DISCLAIMER}</Text>
        {sheet}
      </View>
    );
  }

  // No number: under 30 or over 79, missing age or sex, or no estimate yet
  return (
    <View style={box}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
        <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>Heart risk</Text>
        <AnimatedButton
          onPress={openAbout}
          accessibilityRole="button"
          accessibilityLabel="About your heart risk"
          style={{ width: 44, height: 44, marginVertical: -8, marginRight: -10, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="info" size={20} color={c.slate} />
        </AnimatedButton>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
        {risk ? unavailableText(risk) : "Your heart risk shows here after setup."}
      </Text>
      {risk?.reason === "no_estimate" ? (
        <TouchableOpacity onPress={onAddLabResults} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.link }}>Add lab results</Text>
        </TouchableOpacity>
      ) : null}
      {sheet}
    </View>
  );
}

/** "About your heart risk": what it means, what it uses, what changes it, the bands and the source. */
export function AboutHeartRisk({
  visible,
  risk,
  onClose,
  onAddLabResults,
}: {
  visible: boolean;
  risk: HeartRisk | null;
  onClose: () => void;
  onAddLabResults: () => void;
}) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const shown = risk && risk.available ? risk : null;
  const pressure = shown ? pressureUsedText(shown) : null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "88%", backgroundColor: c.canvas, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>About your heart risk</Text>
            <AnimatedButton onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}>
              <Feather name="x" size={22} color={c.slate} />
            </AnimatedButton>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 16 + insets.bottom, gap: 14 }}>
            {shown ? (
              <Section title="Yours">{`${percentText(shown.ascvd_10)}, ${bandLabel(shown.band)}. ${basisText(shown)}`}</Section>
            ) : null}
            <Section title="What it means">
              Your chance of a heart attack or stroke in the next 10 years. 4% means about 4 in 100 people like you would have
              one. Lower is better. It&apos;s worked out with the American Heart Association&apos;s PREVENT equations, for ages 30 to 79.
            </Section>
            <Section title="What it uses">
              Your age and sex, cholesterol and HDL, kidney function (eGFR), daytime blood pressure, and whether you smoke, have
              diabetes, or take blood pressure or cholesterol medicine. Without lab results, HeartLink estimates them from your
              answers.
            </Section>
            {pressure ? <Section title="Blood pressure used">{pressure}</Section> : null}
            <Section title="What changes it">
              Lower blood pressure, quitting smoking, and healthier cholesterol and blood sugar. Exercise, meals and sleep help
              these over time; you see their progress in your habits score.
            </Section>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>The bands</Text>
              {RISK_BANDS.map(({ band, range }) => {
                const tag = bandColors(band, c);
                return (
                  <View key={band} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ minWidth: 104, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: tag.fg }}>{bandLabel(band)}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: c.charcoal }}>{range}</Text>
                  </View>
                );
              })}
              <Text style={{ fontSize: 13, color: c.slate }}>From the 2026 ACC/AHA cholesterol guideline.</Text>
            </View>
            {shown && thirtyYearText(shown) ? (
              <Section title="Over 30 years">{`For ages 30 to 59 the AHA also gives a 30-year view. ${thirtyYearText(shown)}.`}</Section>
            ) : null}
            <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>{DISCLAIMER} It was built on US data and hasn&apos;t been tested on Filipino users.</Text>
            <TouchableOpacity onPress={() => Linking.openURL(PREVENT_PAPER_URL)} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.link }}>The PREVENT paper (Circulation, 2024)</Text>
            </TouchableOpacity>
            {shown?.kind === "estimated" ? (
              <DsButton label="Add lab results" onPress={() => { onClose(); onAddLabResults(); }} />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>{title}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{children}</Text>
    </View>
  );
}
