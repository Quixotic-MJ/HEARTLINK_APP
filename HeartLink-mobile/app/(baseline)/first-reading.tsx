import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, Tag } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useUser } from "../../contexts/UserContext";
import { apiFetch } from "../../lib/api";

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
      apiFetch(`/api/health-logs/${userId}?page=1&page_size=1`, { headers: { Authorization: `Bearer ${token}` } })
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
          <DsButton
            label="Continue"
            onPress={next}
            icon={<Feather name="arrow-right" size={17} color="#ffffff" />}
          />
        ) : (
          <>
            <DsButton
              label="Log my reading"
              onPress={() => router.push("/(home)/(health)/log-symptoms")}
              accessibilityHint="Opens the blood pressure log"
              icon={<Feather name="plus-circle" size={17} color="#ffffff" />}
            />
            <DsButton label="I don't have a monitor right now" variant="quiet" onPress={next} />
          </>
        )
      }
    >
      <View className="flex-row justify-between items-center" style={{ marginBottom: 18 }}>
        <Tag label="Last steps · 1 of 2" align="center" />
        {!reading ? (
          <AnimatedButton
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel="Skip blood pressure reading"
            style={{
              height: 32,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: c.hairline,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.slate }}>Skip</Text>
          </AnimatedButton>
        ) : null}
      </View>

      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
        {reading ? "Reading saved" : "Log your first reading"}
      </Text>
      <Text style={{ fontSize: 15.5, lineHeight: 23, color: c.slate, marginTop: 8, marginBottom: 22 }}>
        {reading
          ? "Nice start! Your score now uses a real reading, making your stability metrics personalized."
          : "Your score so far comes from your answers. A real blood pressure reading makes it truly yours."}
      </Text>

      {reading ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: "#A7F3D0",
            backgroundColor: "#ECFDF5",
            padding: 24,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Feather name="check" size={24} color="#059669" />
          </View>
          <Text style={{ fontSize: 44, fontWeight: "800", letterSpacing: -1, color: "#065F46" }}>
            {reading.systolic}/{reading.diastolic}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#047857", marginTop: 2 }}>mmHg</Text>
        </View>
      ) : (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 13.5, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase", color: c.slate, marginBottom: 12 }}>
            Tips for an accurate reading
          </Text>
          <View className="flex-row" style={{ gap: 10 }}>
            {TIPS.map((t) => (
              <View
                key={t.text}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#EFF6FF",
                  borderWidth: 1.5,
                  borderColor: "#BFDBFE",
                  alignItems: "center",
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <MaterialCommunityIcons name={t.icon} size={20} color="#1D4ED8" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 16, color: "#1E40AF", textAlign: "center" }}>
                  {t.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </DsScreen>
  );
}
