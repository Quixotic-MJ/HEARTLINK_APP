import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, FadeIn, FadeInDown, ZoomIn, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { BaselineData, useBaseline } from "../../contexts/BaselineContext";
import { useUser } from "../../contexts/UserContext";
import { getToken, getUserId as getStoredUserId } from "../../lib/secureTokenStore";
import { light, scoreBand, ScoreBand, DsColors } from "../../constants/theme";

const mapSleepHours = (val: string) => {
  switch (val) {
    case "5": return 5.0;
    case "5-6": return 5.5;
    case "7-8": return 7.5;
    case "9": return 9.0;
    default: return parseFloat(val) || 8.0;
  }
};

const daysOrNull = (on: boolean, v?: string) => (on ? Math.max(1, parseInt(v || "1", 10)) : null);

// Same two requests the old calculating screen made: profile first, then the baseline that
// computes the starting Health Stability Score.
async function submitBaseline(data: BaselineData, userId: string, token: string): Promise<number> {
  const base_url = process.env.EXPO_PUBLIC_API_URL;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const profileRes = await fetch(`${base_url}/api/users/${userId}/profile`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      first_name: data.first_name,
      last_name: data.last_name || "",
      date_of_birth: data.date_of_birth,
      sex: data.sex,
      height_cm: parseFloat(data.height_cm) || 0,
      weight_kg: parseFloat(data.weight_kg) || 0,
      health_goals: data.health_goals || [],
    }),
  });
  if (!profileRes.ok) {
    const err = await profileRes.json().catch(() => null);
    throw new Error(err?.detail || "We couldn't save your profile.");
  }

  const drinks = !!data.ever_drank;
  const baselineRes = await fetch(`${base_url}/api/users/${userId}/baseline/complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      vigorous_activity: !!data.vigorous_activity,
      vigorous_days: daysOrNull(!!data.vigorous_activity, data.vigorous_days),
      vigorous_minutes: daysOrNull(!!data.vigorous_activity, data.vigorous_minutes),
      moderate_activity: !!data.moderate_activity,
      moderate_days: daysOrNull(!!data.moderate_activity, data.moderate_days),
      moderate_minutes: daysOrNull(!!data.moderate_activity, data.moderate_minutes),
      walk_bike_transport: !!data.walk_bike_transport,
      walk_bike_days: daysOrNull(!!data.walk_bike_transport, data.walk_bike_days),
      walk_bike_minutes: daysOrNull(!!data.walk_bike_transport, data.walk_bike_minutes),
      sedentary_hours: data.sedentary_hours || "2-4h",
      sleep_hours: mapSleepHours(data.sleep_hours || "7-8"),
      ever_smoked: !!data.ever_smoked,
      smoke_now: data.ever_smoked ? data.smoke_now || "Not at all" : null,
      ever_drank: drinks,
      drink_frequency: drinks ? data.drink_frequency || "Never" : null,
      drinks_per_occasion: drinks && data.drink_frequency && data.drink_frequency !== "Never" ? data.drinks_per_occasion : null,
      binge_drinking_freq: drinks && data.drink_frequency && data.drink_frequency !== "Never" ? data.binge_drinking_freq : null,
      diet_level: data.diet_level || "average",
      fruit_veg_servings: data.fruit_veg_servings || "2-3",
      fried_food_freq: data.fried_food_freq || "sometimes",
      salty_food_freq: data.salty_food_freq || "sometimes",
      allergies: data.allergies?.includes("None") ? [] : data.allergies || [],
      dietary_practice: data.dietary_practice || "None",
    }),
  });
  if (!baselineRes.ok) {
    const err = await baselineRes.json().catch(() => null);
    throw new Error(err?.detail || "We couldn't work out your score.");
  }
  const body = await baselineRes.json().catch(() => null);
  const score = Number(body?.initial_hss?.score);
  if (!Number.isFinite(score)) throw new Error("We couldn't read your score.");
  return Math.round(score);
}

// Plain-language notes from the answers themselves (wellness wording, not a diagnosis).
function readAnswers(d: BaselineData): { helping: string[]; grow: string[] } {
  const helping: string[] = [];
  const grow: string[] = [];
  if (!d.ever_smoked) helping.push("Non-smoker");
  else if (d.smoke_now === "Not at all") helping.push("Quit smoking");
  else grow.push("Smoking");
  if (d.sleep_hours === "7-8") helping.push("7–8 h of sleep");
  if (d.sleep_hours === "5" || d.sleep_hours === "5-6") grow.push("Short sleep");
  if (d.fruit_veg_servings === "4-5" || d.fruit_veg_servings === "6+") helping.push("Plenty of fruit & veg");
  if (d.fruit_veg_servings === "0-1") grow.push("Little fruit & veg");
  if (d.salty_food_freq === "often" || d.salty_food_freq === "daily") grow.push("Salty foods often");
  if (d.fried_food_freq === "often" || d.fried_food_freq === "daily") grow.push("Fried foods often");
  if (d.sedentary_hours === "6-8h" || d.sedentary_hours === "8+h") grow.push("Long sitting days");
  const active = (d.vigorous_activity || d.moderate_activity || d.walk_bike_transport);
  if (active) helping.push("Regular movement");
  else grow.push("Little exercise");
  if (!d.ever_drank) helping.push("No alcohol");
  return { helping: helping.slice(0, 2), grow: grow.slice(0, 2) };
}

function bandStyle(key: ScoreBand, c: DsColors): { bg: string; fg: string } {
  switch (key) {
    case "good": return { bg: c.mint, fg: c.charcoal };
    case "moderate": return { bg: c.yellow, fg: c.warmText };
    case "elevated": return { bg: c.peach, fg: c.warmText };
    case "critical": return { bg: c.rose, fg: c.charcoal };
  }
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The blue part of the score ring, filling from empty to the score once the screen opens. */
function RingFill({ r, circ, filled, color }: { r: number; circ: number; filled: number; color: string }) {
  const offset = useSharedValue(circ);
  useEffect(() => {
    offset.value = withDelay(200, withTiming(circ - filled, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [circ, filled, offset]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <AnimatedCircle
      cx={94}
      cy={94}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={12}
      strokeLinecap="round"
      strokeDasharray={`${circ} ${circ}`}
      animatedProps={props}
      transform="rotate(-90 94 94)"
    />
  );
}

type State =
  | { status: "working" }
  | { status: "error"; message: string }
  | { status: "done"; score: number; name: string; helping: string[]; grow: string[] };

export default function ScoreScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { data, resetData } = useBaseline();
  const { token, userId, refreshUser } = useUser();
  const [state, setState] = useState<State>({ status: "working" });
  const started = useRef(false);

  const run = useCallback(async () => {
    setState({ status: "working" });
    try {
      const id = userId || (await getStoredUserId()) || "";
      const authToken = token || (await getToken()) || "";
      if (!id) throw new Error("Please log in again to finish set-up.");
      const score = await submitBaseline(data, id, authToken);
      const notes = readAnswers(data);
      const name = data.first_name;
      await refreshUser();
      resetData();
      setState({ status: "done", score, name, ...notes });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, [data, token, userId, refreshUser, resetData]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  if (state.status === "working") {
    return (
      <DsScreen centered>
        <View className="items-center">
          <ActivityIndicator size="large" color={c.line} accessibilityLabel="Working out your score" />
          <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink, marginTop: 20 }}>Working out your starting score</Text>
          <Text style={{ fontSize: 15, color: c.slate, marginTop: 6 }}>This takes a few seconds.</Text>
        </View>
      </DsScreen>
    );
  }

  if (state.status === "error") {
    return (
      <DsScreen
        centered
        footer={
          <>
            <DsButton label="Try again" onPress={run} />
            <DsButton label="Back to my answers" variant="quiet" onPress={() => router.replace("/(baseline)/plan")} />
          </>
        }
      >
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.rose, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Feather name="wifi-off" size={26} color={c.charcoal} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "600", color: c.ink }}>We couldn&apos;t get your score</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8 }}>
          {state.message} Your answers are saved, so nothing is lost.
        </Text>
      </DsScreen>
    );
  }

  const band = scoreBand(state.score, light);
  const bs = bandStyle(band.key, c);
  const R = 80;
  const circ = 2 * Math.PI * R;
  const filled = (Math.max(0, Math.min(100, state.score)) / 100) * circ;

  return (
    <DsScreen
      footer={
        <DsButton
          label="Continue"
          onPress={() => router.replace({ pathname: "/(baseline)/first-reading", params: { name: state.name } })}
        />
      }
    >
      <View className="items-center">
        <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: c.steel, marginBottom: 16 }}>
          Your starting score
        </Text>
        <View style={{ width: 188, height: 188 }} accessible accessibilityLabel={`Heart Health Stability Score ${state.score} out of 100, ${band.label}`}>
          <Svg width={188} height={188} viewBox="0 0 188 188">
            <Circle cx={94} cy={94} r={R} fill="none" stroke={c.hairlineSoft} strokeWidth={12} />
            <RingFill r={R} circ={circ} filled={filled} color={c.line} />
          </Svg>
          <Animated.View
            entering={ZoomIn.delay(250).springify().damping(14)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 56, fontWeight: "600", letterSpacing: -1, color: c.ink }}>{state.score}</Text>
            <Text style={{ fontSize: 13, color: c.steel }}>out of 100</Text>
          </Animated.View>
        </View>
        <Animated.View entering={FadeIn.delay(1000).duration(300)} style={{ marginTop: 14, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: bs.bg }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: bs.fg }}>{band.label}</Text>
        </Animated.View>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, textAlign: "center", marginTop: 14, marginBottom: 22, maxWidth: 320 }}>
          This is where you start, based on your answers. It moves as you log readings, meals and activity.
        </Text>
      </View>

      {state.helping.length || state.grow.length ? (
        <Animated.View entering={FadeInDown.delay(1100).duration(350)} className="flex-row" style={{ gap: 10 }}>
          {state.helping.length ? (
            <View style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: c.mint }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal, marginBottom: 8 }}>Helping you</Text>
              {state.helping.map((t) => (
                <Text key={t} style={{ fontSize: 14, fontWeight: "500", lineHeight: 21, color: c.charcoal }}>{t}</Text>
              ))}
            </View>
          ) : null}
          {state.grow.length ? (
            <View style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: c.peach }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal, marginBottom: 8 }}>Room to grow</Text>
              {state.grow.map((t) => (
                <Text key={t} style={{ fontSize: 14, fontWeight: "500", lineHeight: 21, color: c.charcoal }}>{t}</Text>
              ))}
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <View style={{ marginTop: 12 }}>
        <InfoNote text="HeartLink helps you build heart-healthy habits. It doesn't diagnose conditions or replace your doctor." />
      </View>
    </DsScreen>
  );
}
