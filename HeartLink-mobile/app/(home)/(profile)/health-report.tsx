import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import { sharePdf } from "../../../services/sharePdf";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { PremiumRequiredError, useHealthReport } from "../../../hooks/useHealthReport";
import {
  HealthReport,
  ReportDays,
  dayLabel,
  doctorHighlights,
  periodLabel,
  readiness,
  reportFlags,
  reportHtml,
  time12,
} from "../../../services/healthReport";
import { isPremiumProfile } from "../../../services/premium";
import { markWeeklyReportOpened } from "../../../services/weeklyReport";

// HL-085, 2026-11-12: the Visit summary, the one report to show or send to a doctor or clinic. The last 7 days are free
// (it replaced the old weekly summary screen); 1 and 3 months are Premium. Shared as a PDF. It only summarises what was
// logged; it never diagnoses.
//
// The screen doesn't repeat Trends (that's where people see how they're doing). It helps them get ready for a checkup,
// shows the few lines the doctor reads first and the things to mention. The full tables and the day-by-day log
// (AMA/AHA Target: BP style) are in the PDF, which they can preview before sharing.

const PERIODS: { days: ReportDays; label: string; premium: boolean }[] = [
  { days: 7, label: "7 days", premium: false },
  { days: 30, label: "1 month", premium: true },
  { days: 90, label: "3 months", premium: true },
];
const FLAGS_SHOWN = 5;

function Header() {
  const router = useRouter();
  return (
    <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
      <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
      <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">
        Visit summary
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ marginTop: 18, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16, paddingVertical: 6 }}>
      <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: "600", color: c.steel, paddingTop: 10, paddingBottom: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { c } = useDs();
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: c.slate }}>{label}</Text>
      <Text style={{ flexShrink: 1, fontSize: 15, fontWeight: "600", color: c.ink, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

/** "Is your summary ready?": how many of the last 7 days have readings, and how to prepare for the visit. */
function ReadyCard({ report }: { report: HealthReport }) {
  const { c } = useDs();
  const router = useRouter();
  const ready = readiness(report);
  if (!ready) return null;
  const done = ready.level === "full" || ready.level === "good";
  return (
    <View style={{ marginTop: 18, padding: 16, borderRadius: 12, backgroundColor: c.surface, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconBadge icon={done ? "check-circle-outline" : "calendar-clock"} tint={done ? "mint" : "yellow"} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.steel }}>Is your summary ready?</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 2 }}>{ready.title}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>{ready.text}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Tag label={`Mornings: ${ready.mornings}`} tone="neutral" />
        <Tag label={`Evenings: ${ready.evenings}`} tone="neutral" />
      </View>
      {ready.level !== "full" ? (
        <DsButton label="Log a reading" variant="link" onPress={() => router.push("/(home)/(health)/log-symptoms")} />
      ) : null}
    </View>
  );
}

function SummaryBody({ report }: { report: HealthReport }) {
  const { c } = useDs();
  const highlights = doctorHighlights(report);
  const flags = reportFlags(report);
  const shown = flags.slice(0, FLAGS_SHOWN);
  return (
    <>
      <Text style={{ marginTop: 18, fontSize: 14, color: c.steel }}>{periodLabel(report)}</Text>
      <ReadyCard report={report} />

      <Section title="What your doctor will see first">
        {highlights.map((r, i) => (
          <Row key={r.label} label={r.label} value={r.value} last={i === highlights.length - 1} />
        ))}
      </Section>

      <Section title="Things to mention to your doctor">
        {shown.length ? (
          shown.map((f, i) => (
            <View
              key={`${f.date}-${f.time ?? "alert"}-${i}`}
              style={{ paddingVertical: 10, borderBottomWidth: i === shown.length - 1 && flags.length <= FLAGS_SHOWN ? 0 : 1, borderBottomColor: c.hairlineSoft }}
            >
              <Text style={{ fontSize: 13, color: c.steel }}>
                {dayLabel(f.date)}
                {f.time ? `, ${time12(f.time)}` : ""}
              </Text>
              <Text style={{ fontSize: 15, color: c.ink, marginTop: 2 }}>{f.text}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, paddingVertical: 10 }}>
            Nothing stood out: no high or low readings, symptoms or health alerts in this period.
          </Text>
        )}
        {flags.length > FLAGS_SHOWN ? (
          <Text style={{ fontSize: 14, color: c.slate, paddingVertical: 10 }}>And {flags.length - FLAGS_SHOWN} more in the PDF.</Text>
        ) : null}
      </Section>

      <View style={{ marginTop: 18 }}>
        <InfoNote
          icon="file-text"
          title="In the PDF"
          text="Everything above, plus your morning and evening averages, medicine, food, exercise, sleep, lab results and a day-by-day log of every check-in."
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <InfoNote icon="info" text={report.disclaimer} />
      </View>
    </>
  );
}

function PremiumPrompt() {
  const { c } = useDs();
  const router = useRouter();
  return (
    <View style={{ marginTop: 22, padding: 18, borderRadius: 12, backgroundColor: c.surface, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconBadge icon="file-chart-outline" tint="sky" size={40} />
        <View style={{ flex: 1 }}>
          <Tag label="Premium" tone="warm" />
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 6 }}>Longer summaries for your checkups</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
        The same summary for the last 1 or 3 months, to show your doctor how things went over time. The last 7 days
        are always free.
      </Text>
      <DsButton label="See HeartLink Premium" onPress={() => router.push("/(home)/(settings)/premium")} />
    </View>
  );
}

export default function HealthReportScreen() {
  const { c } = useDs();
  const { user, userId } = useUser();
  const { showToast } = useToast();
  const premium = isPremiumProfile(user);
  const [days, setDays] = useState<ReportDays>(7);
  const [sharing, setSharing] = useState(false);
  const report = useHealthReport(days);
  const premiumRequired = report.error instanceof PremiumRequiredError;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "HeartLink patient";

  // Opening it counts as seeing this week's "Your visit summary is ready" banner on the Dashboard
  useEffect(() => {
    if (userId) markWeeklyReportOpened(userId).catch(() => {});
  }, [userId]);

  const share = async () => {
    if (!report.data) return;
    setSharing(true);
    try {
      const result = await sharePdf(reportHtml(report.data, name), `HeartLink_visit_summary_${report.data.period.end}`, "Share your visit summary");
      if (result === "unavailable") showToast({ title: "Sharing isn't available", message: "This phone can't share files.", type: "error" });
    } catch {
      showToast({ title: "Couldn't make the PDF", message: "Please try again.", type: "error" });
    } finally {
      setSharing(false);
    }
  };

  // Opens the phone's print preview, which shows the PDF exactly as the doctor gets it (and can save or print it)
  const preview = async () => {
    if (!report.data) return;
    try {
      await Print.printAsync({ html: reportHtml(report.data, name) });
    } catch {
      showToast({ title: "Couldn't open the preview", message: "Please try again.", type: "error" });
    }
  };

  const footer = report.data ? (
    <View style={{ gap: 4 }}>
      <DsButton label="Share PDF" onPress={share} loading={sharing} block />
      <DsButton label="Preview the PDF" variant="quiet" onPress={preview} block />
    </View>
  ) : null;

  return (
    <DsScreen header={<Header />} footer={footer}>
      <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>
        A summary of what you logged, to show or send to your doctor or clinic. To see how you&apos;re doing day to day,
        open Trends.
      </Text>

      <View accessibilityRole="tablist" style={{ marginTop: 18, flexDirection: "row", padding: 4, borderRadius: 10, backgroundColor: c.surface }}>
        {PERIODS.map((p) => {
          const on = p.days === days;
          return (
            <AnimatedButton
              key={p.days}
              onPress={() => {
                Haptics.selectionAsync();
                setDays(p.days);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.premium && !premium ? `${p.label}, Premium` : p.label}
              style={{ flex: 1, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: on ? 1 : 0, borderColor: c.hairline, backgroundColor: on ? c.canvas : "transparent" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {p.premium && !premium ? <Feather name="lock" size={12} color={c.slate} /> : null}
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: on ? "600" : "400", color: on ? c.ink : c.slate }}>{p.label}</Text>
              </View>
            </AnimatedButton>
          );
        })}
      </View>

      {premiumRequired ? (
        <PremiumPrompt />
      ) : report.isPending ? (
        <View style={{ marginTop: 18, gap: 12 }}>
          <Skeleton style={{ height: 24, width: "60%", borderRadius: 6 }} />
          <Skeleton style={{ height: 160, borderRadius: 12 }} />
          <Skeleton style={{ height: 200, borderRadius: 12 }} />
        </View>
      ) : report.isError || !report.data ? (
        <View style={{ marginTop: 18, gap: 12 }}>
          <InfoNote icon="wifi-off" title="Your summary couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => report.refetch()} block />
        </View>
      ) : (
        <SummaryBody report={report.data} />
      )}
    </DsScreen>
  );
}
