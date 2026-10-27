import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { apiFetch } from "../lib/api";
import { CEBU_CITY, Point, toClinics } from "../services/clinics";

// HL-078 / HL-088: the clinic directory, nearest emergency rooms first. Without location permission the list is
// ordered from Cebu City's centre and `locationDenied` says so.

async function getClinics(): Promise<unknown> {
  const res = await apiFetch("/api/clinics", { auth: false });
  if (!res.ok) throw new Error("Couldn't load clinics");
  return res.json();
}

export function useNearbyClinics(enabled = true) {
  const [you, setYou] = useState<Point | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setLocationDenied(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) setYou({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        if (!cancelled) setLocationDenied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const query = useQuery({ queryKey: ["clinics"], queryFn: getClinics, enabled, staleTime: 60 * 60 * 1000 });
  const clinics = useMemo(() => toClinics(query.data, you ?? CEBU_CITY), [query.data, you]);

  return { clinics, you, locationDenied, isPending: query.isPending, isError: query.isError, refetch: query.refetch };
}
