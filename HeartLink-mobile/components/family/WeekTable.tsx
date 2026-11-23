import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDs } from "../onboarding/useDs";
import { BP_LEGEND, BP_WORDS, BpCategory, WeekDay, weekDayLabel } from "../../services/family";

// HL-161: the last 7 days for a family member, newest first: each day's highest blood pressure in plain words, and the
// pulse. Only what the patient logged; never a diagnosis. HL-167: the medicine column was removed with the question.

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

function rowLabel(d: WeekDay, now: Date): string {
  const day = weekDayLabel(d.date, now);
  if (!d.logged) return `${day}: nothing logged.`;
  const bp = d.bp ? `blood pressure ${d.bp.systolic} over ${d.bp.diastolic}, ${BP_WORDS[d.bp.category].label}` : "no blood pressure";
  return `${day}: ${bp}; ${d.pulse ? `pulse ${d.pulse}` : "no pulse"}.`;
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
          <Text style={[head, { width: 72 }]}>Pulse</Text>
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
                <Text style={{ width: 72, fontSize: 13.5, color: d.pulse ? c.charcoal : c.steel, fontVariant: ["tabular-nums"] }}>
                  {d.pulse ? `${d.pulse} bpm` : "—"}
                </Text>
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
