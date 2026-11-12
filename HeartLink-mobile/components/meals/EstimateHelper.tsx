import React from "react";
import { Text, View } from "react-native";
import { useDs } from "../onboarding/useDs";
import { ChipGroup, ChoiceList } from "../onboarding/Controls";
import { InfoNote } from "../onboarding/QuestionLayout";
import { AmountStepper } from "../food/FoodBits";
import { DISHES, EXTRAS, EstimateExtra } from "../../constants/estimateFoods";
import { EstimateSelection, EstimateTotals, MAX_EXTRA, extraSodium, nutrientsFor } from "../../services/mealEstimate";
import { SODIUM_LIMIT_MG } from "../../services/dailyLimits";

// HL-157: "Help me estimate" on Meals › Estimate a meal: 1) the dish, 2) how much, 3) the hidden salt. The screen turns
// the choices into the meal's numbers (services/mealEstimate.ts); every value is cited in constants/estimateFoods.ts.

const OTHER = "other";
const mg = (n: number) => `${Math.round(n).toLocaleString("en-US")} mg`;

function StepTitle({ n, children }: { n: number; children: string }) {
  const { c } = useDs();
  return (
    <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginBottom: 10 }}>
      {`${n}. ${children}`}
    </Text>
  );
}

function ExtraRow({ extra, count, onChange, last }: { extra: EstimateExtra; count: number; onChange: (n: number) => void; last: boolean }) {
  const { c } = useDs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.hairlineSoft,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{extra.name}</Text>
        <Text style={{ fontSize: 13, color: c.slate, marginTop: 1 }}>{`${extra.unit.label}: about ${mg(extraSodium(extra))} sodium`}</Text>
      </View>
      <AmountStepper
        label={extra.name}
        value={count === 0 ? "None" : count === 1 ? extra.unit.label : `${count} × ${extra.unit.label}`}
        onLess={() => onChange(Math.max(0, count - 1))}
        onMore={() => onChange(Math.min(MAX_EXTRA, count + 1))}
      />
    </View>
  );
}

export function EstimateHelper({
  selection,
  totals,
  onChange,
}: {
  selection: EstimateSelection;
  totals: EstimateTotals;
  onChange: (next: EstimateSelection) => void;
}) {
  const { c } = useDs();
  const dish = DISHES.find((d) => d.id === selection.dishId);
  const dishOptions = [
    { value: OTHER, label: "Something else", desc: "Add anything salty below, then name the meal" },
    ...DISHES.map((d) => ({
      value: d.id,
      label: d.name,
      desc: `About ${mg(nutrientsFor(d.per100g, d.portions[0].grams).sodium)} sodium per ${d.portions[0].label.charAt(0).toLowerCase()}${d.portions[0].label.slice(1)}`,
    })),
  ];
  const overLimit = totals.sodium > SODIUM_LIMIT_MG;

  return (
    <View style={{ gap: 24 }}>
      <View>
        <StepTitle n={1}>What did you eat?</StepTitle>
        <ChoiceList
          accessibilityLabel="What did you eat?"
          value={selection.dishId ?? OTHER}
          onChange={(v) => onChange({ ...selection, dishId: v === OTHER ? null : v, portionIndex: v === OTHER ? 0 : Math.min(1, (DISHES.find((d) => d.id === v)?.portions.length ?? 1) - 1) })}
          options={dishOptions}
        />
      </View>

      {dish ? (
        <View>
          <StepTitle n={2}>How much?</StepTitle>
          <ChipGroup
            accessibilityLabel="How much did you eat?"
            options={dish.portions.map((p, i) => ({ value: String(i), label: p.label }))}
            selected={[String(selection.portionIndex)]}
            onToggle={(v) => onChange({ ...selection, portionIndex: Number(v) })}
          />
          <Text style={{ fontSize: 13, lineHeight: 18, color: c.steel, marginTop: 8 }}>
            A cup is about the size of your fist; a palm-sized piece of meat or fish is about 85 g.
          </Text>
        </View>
      ) : null}

      <View>
        <StepTitle n={dish ? 3 : 2}>Anything salty added?</StepTitle>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginBottom: 6 }}>
          Sauces, salt and processed meats are where most hidden salt comes from. Add what you used or ate.
        </Text>
        {(["Sauces and salt", "Processed meats"] as const).map((group) => {
          const items = EXTRAS.filter((e) => e.group === group);
          return (
            <View key={group} style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.steel }}>{group}</Text>
              {items.map((e, i) => (
                <ExtraRow
                  key={e.id}
                  extra={e}
                  count={selection.extras[e.id] ?? 0}
                  last={i === items.length - 1}
                  onChange={(n) => onChange({ ...selection, extras: { ...selection.extras, [e.id]: n } })}
                />
              ))}
            </View>
          );
        })}
      </View>

      {/* What the choices add up to */}
      <View
        accessibilityLiveRegion="polite"
        style={{ padding: 16, borderRadius: 12, backgroundColor: overLimit ? c.rose : c.surface, gap: 4 }}
      >
        <Text style={{ fontSize: 13, color: c.charcoal }}>Your estimate</Text>
        <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>{`About ${mg(totals.sodium)} sodium`}</Text>
        <Text style={{ fontSize: 14, color: c.charcoal }}>
          {`${totals.calories.toLocaleString("en-US")} kcal · daily sodium limit ${mg(SODIUM_LIMIT_MG)}`}
          {overLimit ? " · more than a whole day's limit" : ""}
        </Text>
      </View>

      <InfoNote
        icon="info"
        text="An estimate from USDA FoodData Central values (US foods and recipes), pending Dietitian review. Use a food label when you have one."
      />
    </View>
  );
}
