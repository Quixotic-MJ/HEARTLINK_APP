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
import MapView, { Marker, UrlTile } from "react-native-maps";
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
  const isEmergency = clinic.status.includes("24/7");

  return (
    <View className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 mb-4 shadow-sm">
      {/* Top row */}
      <View className="flex-row items-start mb-4">
        {/* Icon */}
        <View 
          className="w-11 h-11 rounded-xl items-center justify-center mr-4 flex-shrink-0"
          style={{ backgroundColor: isEmergency ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.1)' }}
        >
          <MaterialCommunityIcons 
            name="hospital-building" 
            size={22} 
            color={isEmergency ? "#ef4444" : "#38bdf8"} 
          />
        </View>

        <View className="flex-1 pr-2">
          <Text className="text-[16px] font-bold text-slate-900 dark:text-white leading-snug mb-1">
            {clinic.name}
          </Text>
          <Text className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">{clinic.doctor}</Text>
        </View>
        
        {/* Status Badge */}
        {isEmergency ? (
          <Text className="text-[12px] font-bold text-green-500">24/7</Text>
        ) : (
          <Text className="text-[12px] font-bold text-slate-400">Business hrs</Text>
        )}
      </View>

      {/* Meta row with pills */}
      <View className="flex-row items-center mb-5 gap-2">
        <View className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <Text className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{clinic.distance}</Text>
        </View>
        <View className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <Text className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{clinic.specialty}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDirections}
          className="flex-1 flex-row items-center justify-center py-3.5 rounded-2xl bg-sky-400 dark:bg-sky-500 gap-2"
        >
          <Feather name="navigation" size={15} color="#ffffff" />
          <Text className="text-[15px] font-bold text-white">Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onCall}
          className="flex-1 flex-row items-center justify-center py-3.5 rounded-2xl bg-slate-900 dark:bg-slate-800 gap-2"
        >
          <Feather name="phone-call" size={15} color="#ffffff" />
          <Text className="text-[15px] font-bold text-white">Call</Text>
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
  const [userLocation, setUserLocation] = useState({ latitude: 10.3157, longitude: 123.8854 });
  const mapRef = React.useRef<MapView>(null);

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
          setUserLocation({ latitude: userLat, longitude: userLon });
        }

        // Fetch Clinics from Backend
        const base_url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${base_url}/api/clinics`);
        const data = await response.json();
        
        const currentHour = new Date().getHours();

        // Calculate distance and map data
        const processedClinics = data
          .filter((clinic: any) => {
            const lat = Number(clinic.latitude);
            const lon = Number(clinic.longitude);
            return !isNaN(lat) && !isNaN(lon);
          })
          .map((clinic: any) => {
            const lat = Number(clinic.latitude);
            const lon = Number(clinic.longitude);
            const dist = getDistance(userLat, userLon, lat, lon);
            
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
              id: clinic.id ? String(clinic.id) : clinic.name,
              doctor: clinic.doctor || "Medical Staff",
              specialty: clinic.specialty || "General",
              phone: clinic.phone || "",
              latitude: lat,
              longitude: lon,
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
    // The "dir/?api=1&destination=" format tells Google Maps to automatically calculate 
    // a route from the user's current location to the destination.
    const destination = `${lat},${lng}`;
    
    const url = Platform.select({
      // Apple Maps directions
      ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
      // Google Maps navigation intent
      android: `google.navigation:q=${destination}`,
    });

    if (url) {
      Linking.openURL(url).catch(() =>
        // Fallback to Google Maps web directions (works on all devices)
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`)
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
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center mr-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <Feather name="arrow-left" size={20} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1 ml-1">
            <Text className="text-[20px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>
              Emergency locator
            </Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Nearby cardiovascular centers</Text>
          </View>
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <MaterialCommunityIcons name="heart-pulse" size={20} color="#ef4444" />
          </View>
        </View>
        
        {locationError && (
          <View className="flex-row items-center bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900/50 rounded-2xl px-4 py-3 gap-3 mb-2">
            <Feather name="info" size={18} color="#f97316" />
            <Text className="flex-1 text-[13px] font-medium text-orange-800 dark:text-orange-200 leading-snug">
              {locationError}
            </Text>
          </View>
        )}
      </View>

      {/* ── Clinic list ── */}
      <View className="flex-1 px-5">
        {/* List header */}
        <View className="py-4 flex-row items-center justify-between">
          <Text className="text-[16px] font-bold text-slate-900 dark:text-white">
            Nearby specialists
          </Text>
          <Text className="text-[14px] font-bold text-sky-500">
            {filtered.length} found
          </Text>
        </View>

        <ScrollView
          contentContainerClassName="pb-10 pt-2 gap-4"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Feather name="search" size={26} color="#94a3b8" />}
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