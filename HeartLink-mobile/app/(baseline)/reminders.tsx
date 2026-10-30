import React, { useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, IconBadge, InfoNote, Tag, BadgeTint, McIcon } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { DEFAULT_REMINDERS, Reminders, formatTime, saveReminders, scheduleReminders } from "../../services/remindersService";

const ROWS: { key: keyof Reminders; when: string; title: string; icon: McIcon; tint: BadgeTint }[] = [
  { key: "morning", when: "Morning", title: "Check your blood pressure", icon: "white-balance-sunny", tint: "yellow" },
  { key: "medicine", when: "Medicines", title: "Take your medicines", icon: "pill", tint: "peach" },
  { key: "activity", when: "Afternoon", title: "Time to move", icon: "walk", tint: "mint" },
  { key: "evening", when: "Evening", title: "Look back on your day", icon: "weather-night", tint: "lavender" },
];

const toDate = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export default function RemindersScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { userId, token } = useUser();
  const { showToast } = useToast();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [reminders, setReminders] = useState<Reminders>(DEFAULT_REMINDERS);
  const [editing, setEditing] = useState<keyof Reminders | null>(null);
  const [saving, setSaving] = useState(false);

  const count = ROWS.filter((r) => reminders[r.key].enabled).length;
  const done = () => router.replace({ pathname: "/(baseline)/day-one", params: { name: name ?? "" } });

  const turnOn = async () => {
    if (count === 0) {
      done();
      return;
    }
    setSaving(true);
    try {
      if (userId) await saveReminders(userId, token || "", reminders);
      const allowed = await scheduleReminders(reminders);
      if (!allowed) {
        showToast({ title: "Notifications are off", message: "You can allow them later in your phone's settings.", type: "info" });
      }
    } catch (e) {
      showToast({ title: "Reminders not saved", message: e instanceof Error ? e.message : "Try again later in Settings.", type: "error" });
    } finally {
      setSaving(false);
      done();
    }
  };

  return (
    <DsScreen
      footer={
        <>
          <DsButton
            label={count === 0 ? "Continue without reminders" : `Turn on ${count} ${count === 1 ? "reminder" : "reminders"}`}
            loading={saving}
            onPress={turnOn}
            icon={<Feather name="arrow-right" size={17} color="#ffffff" />}
          />
          <DsButton label="Not now" variant="quiet" onPress={done} />
        </>
      }
    >
      <View style={{ marginBottom: 18 }}>
        <Tag label="Last steps · 2 of 2" />
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
        Plan your day with HeartLink
      </Text>
      <Text style={{ fontSize: 15.5, lineHeight: 23, color: c.slate, marginTop: 8, marginBottom: 22 }}>
        A gentle nudge at each moment. Change the times anytime in Settings.
      </Text>

      <View style={{ gap: 12 }}>
        {ROWS.map((r) => {
          const item = reminders[r.key];
          return (
            <View
              key={r.key}
              className="flex-row items-center"
              style={{
                gap: 14,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: item.enabled ? "#BFDBFE" : c.hairline,
                backgroundColor: item.enabled ? "#F8FAFC" : c.canvas,
              }}
            >
              <IconBadge icon={r.icon} tint={r.tint} size={42} />
              <View className="flex-1">
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: c.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {r.when}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, marginTop: 2 }}>{r.title}</Text>
                <AnimatedButton
                  onPress={() => setEditing(r.key)}
                  disabled={Platform.OS === "web"}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.when} reminder time, ${formatTime(item.time)}. Tap to change`}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 6,
                    height: 30,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: item.enabled ? "#DBEAFE" : c.hairline,
                    backgroundColor: item.enabled ? "#EFF6FF" : "#F8FAFC",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Feather name="clock" size={12} color={item.enabled ? "#2563EB" : c.slate} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: item.enabled ? "#1D4ED8" : c.ink }}>
                    {formatTime(item.time)}
                  </Text>
                </AnimatedButton>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={(v) => setReminders((prev) => ({ ...prev, [r.key]: { ...prev[r.key], enabled: v } }))}
                trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#CBD5E1"
                accessibilityLabel={`${r.when} reminder`}
              />
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 18 }}>
        <InfoNote icon="bell" text="Next, your phone will ask to allow notifications. Tap Allow so these can reach you." />
      </View>

      {editing && Platform.OS !== "web" ? (
        <DateTimePicker
          value={toDate(reminders[editing].time)}
          mode="time"
          display="default"
          onValueChange={(_event, date) => {
            const key = editing;
            setEditing(null);
            if (date && key) {
              const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
              setReminders((prev) => ({ ...prev, [key]: { ...prev[key], time } }));
            }
          }}
          onDismiss={() => setEditing(null)}
        />
      ) : null}
    </DsScreen>
  );
}
