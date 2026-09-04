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
import * as Location from 'expo-location';
import { EmptyState } from "../components/ui/EmptyState";

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


// ─── Haversine Distance ───────────────────────────────────────────────────────
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

// ─── Clinic Card ──────────────────────────────────────────────────────────────

function ClinicCard({ clinic, onDirections, onCall }: {
  clinic: Clinic;
  onDirections: () => void;
  onCall: () => void;
}) {
  return (
    <View className="bg-white dark:bg-slate-900 dark:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-4 mb-3">
      {/* Top row */}
      <View className="flex-row items-start mb-3">
        {/* Icon */}
        <View className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 items-center justify-center mr-3 flex-shrink-0">
          <MaterialCommunityIcons name="heart-pulse" size={18} color="#a32d2d" />
        </View>

        <View className="flex-1">
          <Text className="text-[14px] font-medium text-slate-900 dark:text-white dark:text-slate-900 leading-snug mb-0.5">
            {clinic.name}
          </Text>
          <Text className="text-[12px] text-slate-400">{clinic.doctor}</Text>
        </View>
      </View>

      {/* Meta row */}
      <View className="flex-row items-center justify-between mb-3 gap-2">
        <View className="flex-row items-center gap-2 flex-shrink flex-wrap">
          <View className="flex-row items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-2.5 py-1 rounded-lg">
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="#94a3b8" />
            <Text className="text-[11px] text-slate-500 dark:text-slate-400">{clinic.distance}</Text>
          </View>
          <View className="flex-row items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 px-2.5 py-1 rounded-lg">
            <MaterialCommunityIcons name="stethoscope" size={12} color="#94a3b8" />
            <Text className="text-[11px] text-slate-500 dark:text-slate-400" numberOfLines={1}>{clinic.specialty}</Text>
          </View>
        </View>

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
      <View className="h-px bg-slate-100 dark:bg-slate-800 mb-3" />

      {/* Action buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDirections}
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-950 gap-1.5"
        >
          <Feather name="navigation" size={14} color="#475569" />
          <Text className="text-[13px] font-medium text-slate-600 dark:text-slate-300">Directions</Text>
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
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  
  React.useEffect(() => {
    (async () => {
      try {
        let userLat = 10.3157;
        let userLon = 123.8854;

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied. Showing default area.');
        } else {
          let location = await Location.getCurrentPositionAsync({});
          userLat = location.coords.latitude;
          userLon = location.coords.longitude;

        }

        // Fetch Clinics from Backend
        const base_url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${base_url}/api/clinics`);
        const data = await response.json();
        
        const currentHour = new Date().getHours();

        // Calculate distance and map data
        const processedClinics = data.map((clinic: any) => {
          const dist = getDistance(userLat, userLon, clinic.latitude, clinic.longitude);
          
          // Major medical institutes & hospital emergency departments operate 24/7
          const isHospitalOrEmergency = 
            clinic.name?.toLowerCase().includes("hospital") || 
            clinic.name?.toLowerCase().includes("institute") ||
            clinic.specialty?.toLowerCase().includes("emergency") ||
            clinic.operating_hours === "24/7";

          let isOpen = true;
          let statusText = "Open now";

          if (isHospitalOrEmergency) {
            isOpen = true;
            statusText = "24/7 Emergency";
          } else if (clinic.operating_hours) {
            statusText = clinic.operating_hours;
            isOpen = true;
          } else {
            // Standard daytime clinic hours (8:00 AM - 5:00 PM)
            isOpen = currentHour >= 8 && currentHour < 17;
            statusText = isOpen ? "Open now" : "Closed";
          }

          return {
            ...clinic,
            distance: dist.toFixed(1) + " km",
            isOpen: isOpen,
            status: statusText
          };
        });

        // Sort by closest distance
        processedClinics.sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));
        
        setClinics(processedClinics);
        setIsLoading(false);

      } catch (error) {
        console.log(error);
        setLocationError('Could not fetch location or clinics.');
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = searchQuery.trim()
    ? clinics.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clinics;


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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-3 bg-white dark:bg-slate-900 dark:bg-slate-100 border-b border-slate-200 dark:border-slate-800/50">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/70 items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[16px] font-medium text-slate-900 dark:text-white dark:text-slate-900" numberOfLines={1}>
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
            Critical HSS Score: Immediate medical consultation recommended.
          </Text>
        </View>
        {locationError && (
          <View className="flex-row items-center bg-orange-50 border border-orange-200 rounded-xl px-3.5 py-2.5 gap-2.5 mt-2">
            <Feather name="info" size={16} color="#c2410c" />
            <Text className="flex-1 text-[13px] font-medium text-orange-700 leading-snug">
              {locationError}
            </Text>
          </View>
        )}
      </View>

      
      {/* ── Clinic list ── */}
      <View className="flex-1">
        {/* List header */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900 dark:bg-slate-100">
          <Text className="text-[13px] font-medium text-slate-900 dark:text-white dark:text-slate-900">
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
            <EmptyState
              icon={<Feather name="search" size={26} color="#cbd5e1" />}
              title="No results found"
              subtitle="Try a different name or specialty."
              className="pt-12"
            />
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