import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDs } from "../../components/onboarding/useDs";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../components/onboarding/QuestionLayout";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { TrendChart } from "../../components/trends/TrendChart";
import { PageHeader } from "../../components/family/FamilyBits";
import { useToast } from "../../contexts/ToastContext";
import { useFamilySummary, useStopFollowing } from "../../hooks/useFamily";
import { agoLine, summaryChart } from "../../services/family";

// HL-087: what a follower sees: the latest readings, the last check-in, 30-day charts and any open health alert.
// Read-only, and only what the patient logged; never a diagnosis.

function Tile({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  const { c } = useDs();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} ${unit ?? ""}, ${note}`}
      style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, gap: 4 }}
    >
      <Text style={{ fontSize: 13, color: c.slate }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
        {unit ? <Text style={{ fontSize: 13, color: c.slate }}>{unit}</Text> : null}
      </View>
      <Text style={{ fontSize: 12, color: c.steel }}>{note}</Text>
    </View>
  );
}

export default function FollowedPersonScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const summary = useFamilySummary(patientId);
  const stop = useStopFollowing();
  const [confirmStop, setConfirmStop] = useState(false);

  const s = summary.data;
  const name = s?.name ?? "";

  const stopFollowing = () => {
    setConfirmStop(false);
    if (!patientId) return;
    stop.mutate(patientId, {
      onSuccess: () => {
        showToast({ title: `You stopped following ${name}`, message: "You won't get their alerts any more.", type: "success" });
        router.back();
      },
      onError: (e) => showToast({ title: "Couldn't stop following", message: e.message, type: "error" }),
    });
  };

  const body = () => {
    if (summary.isPending) {
      return (
        <View style={{ gap: 12 }}>
          <Skeleton style={{ height: 100, borderRadius: 12 }} />
          <Skeleton style={{ height: 220, borderRadius: 12 }} />
        </View>
      );
    }
    if (summary.isError || !s) {
      return (
        <View style={{ gap: 12 }}>
          <InfoNote icon="alert-circle" title="This couldn't load" text={summary.error?.message ?? "Check your connection, then try again."} />
          <DsButton label="Try again" variant="secondary" onPress={() => summary.refetch()} block />
        </View>
      );
    }
    if (s.paused) {
      return (
        <InfoNote
          icon="pause-circle"
          title="Sharing is paused"
          text={`${s.name} isn't on HeartLink Premium right now. You'll see their readings and get alerts again when they renew.`}
        />
      );
    }

    const chart = summaryChart(s.days);
    const hasBp = chart.pressure.some((p) => p !== null);
    const scores = chart.scores.filter((v): v is number => v !== null);
    const alert = s.open_alerts[0];

    return (
      <View style={{ gap: 22 }}>
        {alert ? (
          <View accessibilityRole="alert" style={{ padding: 16, borderRadius: 12, backgroundColor: c.rose, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="alert-triangle" size={18} color={c.danger} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: c.ink }}>{`Open health alert: ${alert.type}`}</Text>
            </View>
            <Text style={{ fontSize: 14, lineHeight: 21, color: c.charcoal }}>
              {`Logged ${agoLine(alert.at).toLowerCase()}. Check on ${s.name}. If they need help now, call 911.`}
            </Text>
            <DsButton label="Call 911" onPress={() => Linking.openURL("tel:911").catch(() => {})} />
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Tile
            label="Blood pressure"
            value={s.latest_bp ? `${s.latest_bp.systolic}/${s.latest_bp.diastolic}` : "--"}
            unit={s.latest_bp ? "mmHg" : undefined}
            note={s.latest_bp ? agoLine(s.latest_bp.at) : "No readings yet"}
          />
          <Tile
            label="Pulse"
            value={s.latest_pulse ? String(s.latest_pulse.bpm) : "--"}
            unit={s.latest_pulse ? "bpm" : undefined}
            note={s.latest_pulse ? agoLine(s.latest_pulse.at) : "No readings yet"}
          />
          <Tile label="Heart score" value={s.score ? String(s.score.value) : "--"} note={s.score ? agoLine(s.score.at) : "No score yet"} />
          <Tile label="Last check-in" value={agoLine(s.last_check_in)} note="Any check-in" />
        </View>

        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>Blood pressure, last 30 days</Text>
          {hasBp ? (
            <TrendChart
              kind="range"
              days={chart.days}
              values={chart.pressure}
              yMin={40}
              yMax={200}
              ticks={[60, 100, 140]}
              refLine={{ value: 180, label: "180: emergency level", color: c.danger }}
              accessibilityLabel={`${s.name}'s blood pressure over the last 30 days, each day's last reading.`}
            />
          ) : (
            <Text style={{ fontSize: 15, color: c.slate }}>No readings in the last 30 days.</Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>Heart score, last 30 days</Text>
          {scores.length ? (
            <TrendChart
              kind="line"
              days={chart.days}
              values={chart.scores}
              yMin={Math.max(0, Math.min(60, Math.floor((Math.min(...scores) - 5) / 10) * 10))}
              yMax={100}
              ticks={[60, 80, 100]}
              accessibilityLabel={`${s.name}'s heart score over the last 30 days.`}
            />
          ) : (
            <Text style={{ fontSize: 15, color: c.slate }}>No score in the last 30 days.</Text>
          )}
        </View>

        <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>
          {`This is what ${s.name} logged in HeartLink. It isn't a diagnosis.`}
        </Text>
      </View>
    );
  };

  return (
    <DsScreen
      header={<PageHeader title={name || "Family member"} onBack={() => router.back()} />}
      footer={s ? <DsButton label="Stop following" variant="link" onPress={() => setConfirmStop(true)} /> : null}
    >
      {body()}
      <ConfirmDialog
        visible={confirmStop}
        onCancel={() => setConfirmStop(false)}
        onConfirm={stopFollowing}
        title={`Stop following ${name}?`}
        message="You won't see their readings or get their alerts. They can send you a new code later."
        confirmLabel="Stop following"
        cancelLabel="Cancel"
        variant="destructive"
        mode="bottom-sheet"
        icon="user-x"
      />
    </DsScreen>
  );
}
