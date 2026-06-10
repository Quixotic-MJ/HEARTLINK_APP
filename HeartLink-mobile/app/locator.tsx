import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";

// ─── Types ────────────────────────────────────────────────────────────────────

type Clinic = {
  id: string;
  name: string;
  doctor: string;
  distance: string;
  status: string;
  isOpen: boolean;
  latitude: number;
  longitude: number;
  phone: string;
  specialty: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CLINICS: Clinic[] = [
  {
    id: "1",
    name: "Chong Hua Hospital Heart Institute",
    doctor: "Dr. Maria Santos, MD, FACC",
    distance: "2.4 km",
    status: "Open now",
    isOpen: true,
    latitude: 10.3129,
    longitude: 123.8925,
    phone: "1234567890",
    specialty: "General Cardiology",
  },
  {
    id: "2",
    name: "Cebu Doctors' University Hospital",
    doctor: "Dr. Juan Dela Cruz, MD",
    distance: "3.1 km",
    status: "Open now",
    isOpen: true,
    latitude: 10.3152,
    longitude: 123.8897,
    phone: "0987654321",
    specialty: "General Cardiology",
  },
  {
    id: "3",
    name: "Perpetual Succour Hospital",
    doctor: "Dr. Anna Reyes, MD",
    distance: "4.5 km",
    status: "Closed",
    isOpen: false,
    latitude: 10.3188,
    longitude: 123.8966,
    phone: "1122334455",
    specialty: "Cardiac Rehabilitation",
  },
];

const INITIAL_REGION = {
  latitude: 10.3157,
  longitude: 123.8854,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Clinic Card ──────────────────────────────────────────────────────────────

function ClinicCard({ clinic, onDirections, onCall }: {
  clinic: Clinic;
  onDirections: () => void;
  onCall: () => void;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200/70 p-4">
      {/* Top row */}
      <View className="flex-row items-start mb-3">
        {/* Icon */}
        <View className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 items-center justify-center mr-3 flex-shrink-0">
          <MaterialCommunityIcons name="heart-pulse" size={18} color="#a32d2d" />
        </View>

        <View className="flex-1">
          <Text className="text-[14px] font-medium text-slate-900 leading-snug mb-0.5">
            {clinic.name}
          </Text>
          <Text className="text-[12px] text-slate-400">{clinic.doctor}</Text>
        </View>
      </View>

      {/* Meta row — distance + specialty on left, status on right, wrapped */}
      <View className="flex-row items-center justify-between mb-3 gap-2">
        {/* Left: distance + specialty chips */}
        <View className="flex-row items-center gap-2 flex-shrink flex-wrap">
          <View className="flex-row items-center gap-1 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg">
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="#94a3b8" />
            <Text className="text-[11px] text-slate-500">{clinic.distance}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg">
            <MaterialCommunityIcons name="stethoscope" size={12} color="#94a3b8" />
            <Text className="text-[11px] text-slate-500" numberOfLines={1}>{clinic.specialty}</Text>
          </View>
        </View>

        {/* Right: status — flex-shrink-0 so it never wraps or clips */}
        <View
          className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg border flex-shrink-0"
          style={{
            backgroundColor: clinic.isOpen ? "#eaf3de" : "#f8fafc",
            borderColor: clinic.isOpen ? "#c0dd97" : "#e2e8f0",
          }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: clinic.isOpen ? "#639922" : "#cbd5e1" }}
          />
          <Text
            className="text-[11px] font-medium"
            style={{ color: clinic.isOpen ? "#3b6d11" : "#94a3b8" }}
          >
            {clinic.status}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-slate-100 mb-3" />

      {/* Action buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDirections}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200/70 bg-slate-50 gap-1.5"
        >
          <Feather name="navigation" size={14} color="#475569" />
          <Text className="text-[13px] font-medium text-slate-600">Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onCall}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Feather name="phone-call" size={14} color="#fff" />
          <Text className="text-[13px] font-medium text-white">Call clinic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LocatorScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  const filtered = searchQuery.trim()
    ? CLINICS.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CLINICS;

  const handleGetDirections = (lat: number, lng: number, name: string) => {
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${name}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${name})`,
    });
    if (url) {
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`)
      );
    }
  };

  const handleCallClinic = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch((err) =>
      console.error("Error opening dialer:", err)
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-200/50">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[16px] font-medium text-slate-900" numberOfLines={1}>
              Emergency Locator
            </Text>
            <Text className="text-[12px] text-slate-400">Nearby Cardiovascular Centers</Text>
          </View>
          <View className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 items-center justify-center">
            <MaterialCommunityIcons name="heart-pulse" size={18} color="#a32d2d" />
          </View>
        </View>

        {/* Alert Banner */}
        <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 gap-2.5">
          <Feather name="alert-triangle" size={16} color="#dc2626" />
          <Text className="flex-1 text-[13px] font-medium text-red-700 leading-snug">
            Critical CSS Score: Immediate medical consultation recommended.
          </Text>
        </View>
      </View>

      {/* ── Map ── */}
      <View style={{ height: "35%" }} className="bg-slate-100 relative">
        <MapView
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={{ width: "100%", height: "100%" }}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {CLINICS.map((clinic) => (
            <Marker
              key={clinic.id}
              coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
              onPress={() => setSelectedClinic(clinic)}
            >
              <View className="items-center">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center border-2"
                  style={{
                    backgroundColor: "#fff",
                    borderColor: clinic.isOpen ? "#c0dd97" : "#e2e8f0",
                  }}
                >
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={16}
                    color={clinic.isOpen ? "#a32d2d" : "#94a3b8"}
                  />
                </View>
                {/* Pointer tail */}
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 6,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#fff",
                    marginTop: -1,
                  }}
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Selected Clinic Modal (Bottom Sheet over Map) */}
        {selectedClinic && (
          <View className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg shadow-black/20 p-1">
             <View className="flex-row justify-end mb-1">
                <TouchableOpacity onPress={() => setSelectedClinic(null)} className="p-2">
                   <Feather name="x" size={16} color="#94a3b8" />
                </TouchableOpacity>
             </View>
             <ClinicCard
                clinic={selectedClinic}
                onDirections={() => handleGetDirections(selectedClinic.latitude, selectedClinic.longitude, selectedClinic.name)}
                onCall={() => handleCallClinic(selectedClinic.phone)}
             />
          </View>
        )}

        {/* Map overlay — open count pill */}
        <View
          className="absolute top-3 right-3 flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border"
          style={{ backgroundColor: "rgba(255,255,255,0.92)", borderColor: "#e2e8f0", display: selectedClinic ? 'none' : 'flex' }}
        >
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-[11px] font-medium text-slate-700">
            {CLINICS.filter((c) => c.isOpen).length} open nearby
          </Text>
        </View>
      </View>

      {/* ── Clinic list ── */}
      <View className="flex-1">
        {/* List header */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-slate-200/50 bg-white">
          <Text className="text-[13px] font-medium text-slate-900">
            Nearby specialists
          </Text>
          <Text className="text-[12px] text-slate-400">
            {filtered.length} found
          </Text>
        </View>

        <ScrollView
          contentContainerClassName="p-5 gap-3"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View className="items-center pt-12">
              <View className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/70 items-center justify-center mb-3">
                <Feather name="search" size={22} color="#cbd5e1" />
              </View>
              <Text className="text-[15px] font-medium text-slate-900 mb-1">
                No results found
              </Text>
              <Text className="text-[13px] text-slate-400 text-center">
                Try a different name or specialty.
              </Text>
            </View>
          ) : (
            filtered.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
                onDirections={() =>
                  handleGetDirections(clinic.latitude, clinic.longitude, clinic.name)
                }
                onCall={() => handleCallClinic(clinic.phone)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}