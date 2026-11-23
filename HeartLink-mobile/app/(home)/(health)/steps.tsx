import React, { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import { stepsText } from "../../../components/dashboard/StepsCard";
import { useToast } from "../../../contexts/ToastContext";
import { type StepDay, useStepTracking, useStepWeek } from "../../../hooks/useSteps";
import { openHealthConnectInStore } from "../../../services/stepTracker";

// HL-163: Settings › Step tracking, and where the dashboard's Steps card leads. Turn reading steps from Health Connect
// on or off, see the week, and how steps count.

const HOW_IT_COUNTS =
  "Your step total is for your own tracking and doesn't change your score. Brisk walking does: stretches walked at about 100 steps a minute or faster count as movement minutes in your Habit score, like a logged exercise. A walk you also log in HeartLink is counted once. Steps come from Health Connect, so they're an estimate from your phone or watch.";

function dayLabel(day: string, isToday: boolean): string {
  if (isToday) return "Today";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

function DayRow({ day, goal, isToday, last }: { day: StepDay; goal: number; isToday: boolean; last: boolean }) {
  const { c } = useDs();
  const reached = day.steps >= goal;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.hairlineSoft,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: isToday ? "700" : "600", color: c.ink }}>{dayLabel(day.day, isToday)}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>
          {day.brisk_minutes > 0 ? `${day.brisk_minutes} brisk min` : "No brisk walking"}
        </Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{`${stepsText(day.steps)} steps`}</Text>
      <View style={{ width: 20, alignItems: "center" }}>
        {reached ? <Feather name="check-circle" size={18} color={c.primary} accessibilityLabel="Goal reached" /> : null}
      </View>
    </View>
  );
}

export default function StepsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const tracking = useStepTracking();
  const week = useStepWeek(tracking.on === true);
  const [confirmOff, setConfirmOff] = useState(false);

  const onSwitch = async (value: boolean) => {
    if (!value) {
      setConfirmOff(true);
      return;
    }
    const result = await tracking.turnOn();
    if (result === "on") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ title: "Step tracking on", message: "Your steps will update each time you open HeartLink", type: "success" });
    } else if (result === "denied") {
      showToast({ title: "Steps not allowed", message: "Allow HeartLink to read steps in Health Connect to turn this on", type: "info" });
    } else if (result === "needs_install" || result === "needs_update") {
      openHealthConnectInStore();
    }
  };

  const turnOff = async () => {
    try {
      await tracking.turnOff();
      setConfirmOff(false);
      showToast({ title: "Step tracking off", message: "Your saved steps were deleted", type: "success" });
    } catch (e) {
      setConfirmOff(false);
      showToast({ title: "Couldn't turn it off", message: e instanceof Error ? e.message : "Please try again.", type: "error" });
    }
  };

  const syncNow = async () => {
    const r = await tracking.syncNow();
    if (r === "no_access") showToast({ title: "Steps not allowed", message: "Allow HeartLink to read steps in Health Connect", type: "info" });
    else if (r === "failed") showToast({ title: "Couldn't update", message: "Check your connection, then try again", type: "error" });
  };

  const needsHealthConnect = tracking.state === "needs_install" || tracking.state === "needs_update";
  const days = week.data ? [...week.data.days].reverse() : [];
  const lastSynced = week.data?.last_synced_at
    ? new Date(week.data.last_synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <DsScreen header={<PageHeader title="Steps" onBack={() => router.back()} />}>
      <View style={{ gap: 22 }}>
        {!tracking.available ? (
          <InfoNote
            icon="smartphone"
            title="Step tracking works in the installed Android app"
            text="It reads the steps your phone counts in Health Connect, which Expo Go and iPhones don't have yet."
          />
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.hairline,
              backgroundColor: c.canvas,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>Count my steps</Text>
              <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>
                {tracking.on ? "On: from Health Connect" : "Off"}
              </Text>
            </View>
            <Switch
              value={tracking.on === true}
              disabled={tracking.busy || tracking.on === null}
              onValueChange={onSwitch}
              trackColor={{ false: isDark ? c.hairlineStrong : "#CBD5E1", true: c.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Count my steps"
              accessibilityRole="switch"
            />
          </View>
        )}

        {tracking.available && needsHealthConnect ? (
          <View style={{ gap: 10 }}>
            <InfoNote
              icon="download"
              title={tracking.state === "needs_update" ? "Update Health Connect" : "Get Health Connect"}
              text="HeartLink reads your steps from Health Connect, Google's app for health data. It's free on the Play Store."
            />
            <DsButton
              label={tracking.state === "needs_update" ? "Update Health Connect" : "Get Health Connect"}
              variant="secondary"
              onPress={openHealthConnectInStore}
              block
            />
          </View>
        ) : null}

        {tracking.on ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
                This week
              </Text>
              {week.data ? (
                <Text style={{ fontSize: 13, color: c.slate }}>{`Goal ${stepsText(week.data.goal)} a day`}</Text>
              ) : null}
            </View>
            {week.isPending ? (
              <Skeleton style={{ height: 320, borderRadius: 12 }} />
            ) : week.isError || !week.data ? (
              <View style={{ gap: 10 }}>
                <InfoNote icon="wifi-off" title="Your steps couldn't load" text="Check your connection, then try again." />
                <DsButton label="Try again" variant="secondary" onPress={() => week.refetch()} block />
              </View>
            ) : (
              <>
                <View style={{ paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
                  {days.map((d, i) => (
                    <DayRow key={d.day} day={d} goal={week.data.goal} isToday={i === 0} last={i === days.length - 1} />
                  ))}
                </View>
                <Text style={{ fontSize: 13, color: c.steel }}>
                  {lastSynced ? `Updated ${lastSynced}` : "Not updated yet"}
                </Text>
                <DsButton label="Update now" variant="secondary" loading={tracking.busy} onPress={syncNow} block />
              </>
            )}
          </View>
        ) : null}

        <InfoNote icon="info" title="How steps count" text={HOW_IT_COUNTS} />

        <DsButton
          label="Change my step goal"
          variant="quiet"
          onPress={() => router.push("/(home)/(health)/goals-thresholds")}
          block
        />
      </View>

      <ConfirmDialog
        visible={confirmOff}
        onCancel={() => setConfirmOff(false)}
        onConfirm={turnOff}
        variant="destructive"
        title="Stop counting steps?"
        message="HeartLink stops reading your steps and deletes the steps it saved. Brisk minutes from your phone come off your Habit score."
        confirmLabel="Stop and delete"
        cancelLabel="Keep counting"
      />
    </DsScreen>
  );
}
