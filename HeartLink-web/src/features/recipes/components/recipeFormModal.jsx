import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_VALUES, UNIT_GROUPS, UNIT_VALUES, foodSchema, recipePayload, recipeValues } from "../recipeForm.js";
import { formatReviewDate } from "../../../utils/formatReviewDate.js";
import { navigateTabs } from "../../../utils/navigateTabs.js";
import { InputField } from "../../../components/ui/inputField.jsx";
import { FormErrorSummary } from "../../../components/ui/formErrorSummary.jsx";
import { apiUpload } from "../../../lib/api.js";
import { DiscardDraft } from "../../../components/ui/discardDraft.jsx";
import { useDraftExit } from "../../../hooks/useDraftExit.js";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";

// The edit view's tabs, and which fields live on each, so a save that fails opens the right tab.
const TABS = [
  ["basics", "Basics"],
  ["nutrition", "Nutrition"],
  ["ingredients", "Ingredients & steps"],
  ["media", "Picture"],
];

const TAB_FIELDS = {
  basics: [
    "name",
    "foodSourceType",
    "category",
    "categoryOther",
    "prepTimeMinutes",
    "servings",
    "difficulty",
  ],
  nutrition: ["calories", "sodium", "satFat", "cholesterol", "fiber"],
  ingredients: ["ingredients", "steps"],
  media: ["mediaUrl"],
};

function describeRecipeField(name) {
  const [group, index, field] = name.split(".");
  if (group === "ingredients" && index !== undefined) {
    return { id: name, label: `Ingredient ${Number(index) + 1} ${field}` };
  }
  if (group === "steps" && index !== undefined) {
    return { id: name, label: `Cooking step ${Number(index) + 1}` };
  }
  const labels = {
    name: "Recipe name", foodSourceType: "Food source", category: "Category",
    categoryOther: "Other category", prepTimeMinutes: "Preparation time", servings: "Servings",
    difficulty: "Difficulty", calories: "Calories", sodium: "Sodium", satFat: "Saturated fat",
    cholesterol: "Cholesterol", fiber: "Fiber", ingredients: "Ingredients", steps: "Cooking steps",
    mediaUrl: "Dish photograph",
  };
  const ids = { foodSourceType: "recipe-food-source", category: "recipe-category", difficulty: "recipe-difficulty", mediaUrl: "recipe-media-upload" };
  return { id: ids[name] || name, label: labels[name] || name };
}

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

const FoodFormModal = ({
  isOpen,
  onClose: finishClose,
  recipe,
  canEdit = false,
  isDietitian = false,
  onSave,
  onReview,
}) => {
  const dialogRef = useRef(null);
  const errorRef = useRef(null);
  const inFlight = useRef(false);
  const uploadInFlight = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const busy = saving || isUploading;


  // HL-037: a Dietitian's note when sending a recipe back for changes.
  const [reviewNote, setReviewNote] = useState("");
  // An existing recipe opens in the review view; a new one goes straight to editing.
  const [mode, setMode] = useState("review");
  const [tab, setTab] = useState("basics");
  const [uploadError, setUploadError] = useState("");
  const [failedMediaUrl, setFailedMediaUrl] = useState(null);
  const [noteFor, setNoteFor] = useState(null);

  if ((isOpen ? recipe || "new" : null) !== noteFor) {
    setNoteFor(isOpen ? recipe || "new" : null);
    setReviewNote("");
    setMode(recipe ? "review" : "edit");
    setTab("basics");
    setUploadError("");
    setSaveError("");
    setSaving(false);
  }

  useEffect(() => {
    if (saveError) errorRef.current?.focus();
  }, [saveError]);

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
    setValue,
    formState: { errors, submitCount, isDirty },
  } = useForm({
    resolver: zodResolver(foodSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
    shouldFocusError: false,
  });

  const {
    fields: ingredientsFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control,
    name: "ingredients",
  });

  const {
    fields: stepsFields,
    append: appendStep,
    remove: removeStep,
    swap: swapSteps,
  } = useFieldArray({
    control,
    name: "steps",
  });

  const watchedValues = useWatch({ control });
  const v = { ...DEFAULT_VALUES, ...watchedValues };
  const category = v.category;
  const ingredientUnits = (v.ingredients || []).map((ing) => ing?.unit || "");
  const mediaUrl = v.mediaUrl;
  const status = v.status;
  const imagePreviewError = !!mediaUrl && failedMediaUrl === mediaUrl;

  useEffect(() => {
    reset(recipeValues(recipe));
  }, [recipe, isOpen, reset]);

  const draftExit = useDraftExit(isOpen, isDirty || reviewNote.length > 0, finishClose, dialogRef, busy);
  const onClose = () => {
    if (!inFlight.current && !uploadInFlight.current) draftExit.requestClose();
  };
  useDialogFocus(isOpen, dialogRef, onClose);

  const onSubmit = async (data) => {
    if (!canEdit || inFlight.current || uploadInFlight.current || !onSave) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(recipePayload(data));
      finishClose();
    } catch (err) {
      setSaveError(err?.data?.detail || "The recipe was not saved. Your changes are still here.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  // A save that fails checks opens the edit view on the first tab with a problem.
  const onInvalid = (errs) => {
    setMode("edit");
    setTab(
      TABS.map(([id]) => id).find((id) =>
        TAB_FIELDS[id].some((f) => errs[f])
      ) || "basics"
    );
  };

  // HL-037: review is a separate exact-version action; it never edits recipe content.
  const saveReview = async (approved) => {
    if (!isDietitian || inFlight.current || uploadInFlight.current || !onReview) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await onReview({
        decision: approved ? "approve" : "changes_requested",
        note: approved ? undefined : reviewNote.trim(),
      });
      finishClose();
    } catch (err) {
      setSaveError(err?.data?.detail || "The review was not saved. Refresh and try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus);
    handleSubmit((data) => onSubmit({ ...data, status: newStatus }), onInvalid)();
  };

  if (!isOpen) return null;

  const approved = !!recipe?.expertValidated;
  const sentBack = !approved && !!recipe?.reviewNote;
  const approvedOn = formatReviewDate(recipe?.reviewedAt);
  const ingredientRows = (v.ingredients || []).filter((i) =>
    (i?.name || "").trim()
  );
  const stepRows = (v.steps || []).filter((s) => (s?.value || "").trim());
  const tabsWithErrors = new Set(
    TABS.map(([id]) => id).filter((id) =>
      TAB_FIELDS[id].some((f) => errors[f])
    )
  );

  const statusChip =
    {
      published: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
      draft: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      archived: "border-cal-hairline bg-cal-surface-card text-cal-muted",
    }[status] || "border-cal-hairline bg-cal-surface-card text-cal-muted";

  const secondaryBtn =
    "inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryBtn =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted";
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer";
  const selectFieldClass = (hasErr) =>
    `h-10 w-full appearance-none rounded-[8px] border bg-cal-canvas pl-3.5 pr-9 text-[14px] font-medium text-cal-ink outline-none transition-colors cursor-pointer ${
      hasErr
        ? "border-cal-error focus:border-cal-error"
        : "border-cal-hairline focus:border-cal-ink"
    }`;

  const displayCategory =
    v.category === "Others" ? v.categoryOther || "Others" : v.category;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby={draftExit.discarding ? "discard-changes-title" : "recipe-panel-title"}
        tabIndex={-1}
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.12)] ${
          expanded ? "h-full max-w-[1280px]" : "h-[min(880px,100%)] max-w-[920px]"
        }`}
      >
        {draftExit.discarding && (
          <DiscardDraft onKeep={draftExit.keepEditing} onDiscard={draftExit.confirmDiscard} />
        )}
        <div className={draftExit.discarding ? "hidden" : "contents"}>
        {/* Header: name, status chips, more actions, size, and the tabs while editing */}
        <div className="shrink-0 border-b border-cal-hairline bg-cal-canvas px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-cal-muted">
                {!recipe
                  ? "New recipe"
                  : mode === "review"
                    ? "Recipe overview"
                    : "Editing recipe"}
              </p>
              <h3
                id="recipe-panel-title"
                className="mt-0.5 truncate font-cal-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
              >
                {v.name || "Untitled recipe"}
              </h3>
              {recipe && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className={`${PILL} capitalize ${statusChip}`}>
                    {status}
                  </span>
                  <span
                    className={`${PILL} ${
                      approved
                        ? "border-cal-success/25 bg-cal-success/10 text-cal-ink"
                        : "border-cal-warning/35 bg-cal-warning/15 text-cal-ink"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        approved ? "bg-cal-success" : "bg-cal-warning"
                      }`}
                    />
                    <span>
                      {approved
                        ? "Dietitian approved"
                        : sentBack
                          ? "Sent back by dietitian"
                          : "Waiting for dietitian approval"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleExpanded}
                aria-label={
                  expanded ? "Make the panel smaller" : "Make the panel bigger"
                }
                title={expanded ? "Smaller" : "Bigger"}
                className={`hidden md:flex ${iconBtn}`}
              >
                {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className={iconBtn}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {mode === "edit" && (
            <div
              role="tablist"
              onKeyDown={navigateTabs}
              aria-label="Recipe sections"
              className="relative mt-4 inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1 select-none"
            >
              {TABS.map(([id, label]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`recipe-tab-${id}`}
                    aria-controls="recipe-editor-panel"
                    tabIndex={active ? 0 : -1}
                    aria-selected={active}
                    disabled={busy}
                    onClick={() => setTab(id)}
                    className={`group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="recipe-form-active-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    {tabsWithErrors.has(id) && (
                      <span className="relative z-10 flex items-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-cal-error"}`}
                          aria-hidden="true"
                        />
                        <span className="sr-only"> (needs fixing)</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {mode === "review" ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {sentBack && (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-warning/35 bg-cal-warning/10 px-4 py-3">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-cal-ink"
                  aria-hidden="true"
                />
                <p className="m-0 text-[13.5px] leading-[1.5] text-cal-ink">
                  <span className="font-semibold">Dietitian&apos;s note:</span>{" "}
                  {recipe.reviewNote}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-surface-soft sm:w-56">
                {v.mediaUrl && !imagePreviewError ? (
                  <img
                    src={v.mediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setFailedMediaUrl(v.mediaUrl)}
                  />
                ) : (
                  <ImageIcon
                    size={22}
                    className="text-cal-muted"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 text-[12px] font-medium text-cal-body">
                    {displayCategory}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-surface-soft px-2.5 py-0.5 text-[12px] font-medium text-cal-body">
                    {v.foodSourceType}
                  </span>
                </div>
              </div>
            </div>

            <section>
              <h4 className="font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                Preparation
              </h4>
              <p className="mt-0.5 mb-2.5 text-[13px] text-cal-muted">
                The dietitian checks that these fit the dish before approving.
              </p>
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline">
                {[
                  ["Prep time", `${v.prepTimeMinutes} min`, true],
                  ["Difficulty", v.difficulty, false],
                  ["Servings", String(v.servings), true],
                ].map(([label, value, mono]) => (
                  <div key={label} className="bg-cal-canvas px-4 py-3.5">
                    <p className="text-[12px] font-medium text-cal-muted">{label}</p>
                    <p
                      className={`mt-1 text-[16px] font-semibold text-cal-ink ${
                        mono ? "font-cal-mono tabular-nums" : ""
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="mb-2.5 font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                Nutrition per serving
              </h4>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline sm:grid-cols-5">
                {[
                  ["Calories", `${v.calories} kcal`],
                  ["Sodium", `${v.sodium} mg`],
                  ["Saturated fat", `${v.satFat} g`],
                  ["Cholesterol", `${v.cholesterol} mg`],
                  ["Fiber", `${v.fiber} g`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-cal-canvas px-4 py-3.5">
                    <p className="text-[12px] font-medium text-cal-muted">{label}</p>
                    <p className="mt-1 font-cal-mono text-[15.5px] font-semibold tabular-nums text-cal-ink">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-[2fr_3fr]">
              <section>
                <h4 className="mb-2.5 font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                  Ingredients
                </h4>
                {ingredientRows.length ? (
                  <ul className="divide-y divide-cal-hairline overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-canvas">
                    {ingredientRows.map((ing, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-3 px-4 py-2.5 text-[13.5px]"
                      >
                        <span className="w-24 shrink-0 font-cal-mono text-[12.5px] text-cal-muted">
                          {[ing.amount, ing.unit].filter(Boolean).join(" ") ||
                            "Amount not recorded"}
                        </span>
                        <span className="min-w-0 flex-1 font-medium text-cal-ink">
                          {ing.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-cal-muted">No ingredients yet.</p>
                )}
              </section>

              <section>
                <h4 className="mb-2.5 font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                  Steps
                </h4>
                {stepRows.length ? (
                  <ol className="divide-y divide-cal-hairline overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-canvas">
                    {stepRows.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 px-4 py-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft font-cal-mono text-[11.5px] font-semibold text-cal-ink">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55] text-cal-body">
                          {s.value}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[13.5px] text-cal-muted">No steps yet.</p>
                )}
              </section>
            </div>

            {isDietitian && recipe && status !== "archived" && (
              <section className="space-y-2.5 rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-4">
                <label
                  htmlFor="review-note"
                  className="block text-[13px] font-semibold text-cal-ink"
                >
                  Send back for changes{" "}
                  <span className="font-normal text-cal-muted">(note required)</span>
                </label>
                <textarea
                  id="review-note"
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  disabled={busy}
                  maxLength={500}
                  placeholder="e.g. Prep time is too short for this dish; please check the difficulty."
                  className="w-full resize-none rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2 text-[13.5px] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={busy || !reviewNote.trim()}
                    onClick={() => saveReview(false)}
                    className={secondaryBtn}
                  >
                    Send back with note
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => handleSubmit(onSubmit, onInvalid)(event)}
            aria-busy={busy}
            className="flex-1 overflow-y-auto px-6 py-5"
          >
            <FormErrorSummary
              errors={errors}
              submitCount={submitCount}
              describeField={describeRecipeField}
              disabled={busy}
              onSelect={(name) => setTab(TABS.find(([id]) => TAB_FIELDS[id].includes(name.split(".")[0]))?.[0] || "basics")}
            />
            <div role="tabpanel" id="recipe-editor-panel" aria-labelledby={`recipe-tab-${tab}`} tabIndex={0}>
            <fieldset disabled={busy} className="contents">
            {tab === "basics" && (
              <div className="space-y-4">
                <InputField
                  id="name"
                  label="Food / meal name"
                  placeholder="e.g. Low-Sodium Chicken Broth"
                  error={errors.name}
                  {...register("name")}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="recipe-food-source"
                    className="block text-[13px] font-semibold text-cal-ink"
                  >
                    Food source type
                  </label>
                  <div className="relative">
                    <select
                      id="recipe-food-source"
                      {...register("foodSourceType")}
                      className={selectFieldClass(!!errors.foodSourceType)}
                    >
                      <option value="Home Recipe">Home Recipe</option>
                      <option value="Fast Food Chain">Fast Food Chain</option>
                      <option value="Local Carenderia">Local Carenderia</option>
                      <option value="Raw Ingredient">Raw Ingredient</option>
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                    />
                  </div>
                  {errors.foodSourceType && (
                    <p className="text-[12px] font-medium text-cal-error">
                      {errors.foodSourceType.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="recipe-category"
                      className="block text-[13px] font-semibold text-cal-ink"
                    >
                      Meal category
                    </label>
                    <div className="relative">
                      <select
                        id="recipe-category"
                        {...register("category")}
                        className={selectFieldClass(!!errors.category)}
                      >
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                        <option value="Others">Others</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                    {errors.category && (
                      <p className="text-[12px] font-medium text-cal-error">
                        {errors.category.message}
                      </p>
                    )}
                    {category === "Others" && (
                      <div className="pt-2">
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

                </div>

                {/* Prep & Metrics */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InputField
                    id="prepTimeMinutes"
                    type="number"
                    label="Prep time (mins)"
                    placeholder="15"
                    inputClassName="font-cal-mono"
                    error={errors.prepTimeMinutes}
                    {...register("prepTimeMinutes")}
                  />

                  <InputField
                    id="servings"
                    type="number"
                    label="Servings"
                    placeholder="1"
                    inputClassName="font-cal-mono"
                    error={errors.servings}
                    {...register("servings")}
                  />

                  <div className="space-y-1.5">
                    <label
                      htmlFor="recipe-difficulty"
                      className="block text-[13px] font-semibold text-cal-ink"
                    >
                      Difficulty
                    </label>
                    <div className="relative">
                      <select
                        id="recipe-difficulty"
                        {...register("difficulty")}
                        className={selectFieldClass(!!errors.difficulty)}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {tab === "nutrition" && (
              <div className="space-y-4">
                <p className="text-[13.5px] text-cal-muted">
                  Per stated serving. These values are used in recipe details and diary totals.
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InputField
                    id="calories"
                    type="number"
                    label="Calories (kcal)"
                    inputClassName="font-cal-mono"
                    error={errors.calories}
                    {...register("calories")}
                  />
                  <InputField
                    id="sodium"
                    type="number"
                    label="Sodium (mg)"
                    inputClassName="font-cal-mono"
                    error={errors.sodium}
                    {...register("sodium")}
                  />
                  <InputField
                    id="satFat"
                    type="number"
                    label="Sat. fat (g)"
                    inputClassName="font-cal-mono"
                    error={errors.satFat}
                    {...register("satFat")}
                  />
                  <InputField
                    id="cholesterol"
                    type="number"
                    label="Cholesterol (mg)"
                    inputClassName="font-cal-mono"
                    error={errors.cholesterol}
                    {...register("cholesterol")}
                  />
                  <InputField
                    id="fiber"
                    type="number"
                    label="Fiber (g)"
                    inputClassName="font-cal-mono"
                    error={errors.fiber}
                    {...register("fiber")}
                  />
                </div>
              </div>
            )}

            {tab === "ingredients" && (
              <div className="space-y-6">
                <div>
                  <h4 id="ingredients" tabIndex={-1} className="mb-2.5 font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                    Ingredients
                  </h4>
                  {errors.ingredients?.root && (
                    <p className="mb-2 text-[12px] font-medium text-cal-error">
                      {errors.ingredients.root.message}
                    </p>
                  )}

                  <div className="mb-3 space-y-2.5">
                    {ingredientsFields.map((field, index) => (
                      <div key={field.id} className="space-y-1">
                        <div className="grid grid-cols-[5rem_minmax(0,1fr)_2.25rem] items-center gap-2 sm:grid-cols-[5rem_9rem_minmax(0,1fr)_2.25rem]">
                          <input
                            type="number"
                            step="any"
                            {...register(`ingredients.${index}.amount`)}
                            id={`ingredients.${index}.amount`}
                            aria-label={`Ingredient ${index + 1} amount`}
                            aria-invalid={!!errors.ingredients?.[index]?.amount}
                            aria-describedby={errors.ingredients?.[index]?.amount ? `ingredients.${index}.amount-error` : undefined}
                            placeholder="Amt"
                            className={`h-9 w-20 rounded-[8px] border bg-cal-canvas px-2.5 font-cal-mono text-[13px] text-cal-ink placeholder:font-cal-sans placeholder:text-cal-muted outline-none transition-colors ${
                              errors.ingredients?.[index]?.amount
                                ? "border-cal-error focus:border-cal-error"
                                : "border-cal-hairline focus:border-cal-ink"
                            }`}
                          />
                          <div className="relative min-w-0">
                            <select
                              {...register(`ingredients.${index}.unit`)}
                              id={`ingredients.${index}.unit`}
                              aria-label={`Ingredient ${index + 1} unit`}
                              className={`h-9 w-full appearance-none rounded-[8px] border bg-cal-canvas pl-2.5 pr-7 text-[13px] text-cal-ink outline-none transition-colors cursor-pointer ${
                                errors.ingredients?.[index]?.unit
                                  ? "border-cal-error focus:border-cal-error"
                                  : "border-cal-hairline focus:border-cal-ink"
                              }`}
                            >
                              <option value="">No unit</option>
                              {UNIT_GROUPS.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.units.map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              {/* Keep an older unit that isn't in the list, so editing never loses it */}
                              {ingredientUnits?.[index] &&
                                !UNIT_VALUES.has(ingredientUnits[index]) && (
                                  <option value={ingredientUnits[index]}>
                                    {ingredientUnits[index]}
                                  </option>
                                )}
                            </select>
                            <ChevronDown
                              size={13.5}
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cal-muted"
                            />
                          </div>
                          <input
                            type="text"
                            {...register(`ingredients.${index}.name`)}
                            id={`ingredients.${index}.name`}
                            aria-label={`Ingredient ${index + 1} name`}
                            aria-invalid={!!errors.ingredients?.[index]?.name}
                            aria-describedby={errors.ingredients?.[index]?.name ? `ingredients.${index}.name-error` : undefined}
                            placeholder="Ingredient name"
                            className={`col-span-2 row-start-2 h-9 min-w-0 rounded-[8px] border bg-cal-canvas px-3 text-[13.5px] text-cal-ink placeholder:text-cal-muted outline-none transition-colors sm:col-span-1 sm:row-start-auto ${
                              errors.ingredients?.[index]?.name
                                ? "border-cal-error focus:border-cal-error"
                                : "border-cal-hairline focus:border-cal-ink"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            aria-label="Remove ingredient"
                            className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer sm:col-start-auto sm:row-start-auto"
                          >
                            <Trash2 size={14.5} />
                          </button>
                        </div>
                        {errors.ingredients?.[index]?.name && (
                          <span id={`ingredients.${index}.name-error`} className="ml-1 block text-[12px] font-medium text-cal-error">
                            {errors.ingredients[index].name.message}
                          </span>
                        )}
                        {errors.ingredients?.[index]?.amount && (
                          <span id={`ingredients.${index}.amount-error`} className="ml-1 block text-[12px] font-medium text-cal-error">
                            {errors.ingredients[index].amount.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      appendIngredient({ name: "", amount: "", unit: "" })
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add ingredient</span>
                  </button>
                </div>

                <div className="border-t border-cal-hairline pt-5">
                  <h4 id="steps" tabIndex={-1} className="mb-2.5 font-cal-display text-[17px] font-semibold tracking-[-0.3px] text-cal-ink">
                    Cooking steps
                  </h4>
                  {errors.steps?.root && (
                    <p className="mb-2 text-[12px] font-medium text-cal-error">
                      {errors.steps.root.message}
                    </p>
                  )}

                  <div className="mb-3 space-y-3">
                    {stepsFields.map((field, index) => (
                      <div key={field.id} className="space-y-1">
                        <div className="flex w-full items-start gap-2.5">
                          <div className="flex-1">
                            <span className="mb-1 block font-cal-mono text-[11.5px] font-semibold text-cal-muted">
                              Step {index + 1}
                            </span>
                            <textarea
                              rows={2}
                              {...register(`steps.${index}.value`)}
                              id={`steps.${index}.value`}
                              aria-label={`Cooking step ${index + 1}`}
                              aria-invalid={!!errors.steps?.[index]?.value}
                              aria-describedby={errors.steps?.[index]?.value ? `steps.${index}.value-error` : undefined}
                              placeholder="Describe preparation step…"
                              className={`w-full resize-none rounded-[8px] border bg-cal-canvas px-3 py-2 text-[13.5px] text-cal-ink placeholder:text-cal-muted outline-none transition-colors ${
                                errors.steps?.[index]?.value
                                  ? "border-cal-error focus:border-cal-error"
                                  : "border-cal-hairline focus:border-cal-ink"
                              }`}
                            />
                          </div>
                          <div className="mt-6 flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (index > 0) swapSteps(index, index - 1);
                              }}
                              disabled={index === 0}
                              title="Move up"
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (index < stepsFields.length - 1) {
                                  swapSteps(index, index + 1);
                                }
                              }}
                              disabled={index === stepsFields.length - 1}
                              title="Move down"
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              title="Delete step"
                              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-cal-muted hover:bg-cal-error/10 hover:text-cal-error transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {errors.steps?.[index]?.value && (
                          <span id={`steps.${index}.value-error`} className="ml-1 block text-[12px] font-medium text-cal-error">
                            {errors.steps[index].value.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => appendStep({ value: "" })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add step</span>
                  </button>
                </div>
              </div>
            )}

            {tab === "media" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="recipe-media-upload"
                    className="mb-1.5 block text-[13px] font-semibold text-cal-ink"
                  >
                    Dish photograph
                  </label>
                  <div className="relative mb-3 flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-surface-soft">
                    {!mediaUrl || imagePreviewError ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-cal-muted">
                        <ImageIcon size={24} className="text-cal-muted" />
                        <span className="text-[12.5px] font-medium">
                          Recipe image preview
                        </span>
                        {imagePreviewError && (
                          <span className="mt-1 text-[12px] font-semibold text-cal-error">
                            Image URL is unreachable or invalid.
                          </span>
                        )}
                      </div>
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Recipe preview"
                        className="h-full w-full object-cover"
                        onError={() => setFailedMediaUrl(mediaUrl)}
                      />
                    )}
                  </div>

                  <div>
                    <input
                      id="recipe-media-upload"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file || uploadInFlight.current || inFlight.current) return;
                        uploadInFlight.current = true;
                        setIsUploading(true);
                        setUploadError("");
                        try {
                          const data = await apiUpload(file, "recipes");
                          setValue("mediaUrl", data.url, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        } catch (err) {
                          setUploadError(
                            err?.data?.detail || "Upload failed. Please try again."
                          );
                        } finally {
                          uploadInFlight.current = false;
                          setIsUploading(false);
                        }
                      }}
                      className="w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 py-2 text-[13px] text-cal-ink transition-colors file:mr-3 file:rounded-[6px] file:border file:border-cal-hairline file:bg-cal-surface-soft file:px-3 file:py-1 file:text-[12px] file:font-semibold file:text-cal-ink hover:file:bg-cal-surface-card cursor-pointer"
                    />
                    {isUploading && <p role="status" className="mt-1.5 text-[12px] text-cal-muted">Uploading image. Wait for confirmation before saving.</p>}
                    {uploadError && (
                      <p role="alert" className="mt-1.5 text-[12px] font-medium text-cal-error">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            </fieldset>
            </div>
          </form>
        )}

        {/* Footer: one monochrome #111111 primary CTA per view */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          {saveError && (
            <p
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="w-full rounded-[8px] border border-cal-error/30 bg-cal-error/10 px-3 py-2 text-[13px] font-medium text-cal-error outline-none"
            >
              {saveError}
            </p>
          )}
          {mode === "review" ? (
            <>
              <p className="min-w-[200px] flex-1 text-[13px] leading-snug text-cal-muted">
                {status === "archived" && isDietitian
                  ? "Archived recipes are read-only and cannot be reviewed."
                  : approved
                  ? `Approved by a dietitian${approvedOn ? ` on ${approvedOn}` : ""}.`
                  : isDietitian
                    ? "Approval keeps this draft ready for an Admin to publish."
                    : "App users can't see this until a Dietitian approves it and an Admin publishes it."}
              </p>
              {isDietitian && !approved && status !== "archived" ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveReview(true)}
                    disabled={busy}
                    className={primaryBtn}
                  >
                    <ShieldCheck size={15} />
                    <span>Approve revision</span>
                  </button>
                </>
              ) : canEdit ? (
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  disabled={busy}
                  className={primaryBtn}
                >
                  Edit details
                </button>
              ) : (
                <button type="button" onClick={onClose} className={secondaryBtn}>
                  Close
                </button>
              )}
            </>
          ) : (
            <>
              <p className="min-w-[200px] flex-1 text-[13px] leading-snug text-cal-muted">
                {recipe?.status === "published"
                  ? "Saving content changes withdraws this recipe until a Dietitian reviews it again."
                  : recipe
                    ? "Content changes require a new Dietitian review before publication."
                    : "A Dietitian reviews this draft before an Admin can publish it."}
              </p>
              <button type="button" onClick={onClose} disabled={busy} className={secondaryBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveWithStatus(status === "archived" ? "draft" : status)}
                disabled={busy}
                className={primaryBtn}
              >
                {isUploading
                  ? "Uploading…"
                  : saving
                  ? "Saving..."
                  : status === "published"
                    ? "Save changes"
                    : status === "archived"
                      ? "Restore to draft"
                      : "Save draft"}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FoodFormModal;
