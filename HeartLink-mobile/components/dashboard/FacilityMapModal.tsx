import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Linking,
} from "react-native";
import MapView, { Marker, type Region, UrlTile } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

/**
 * FacilityMapModal — pure React Native port of the ViewOnMap web blueprint
 * for the "Find a Healthcare Facility" card.
 *
 * Blueprint mechanics preserved:
 * - Pill trigger -> expanded map (blueprint spring: stiffness 400,
 *   damping 30, mass 0.8; layoutId morph has no RN equivalent, so the panel
 *   springs up from a bottom sheet instead).
 * - Map loader until the map is ready, floating close button.
 * - iframe embed -> native MapView (react-native-maps) with tappable markers.
 *
 * Scope: Cebu area only — facilities beyond CEBU_RADIUS_KM of Cebu City
 * center are excluded, and the fallback region is Cebu City.
 */

export interface CebuFacility {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  distance: string;
  isOpen: boolean;
  status: string;
}

// Cebu City center (matches the locator default) + scope guard.
const CEBU_CENTER = { latitude: 10.3157, longitude: 123.8854 };
const CEBU_RADIUS_KM = 50;
const MAX_PINS = 8;

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function openDirections(lat: number, lng: number, name: string) {
  const destination = `${lat},${lng}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
    android: `google.navigation:q=${destination}`,
  });
  if (url) {
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`)
    );
  }
}

export function FacilityMapModal({
  visible,
  onClose,
  onOpenFull,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [facilities, setFacilities] = useState<CebuFacility[]>([]);
  const [userCoords, setUserCoords] = useState(CEBU_CENTER);
  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  // Panel motion uses RN Animated (Reanimated entering swallows touches
  // inside RN Modals). Blueprint spring: stiffness 400, damping 30, mass 0.8.
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        stiffness: 400,
        damping: 30,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get("window").height,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [slideAnim, backdropAnim]
  );

  // Load user location + Cebu-scoped facilities when the modal opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setMapReady(false);
    setSelectedId(null);

    (async () => {
      setIsLoading(true);
      try {
        let userLat = CEBU_CENTER.latitude;
        let userLon = CEBU_CENTER.longitude;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            userLat = loc.coords.latitude;
            userLon = loc.coords.longitude;
          }
        } catch {
          // Fall back to Cebu City center.
        }
        if (cancelled) return;
        setUserCoords({ latitude: userLat, longitude: userLon });

        const res = await fetch(`${base_url}/api/clinics`);
        const data = await res.json();
        if (cancelled) return;

        const currentHour = new Date().getHours();
        const processed: CebuFacility[] = (Array.isArray(data) ? data : [])
          .filter((c: any) => {
            const lat = Number(c.latitude);
            const lon = Number(c.longitude);
            if (isNaN(lat) || isNaN(lon)) return false;
            // Cebu scope guard.
            return getDistanceKm(CEBU_CENTER.latitude, CEBU_CENTER.longitude, lat, lon) <= CEBU_RADIUS_KM;
          })
          .map((c: any) => {
            const dist = getDistanceKm(userLat, userLon, Number(c.latitude), Number(c.longitude));
            const isHospital =
              c.name?.toLowerCase().includes("hospital") ||
              c.name?.toLowerCase().includes("institute") ||
              c.specialty?.toLowerCase().includes("emergency") ||
              c.operating_hours === "24/7";
            const isOpen = isHospital || !!c.operating_hours || (currentHour >= 8 && currentHour < 17);
            return {
              id: String(c.id ?? c.name),
              name: c.name || "Clinic",
              specialty: c.specialty || "General",
              phone: c.phone || "",
              latitude: Number(c.latitude),
              longitude: Number(c.longitude),
              distanceKm: dist,
              distance: `${dist.toFixed(1)} km`,
              isOpen,
              status: isHospital ? "24/7 Emergency" : isOpen ? "Open now" : "Closed",
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, MAX_PINS);

        setFacilities(processed);
        setSelectedId(processed[0]?.id ?? null);
      } catch {
        if (!cancelled) setFacilities([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const selected = facilities.find((f) => f.id === selectedId) ?? facilities[0];

  const focusFacility = (f: CebuFacility) => {
    Haptics.selectionAsync();
    setSelectedId(f.id);
    mapRef.current?.animateToRegion(
      { latitude: f.latitude, longitude: f.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      350
    );
  };

  const initialRegion: Region = {
    latitude: selected?.latitude ?? userCoords.latitude,
    longitude: selected?.longitude ?? userCoords.longitude,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={animateIn}
      onRequestClose={() => animateOut(onClose)}
    >
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.6)", opacity: backdropAnim, justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => animateOut(onClose)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          style={{
            width: "100%",
            maxHeight: "88%",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            backgroundColor: isDark ? "#1A2634" : "#FFFFFF",
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#E2E8E5",
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Map (blueprint expanded square) */}
          <View style={{ height: 300, backgroundColor: isDark ? "#0f172a" : "#E5E4EE", overflow: "hidden" }}>
            <MapView
              ref={mapRef}
              style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}
              mapType="none"
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton={false}
              onMapReady={() => setMapReady(true)}
            >
              <UrlTile
                urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
              />
              {facilities.map((f) => (
                <Marker
                  key={f.id}
                  coordinate={{ latitude: f.latitude, longitude: f.longitude }}
                  title={f.name}
                  description={`${f.distance} • ${f.status}`}
                  pinColor={f.id === selected?.id ? "#3b82f6" : "#475569"}
                  onPress={() => setSelectedId(f.id)}
                />
              ))}
            </MapView>

            {/* Loader until the map is ready (blueprint) */}
            {(!mapReady || isLoading) && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#0f172a" : "#E5E4EE",
                }}
              >
                <ActivityIndicator size="large" color="#E8532E" />
                <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "600", color: isDark ? "#94A3B8" : "#64748b" }}>
                  Finding nearby Cebu facilities…
                </Text>
              </View>
            )}

            {/* Close (blueprint) */}
            <TouchableOpacity
              onPress={() => animateOut(onClose)}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "#2A2A2D" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                  },
                  android: { elevation: 6 },
                }),
              }}
            >
              <Feather name="x" size={20} color={isDark ? "#fff" : "#85848B"} />
            </TouchableOpacity>

            {/* Cebu scope pill */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "rgba(15,23,42,0.65)",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Feather name="map-pin" size={12} color="#fff" />
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                Cebu City area
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: isDark ? "#94A3B8" : "#64748b", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Closest to you
            </Text>

            {selected ? (
              <View
                style={{
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      numberOfLines={2}
                      style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#fff" : "#0f172a", marginBottom: 4 }}
                    >
                      {selected.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: isDark ? "#94A3B8" : "#64748b" }}>
                      {selected.distance} • {selected.specialty}
                    </Text>
                  </View>
                  {selected.status.includes("24/7") && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: "rgba(34,197,94,0.15)",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>24/7</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openDirections(selected.latitude, selected.longitude, selected.name)}
                    style={{ flex: 1, borderRadius: 10, paddingVertical: 11, backgroundColor: "#3b82f6", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                  >
                    <Feather name="navigation" size={15} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={!selected.phone}
                    onPress={() => selected.phone && Linking.openURL(`tel:${selected.phone}`)}
                    style={{ flex: 1, borderRadius: 10, paddingVertical: 11, backgroundColor: isDark ? "#0f172a" : "#1e293b", opacity: selected.phone ? 1 : 0.5, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                  >
                    <Feather name="phone-call" size={15} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              !isLoading && (
                <Text style={{ textAlign: "center", fontSize: 13, color: isDark ? "#94A3B8" : "#64748b", paddingVertical: 8 }}>
                  No Cebu facilities found. Check your connection and try again.
                </Text>
              )
            )}

            {/* Nearby list */}
            {facilities.length > 1 && (
              <View style={{ gap: 8 }}>
                {facilities.filter(f => f.id !== selected?.id).slice(0, 3).map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    activeOpacity={0.75}
                    onPress={() => focusFacility(f)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#fff" : "#0f172a", marginBottom: 2 }}>
                        {f.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? "#94A3B8" : "#64748b" }}>
                        {f.distance} • {f.status}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={isDark ? "#94A3B8" : "#94a3b8"} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => animateOut(onOpenFull)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16, marginTop: 4 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#3b82f6" }}>
                Open full locator
              </Text>
              <Feather name="arrow-right" size={15} color="#3b82f6" />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
