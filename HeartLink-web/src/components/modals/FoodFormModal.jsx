import { useEffect, useState } from "react";
import {
  X,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Archive,
  ArrowUp,
  ArrowDown,
  Ellipsis,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { apiUpload } from "../../api";
import CardiologistGuidance from "../care/CardiologistGuidance";

// HL-031: ingredient units are picked from a list instead of typed
const UNIT_GROUPS = [
  { label: "Weight", units: [["g", "g (grams)"], ["kg", "kg (kilograms)"]] },
  { label: "Volume", units: [["ml", "ml (millilitres)"], ["L", "L (litres)"], ["cup", "cup"], ["tbsp", "tbsp (tablespoon)"], ["tsp", "tsp (teaspoon)"]] },
  { label: "Count", units: [["pc", "pc (piece)"], ["slice", "slice"], ["clove", "clove"], ["stalk", "stalk"], ["can", "can"], ["pack", "pack"], ["serving", "serving"], ["pinch", "pinch"]] },
  { label: "Size", units: [["small", "small"], ["medium", "medium"], ["large", "large"]] },
];
const UNIT_VALUES = new Set(UNIT_GROUPS.flatMap((g) => g.units.map(([value]) => value)));
// Older recipes typed some units differently; these select the matching dropdown option.
const UNIT_ALIASES = {
  cups: "cup", cloves: "clove", stalks: "stalk", slices: "slice", pcs: "pc", piece: "pc", pieces: "pc",
  gram: "g", grams: "g", tablespoon: "tbsp", tablespoons: "tbsp", teaspoon: "tsp", teaspoons: "tsp",
  l: "L", liter: "L", litre: "L", cans: "can", packs: "pack", servings: "serving",
};
const normalizeUnit = (unit) => {
  const trimmed = (unit || "").trim();
  if (!trimmed || UNIT_VALUES.has(trimmed)) return trimmed;
  return UNIT_ALIASES[trimmed.toLowerCase()] || trimmed;
};

// The edit view's tabs, and which fields live on each, so a save that fails opens the right tab.
const TABS = [
  ["basics", "Basics"],
  ["nutrition", "Nutrition"],
  ["ingredients", "Ingredients & steps"],
  ["media", "Picture"],
];
const TAB_FIELDS = {
  basics: ["name", "foodSourceType", "category", "categoryOther", "hssTarget", "prepTimeMinutes", "servings", "difficulty", "heartBenefit"],
  nutrition: ["calories", "sodium", "satFat", "cholesterol", "fiber"],
  ingredients: ["ingredients", "steps"],
  media: ["mediaUrl"],
};

const parseIngredientString = (str) => {
  if (!str) return { name: "", amount: "", unit: "" };
  const match = str.trim().match(/^([0-9./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    let amtStr = match[1];
    let amount = parseFloat(amtStr);
    if (amtStr.includes("/")) {
      const parts = amtStr.split("/");
      if (parts.length === 2) {
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
    const unit = normalizeUnit(match[2]);
    const name = match[3] || "";
    if (!isNaN(amount) && name) {
      return { name, amount: String(amount), unit };
    }
  }
  return { name: str, amount: "", unit: "" };
};

const foodSchema = z.object({
  name: z.string().min(1, "Name is required."),
  foodSourceType: z.string().default("Home Recipe"),
  category: z.string().min(1, "Category is required."),
  categoryOther: z.string().max(40, "Keep it under 40 characters.").optional(),
  hssTarget: z.string().min(1, "HSS Tier is required."),
  prepTimeMinutes: z.coerce.number().min(0, "Cannot be negative").default(15),
  servings: z.coerce.number().min(1, "At least 1 serving").default(1),
  difficulty: z.string().default("Easy"),
  heartBenefit: z.string().optional(),
  calories: z.coerce.number().min(0, "Cannot be negative"),
  sodium: z.coerce.number().min(0, "Cannot be negative"),
  satFat: z.coerce.number().min(0, "Cannot be negative"),
  cholesterol: z.coerce.number().min(0, "Cannot be negative"),
  fiber: z.coerce.number().min(0, "Cannot be negative"),
  expertValidated: z.boolean().default(false),
  status: z.string().default("draft"),
  mediaUrl: z.string().optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Ingredient name is required."),
      amount: z.union([
        z.literal(""),
        z.coerce.number().min(0, "Amount cannot be negative")
      ]).nullable().optional(),
      unit: z.string().nullable().optional()
    })
  ).min(1, "At least one ingredient is required."),
  steps: z.array(
    z.object({
      value: z.string().min(1, "Step content is required.")
    })
  ).min(1, "At least one step is required."),
}).superRefine((data, ctx) => {
  // HL-030: "Others" needs a typed category name
  if (data.category === "Others" && !(data.categoryOther || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryOther"],
      message: "Type the category name.",
    });
  }
});

const FoodFormModal = ({ isOpen, onClose, recipe, isDietitian = false, onSave, onDelete }) => {
  // HL-037: a Dietitian's note when sending a recipe back for changes.
  const [reviewNote, setReviewNote] = useState("");
  // An existing recipe opens in the review view; a new one goes straight to editing.
  const [mode, setMode] = useState("review");
  const [tab, setTab] = useState("basics");
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  if ((isOpen ? recipe || "new" : null) !== noteFor) {
    setNoteFor(isOpen ? recipe || "new" : null);
    setReviewNote("");
    setMode(recipe ? "review" : "edit");
    setTab("basics");
    setMenuOpen(false);
  }
  // Normal or expanded size; remembered on this browser only.
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("hl-recipe-panel-expanded") === "1";
    } catch {
      return false;
    }
  });
  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem("hl-recipe-panel-expanded", next ? "1" : "0");
    } catch {
      // Storage blocked: the size just isn't remembered.
    }
  };
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      category: "Breakfast",
      categoryOther: "",
      hssTarget: "Stable (80-100)",
      foodSourceType: "Home Recipe",
      prepTimeMinutes: 15,
      servings: 1,
      difficulty: "Easy",
      heartBenefit: "",
      sodium: 0,
      calories: 0,
      satFat: 0,
      cholesterol: 0,
      fiber: 0,
      status: "draft",
      expertValidated: false,
      mediaUrl: "",
      ingredients: [{ name: "", amount: "", unit: "" }],
      steps: [{ value: "" }],
    },
    mode: "onTouched",
  });

  const { fields: ingredientsFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control,
    name: "ingredients",
  });

  const { fields: stepsFields, append: appendStep, remove: removeStep, swap: swapSteps } = useFieldArray({
    control,
    name: "steps",
  });

  const category = watch("category");
  const ingredientUnits = (watch("ingredients") || []).map((ing) => ing?.unit || "");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");

  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setImagePreviewError(false);
  }, [mediaUrl]);

  useEffect(() => {
    if (recipe) {
      // Map steps list
      let stepsList = [];
      if (recipe.steps && recipe.steps.length > 0) {
        stepsList = recipe.steps.map(s => ({ value: s }));
      } else if (recipe.instructions) {
        stepsList = recipe.instructions.split("\n").map(s => s.trim()).filter(Boolean).map(s => ({ value: s }));
      }
      if (stepsList.length === 0) {
        stepsList = [{ value: "" }];
      }

      // Map ingredients list
      let ingredientsList = [];
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        ingredientsList = recipe.ingredients.map(ing => {
          if (typeof ing === "string") {
            return parseIngredientString(ing);
          }
          return {
            name: ing.name || "",
            amount: ing.amount !== null && ing.amount !== undefined ? String(ing.amount) : "",
            unit: normalizeUnit(ing.unit)
          };
        });
      }
      if (ingredientsList.length === 0) {
        ingredientsList = [{ name: "", amount: "", unit: "" }];
      }

      reset({
        name: recipe.name || "",
        category: recipe.category || "Breakfast",
        categoryOther: recipe.categoryOther || "",
        hssTarget: recipe.hssTarget || "Stable (80-100)",
        foodSourceType: recipe.foodSourceType || "Home Recipe",
        prepTimeMinutes: recipe.prepTimeMinutes !== undefined ? recipe.prepTimeMinutes : 15,
        servings: recipe.servings !== undefined ? recipe.servings : 1,
        difficulty: recipe.difficulty || "Easy",
        heartBenefit: recipe.heartBenefit || "",
        sodium: recipe.sodium || 0,
        calories: recipe.calories || 0,
        satFat: recipe.satFat || 0,
        cholesterol: recipe.cholesterol || 0,
        fiber: recipe.fiber || 0,
        status: recipe.status || "draft",
        expertValidated: recipe.expertValidated || false,
        mediaUrl: recipe.mediaUrl || "",
        ingredients: ingredientsList,
        steps: stepsList,
      });
    } else {
      reset({
        name: "",
        category: "Breakfast",
      categoryOther: "",
        hssTarget: "Stable (80-100)",
        foodSourceType: "Home Recipe",
        prepTimeMinutes: 15,
        servings: 1,
        difficulty: "Easy",
        heartBenefit: "",
        sodium: 0,
        calories: 0,
        satFat: 0,
        cholesterol: 0,
        fiber: 0,
        status: "draft",
        expertValidated: false,
        mediaUrl: "",
        ingredients: [{ name: "", amount: "", unit: "" }],
        steps: [{ value: "" }],
      });
    }
  }, [recipe, isOpen, reset]);

  const onSubmit = (data) => {
    if (onSave) {
      const mappedIngredients = (data.ingredients || [])
        .filter(i => i.name && i.name.trim())
        .map(i => ({
          name: i.name.trim(),
          amount: i.amount !== "" && i.amount !== null && i.amount !== undefined ? Number(i.amount) : null,
          unit: i.unit ? i.unit.trim() : null
        }));

      const mappedSteps = (data.steps || [])
        .filter(s => s.value && s.value.trim())
        .map(s => s.value.trim());

      onSave({
        ...data,
        categoryOther: data.category === "Others" ? data.categoryOther.trim() : "",
        prepTimeMinutes: Number(data.prepTimeMinutes) || 15,
        servings: Number(data.servings) || 1,
        difficulty: data.difficulty || "Easy",
        heartBenefit: data.heartBenefit || "",
        ingredients: mappedIngredients,
        steps: mappedSteps,
      });
    }
    onClose();
  };

  // HL-037: a Dietitian approves, or sends it back with a note, and the recipe is saved straight away.
  const saveReview = (approved) => {
    setValue("expertValidated", approved);
    handleSubmit((data) => onSubmit({ ...data, expertValidated: approved, reviewNote: approved ? "" : reviewNote.trim() }), onInvalid)();
  };

  // A save that fails checks opens the edit view on the first tab with a problem.
  const onInvalid = (errs) => {
    setMode("edit");
    setTab(TABS.map(([id]) => id).find((id) => TAB_FIELDS[id].some((f) => errs[f])) || "basics");
  };

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus);
    handleSubmit((data) => onSubmit({ ...data, status: newStatus }), onInvalid)();
  };

  if (!isOpen) return null;

  // The review view reads the form, so it always shows what would be saved.
  const v = watch();
  const approved = !!recipe?.expertValidated;
  const sentBack = !approved && !!recipe?.reviewNote;
  const approvedOn = recipe?.reviewedAt
    ? new Date(recipe.reviewedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    : "";
  const ingredientRows = (v.ingredients || []).filter((i) => (i.name || "").trim());
  const stepRows = (v.steps || []).filter((s) => (s.value || "").trim());
  const tabsWithErrors = new Set(TABS.map(([id]) => id).filter((id) => TAB_FIELDS[id].some((f) => errors[f])));
  const statusChip = {
    published: "bg-ds-mint text-ds-charcoal",
    draft: "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold",
    archived: "bg-ds-surface-alt text-ds-charcoal",
  }[status] || "bg-ds-surface-alt text-ds-charcoal";
  const secondaryBtn = "h-11 px-4 rounded-[8px] border border-ds-hairline-strong bg-ds-canvas hover:bg-ds-surface text-[14px] font-medium text-ds-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";
  const primaryBtn = "h-11 px-[18px] rounded-[8px] bg-ds-primary hover:bg-ds-primary-pressed text-[14px] font-medium text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";
  const iconBtn = "w-9 h-9 flex items-center justify-center rounded-[8px] text-ds-slate hover:text-ds-ink hover:bg-ds-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line";
  const categoryLabel = v.category === "Others" ? v.categoryOther || "Others" : v.category;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-panel-title"
        className={`relative w-full ${expanded ? "max-w-[1280px] h-full" : "max-w-[920px] h-[min(900px,100%)]"} bg-ds-canvas border border-ds-hairline rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink`}
      >
        {/* Header: name, status chips, more actions, size, and the tabs while editing */}
        <div className={`px-6 pt-5 border-b border-ds-hairline shrink-0 ${mode === "edit" ? "" : "pb-4"}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-ds-slate">{!recipe ? "New recipe" : mode === "review" ? "Recipe" : "Editing recipe"}</p>
              <h3 id="recipe-panel-title" className="mt-0.5 text-[21px] leading-[1.3] font-semibold tracking-[-0.01em] truncate">
                {v.name || "Untitled recipe"}
              </h3>
              {recipe && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 rounded-[6px] text-[12px] font-semibold capitalize ${statusChip}`}>{status}</span>
                  <span className="px-2 py-0.5 rounded-[6px] text-[12px] font-semibold bg-ds-tint text-ds-on-tint">For {v.hssTarget}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[12px] font-semibold ${
                      approved ? "bg-ds-mint text-ds-charcoal" : "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold"
                    }`}
                  >
                    {approved ? "Dietitian approved" : sentBack ? "Sent back by the dietitian" : "Waiting for dietitian approval"}
                  </span>
                </div>
              )}
            </div>

            {recipe && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="More actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className={`${iconBtn} border border-ds-hairline`}
                >
                  <Ellipsis size={18} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-11 z-10 w-48 py-1 rounded-[8px] border border-ds-hairline bg-ds-canvas shadow-[0_16px_48px_-8px_rgba(15,15,15,0.16)]">
                    {status !== "archived" && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          handleSaveWithStatus("archived");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[14px] text-ds-ink hover:bg-ds-surface cursor-pointer"
                      >
                        <Archive size={15} className="text-ds-slate" /> Archive
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onClose();
                          onDelete(recipe);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[14px] text-ds-danger hover:bg-ds-rose cursor-pointer"
                      >
                        <Trash2 size={15} /> Delete recipe
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleExpanded}
              aria-label={expanded ? "Make the panel smaller" : "Make the panel bigger"}
              title={expanded ? "Smaller" : "Bigger"}
              className={`hidden md:flex ${iconBtn}`}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className={iconBtn}>
              <X size={18} />
            </button>
          </div>

          {mode === "edit" && (
            <div role="tablist" aria-label="Recipe sections" className="mt-4 flex gap-1 overflow-x-auto">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`h-11 px-3.5 text-[14px] border-b-2 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-line ${
                    tab === id ? "border-ds-ink font-semibold text-ds-ink" : "border-transparent font-medium text-ds-slate hover:text-ds-ink"
                  }`}
                >
                  {label}
                  {tabsWithErrors.has(id) && (
                    <>
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-ds-danger align-middle" aria-hidden="true" />
                      <span className="sr-only"> (needs fixing)</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "review" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {sentBack && (
              <div className="flex gap-2.5 px-3.5 py-3 rounded-xl bg-ds-yellow">
                <AlertCircle size={18} className="shrink-0 mt-px text-ds-warm-text" aria-hidden="true" />
                <p className="text-[14px] leading-normal text-ds-charcoal">
                  <span className="font-semibold">Dietitian's note:</span> {recipe.reviewNote}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-56 h-36 shrink-0 rounded-xl overflow-hidden bg-ds-surface border border-ds-hairline flex items-center justify-center">
                {v.mediaUrl && !imagePreviewError ? (
                  <img src={v.mediaUrl} alt="" className="w-full h-full object-cover" onError={() => setImagePreviewError(true)} />
                ) : (
                  <ImageIcon size={22} className="text-ds-steel" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <p className="text-[14px] text-ds-slate">
                  {categoryLabel}, {v.foodSourceType}
                </p>
                {v.heartBenefit ? (
                  <p className="text-[15px] leading-[1.55] text-ds-charcoal">{v.heartBenefit}</p>
                ) : (
                  <p className="text-[14px] text-ds-warm-text font-medium">No heart-health benefit written yet</p>
                )}
              </div>
            </div>

            <section>
              <h4 className="text-[16px] font-semibold mb-1">Preparation</h4>
              <p className="text-[13px] text-ds-slate mb-2.5">The dietitian checks that these fit the dish before approving.</p>
              <div className="grid grid-cols-3 gap-px bg-ds-hairline-soft border border-ds-hairline rounded-xl overflow-hidden">
                {[
                  ["Prep time", `${v.prepTimeMinutes} min`],
                  ["Difficulty", v.difficulty],
                  ["Servings", v.servings],
                ].map(([label, value]) => (
                  <div key={label} className="bg-ds-canvas px-3.5 py-3">
                    <p className="text-[12px] text-ds-slate">{label}</p>
                    <p className="mt-0.5 text-[16px] font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[16px] font-semibold mb-2.5">Nutrition per serving</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-ds-hairline-soft border border-ds-hairline rounded-xl overflow-hidden">
                {[
                  ["Calories", `${v.calories} kcal`],
                  ["Sodium", `${v.sodium} mg`],
                  ["Saturated fat", `${v.satFat} g`],
                  ["Cholesterol", `${v.cholesterol} mg`],
                  ["Fiber", `${v.fiber} g`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-ds-canvas px-3.5 py-3">
                    <p className="text-[12px] text-ds-slate">{label}</p>
                    <p className="mt-0.5 text-[16px] font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5">
              <section>
                <h4 className="text-[16px] font-semibold mb-2.5">Ingredients</h4>
                {ingredientRows.length ? (
                  <ul className="border border-ds-hairline rounded-xl divide-y divide-ds-hairline-soft">
                    {ingredientRows.map((ing, i) => (
                      <li key={i} className="flex gap-3 px-3.5 py-2.5 text-[14px]">
                        <span className="w-20 shrink-0 text-ds-slate">{[ing.amount, ing.unit].filter(Boolean).join(" ") || "To taste"}</span>
                        <span className="flex-1 min-w-0">{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px] text-ds-warm-text font-medium">No ingredients yet</p>
                )}
              </section>
              <section>
                <h4 className="text-[16px] font-semibold mb-2.5">Steps</h4>
                {stepRows.length ? (
                  <ol className="border border-ds-hairline rounded-xl divide-y divide-ds-hairline-soft">
                    {stepRows.map((s, i) => (
                      <li key={i} className="flex gap-3 px-3.5 py-3">
                        <span className="w-6 h-6 shrink-0 rounded-[6px] bg-ds-surface-alt text-[13px] font-semibold flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 min-w-0 text-[14px] leading-normal">{s.value}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[14px] text-ds-warm-text font-medium">No steps yet</p>
                )}
              </section>
            </div>

            {recipe && <CardiologistGuidance />}

            {isDietitian && recipe && (
              <section className="border border-ds-hairline rounded-xl px-4 py-3.5 space-y-2.5">
                <label htmlFor="review-note" className="block text-[14px] font-semibold text-ds-ink">
                  Send it back for changes <span className="font-normal text-ds-slate">(optional)</span>
                </label>
                <textarea
                  id="review-note"
                  rows="2"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Prep time is too short for this dish; please check the difficulty."
                  className="w-full px-3 py-2 text-[14px] bg-ds-canvas border border-ds-hairline-strong focus:border-ds-line rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel resize-none"
                />
                <div className="flex justify-end">
                  <button type="button" disabled={!reviewNote.trim()} onClick={() => saveReview(false)} className={secondaryBtn}>
                    Send back with note
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tab === "basics" && (
              <div className="space-y-4">
              <div className="col-span-1">
                <InputField
                  id="name"
                  label="Food / Meal Name"
                  placeholder="e.g. Low-Sodium Chicken Broth"
                  error={errors.name}
                  {...register("name")}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Food Source Type
                </label>
                <select
                  {...register("foodSourceType")}
                  className={`w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border ${
                    errors.foodSourceType ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                  } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
                >
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
                {errors.foodSourceType && <p className="text-[11px] text-ds-danger mt-1">{errors.foodSourceType.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Meal Category
                  </label>
                  <select
                    {...register("category")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border ${
                      errors.category ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                    } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                    <option value="Others">Others</option>
                  </select>
                  {errors.category && <p className="text-[11px] text-ds-danger mt-1">{errors.category.message}</p>}
                  {category === "Others" && (
                    <div className="mt-2">
                      <InputField
                        id="categoryOther"
                        label="Specify category *"
                        placeholder="e.g. Soup, Dessert"
                        maxLength={40}
                        error={errors.categoryOther}
                        {...register("categoryOther")}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    HSS Suitability
                  </label>
                  <select
                    {...register("hssTarget")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border ${
                      errors.hssTarget ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                    } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
                  >
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Moderate (60-79)">Moderate (60-79)</option>
                    <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                    <option value="Critical (<50)">Critical &lt;50</option>
                  </select>
                  {errors.hssTarget && <p className="text-[11px] text-ds-danger mt-1">{errors.hssTarget.message}</p>}
                </div>
              </div>

              {/* Prep & Metrics */}
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <InputField
                    id="prepTimeMinutes"
                    type="number"
                    label="Prep Time (mins)"
                    placeholder="15"
                    error={errors.prepTimeMinutes}
                    {...register("prepTimeMinutes")}
                  />
                </div>
                <div>
                  <InputField
                    id="servings"
                    type="number"
                    label="Servings"
                    placeholder="1"
                    error={errors.servings}
                    {...register("servings")}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Difficulty
                  </label>
                  <select
                    {...register("difficulty")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-ds-canvas border ${
                      errors.difficulty ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                    } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <InputField
                  id="heartBenefit"
                  label="Heart-Health Benefit (Optional)"
                  placeholder="e.g. Rich in soluble fiber, low in sodium for blood pressure stability."
                  error={errors.heartBenefit}
                  {...register("heartBenefit")}
                />
              </div>
              </div>
            )}
            {tab === "nutrition" && (
              <div className="space-y-3">
                <p className="text-[13px] text-ds-slate">Per serving. Patients see these numbers and the app adds them to their daily totals.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <InputField
                id="calories"
                type="number"
                label="Calories (kcal)"
                error={errors.calories}
                {...register("calories")}
              />
              <InputField
                id="sodium"
                type="number"
                label="Sodium (mg)"
                error={errors.sodium}
                {...register("sodium")}
              />
              <InputField
                id="satFat"
                type="number"
                label="Sat. Fat (g)"
                error={errors.satFat}
                {...register("satFat")}
              />
              <InputField
                id="cholesterol"
                type="number"
                label="Cholesterol (mg)"
                error={errors.cholesterol}
                {...register("cholesterol")}
              />
              <InputField
                id="fiber"
                type="number"
                label="Fiber (g)"
                error={errors.fiber}
                {...register("fiber")}
              />
            </div>
              </div>
            )}
            {tab === "ingredients" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-semibold text-ds-ink mb-2">Ingredients</h4>
            {errors.ingredients?.root && (
              <p className="text-[11px] text-ds-danger mb-2">{errors.ingredients.root.message}</p>
            )}

            <div className="space-y-2 mb-3">
              {ingredientsFields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      {...register(`ingredients.${index}.amount`)}
                      placeholder="Amt"
                      className={`w-20 px-2.5 py-1.5 text-[12.5px] bg-ds-canvas border ${
                        errors.ingredients?.[index]?.amount ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                      } rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel transition-colors`}
                    />
                    <select
                      {...register(`ingredients.${index}.unit`)}
                      aria-label="Unit"
                      className={`w-32 px-2 py-1.5 text-[12.5px] bg-ds-canvas border ${
                        errors.ingredients?.[index]?.unit ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                      } rounded-[8px] focus:outline-none text-ds-ink transition-colors cursor-pointer`}
                    >
                      <option value="">No unit</option>
                      {UNIT_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.units.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </optgroup>
                      ))}
                      {/* Keep an older unit that isn't in the list, so editing never loses it */}
                      {ingredientUnits?.[index] && !UNIT_VALUES.has(ingredientUnits[index]) && (
                        <option value={ingredientUnits[index]}>{ingredientUnits[index]}</option>
                      )}
                    </select>
                    <input
                      type="text"
                      {...register(`ingredients.${index}.name`)}
                      placeholder="Ingredient Name"
                      className={`flex-1 px-2.5 py-1.5 text-[12.5px] bg-ds-canvas border ${
                        errors.ingredients?.[index]?.name ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                      } rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-ds-slate hover:text-ds-danger p-1.5 rounded-lg hover:bg-ds-rose transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {errors.ingredients?.[index]?.name && (
                    <span className="text-[11px] text-ds-danger block ml-1">
                      {errors.ingredients[index].name.message}
                    </span>
                  )}
                  {errors.ingredients?.[index]?.amount && (
                    <span className="text-[11px] text-ds-danger block ml-1">
                      {errors.ingredients[index].amount.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendIngredient({ name: "", amount: "", unit: "" })}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-ds-primary hover:text-ds-primary-pressed transition-colors cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add ingredient</span>
            </button>
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-ds-ink mb-2">Cooking steps</h4>
            {errors.steps?.root && (
              <p className="text-[11px] text-ds-danger mb-2">{errors.steps.root.message}</p>
            )}

            <div className="space-y-3 mb-3">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-start gap-2.5 w-full">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-ds-steel uppercase block mb-1">
                        STEP {index + 1}
                      </span>
                      <textarea
                        rows="2"
                        {...register(`steps.${index}.value`)}
                        placeholder="Describe preparation step…"
                        className={`w-full px-3 py-2 text-[12.5px] bg-ds-canvas border ${
                          errors.steps?.[index]?.value ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'
                        } rounded-[8px] focus:outline-none text-ds-ink placeholder:text-ds-steel transition-colors resize-none`}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { if (index > 0) swapSteps(index, index - 1); }}
                        disabled={index === 0}
                        className="text-ds-slate hover:text-ds-ink disabled:opacity-30 p-1.5 rounded-[6px] hover:bg-ds-surface transition-colors cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (index < stepsFields.length - 1) swapSteps(index, index + 1); }}
                        disabled={index === stepsFields.length - 1}
                        className="text-ds-slate hover:text-ds-ink disabled:opacity-30 p-1.5 rounded-[6px] hover:bg-ds-surface transition-colors cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-ds-slate hover:text-ds-danger p-1.5 rounded-[6px] hover:bg-ds-rose transition-colors cursor-pointer"
                        title="Delete step"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {errors.steps?.[index]?.value && (
                    <span className="text-[11px] text-ds-danger block ml-1">
                      {errors.steps[index].value.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendStep({ value: "" })}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-ds-primary hover:text-ds-primary-pressed transition-colors cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add step</span>
            </button>
                </div>
              </div>
            )}
            {tab === "media" && (
              <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-ds-ink mb-1">
                  Media Image
                </label>
                <div className="mb-2.5 w-full h-32 rounded-[8px] overflow-hidden bg-ds-surface border border-ds-hairline flex flex-col items-center justify-center relative">
                  {!mediaUrl || imagePreviewError ? (
                    <div className="flex flex-col items-center justify-center text-ds-steel gap-1 p-4 text-center">
                      <ImageIcon size={22} className="text-ds-steel" />
                      <span className="text-[11px] font-medium">Recipe image preview</span>
                      {imagePreviewError && (
                        <span className="text-[11px] text-ds-warm-text font-semibold mt-1">
                          Warning: Image URL is unreachable or invalid.
                        </span>
                      )}
                    </div>
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Recipe preview"
                      className="w-full h-full object-cover"
                      onError={() => setImagePreviewError(true)}
                    />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) {
                        setUploadError("");
                        try {
                          const data = await apiUpload(file, "recipes");
                          setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                        } catch (err) {
                          // HL-048: a rejected file is never saved some other way
                          console.error("Recipe image upload error:", err);
                          setUploadError(err?.data?.detail || "Upload failed. Please try again.");
                        }
                      }
                    }}
                    className="w-full px-3 py-1.5 text-[12px] bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none text-ds-ink transition-colors file:mr-3 file:py-1 file:px-2.5 file:rounded-[6px] file:border-0 file:text-[11px] file:font-semibold file:bg-ds-canvas file:text-ds-ink file:border file:border-ds-hairline hover:file:border-ds-line hover:file:text-ds-primary cursor-pointer"
                  />
                  {uploadError && <p className="text-[11px] text-ds-danger mt-1">{uploadError}</p>}
                </div>
              </div>
              </div>
            )}
          </form>
        )}

        {/* Footer: one blue button per view */}
        <div className="px-6 py-3.5 border-t border-ds-hairline bg-ds-canvas flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {mode === "review" ? (
            <>
              <p className="flex-1 min-w-[200px] text-[13px] leading-snug text-ds-slate">
                {approved
                  ? `Approved by a dietitian${approvedOn ? ` on ${approvedOn}` : ""}.`
                  : isDietitian
                    ? "Patients only see this recipe after you approve it."
                    : "Patients can't see this until a dietitian approves it."}
              </p>
              {isDietitian && !approved ? (
                <>
                  <button type="button" onClick={() => setMode("edit")} className={secondaryBtn}>
                    Edit details
                  </button>
                  <button type="button" onClick={() => saveReview(true)} className={primaryBtn}>
                    Approve for patients
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("edit")} className={primaryBtn}>
                  Edit details
                </button>
              )}
            </>
          ) : (
            <>
              <p className="flex-1 min-w-[200px] text-[13px] leading-snug text-ds-slate">
                {isDietitian ? "" : recipe ? "Saving sends it back to a dietitian for approval." : "A dietitian approves it before patients see it."}
              </p>
              <button type="button" onClick={onClose} className={secondaryBtn}>
                Cancel
              </button>
              {status === "draft" && (
                <>
                  <button type="button" onClick={() => handleSaveWithStatus("draft")} className={secondaryBtn}>
                    Save draft
                  </button>
                  <button type="button" onClick={() => handleSaveWithStatus("published")} className={primaryBtn}>
                    Publish
                  </button>
                </>
              )}
              {status === "published" && (
                <button type="button" onClick={() => handleSaveWithStatus("published")} className={primaryBtn}>
                  Save changes
                </button>
              )}
              {status === "archived" && (
                <button type="button" onClick={() => handleSaveWithStatus("draft")} className={primaryBtn}>
                  Restore to draft
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodFormModal;
