import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Save, Trash2, X } from "lucide-react";
import { AUDIENCES } from "../contentModel";

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500";

const blankIngredient = () => ({
  name: "", household_amount: "", household_unit: "", metric_amount: "", metric_unit: "",
  preparation: "", brand: "", nutrient_source: "", nutrient_source_record_id: "",
});
const blankEvidence = () => ({ title: "", url: "" });

const listText = (value) => (Array.isArray(value) ? value.join("\n") : value || "");
const toList = (value) => String(value || "").split("\n").map((entry) => entry.trim()).filter(Boolean);

function initialForm(type, item) {
  if (type === "recipe") {
    return {
      name: item?.name || "",
      category: item?.category || "Breakfast",
      mediaUrl: item?.image_url || item?.imageUrl || "",
      prepTimeMinutes: item?.prep_time_minutes ?? item?.prepTime ?? 15,
      difficulty: item?.difficulty || "Easy",
      servings: item?.servings || 1,
      yieldDescription: item?.yield_description || item?.yieldDescription || "",
      servingDescription: item?.serving_description || item?.servingDescription || "",
      heartBenefit: item?.heart_benefit || "",
      calories: item?.calories || "",
      sodium: item?.sodium_mg ?? item?.sodium ?? "",
      satFat: item?.saturated_fat_g ?? item?.satFat ?? "",
      cholesterol: item?.cholesterol_mg ?? item?.cholesterol ?? "",
      fiber: item?.fiber_g ?? item?.fiber ?? "",
      totalCalories: item?.nutrition_totals?.calories || "",
      totalSodium: item?.nutrition_totals?.sodium_mg || "",
      totalSatFat: item?.nutrition_totals?.saturated_fat_g || "",
      totalCholesterol: item?.nutrition_totals?.cholesterol_mg || "",
      totalFiber: item?.nutrition_totals?.fiber_g || "",
      nutrientSource: item?.nutrient_source || item?.nutrientSource || "",
      nutrientSourceRecordId: item?.nutrient_source_record_id || item?.nutrientSourceRecordId || "",
      nutrientCalculationNotes: item?.nutrient_calculation_notes || "",
      audiences: item?.intended_audiences || item?.audiences || ["general_wellness"],
      allergenNotes: item?.allergen_notes || item?.allergenNotes || "",
      contraindicationNotes: item?.contraindication_notes || item?.contraindicationNotes || "",
      ingredients: (item?.ingredients || []).map((ingredient) => ({
        ...blankIngredient(),
        ...ingredient,
        household_amount: ingredient.household_amount ?? ingredient.amount ?? "",
        household_unit: ingredient.household_unit ?? ingredient.unit ?? "",
      })),
      stepsText: listText(item?.steps),
      evidence: (item?.evidence_sources || item?.evidenceSources || []).map((source) => (
        typeof source === "string" ? { title: source, url: "" } : source
      )),
      changeNotes: item?.change_notes || item?.changeNotes || "",
      requiresCardiologistReview: !!(item?.requires_cardiologist_review || item?.requiresCardiologistReview),
    };
  }
  return {
    name: item?.name || "",
    description: item?.description || "",
    type: item?.type || "Walking",
    intensity: item?.intensity || "Low",
    duration: item?.duration_minutes ?? item?.duration ?? 15,
    calories: item?.calories || "",
    goal: item?.goal || "",
    mediaUrl: item?.media_url || item?.imageUrl || "",
    videoUrl: item?.video_url || "",
    audiences: item?.intended_audiences || item?.audiences || ["general_wellness"],
    frequencyGuidance: item?.frequency_guidance || item?.frequencyGuidance || "",
    progressionGuidance: item?.progression_guidance || item?.progressionGuidance || "",
    equipmentText: listText(item?.equipment || item?.requirements),
    stepsText: listText(item?.steps),
    modificationsText: listText(item?.modifications),
    contraindicationsText: listText(item?.contraindications),
    stopSymptomsText: listText(item?.stop_symptoms || item?.stopSymptoms),
    clearanceRequired: !!(item?.clearance_required || item?.clearanceRequired),
    clearanceNotes: item?.clearance_notes || item?.clearanceNotes || "",
    evidence: (item?.evidence_sources || item?.evidenceSources || []).map((source) => (
      typeof source === "string" ? { title: source, url: "" } : source
    )),
    changeNotes: item?.change_notes || item?.changeNotes || "",
    requiresCardiologistReview: !!(item?.requires_cardiologist_review || item?.requiresCardiologistReview),
  };
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>}
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-[12px] leading-5 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EvidenceEditor({ values, onChange }) {
  const rows = values.length ? values : [blankEvidence()];
  const update = (index, key, value) => {
    const next = [...rows];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };
  return (
    <div className="space-y-2.5">
      {rows.map((source, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input aria-label={`Evidence ${index + 1} title`} value={source.title || ""} onChange={(event) => update(index, "title", event.target.value)} className={inputClass} placeholder="Source title or organization" />
          <input aria-label={`Evidence ${index + 1} URL`} value={source.url || ""} onChange={(event) => update(index, "url", event.target.value)} className={inputClass} placeholder="https://…" />
          <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove evidence ${index + 1}`}><Trash2 size={15} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, blankEvidence()])} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-700"><Plus size={14} /> Add evidence source</button>
    </div>
  );
}

export default function ContentEditorModal({ open, type, item, onClose, onSave }) {
  const [form, setForm] = useState(() => initialForm(type, item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(() => `${item ? "Edit" : "Create"} ${type} draft`, [item, type]);
  if (!open) return null;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleAudience = (value) => set("audiences", form.audiences.includes(value)
    ? form.audiences.filter((entry) => entry !== value)
    : [...form.audiences, value]);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("A title is required.");
    if (item && !form.changeNotes.trim()) return setError("Describe what changed so reviewers can compare this version.");
    if (!form.audiences.length) return setError("Select at least one intended audience.");
    const evidenceSources = (form.evidence || []).filter((source) => source.title?.trim() || source.url?.trim());
    let payload;
    if (type === "recipe") {
      payload = {
        ...form,
        ingredients: form.ingredients.filter((ingredient) => ingredient.name?.trim()),
        steps: toList(form.stepsText),
        evidenceSources,
        intendedAudiences: form.audiences,
        nutritionTotals: {
          calories: Number(form.totalCalories || 0), sodium_mg: Number(form.totalSodium || 0),
          saturated_fat_g: Number(form.totalSatFat || 0), cholesterol_mg: Number(form.totalCholesterol || 0),
          fiber_g: Number(form.totalFiber || 0),
        },
      };
    } else {
      payload = {
        ...form,
        intendedAudiences: form.audiences,
        steps: toList(form.stepsText), equipment: toList(form.equipmentText),
        modifications: toList(form.modificationsText), contraindications: toList(form.contraindicationsText),
        stopSymptoms: toList(form.stopSymptomsText), evidenceSources,
      };
    }
    setSaving(true);
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError?.message || "Could not save this draft.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-700">Versioned content</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">Saving an edit creates a new draft version and invalidates approval on the previous version.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close editor"><X size={18} /></button>
        </div>

        <form onSubmit={save} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-medium text-rose-800"><AlertTriangle size={16} className="shrink-0" />{error}</div>}

          <Section title="Identity and audience" description="Audience is a care mode, not an HSS tier or medical diagnosis.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title"><input value={form.name} onChange={(event) => set("name", event.target.value)} className={inputClass} /></Field>
              {type === "recipe" ? (
                <Field label="Category"><select value={form.category} onChange={(event) => set("category", event.target.value)} className={inputClass}>{["Breakfast", "Lunch", "Dinner", "Snack"].map((value) => <option key={value}>{value}</option>)}</select></Field>
              ) : (
                <Field label="Activity type"><input value={form.type} onChange={(event) => set("type", event.target.value)} className={inputClass} placeholder="Walking, resistance, mobility…" /></Field>
              )}
              <div className="sm:col-span-2">
                <span className={labelClass}>Intended audience</span>
                <div className="grid gap-2 sm:grid-cols-2">{AUDIENCES.map((audience) => <label key={audience.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] font-semibold text-slate-700"><input type="checkbox" checked={form.audiences.includes(audience.value)} onChange={() => toggleAudience(audience.value)} className="h-4 w-4 accent-sky-600" />{audience.label}</label>)}</div>
              </div>
              <Field label="Image URL"><input value={form.mediaUrl} onChange={(event) => set("mediaUrl", event.target.value)} className={inputClass} placeholder="https://…" /></Field>
              {type === "exercise" && <Field label="Video URL"><input value={form.videoUrl} onChange={(event) => set("videoUrl", event.target.value)} className={inputClass} placeholder="https://…" /></Field>}
            </div>
          </Section>

          {type === "recipe" ? (
            <>
              <Section title="Yield and per-serving nutrition" description="Per-serving values must use the serving definition below. The 140 mg labeling threshold is not used as a universal meal allowance.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Preparation minutes"><input type="number" min="0" value={form.prepTimeMinutes} onChange={(event) => set("prepTimeMinutes", event.target.value)} className={inputClass} /></Field>
                  <Field label="Servings"><input type="number" min="1" value={form.servings} onChange={(event) => set("servings", event.target.value)} className={inputClass} /></Field>
                  <Field label="Yield description"><input value={form.yieldDescription} onChange={(event) => set("yieldDescription", event.target.value)} className={inputClass} placeholder="Makes 4 cups" /></Field>
                  <Field label="Serving description"><input value={form.servingDescription} onChange={(event) => set("servingDescription", event.target.value)} className={inputClass} placeholder="1 cup (240 g)" /></Field>
                  {[['calories','Calories'],['sodium','Sodium (mg)'],['satFat','Saturated fat (g)'],['cholesterol','Cholesterol (mg)'],['fiber','Fiber (g)']].map(([key, label]) => <Field key={key} label={`${label} / serving`}><input type="number" min="0" step="any" value={form[key]} onChange={(event) => set(key, event.target.value)} className={inputClass} /></Field>)}
                </div>
              </Section>
              <Section title="Total-recipe nutrition" description="Store recipe totals separately so per-serving values remain auditable.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['totalCalories','Calories'],['totalSodium','Sodium (mg)'],['totalSatFat','Saturated fat (g)'],['totalCholesterol','Cholesterol (mg)'],['totalFiber','Fiber (g)']].map(([key, label]) => <Field key={key} label={label}><input type="number" min="0" step="any" value={form[key]} onChange={(event) => set(key, event.target.value)} className={inputClass} /></Field>)}</div>
              </Section>
              <Section title="Ingredients" description="Each ingredient needs a household measure and metric mass or volume; note preparation state and brand when they affect nutrition.">
                <div className="space-y-3">{(form.ingredients.length ? form.ingredients : [blankIngredient()]).map((ingredient, index) => {
                  const rows = form.ingredients.length ? form.ingredients : [blankIngredient()];
                  const updateIngredient = (key, value) => { const next = [...rows]; next[index] = { ...next[index], [key]: value }; set("ingredients", next); };
                  return <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[12px] font-bold text-slate-700">Ingredient {index + 1}</span><button type="button" onClick={() => set("ingredients", rows.filter((_, rowIndex) => rowIndex !== index))} className="text-slate-400 hover:text-rose-700"><Trash2 size={15} /></button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input aria-label="Ingredient name" value={ingredient.name} onChange={(event) => updateIngredient("name", event.target.value)} className={`${inputClass} lg:col-span-2`} placeholder="Ingredient name" /><input aria-label="Household amount" value={ingredient.household_amount} onChange={(event) => updateIngredient("household_amount", event.target.value)} className={inputClass} placeholder="Household amount" /><input aria-label="Household unit" value={ingredient.household_unit} onChange={(event) => updateIngredient("household_unit", event.target.value)} className={inputClass} placeholder="cup, tbsp…" /><input aria-label="Metric amount" type="number" step="any" value={ingredient.metric_amount} onChange={(event) => updateIngredient("metric_amount", event.target.value)} className={inputClass} placeholder="Metric amount" /><input aria-label="Metric unit" value={ingredient.metric_unit} onChange={(event) => updateIngredient("metric_unit", event.target.value)} className={inputClass} placeholder="g or mL" /><input aria-label="Preparation state" value={ingredient.preparation} onChange={(event) => updateIngredient("preparation", event.target.value)} className={inputClass} placeholder="chopped, cooked…" /><input aria-label="Brand" value={ingredient.brand} onChange={(event) => updateIngredient("brand", event.target.value)} className={inputClass} placeholder="Brand (if relevant)" /></div></div>;
                })}</div>
                <button type="button" onClick={() => set("ingredients", [...form.ingredients, blankIngredient()])} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-700"><Plus size={14} /> Add ingredient</button>
              </Section>
              <Section title="Preparation and safety">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Preparation steps" hint="One step per line"><textarea rows="7" value={form.stepsText} onChange={(event) => set("stepsText", event.target.value)} className={inputClass} /></Field>
                  <div className="space-y-4"><Field label="Allergen statement"><textarea rows="3" value={form.allergenNotes} onChange={(event) => set("allergenNotes", event.target.value)} className={inputClass} placeholder="Use “None known” when applicable" /></Field><Field label="Contraindication notes"><textarea rows="3" value={form.contraindicationNotes} onChange={(event) => set("contraindicationNotes", event.target.value)} className={inputClass} placeholder="Use “None known” when applicable" /></Field></div>
                </div>
              </Section>
              <Section title="Nutrient provenance">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Primary nutrient source"><select value={form.nutrientSource} onChange={(event) => set("nutrientSource", event.target.value)} className={inputClass}><option value="">Select source</option><option>DOST-FNRI Philippine Food Composition Tables</option><option>USDA FoodData Central</option><option>Nutritionist-reviewed calculation</option></select></Field><Field label="Source record ID"><input value={form.nutrientSourceRecordId} onChange={(event) => set("nutrientSourceRecordId", event.target.value)} className={inputClass} /></Field><Field label="Calculation notes"><textarea rows="3" value={form.nutrientCalculationNotes} onChange={(event) => set("nutrientCalculationNotes", event.target.value)} className={inputClass} /></Field><Field label="Heart-health context"><textarea rows="3" value={form.heartBenefit} onChange={(event) => set("heartBenefit", event.target.value)} className={inputClass} placeholder="Use support language; do not diagnose or promise prevention." /></Field></div>
              </Section>
            </>
          ) : (
            <>
              <Section title="Routine prescription" description="Use duration, frequency, progression, and perceived intensity—not maximum-heart-rate formulas alone.">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Intensity"><select value={form.intensity} onChange={(event) => set("intensity", event.target.value)} className={inputClass}>{["None", "Low", "Moderate", "High"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Duration (minutes)"><input type="number" min="1" value={form.duration} onChange={(event) => set("duration", event.target.value)} className={inputClass} /></Field><Field label="Estimated calories"><input type="number" min="0" value={form.calories} onChange={(event) => set("calories", event.target.value)} className={inputClass} /></Field><Field label="Goal"><input value={form.goal} onChange={(event) => set("goal", event.target.value)} className={inputClass} /></Field><Field label="Description"><textarea rows="4" value={form.description} onChange={(event) => set("description", event.target.value)} className={inputClass} /></Field><Field label="Frequency guidance"><textarea rows="4" value={form.frequencyGuidance} onChange={(event) => set("frequencyGuidance", event.target.value)} className={inputClass} /></Field><Field label="Progression guidance"><textarea rows="4" value={form.progressionGuidance} onChange={(event) => set("progressionGuidance", event.target.value)} className={inputClass} /></Field><Field label="Equipment" hint="One item per line"><textarea rows="4" value={form.equipmentText} onChange={(event) => set("equipmentText", event.target.value)} className={inputClass} /></Field></div>
              </Section>
              <Section title="Instructions and safety" description="Stop symptoms and contraindications are displayed to the patient independently of any wellness score.">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Instructions" hint="One step per line"><textarea rows="7" value={form.stepsText} onChange={(event) => set("stepsText", event.target.value)} className={inputClass} /></Field><Field label="Modifications" hint="One option per line"><textarea rows="7" value={form.modificationsText} onChange={(event) => set("modificationsText", event.target.value)} className={inputClass} /></Field><Field label="Contraindications" hint="One condition per line"><textarea rows="6" value={form.contraindicationsText} onChange={(event) => set("contraindicationsText", event.target.value)} className={inputClass} /></Field><Field label="Stop-exercise symptoms" hint="One symptom per line"><textarea rows="6" value={form.stopSymptomsText} onChange={(event) => set("stopSymptomsText", event.target.value)} className={inputClass} /></Field><label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900"><input type="checkbox" checked={form.clearanceRequired} onChange={(event) => set("clearanceRequired", event.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-700" /><span><strong className="block">Medical clearance required</strong>Enable when unsupervised activity should not begin without clinician clearance.</span></label><Field label="Clearance guidance"><textarea rows="4" value={form.clearanceNotes} onChange={(event) => set("clearanceNotes", event.target.value)} className={inputClass} /></Field></div>
              </Section>
            </>
          )}

          <Section title="Evidence and review routing" description="Evidence references are checked by the assigned expert; a condition-specific claim also requires Cardiologist approval.">
            <EvidenceEditor values={form.evidence || []} onChange={(value) => set("evidence", value)} />
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700"><input type="checkbox" checked={form.requiresCardiologistReview} onChange={(event) => set("requiresCardiologistReview", event.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-600" /><span><strong className="block text-slate-900">Contains a hypertension-specific clinical claim or exception</strong>Route this exact version to a Cardiologist in addition to the primary content specialist.</span></label>
            <div className="mt-4"><Field label="Change notes" hint={item ? "Required for edits and shown in version history." : "Describe the scope of this initial draft."}><textarea rows="3" value={form.changeNotes} onChange={(event) => set("changeNotes", event.target.value)} className={inputClass} /></Field></div>
          </Section>
        </form>

        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-6"><p className="hidden text-[11px] text-slate-500 sm:block">Drafts are never available to patients.</p><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"><Save size={15} />{saving ? "Saving…" : "Save draft"}</button></div></div>
      </div>
    </div>
  );
}
