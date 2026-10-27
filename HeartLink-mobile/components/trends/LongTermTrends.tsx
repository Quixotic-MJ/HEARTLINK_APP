import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useDs } from "../onboarding/useDs";
import DsButton from "../onboarding/DsButton";
import { IconBadge, InfoNote, Tag } from "../onboarding/QuestionLayout";
import { Skeleton } from "../ui/Skeleton";
import { TrendChart } from "./TrendChart";
import { PremiumRequiredError } from "../../hooks/useHealthReport";
import { useLongTermTrends } from "../../hooks/useLongTermTrends";
import {
  LongTermBucket,
  LongTermDays,
  LongTermTrends as Data,
  bucketDays,
  bucketName,
  bucketPressure,
  monthCompareRows,
  patternBasis,
  spanName,
} from "../../services/longTermTrends";

// HL-086: the 90-day and 1-year Trends (Premium). Weekly or monthly averages for the chosen measure, this month
// against last, blood pressure by time of day, and pattern notes. Only what was logged; never a diagnosis.

export type LongTermMetric = "score" | "bp" | "pulse" | "sodium";

const PREMIUM_ROUTE = "/(home)/(settings)/premium";

export function LongTermTrends({ days, metric }: { days: LongTermDays; metric: LongTermMetric }) {
  const { c } = useDs();
  const query = useLongTermTrends(days);

  if (query.error instanceof PremiumRequiredError) return <PremiumPrompt />;
  if (query.isPending) {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton style={{ height: 300, borderRadius: 12 }} />
        <Skeleton style={{ height: 200, borderRadius: 12 }} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={{ padding: 20, borderRadius: 12, backgroundColor: c.surface, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{"Trends couldn't load"}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>Check your connection and try again.</Text>
        <DsButton label="Try again" variant="secondary" block={false} onPress={() => query.refetch()} />
      </View>
    );
  }

  const data = query.data;
  return (
    <View style={{ gap: 22 }}>
      <BucketCard data={data} metric={metric} />
      <MonthCompare data={data} />
      <TimeOfDayCard data={data} />
      <Patterns data={data} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>{data.disclaimer}</Text>
    </View>
  );
}

function PremiumPrompt() {
  const { c } = useDs();
  const router = useRouter();
  return (
    <View style={{ padding: 18, borderRadius: 12, backgroundColor: c.surface, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconBadge icon="chart-timeline-variant" tint="mint" size={40} />
        <View style={{ flex: 1 }}>
          <Tag label="Premium" tone="warm" />
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 6 }}>Trends over months</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
        See the last 90 days by week or the last year by month, this month against last, how your blood pressure
        changes through the day, and patterns in what you log.
      </Text>
      <DsButton label="See HeartLink Premium" onPress={() => router.push(PREMIUM_ROUTE as never)} />
    </View>
  );
}

const sectionTitle = (c: ReturnType<typeof useDs>["c"], text: string) => (
  <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
    {text}
  </Text>
);

function lastWith<T>(buckets: LongTermBucket[], pick: (b: LongTermBucket) => T | null): { bucket: LongTermBucket; value: T } | null {
  for (let i = buckets.length - 1; i >= 0; i--) {
    const value = pick(buckets[i]);
    if (value !== null) return { bucket: buckets[i], value };
  }
  return null;
}

/** The chosen measure as one point per week or month. */
function BucketCard({ data, metric }: { data: Data; metric: LongTermMetric }) {
  const { c } = useDs();
  const router = useRouter();
  const { buckets, bucket: kind } = data;
  const days = bucketDays(buckets);
  const labels = kind === "month" ? buckets.map((b) => b.label) : undefined;
  const per = kind === "week" ? "Weekly" : "Monthly";
  const unitName = kind === "week" ? "weeks" : "months";
  const span = spanName(data.days);
  const card = { borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 14 } as const;
  const logBp = "/(home)/(health)/log-symptoms";

  const empty = (title: string, body: string, action: string, route: string) => (
    <View style={{ ...card, alignItems: "center", paddingVertical: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: c.ink, textAlign: "center" }}>{title}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>{body}</Text>
      <DsButton label={action} block={false} onPress={() => router.push(route as never)} />
    </View>
  );

  const head = (value: string, unit: string, when: LongTermBucket) => (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontSize: 40, lineHeight: 46, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
        <Text style={{ fontSize: 14, color: c.slate, flexShrink: 1 }}>{unit}</Text>
      </View>
      <Text style={{ fontSize: 15, color: c.charcoal }}>{`Average for ${bucketName(when, kind)}`}</Text>
    </View>
  );

  const coverage = (count: number) => (
    <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
      {`${per} averages. ${count} of ${buckets.length} ${unitName} have something logged; the rest are left blank.`}
    </Text>
  );

  if (metric === "score") {
    const latest = lastWith(buckets, (b) => b.score);
    if (!latest) return empty(`No heart score in the last ${span}`, "Log your blood pressure and your score will show here.", "Log blood pressure", logBp);
    const values = buckets.map((b) => b.score);
    const present = values.filter((v): v is number => v !== null);
    const yMin = Math.max(0, Math.min(60, Math.floor((Math.min(...present) - 5) / 10) * 10));
    return (
      <View style={card}>
        {head(String(latest.value), "average score", latest.bucket)}
        <TrendChart
          kind="line"
          days={days}
          labels={labels}
          values={values}
          yMin={yMin}
          yMax={100}
          ticks={[yMin, 80, 100].filter((v, i, a) => a.indexOf(v) === i)}
          accessibilityLabel={`${per} average heart score over the last ${span}. Latest ${latest.value}.`}
        />
        {coverage(present.length)}
      </View>
    );
  }

  if (metric === "bp") {
    const values = bucketPressure(buckets);
    const latest = lastWith(buckets, (b) => (b.systolic && b.diastolic ? { sys: b.systolic, dia: b.diastolic } : null));
    if (!latest) return empty(`No blood pressure readings in the last ${span}`, "Log a reading and your trend will show here.", "Log blood pressure", logBp);
    return (
      <View style={card}>
        {head(`${latest.value.sys}/${latest.value.dia}`, "mmHg", latest.bucket)}
        <TrendChart
          kind="range"
          days={days}
          labels={labels}
          values={values}
          yMin={40}
          yMax={200}
          ticks={[60, 100, 140]}
          refLine={{ value: 180, label: "180: emergency level", color: c.danger }}
          accessibilityLabel={`${per} average blood pressure over the last ${span}. Latest ${latest.value.sys} over ${latest.value.dia}.`}
        />
        <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
          {`Each bar runs from the average lower number to the average upper number for that ${kind}.`}
        </Text>
      </View>
    );
  }

  if (metric === "pulse") {
    const values = buckets.map((b) => b.pulse);
    const latest = lastWith(buckets, (b) => b.pulse);
    if (!latest) return empty(`No pulse readings in the last ${span}`, "Add your pulse when you log your blood pressure, and your trend will show here.", "Log blood pressure", logBp);
    const present = values.filter((v): v is number => v !== null);
    return (
      <View style={card}>
        {head(String(latest.value), "bpm", latest.bucket)}
        <TrendChart
          kind="line"
          days={days}
          labels={labels}
          values={values}
          yMin={40}
          yMax={Math.max(120, Math.ceil((Math.max(...present) + 10) / 20) * 20)}
          ticks={[60, 100]}
          accessibilityLabel={`${per} average pulse over the last ${span}. Latest ${latest.value} beats per minute.`}
        />
        {coverage(present.length)}
      </View>
    );
  }

  const limit = data.sodium_limit_mg ?? 2000;
  const values = buckets.map((b) => b.sodium_mg);
  const latest = lastWith(buckets, (b) => b.sodium_mg);
  if (!latest) return empty(`No meals logged in the last ${span}`, "Log what you eat and your daily sodium will show here.", "Log a meal", "/(home)/(meals)/search-meal");
  const present = values.filter((v): v is number => v !== null);
  const yMax = Math.ceil((Math.max(limit * 1.25, ...present) * 1.05) / 500) * 500;
  const over = buckets.reduce((sum, b) => sum + b.days_over_limit, 0);
  const logged = buckets.reduce((sum, b) => sum + b.sodium_days, 0);
  return (
    <View style={card}>
      {head(latest.value.toLocaleString(), "mg a day", latest.bucket)}
      <TrendChart
        kind="bars"
        days={days}
        labels={labels}
        values={values}
        limit={limit}
        yMin={0}
        yMax={yMax}
        ticks={[0, yMax]}
        refLine={{ value: limit, label: `Your limit ${limit.toLocaleString()}`, color: c.ink }}
        accessibilityLabel={`${per} average sodium a day over the last ${span}, against your ${limit} milligram limit.`}
      />
      <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: -6 }}>
        {`Over your ${limit.toLocaleString()} mg limit on ${over} of the ${logged} ${logged === 1 ? "day" : "days"} with meals logged.`}
      </Text>
    </View>
  );
}

function MonthCompare({ data }: { data: Data }) {
  const { c } = useDs();
  const rows = monthCompareRows(data.month_compare);
  return (
    <View style={{ gap: 12 }}>
      {sectionTitle(c, "This month vs last")}
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: -4 }}>The last 30 days against the 30 days before.</Text>
      <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface }}>
          <Text style={{ flex: 1.3, fontSize: 12, color: c.steel }} />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: c.steel, textAlign: "right" }}>Last 30 days</Text>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: c.steel, textAlign: "right" }}>30 before</Text>
        </View>
        {rows.map((r) => (
          <View
            key={r.key}
            accessible
            accessibilityLabel={`${r.label}: ${r.now} in the last 30 days, ${r.before} in the 30 before. ${r.change}`}
            style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}
          >
            <View style={{ flex: 1.3, gap: 2 }}>
              <Text style={{ fontSize: 15, color: c.ink }}>{r.label}</Text>
              {r.change ? <Text style={{ fontSize: 12, color: c.slate }}>{r.change}</Text> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: c.ink, textAlign: "right", fontVariant: ["tabular-nums"] }}>{r.now}</Text>
            <Text style={{ flex: 1, fontSize: 15, color: c.slate, textAlign: "right", fontVariant: ["tabular-nums"] }}>{r.before}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TimeOfDayCard({ data }: { data: Data }) {
  const { c } = useDs();
  const any = data.time_of_day.some((t) => t.readings > 0);
  return (
    <View style={{ gap: 12 }}>
      {sectionTitle(c, "By time of day")}
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: -4 }}>
        {`Your average blood pressure over the last ${spanName(data.days)}, by when you measured it.`}
      </Text>
      {any ? (
        <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
          {data.time_of_day.map((t, i) => {
            const value = t.systolic && t.diastolic ? `${t.systolic}/${t.diastolic}` : "--";
            const count = t.readings === 0 ? "No readings" : `${t.readings} ${t.readings === 1 ? "reading" : "readings"}`;
            return (
              <View
                key={t.key}
                accessible
                accessibilityLabel={`${t.label}, ${t.hours}: ${value === "--" ? "no readings" : `average ${value}, ${count}`}`}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.hairlineSoft }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, color: c.ink }}>{t.label}</Text>
                  <Text style={{ fontSize: 12, color: c.slate }}>{t.hours}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
                  <Text style={{ fontSize: 12, color: c.slate }}>{count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <InfoNote icon="clock" text="Log your blood pressure at different times of day to see how it changes." />
      )}
    </View>
  );
}

function Patterns({ data }: { data: Data }) {
  const { c } = useDs();
  const tint = { sodium: c.peach, exercise: c.mint, medicines: c.lavender } as const;
  return (
    <View style={{ gap: 12 }}>
      {sectionTitle(c, "Worth noticing")}
      {data.patterns.length ? (
        data.patterns.map((p) => (
          <View key={p.key} accessible style={{ padding: 14, borderRadius: 12, backgroundColor: tint[p.key], gap: 6 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>{p.text}</Text>
            <Text style={{ fontSize: 12, color: c.charcoal }}>{patternBasis(p)}</Text>
          </View>
        ))
      ) : (
        <InfoNote
          icon="info"
          text={`Pattern notes need at least ${data.pattern_min_days} days on each side, for example ${data.pattern_min_days} days over your sodium limit and ${data.pattern_min_days} under it. Keep logging and they'll show here.`}
        />
      )}
    </View>
  );
}
