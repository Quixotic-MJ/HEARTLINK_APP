import React, { useState } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import { Skeleton } from "../../../components/ui/Skeleton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { useDs } from "../../../components/onboarding/useDs";
import { IconBadge, SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { apiFetch } from "../../../lib/api";
import { Routine, exerciseKind, toRoutines } from "../../../services/exerciseSession";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { useExploreScore } from "../../../hooks/useExploreData";
import { suitsTier } from "../../../services/explore";

// Every exercise a physical therapist approved (the server sends no others, HL-026), filtered by type.

const FILTERS = ["All", "Light Cardio", "Breathing", "Stationary", "General"] as const;
type Filter = (typeof FILTERS)[number];

const KIND_ICON = { breathing: "wind", cardio: "activity", steps: "user", guide: "play-circle" } as const;

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
  // Every approved exercise shows here; the ones for the patient's score level get a tag.
  const patientTier = useExploreScore().data?.tier ?? null;
  const knowsTier = !!patientTier && patientTier !== "Unknown";
  const shown = filter === "All" ? all : all.filter((r) => r.type.toLowerCase() === filter.toLowerCase());
  const [refreshing, setRefreshing] = useState(false);

  const renderRow = ({ item }: { item: Routine }) => {
    const kind = exerciseKind(item);
    return (
      <AnimatedButton
        onPress={() => router.push({ pathname: "/(home)/(health)/exercise-session", params: { id: item.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.type}, ${item.minutes} minutes, ${item.intensity} intensity${item.reviewedAt ? ". PT approved" : ""}`}
        style={{ minHeight: 72, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <IconBadge icon={KIND_ICON[kind]} tone={kind === "breathing" ? "sky" : "mint"} size={48} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 13, color: c.slate }}>
            {item.type}, {item.minutes} min, {item.intensity.toLowerCase()} intensity
          </Text>
          {knowsTier && item.tier && suitsTier(item.tier, patientTier) ? (
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: c.mint }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>Suits your score</Text>
            </View>
          ) : null}
          {item.reviewedAt ? (
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Feather name="check-circle" size={13} color={c.success} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.charcoal }}>PT approved</Text>
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={c.steel} />
      </AnimatedButton>
    );
  };

  const content = (
    <>
      {!isEmbedded ? (
        <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => (from === "explore" ? router.navigate("/(home)/(tabs)/explore") : router.back())} />
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }}>
            Exercises
          </Text>
        </View>
      ) : null}

      <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
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
                style={{ height: 40, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, justifyContent: "center", backgroundColor: on ? c.ink : c.canvas, borderColor: on ? c.ink : c.hairline }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{f}</Text>
              </AnimatedButton>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <View className="px-5" style={{ paddingTop: 20, gap: 8 }}>
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} style={{ height: 72, borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
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
            shown.length > 0 ? (
              <Text style={{ fontSize: 13, color: c.steel, marginBottom: 12 }}>
                {shown.length} {shown.length === 1 ? "exercise" : "exercises"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ padding: 20, borderRadius: 12, backgroundColor: c.surface, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                {query.isError ? "Exercises couldn't load" : filter === "All" ? "No exercises yet" : `No ${filter.toLowerCase()} exercises yet`}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
                {query.isError ? "Check your connection and try again." : "Exercises show here once they're added."}
              </Text>
              {query.isError ? <DsButton label="Try again" variant="secondary" block={false} onPress={() => query.refetch()} style={{ marginTop: 6 }} /> : null}
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
