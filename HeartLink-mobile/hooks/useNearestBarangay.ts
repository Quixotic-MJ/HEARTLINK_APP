import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { apiFetch } from "../lib/api";
import { Point } from "../services/clinics";
import { Barangay, nearestBarangay, toBarangays } from "../services/barangays";

// HL-171 (panel revision): the nearest barangay, worked out on the phone. The location is only used here; it is never
// sent to HeartLink. "off" = no location permission (askAgain asks again, or opens the phone's settings).

export type NearestStatus = "loading" | "off" | "found" | "none" | "error";

async function getBarangays(): Promise<unknown> {
  const res = await apiFetch("/api/barangays", { auth: false });
  if (!res.ok) throw new Error("Couldn't load barangays");
  return res.json();
}

export function useNearestBarangay() {
  const [you, setYou] = useState<Point | null>(null);
  const [locationOff, setLocationOff] = useState(false);
  const [locating, setLocating] = useState(true);

  const locate = useCallback(async (ask: boolean) => {
    setLocating(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let granted = current.status === "granted";
      if (!granted && ask) {
        if (current.canAskAgain === false) {
          Linking.openSettings().catch(() => {});
        } else {
          granted = (await Location.requestForegroundPermissionsAsync()).status === "granted";
        }
      }
      // Opening the screen never pops up the permission prompt; only the "Turn on location" button asks
      if (!granted) {
        setLocationOff(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setYou({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setLocationOff(false);
    } catch {
      setLocationOff(true);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    locate(false);
  }, [locate]);

  const query = useQuery({ queryKey: ["barangays"], queryFn: getBarangays, staleTime: 60 * 60 * 1000 });
  const list: Barangay[] = useMemo(() => toBarangays(query.data), [query.data]);
  const nearest = useMemo(() => (you ? nearestBarangay(list, you) : null), [list, you]);

  let status: NearestStatus;
  if (locating && !you) status = "loading";
  else if (locationOff && !you) status = "off";
  else if (query.isPending) status = "loading";
  else if (query.isError) status = "error";
  else status = nearest ? "found" : "none";

  return { status, nearest, askAgain: () => locate(true), retry: () => query.refetch() };
}
