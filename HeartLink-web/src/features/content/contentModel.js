export const AUDIENCES = [
  { value: "general_wellness", label: "General Heart Wellness" },
  { value: "hypertension_support", label: "Hypertension Support" },
];

export const STATUS_LABELS = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  in_review: "bg-blue-50 text-blue-700 border-blue-200",
  changes_requested: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-teal-50 text-teal-800 border-teal-200",
  archived: "bg-stone-100 text-stone-600 border-stone-200",
};

export const CONTENT_CONFIG = {
  recipe: {
    singular: "recipe",
    plural: "recipes",
    title: "Recipe lifecycle",
    eyebrow: "Professionally reviewed nutrition",
    description: "Draft, review, approve, and publish versioned recipes for General Heart Wellness and Hypertension Support.",
    endpoint: "/api/recipes",
    requiredExpert: "Dietitian",
  },
  exercise: {
    singular: "exercise",
    plural: "exercises",
    title: "Exercise lifecycle",
    eyebrow: "Professionally reviewed movement",
    description: "Draft, review, approve, and publish safe activity guidance without using a wellness score as medical clearance.",
    endpoint: "/api/exercises/",
    requiredExpert: "Physical Therapist",
  },
};

const lines = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split("\n").map((item) => item.trim()).filter(Boolean);
};

const evidence = (value) => (Array.isArray(value) ? value : []).map((item) => (
  typeof item === "string" ? { title: item, url: "" } : item
));

export function normalizeContent(type, raw) {
  if (type === "recipe") {
    return {
      ...raw,
      id: raw.id,
      name: raw.name || "Untitled recipe",
      imageUrl: raw.image_url || "",
      status: raw.status || "draft",
      contentVersion: Number(raw.content_version || 1),
      changeNotes: raw.change_notes || "",
      audiences: raw.intended_audiences || ["general_wellness"],
      prepTime: Number(raw.prep_time_minutes || 0),
      servings: Number(raw.servings || 1),
      servingDescription: raw.serving_description || "",
      yieldDescription: raw.yield_description || "",
      sodium: Number(raw.sodium_mg || 0),
      calories: Number(raw.calories || 0),
      satFat: Number(raw.saturated_fat_g || 0),
      cholesterol: Number(raw.cholesterol_mg || 0),
      fiber: Number(raw.fiber_g || 0),
      ingredients: raw.ingredients || [],
      steps: lines(raw.steps),
      evidenceSources: evidence(raw.evidence_sources),
      nutrientSource: raw.nutrient_source || "",
      nutrientSourceRecordId: raw.nutrient_source_record_id || "",
      nutritionTotals: raw.nutrition_totals || {},
      allergenNotes: raw.allergen_notes || "",
      contraindicationNotes: raw.contraindication_notes || "",
      requiresCardiologistReview: !!raw.requires_cardiologist_review,
    };
  }
  return {
    ...raw,
    id: raw.id,
    name: raw.name || "Untitled exercise",
    imageUrl: raw.media_url || "",
    status: raw.status || "draft",
    contentVersion: Number(raw.content_version || 1),
    changeNotes: raw.change_notes || "",
    audiences: raw.intended_audiences || ["general_wellness"],
    duration: Number(raw.duration_minutes || 0),
    steps: lines(raw.steps),
    equipment: lines(raw.equipment || raw.requirements),
    modifications: lines(raw.modifications),
    contraindications: lines(raw.contraindications),
    stopSymptoms: lines(raw.stop_symptoms),
    evidenceSources: evidence(raw.evidence_sources),
    frequencyGuidance: raw.frequency_guidance || "",
    progressionGuidance: raw.progression_guidance || "",
    clearanceRequired: !!raw.clearance_required,
    clearanceNotes: raw.clearance_notes || "",
    requiresCardiologistReview: !!raw.requires_cardiologist_review,
  };
}

export function errorMessage(error, fallback = "The request could not be completed.") {
  const detail = error?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) {
    const extras = detail.missing_fields || detail.blockers || [];
    return extras.length ? `${detail.message} ${extras.join(", ")}` : detail.message;
  }
  return fallback;
}

export function audienceLabel(values = []) {
  return AUDIENCES.filter((item) => values.includes(item.value)).map((item) => item.label).join(" · ") || "Audience not set";
}
