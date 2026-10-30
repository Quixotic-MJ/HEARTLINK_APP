import React, { useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { periodDays, pressureByDay, type VitalsRow } from "../../services/trends";

const HEIGHT = 140;
const TOP = 10;
const PLOT = 110;
const MIN = 50;
const MAX = 190;

/**
 * Blood pressure for the last 7 days: one point per day (the day's last reading), top and bottom number,
 * with dashed lines at 120 and 80. Days with no reading are left as gaps. Tap the card to open Trends.
 */
export function PressureWeek({ vitals, onAdd, onOpen }: { vitals: VitalsRow[]; onAdd: () => void; onOpen: () => void }) {
  const { c, isDark } = useDs();
  const [width, setWidth] = useState(0);
  const days = periodDays(7);
  const values = pressureByDay(days, vitals);
  const logged = values.filter(Boolean).length;
  const top = isDark ? "#60a5fa" : "#2563eb";
  const bottom = isDark ? "#1e40af" : "#93c5fd";

  const step = width > 24 ? (width - 24) / 6 : 0;
  const x = (i: number) => 12 + i * step;
  const y = (v: number) => TOP + ((MAX - Math.min(MAX, Math.max(MIN, v))) / (MAX - MIN)) * PLOT;
  // Lines only join neighbouring days that both have a reading
  const segments = (pick: "sys" | "dia") =>
    values.flatMap((v, i) => {
      const n = values[i + 1];
      return v && n ? [`${x(i)},${y(v[pick])} ${x(i + 1)},${y(n[pick])}`] : [];
    });
  const label = (i: number) => (i === 6 ? "Today" : days[i].date.toLocaleDateString("en-US", { weekday: "short" }));
  const summary = values
    .map((v, i) => (v ? `${label(i)} ${v.sys}/${v.dia}` : null))
    .filter(Boolean)
    .join(", ");

  return (
    <AnimatedButton
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={logged ? `Blood pressure, last 7 days: ${summary}. Opens Trends.` : "Blood pressure, last 7 days: nothing logged. Opens Trends."}
      style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 14, backgroundColor: c.canvas, padding: 16, gap: 10 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>Blood pressure</Text>
          <Text style={{ fontSize: 13, color: c.steel }}>Last 7 days</Text>
        </View>
        <AnimatedButton
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Log blood pressure"
          style={{ width: 44, height: 44, marginTop: -10, marginRight: -12, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="plus" size={22} color={c.ink} />
        </AnimatedButton>
      </View>

      {logged === 0 ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, paddingVertical: 12 }}>
          Log your blood pressure each day to see your week here.
        </Text>
      ) : (
        <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
          {width > 0 ? (
            <Svg width={width} height={HEIGHT} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[120, 80].map((v) => (
                <React.Fragment key={v}>
                  <Line x1={0} y1={y(v)} x2={width} y2={y(v)} stroke={c.hairlineStrong} strokeDasharray="4 4" />
                  <SvgText x={width} y={y(v) - 4} fontSize={10} fill={c.steel} textAnchor="end">{String(v)}</SvgText>
                </React.Fragment>
              ))}
              {segments("sys").map((pts) => (
                <Polyline key={`s${pts}`} points={pts} fill="none" stroke={top} strokeWidth={2.5} />
              ))}
              {segments("dia").map((pts) => (
                <Polyline key={`d${pts}`} points={pts} fill="none" stroke={bottom} strokeWidth={2.5} />
              ))}
              {values.map((v, i) =>
                v ? (
                  <React.Fragment key={days[i].key}>
                    <Circle cx={x(i)} cy={y(v.sys)} r={i === 6 ? 4.5 : 3.5} fill={top} />
                    <Circle cx={x(i)} cy={y(v.dia)} r={i === 6 ? 4.5 : 3.5} fill={bottom} />
                  </React.Fragment>
                ) : null
              )}
              {days.map((d, i) => (
                <SvgText
                  key={d.key}
                  x={x(i)}
                  y={HEIGHT - 2}
                  fontSize={10.5}
                  fontWeight={i === 6 ? "700" : "400"}
                  fill={i === 6 ? c.ink : c.steel}
                  textAnchor="middle"
                >
                  {label(i)}
                </SvgText>
              ))}
            </Svg>
          ) : null}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 16 }}>
        {[
          { name: "Top number", color: top },
          { name: "Bottom number", color: bottom },
        ].map((k) => (
          <View key={k.name} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k.color }} />
            <Text style={{ fontSize: 13, color: c.slate }}>{k.name}</Text>
          </View>
        ))}
      </View>
    </AnimatedButton>
  );
}
