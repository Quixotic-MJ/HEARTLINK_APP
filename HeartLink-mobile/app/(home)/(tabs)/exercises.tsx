import React, { useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { ExerciseHistoryLink, SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { apiFetch } from "../../../lib/api";
import { Routine, exerciseAllowed, exerciseKind, toRoutines } from "../../../services/exerciseSession";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { useExploreScore } from "../../../hooks/useExploreData";

// Every exercise a physical therapist approved (the server sends no others, HL-026), filtered by type.

const FILTERS = ["All", "Light Cardio", "Breathing", "Stationary", "General"] as const;
type Filter = (typeof FILTERS)[number];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const KIND_ICON = { breathing: "wind", cardio: "activity", steps: "user", guide: "play-circle" } as const;

const KIND_FALLBACK_IMAGE: Record<string, string> = {
  breathing: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  cardio: "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop",
  steps: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop",
  guide: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop",
};

export default function ExercisesScreen({ isEmbedded = false }: { isEmbedded?: boolean } = {}) {
  const { c, isDark } = useDs();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; from?: string }>();
  // Opened from Explore's "All exercises": back returns there, not to the first tab.
  const from = params.from;
  const startFilter = FILTERS.find((f) => f.toLowerCase() === (params.type ?? "").toLowerCase()) ?? "All";
  // This tab stays open in the background, so a new ?type= (e.g. "Try a breathing exercise")
  // replaces whatever filter was picked before.
  const [picked, setPicked] = useState<{ param?: string; filter: Filter }>({ param: params.type, filter: startFilter });
  const filter = picked.param === params.type ? picked.filter : startFilter;
  const setFilter = (f: Filter) => setPicked({ param: params.type, filter: f });

  // Saved on the phone as the server sent it, turned into Routines each time it's read (see
  // exercise-session.tsx), so old saved copies can't break a newer app.
  const query = useQuery({
    queryKey: ["exercises-raw"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<unknown> => {
      const res = await apiFetch("/api/exercises/");
      if (!res.ok) throw new Error("Failed to fetch exercises");
      return res.json();
    },
    select: toRoutines,
  });
  // An exercise a PT approves shows when the patient comes back to this tab (HL-026).
  useRefetchOnFocus(query.refetch);
  const all = query.data ?? [];
  // HL-123: every approved exercise shows here. When the safety check limits what's open, the open ones get a tag.
  const screening = useExploreScore().data?.screening ?? null;
  const limited = !!screening?.state && screening.state !== "eligible";
  // HL-094: level and category filters appear once exercises have them; "All" keeps those without one in view.
  const [level, setLevel] = useState("All");
  const [category, setCategory] = useState("All");
  const levels = LEVELS.filter((l) => all.some((r) => r.level === l));
  const categories = [...new Set(all.map((r) => r.category).filter(Boolean))].sort();
  const shown = all
    .filter((r) => filter === "All" || r.type.toLowerCase() === filter.toLowerCase())
    .filter((r) => level === "All" || r.level === level)
    .filter((r) => category === "All" || r.category === category);
  const [refreshing, setRefreshing] = useState(false);

  const renderRow = ({ item }: { item: Routine }) => {
    const kind = exerciseKind(item);
    const isBreathing = kind === "breathing";
    const tone = isBreathing
      ? isDark ? "rgba(59, 130, 246, 0.18)" : c.sky
      : isDark ? "rgba(16, 185, 129, 0.18)" : c.mint;
    const iconColor = isBreathing
      ? isDark ? "#60A5FA" : "#2563EB"
      : isDark ? "#34D399" : "#059669";

    const suits = limited && exerciseAllowed(screening, item);

    return (
      <AnimatedButton
        onPress={() =>
          router.push({
            pathname: "/(home)/(health)/exercise-session",
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.type}, ${item.minutes} minutes, ${item.intensity} intensity${item.reviewedAt ? ". PT approved" : ""}`}
        style={{
          minHeight: 88,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#E2E8F0",
          backgroundColor: isDark ? c.surface : c.canvas,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.25 : 0.04,
              shadowRadius: 6,
            },
            android: { elevation: 1 },
          }),
        }}
      >
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: tone,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={KIND_ICON[kind]} size={24} color={iconColor} style={{ position: "absolute" }} />
          <Image
            source={{ uri: item.image || KIND_FALLBACK_IMAGE[kind] }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ fontSize: 15.5, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={{ fontSize: 12.5, color: c.slate }}>
            {item.level ? `${item.level} • ` : ""}{item.category || item.type} • {item.minutes} min • {item.intensity.toLowerCase()} intensity
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 1 }}>
            {suits ? (
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: isDark ? "#34D399" : "#059669" }}>
                  Open for you
                </Text>
              </View>
            ) : null}
            {item.reviewedAt ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? "rgba(59, 130, 246, 0.16)" : "#EFF6FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE",
                }}
              >
                <Feather name="check-circle" size={11} color={isDark ? "#60A5FA" : "#2563EB"} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: isDark ? "#60A5FA" : "#2563EB" }}>
                  PT approved
                </Text>
              </View>
            ) : null}
            {item.position ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: "500", color: c.slate }}>
                  {item.position}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="chevron-right" size={15} color={c.steel} />
        </View>
      </AnimatedButton>
    );
  };

  const content = (
    <>
      {!isEmbedded ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 10,
            gap: 12,
          }}
        >
          <SquareIconButton
            icon="arrow-left"
            label="Go back"
            onPress={() => (from === "explore" ? router.navigate("/(home)/(tabs)/explore") : router.back())}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: "700", color: c.ink, letterSpacing: -0.4 }}
            >
              Exercises
            </Text>
            <Text style={{ fontSize: 12.5, color: c.slate }}>
              Gentle movement and breathing routines
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ paddingVertical: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <AnimatedButton
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={f}
                hitSlop={{ top: 4, bottom: 4 }}
                style={{
                  height: 38,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: on
                    ? c.primary
                    : isDark
                    ? c.surfaceAlt
                    : "#F1F5F9",
                  borderColor: on
                    ? c.primary
                    : isDark
                    ? c.hairline
                    : "#E2E8F0",
                  ...(on
                    ? Platform.select({
                        ios: {
                          shadowColor: c.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                        },
                        android: { elevation: 2 },
                      })
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: "600",
                    color: on ? "#FFFFFF" : c.charcoal,
                  }}
                >
                  {f}
                </Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>
        {levels.length ? <SmallChips label="Level" options={levels} value={level} onChange={setLevel} /> : null}
        {categories.length ? <SmallChips label="Category" options={categories} value={category} onChange={setCategory} /> : null}
      </View>

      {query.isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} style={{ height: 88, borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await query.refetch();
                setRefreshing(false);
              }}
              tintColor={c.line}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: shown.length > 0 ? 12 : 16 }}>
              <ExerciseHistoryLink onPress={() => router.push("/(home)/(health)/exercise-diary")} />
              {shown.length > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: c.slate }}>
                    {shown.length} {shown.length === 1 ? "exercise" : "exercises"}
                    {limited
                      ? ` • ${shown.filter((r) => exerciseAllowed(screening, r)).length} open for you`
                      : ""}
                  </Text>
                  {limited ? (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2.5,
                        borderRadius: 999,
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(16, 185, 129, 0.28)" : "#A7F3D0",
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: "600", color: isDark ? "#34D399" : "#059669" }}>
                        {screening?.state === "caution" ? "Beginner for now" : "Breathing for now"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View
              style={{
                padding: 24,
                borderRadius: 16,
                backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                borderWidth: 1,
                borderColor: isDark ? c.hairline : "#E2E8F0",
                gap: 8,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Feather name="activity" size={28} color={c.steel} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink, textAlign: "center" }}>
                {query.isError
                  ? "Exercises couldn't load"
                  : filter === "All"
                  ? "No exercises yet"
                  : `No ${filter.toLowerCase()} exercises yet`}
              </Text>
              <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.slate, textAlign: "center" }}>
                {query.isError
                  ? "Check your connection and try again."
                  : "Exercises show here once they're approved by your PT."}
              </Text>
              {query.isError ? (
                <DsButton
                  label="Try again"
                  variant="secondary"
                  block={false}
                  onPress={() => query.refetch()}
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </View>
          }
        />
      )}
    </>
  );

  if (isEmbedded) return <View style={{ flex: 1, backgroundColor: c.canvas }}>{content}</View>;
  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />
      {content}
    </ScreenWrapper>
  );
}

/** A second, smaller row of filters under the types. */
function SmallChips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const { c } = useDs();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={`Filter by ${label.toLowerCase()}`}
      style={{ marginTop: 8 }}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}
    >
      {["All", ...options].map((o) => {
        const on = o === value;
        return (
          <AnimatedButton
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o === "All" ? `All ${label.toLowerCase()}s` : o}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center", borderColor: on ? c.line : c.hairline, backgroundColor: on ? c.tint : c.canvas }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: "500", color: on ? c.onTint : c.slate }}>{o === "All" ? `All ${label.toLowerCase()}s` : o}</Text>
          </AnimatedButton>
        );
      })}
    </ScrollView>
  );
}
