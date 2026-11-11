import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag } from "../../../components/onboarding/QuestionLayout";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { PremiumRequiredError, useHealthReport } from "../../../hooks/useHealthReport";
import { HealthReport, ReportDays, periodLabel, reportHtml, reportSections } from "../../../services/healthReport";

// HL-085: the doctor-ready health report (Premium). A summary of the last 1 or 3 months to show at a checkup,
// shared as a PDF. It only summarises what was logged; it never diagnoses.

const PERIODS: { days: ReportDays; label: string }[] = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
];

function Header() {
  const router = useRouter();
  return (
    <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
      <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
      <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink">
        Health report
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ marginTop: 18, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: c.steel, paddingTop: 10, paddingBottom: 4 }}>{title}</Text>
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

function ReportBody({ report }: { report: HealthReport }) {
  // HL-096: the same sections, in the same order, as the PDF and the portal's patient page
  return (
    <>
      {reportSections(report).map((section) => (
        <Section key={section.title} title={section.title}>
          {section.rows.map((r, i) => (
            <Row key={`${r.label}-${i}`} label={r.label} value={r.value} last={i === section.rows.length - 1} />
          ))}
        </Section>
      ))}
      <View style={{ marginTop: 18 }}>
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
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 6 }}>A report for your checkups</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
        Your blood pressure averages, highest and lowest readings, mornings vs evenings, medicines, sodium, exercise,
        sleep and symptoms for the last 1 or 3 months, as a PDF to show your doctor.
      </Text>
      <DsButton label="See HeartLink Premium" onPress={() => router.push("/(home)/(settings)/premium")} />
    </View>
  );
}

export default function HealthReportScreen() {
  const { c } = useDs();
  const { user } = useUser();
  const { showToast } = useToast();
  const [days, setDays] = useState<ReportDays>(30);
  const [sharing, setSharing] = useState(false);
  const report = useHealthReport(days);
  const premiumRequired = report.error instanceof PremiumRequiredError;

  const share = async () => {
    if (!report.data) return;
    setSharing(true);
    try {
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "HeartLink patient";
      const { uri } = await Print.printToFileAsync({ html: reportHtml(report.data, name) });
      const target = `${FileSystem.cacheDirectory}HeartLink_health_report_${report.data.period.end}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: target });
      await Sharing.shareAsync(target, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Share your health report" });
    } catch {
      showToast({ title: "Couldn't make the PDF", message: "Please try again.", type: "error" });
    } finally {
      setSharing(false);
    }
  };

  const footer = report.data ? <DsButton label="Share PDF" onPress={share} loading={sharing} /> : null;

  return (
    <DsScreen header={<Header />} footer={footer}>
      <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>
        A summary of what you logged, to show your doctor at a checkup.
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
              accessibilityLabel={p.label}
              style={{ flex: 1, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: on ? 1 : 0, borderColor: c.hairline, backgroundColor: on ? c.canvas : "transparent" }}
            >
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: on ? "600" : "400", color: on ? c.ink : c.slate }}>{p.label}</Text>
            </AnimatedButton>
          );
        })}
      </View>

      {premiumRequired ? (
        <PremiumPrompt />
      ) : report.isPending ? (
        <View style={{ marginTop: 18, gap: 12 }}>
          <Skeleton style={{ height: 24, width: "60%", borderRadius: 6 }} />
          <Skeleton style={{ height: 220, borderRadius: 12 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
        </View>
      ) : report.isError || !report.data ? (
        <View style={{ marginTop: 18, gap: 12 }}>
          <InfoNote icon="wifi-off" title="Your report couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => report.refetch()} block />
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 18, fontSize: 14, color: c.steel }}>
            {periodLabel(report.data)} · logged on {report.data.days_logged} of {report.data.days} days
          </Text>
          <ReportBody report={report.data} />
        </>
      )}
    </DsScreen>
  );
}
