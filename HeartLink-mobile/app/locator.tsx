import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useDs } from "../components/onboarding/useDs";
import { SquareIconButton } from "../components/exercise/ExerciseBits";
import { ClinicMap } from "../components/clinics/ClinicMap";
import { useNearbyClinics } from "../hooks/useNearbyClinics";
import { Clinic, callClinic, clinicLabel, distanceLabel, hasEmergencyRoom, openDirections } from "../services/clinics";

// HL-078 / HL-088: nearby clinics in Cebu City, emergency rooms first. Opened from the dashboard and from the
// emergency warning, so it must never depend on a map key: the map is OpenStreetMap, Directions opens the phone's
// maps app, and Call only shows for a number the team checked.

function ClinicCard({ clinic, selected }: { clinic: Clinic; selected: boolean }) {
  const { c } = useDs();
  const er = hasEmergencyRoom(clinic);

  return (
    <View
      className="bg-ds-canvas rounded-xl p-5"
      style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? c.line : c.hairline }}
    >
      <View className="flex-row items-start mb-4">
        <View
          className="w-11 h-11 rounded-lg items-center justify-center mr-4 flex-shrink-0"
          style={{ backgroundColor: er ? c.rose : c.sky }}
        >
          <MaterialCommunityIcons name={er ? "hospital-box" : "hospital-building"} size={22} color={er ? c.danger : c.charcoal} />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-ds-ink leading-snug mb-1">{clinic.name}</Text>
          {clinic.address ? <Text className="text-[13px] text-ds-slate leading-snug">{clinic.address}</Text> : null}
          <View className="flex-row flex-wrap items-center mt-2" style={{ gap: 8 }}>
            <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: er ? c.rose : c.surfaceAlt }}>
              <Text className="text-[13px] font-semibold" style={{ color: er ? c.ink : c.slate }}>{clinicLabel(clinic)}</Text>
            </View>
            <Text className="text-[13px] font-medium text-ds-slate">{distanceLabel(clinic.distanceKm)}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openDirections(clinic)}
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${clinic.name}`}
          className="flex-1 flex-row items-center justify-center rounded-lg bg-ds-primary gap-2"
          style={{ height: 48 }}
        >
          <Feather name="navigation" size={15} color={c.onPrimary} />
          <Text className="text-[15px] font-medium text-ds-on-primary">Directions</Text>
        </TouchableOpacity>
        {clinic.phone ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => callClinic(clinic)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${clinic.name}`}
            className="flex-1 flex-row items-center justify-center rounded-lg border border-ds-hairline-strong gap-2"
            style={{ height: 48 }}
          >
            <Feather name="phone-call" size={15} color={c.ink} />
            <Text className="text-[15px] font-medium text-ds-ink">Call</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function LocatorScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { clinics, you, locationDenied, isPending, isError, refetch } = useNearbyClinics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Clinic>>(null);

  const selectFromMap = (id: string) => {
    setSelectedId(id);
    const index = clinics.findIndex((clinic) => clinic.id === id);
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewOffset: 8, animated: true });
  };

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      {locationDenied ? (
        <View className="flex-row items-center bg-ds-yellow rounded-xl px-4 py-3 gap-3">
          <Feather name="info" size={18} color={c.warmText} />
          <Text className="flex-1 text-[13px] font-medium text-ds-warm-text leading-snug">
            {"Location is off, so distances are from Cebu City's centre."}
          </Text>
        </View>
      ) : null}
      {clinics.length ? <ClinicMap clinics={clinics} you={you} selectedId={selectedId} onSelect={selectFromMap} /> : null}
      <View className="pt-2 flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold text-ds-ink">Nearby clinics</Text>
        {clinics.length ? <Text className="text-[13px] text-ds-steel">{clinics.length} in Cebu City</Text> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center">
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
          <View className="flex-1 ml-3">
            <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink" numberOfLines={1}>
              Emergency locator
            </Text>
            <Text className="text-[13px] text-ds-slate font-medium">Nearest emergency rooms first</Text>
          </View>
          <View className="w-10 h-10 rounded-lg bg-ds-rose items-center justify-center">
            <MaterialCommunityIcons name="heart-pulse" size={20} color={c.danger} />
          </View>
        </View>
      </View>

      {isPending ? (
        <View className="px-5 pt-3" style={{ gap: 12 }}>
          <Skeleton style={{ height: 220, borderRadius: 12 }} />
          <Skeleton style={{ height: 150, borderRadius: 12 }} />
          <Skeleton style={{ height: 150, borderRadius: 12 }} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={clinics}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, gap: 16 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          ListEmptyComponent={
            <EmptyState
              icon={<Feather name={isError ? "wifi-off" : "map-pin"} size={26} color={c.slate} />}
              title={isError ? "Couldn't load clinics" : "No clinics to show"}
              subtitle={isError ? "Check your connection, then try again. In an emergency, call 911." : "In an emergency, call 911."}
              actionLabel={isError ? "Try again" : undefined}
              onAction={isError ? () => refetch() : undefined}
              className="pt-12"
            />
          }
          ListFooterComponent={
            clinics.length ? (
              <Text className="text-[12px] text-ds-steel leading-snug pt-2">
                {"Places come from OpenStreetMap, a public map. HeartLink isn't partnered with any of them. In an emergency, call 911."}
              </Text>
            ) : null
          }
          renderItem={({ item }) => <ClinicCard clinic={item} selected={item.id === selectedId} />}
        />
      )}
    </SafeAreaView>
  );
}
