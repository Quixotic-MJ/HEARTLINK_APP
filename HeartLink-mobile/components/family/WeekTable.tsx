import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../onboarding/useDs";
import { BP_LEGEND, BP_WORDS, BpCategory, medicineMark, WeekDay, weekDayLabel } from "../../services/family";

// HL-161: the last 7 days for a family member, newest first: each day's highest blood pressure in plain words, and the
// medicine answer. Only what the patient logged; never a diagnosis.

export function BpChip({ category }: { category: BpCategory }) {
  const { c } = useDs();
  const words = BP_WORDS[category];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: c[words.tone],
      }}
    >
      {words.urgent ? <Feather name="alert-triangle" size={12} color={c.danger} /> : null}
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.charcoal }}>{words.label}</Text>
    </View>
  );
}

function MedicineCell({ taken }: { taken: boolean | null }) {
  const { c } = useDs();
  const icon = taken === true ? "check" : taken === false ? "x" : "minus";
  const color = taken === true ? c.success : taken === false ? c.danger : c.muted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Feather name={icon} size={14} color={color} />
      <Text style={{ fontSize: 13.5, color: taken === null ? c.steel : c.charcoal }}>{medicineMark(taken)}</Text>
    </View>
  );
}

function rowLabel(d: WeekDay, now: Date): string {
  const day = weekDayLabel(d.date, now);
  if (!d.logged) return `${day}: nothing logged.`;
  const bp = d.bp ? `blood pressure ${d.bp.systolic} over ${d.bp.diastolic}, ${BP_WORDS[d.bp.category].label}` : "no blood pressure";
  return `${day}: ${bp}; medicine ${medicineMark(d.medicine).toLowerCase()}.`;
}

export function WeekTable({ days, now = new Date() }: { days: WeekDay[]; now?: Date }) {
  const { c } = useDs();
  const head = { fontSize: 12.5, fontWeight: "600" as const, color: c.slate };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
        <View
          style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.surface, gap: 8 }}
          aria-hidden
        >
          <Text style={[head, { width: 92 }]}>Day</Text>
          <Text style={[head, { flex: 1 }]}>Blood pressure</Text>
          <Text style={[head, { width: 104 }]}>Medicine</Text>
        </View>
        {days.map((d, i) => (
          <View
            key={d.date}
            accessible
            accessibilityLabel={rowLabel(d, now)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
              minHeight: 52,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: c.hairline,
            }}
          >
            <Text style={{ width: 92, fontSize: 13.5, fontWeight: "500", color: c.ink }}>{weekDayLabel(d.date, now)}</Text>
            {d.logged ? (
              <>
                <View style={{ flex: 1, gap: 4 }}>
                  {d.bp ? (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
                        {`${d.bp.systolic}/${d.bp.diastolic}`}
                      </Text>
                      <BpChip category={d.bp.category} />
                    </>
                  ) : (
                    <Text style={{ fontSize: 13.5, color: c.steel }}>No reading</Text>
                  )}
                </View>
                <View style={{ width: 104 }}>
                  <MedicineCell taken={d.medicine} />
                </View>
              </>
            ) : (
              <Text style={{ flex: 1, fontSize: 13.5, color: c.steel }}>Nothing logged</Text>
            )}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.slate }}>
        {`${BP_LEGEND} When a day has more than one reading, the highest is shown.`}
      </Text>
    </View>
  );
}
