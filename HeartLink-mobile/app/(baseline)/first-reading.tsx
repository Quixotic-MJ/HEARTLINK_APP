import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, Tag } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useUser } from "../../contexts/UserContext";

const TIPS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[] = [
  { icon: "timer-sand", text: "Rest 5 minutes first" },
  { icon: "seat-outline", text: "Sit, feet flat" },
  { icon: "arm-flex-outline", text: "Arm at heart level" },
];

interface Reading {
  systolic: number;
  diastolic: number;
}

// The reading itself is entered on the existing log screen, so its emergency checks
// (180/120 or higher, under 90/60) run exactly as they do everywhere else in the app.
export default function FirstReadingScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { userId, token } = useUser();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [reading, setReading] = useState<Reading | null>(null);

  const next = () => router.replace({ pathname: "/(baseline)/reminders", params: { name: name ?? "" } });

  // When coming back from the log screen, look for a reading saved in the last few minutes.
  useFocusEffect(
    useCallback(() => {
      if (!userId || !token) return;
      let active = true;
      const base_url = process.env.EXPO_PUBLIC_API_URL;
      fetch(`${base_url}/api/health-logs/${userId}?page=1&page_size=1`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (!active || !body) return;
          const items = body.data ?? body;
          const last = Array.isArray(items) ? items[0] : null;
          if (!last?.systolic_bp || !last?.diastolic_bp) return;
          const ageMs = Date.now() - new Date(last.logged_at).getTime();
          if (ageMs >= 0 && ageMs < 15 * 60 * 1000) {
            setReading({ systolic: last.systolic_bp, diastolic: last.diastolic_bp });
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [userId, token])
  );

  return (
    <DsScreen
      footer={
        reading ? (
          <DsButton label="Continue" onPress={next} />
        ) : (
          <>
            <DsButton
              label="Log my reading"
              onPress={() => router.push("/(home)/(health)/log-symptoms")}
              accessibilityHint="Opens the blood pressure log"
            />
            <DsButton label="I don't have a monitor right now" variant="quiet" onPress={next} />
          </>
        )
      }
    >
      <View className="flex-row justify-between items-center" style={{ marginBottom: 16 }}>
        <Tag label="Last steps · 1 of 2" align="center" />
        {!reading ? <DsButton label="Skip" variant="quiet" block={false} onPress={next} /> : null}
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
        {reading ? "Reading saved" : "Log your first reading"}
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8, marginBottom: 22 }}>
        {reading
          ? "Nice start. Your score now uses a real reading, not only your answers."
          : "Your score so far comes from your answers. A real blood pressure reading makes it yours."}
      </Text>

      {reading ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, padding: 20, alignItems: "center" }}>
          <Text style={{ fontSize: 40, fontWeight: "600", color: c.ink }}>
            {reading.systolic}/{reading.diastolic}
          </Text>
          <Text style={{ fontSize: 13, color: c.steel, marginTop: 2 }}>mmHg</Text>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, marginBottom: 10 }}>For a good reading</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {TIPS.map((t) => (
              <View key={t.text} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.sky, alignItems: "center" }}>
                <MaterialCommunityIcons name={t.icon} size={20} color={c.charcoal} />
                <Text style={{ fontSize: 12, fontWeight: "500", lineHeight: 17, color: c.charcoal, marginTop: 4, textAlign: "center" }}>{t.text}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </DsScreen>
  );
}
