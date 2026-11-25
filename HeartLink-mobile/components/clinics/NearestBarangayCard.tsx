import React from "react";
import { Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { Skeleton } from "../ui/Skeleton";
import { useNearestBarangay } from "../../hooks/useNearestBarangay";
import { barangayTitle, callNumber, distanceLine } from "../../services/barangays";
import { openDirections } from "../../services/clinics";

/**
 * HL-171 (panel revision): the nearest barangay's emergency contacts, found by the phone's location and shown by
 * itself (not saved to the user's contacts). Call only shows for a number an admin has checked. Used in My care team
 * and the Emergency locator.
 */
export default function NearestBarangayCard() {
  const { c } = useDs();
  const { status, nearest, askAgain, retry } = useNearestBarangay();

  const note = (text: string) => <Text className="text-[13.5px] text-ds-slate leading-snug">{text}</Text>;

  return (
    <View
      accessibilityLabel="Nearest barangay"
      className="bg-ds-canvas border border-ds-hairline rounded-xl p-5"
      style={{ gap: 10 }}
    >
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View className="w-10 h-10 rounded-lg items-center justify-center" style={{ backgroundColor: c.sky }}>
          <MaterialCommunityIcons name="home-city-outline" size={20} color={c.charcoal} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-semibold text-ds-steel">Nearest barangay</Text>
          <Text className="text-[12.5px] text-ds-steel">Found by your location. It changes when you move.</Text>
        </View>
      </View>

      {status === "loading" ? (
        <View style={{ gap: 8 }}>
          <Skeleton style={{ height: 20, width: "60%", borderRadius: 6 }} />
          <Skeleton style={{ height: 44, borderRadius: 10 }} />
        </View>
      ) : status === "off" ? (
        <>
          {note("Turn on location to see your nearest barangay's emergency contacts.")}
          <DsButton
            label="Turn on location"
            variant="secondary"
            onPress={askAgain}
            icon={<Feather name="map-pin" size={15} color={c.ink} />}
            accessibilityHint="Asks your phone for permission to use your location"
          />
        </>
      ) : status === "error" ? (
        <>
          {note("Couldn't load barangay contacts. In an emergency, call 911.")}
          <DsButton label="Try again" variant="secondary" onPress={retry} />
        </>
      ) : status === "none" || !nearest ? (
        note("No barangay contacts for your area yet. In an emergency, call 911.")
      ) : (
        <>
          <View>
            <Text className="text-[18px] font-semibold text-ds-ink">{barangayTitle(nearest.barangay)}</Text>
            <Text className="text-[13.5px] text-ds-slate">{distanceLine(nearest.barangay, nearest.km)}</Text>
          </View>
          {nearest.barangay.phones.length === 0
            ? note("Number not added yet. In an emergency, call 911.")
            : null}
          <View style={{ gap: 8 }}>
            {nearest.barangay.phones.map((phone) => (
              <DsButton
                key={phone}
                label={`Call ${phone}`}
                onPress={() => callNumber(phone)}
                icon={<Feather name="phone" size={15} color="#FFFFFF" />}
                accessibilityHint={`Calls ${barangayTitle(nearest.barangay)}`}
              />
            ))}
            <DsButton
              label="Directions"
              variant="secondary"
              onPress={() => openDirections(nearest.barangay)}
              icon={<Feather name="navigation" size={15} color={c.ink} />}
              accessibilityHint="Opens your maps app"
            />
          </View>
        </>
      )}
    </View>
  );
}
