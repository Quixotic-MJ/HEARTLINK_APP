import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useDs } from "../onboarding/useDs";
import type { Pressure, TrendDay } from "../../services/trends";

const HEIGHT = 176;
const TOP = 20;
const BOTTOM = 150;
const LEFT = 36;
const RIGHT = 8;

type Band = { from: number; to: number; fill: string; label: string; labelColor: string };
type RefLine = { value: number; label: string; color: string; dashed?: boolean };

type Props = {
  days: TrendDay[];
  yMin: number;
  yMax: number;
  ticks: number[];
  accessibilityLabel: string;
  bands?: Band[];
  refLine?: RefLine;
  /** Axis labels to use instead of the dates, one per point (HL-086: "Oct" for a month). */
  labels?: string[];
} & (
  | {
      kind: "line";
      values: (number | null)[];
      /** Each day's lowest and highest, drawn as a light bar behind its point (heart score). */
      ranges?: ({ low: number; high: number } | null)[];
      /** The day picked by tapping (emphasised instead of the last one), and what a tap does. */
      selected?: number;
      onSelect?: (index: number) => void;
    }
  | { kind: "range"; values: (Pressure | null)[] }
  | { kind: "bars"; values: (number | null)[]; limit: number }
);

/** Which day labels fit: every day for a week, about five spread across longer periods (always the last). */
function labelled(i: number, n: number): boolean {
  if (n <= 7) return true;
  const every = n <= 14 ? 3 : 6;
  return i === n - 1 || (n - 1 - i) % every === 0;
}

function dayLabel(day: TrendDay, n: number): string {
  return n <= 7
    ? day.date.toLocaleDateString("en-US", { weekday: "short" })
    : day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * One chart for the Trends screen: a line (score, pulse), a bar per reading from the lower to the upper
 * number (blood pressure), or daily bars against a limit (sodium). Days with no value are left empty.
 */
export function TrendChart(props: Props) {
  const { c } = useDs();
  const [width, setWidth] = useState(0);
  const { days, yMin, yMax, ticks, bands, refLine } = props;
  const n = days.length;
  const plotW = Math.max(0, width - LEFT - RIGHT);
  const step = n ? plotW / n : 0;
  const x = (i: number) => LEFT + (i + 0.5) * step;
  const y = (v: number) => BOTTOM - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin || 1)) * (BOTTOM - TOP);
  const last = n - 1;

  const body = () => {
    if (props.kind === "line") {
      const segments: string[] = [];
      let current = "";
      props.values.forEach((v, i) => {
        if (v === null) {
          if (current) segments.push(current);
          current = "";
          return;
        }
        current += `${current ? " L" : "M"}${x(i)} ${y(v)}`;
      });
      if (current) segments.push(current);
      const r = n > 14 ? 3 : 4;
      const picked = props.selected ?? last;
      const barW = Math.min(8, Math.max(4, step * 0.5));
      return (
        <>
          {props.ranges?.map((g, i) =>
            g ? (
              <Rect key={`r${i}`} x={x(i) - barW / 2} y={y(g.high)} width={barW} height={Math.max(barW, y(g.low) - y(g.high))} rx={barW / 2} fill={c.line} opacity={0.28} />
            ) : null
          )}
          {segments.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={c.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {props.values.map((v, i) =>
            v === null ? null : (
              <Circle key={i} cx={x(i)} cy={y(v)} r={i === picked ? r + 2 : r} fill={i === picked ? c.primary : c.canvas} stroke={i === picked && props.onSelect ? c.canvas : c.primary} strokeWidth={2.5} />
            )
          )}
        </>
      );
    }
    if (props.kind === "range") {
      const w = Math.min(8, Math.max(3, step * 0.45));
      return props.values.map((v, i) =>
        v === null ? null : (
          <Line key={i} x1={x(i)} x2={x(i)} y1={y(v.sys)} y2={y(v.dia)} stroke={i === last ? c.primaryPressed : c.primary} strokeWidth={w} strokeLinecap="round" />
        )
      );
    }
    const w = Math.min(26, step * 0.6);
    const limit = props.limit;
    return props.values.map((v, i) =>
      v === null ? null : (
        <Rect key={i} x={x(i) - w / 2} y={y(v)} width={w} height={BOTTOM - y(v)} rx={Math.min(4, w / 3)} fill={v > limit ? c.warmText : c.line} />
      )
    );
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={props.accessibilityLabel}
      style={{ height: HEIGHT, width: "100%" }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {/* Score bands: a dashed line where each band starts and its name in the middle, not a filled block */}
          {bands?.map((b) => (
            <React.Fragment key={b.label}>
              {b.from > yMin ? <Line x1={LEFT} x2={width - RIGHT} y1={y(b.from)} y2={y(b.from)} stroke={c.hairlineStrong} strokeWidth={1} strokeDasharray="3 3" /> : null}
              {y(b.from) - y(b.to) >= 12 ? (
                <SvgText x={width - RIGHT - 2} y={(y(b.from) + y(b.to)) / 2 + 4} fontSize={10} fill={c.steel} textAnchor="end">
                  {b.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          ))}
          {ticks.map((t) => (
            <React.Fragment key={t}>
              <Line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} stroke={c.hairlineSoft} strokeWidth={1} />
              <SvgText x={0} y={y(t) + 4} fontSize={11} fill={c.slate}>
                {t.toLocaleString()}
              </SvgText>
            </React.Fragment>
          ))}
          <Line x1={LEFT} x2={width - RIGHT} y1={BOTTOM} y2={BOTTOM} stroke={c.hairline} strokeWidth={1} />
          {body()}
          {props.kind === "line" && props.onSelect
            ? days.map((d, i) => (
                <Rect key={`t${d.key}`} x={LEFT + i * step} y={TOP - 10} width={step} height={BOTTOM - TOP + 10} fill="transparent" onPress={() => props.onSelect?.(i)} />
              ))
            : null}
          {refLine ? (
            <>
              <Line
                x1={LEFT}
                x2={width - RIGHT}
                y1={y(refLine.value)}
                y2={y(refLine.value)}
                stroke={refLine.color}
                strokeWidth={1.5}
                strokeDasharray={refLine.dashed === false ? undefined : "5 4"}
              />
              <SvgText x={width - RIGHT - 2} y={y(refLine.value) - 6} fontSize={10} fill={c.ink} textAnchor="end">
                {refLine.label}
              </SvgText>
            </>
          ) : null}
          {days.map((d, i) =>
            labelled(i, n) ? (
              <SvgText
                key={d.key}
                x={x(i)}
                y={HEIGHT - 6}
                fontSize={11}
                fontWeight={i === last ? "600" : "400"}
                fill={i === last ? c.ink : c.slate}
                textAnchor="middle"
              >
                {props.labels?.[i] ?? dayLabel(d, n)}
              </SvgText>
            ) : null
          )}
        </Svg>
      ) : null}
    </View>
  );
}
