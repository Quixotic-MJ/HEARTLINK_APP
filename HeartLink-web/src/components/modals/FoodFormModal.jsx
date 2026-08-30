import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Archive,
  CheckCircle2,
  Save,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { apiUpload } from "../../api";

const parseIngredientString = (str) => {
  if (!str) return { name: "", amount: "", unit: "" };
  const match = str.trim().match(/^([0-9\./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    let amtStr = match[1];
    let amount = parseFloat(amtStr);
    if (amtStr.includes("/")) {
      const parts = amtStr.split("/");
      if (parts.length === 2) {
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
    const unit = match[2] || "";
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
  hssTarget: z.string().min(1, "HSS Tier is required."),
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
});

const FoodFormModal = ({ isOpen, onClose, recipe, userRole = "medical", onSave, onDelete }) => {
  if (!isOpen) return null;

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
      hssTarget: "Stable (80-100)",
      foodSourceType: "Home Recipe",
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

  const expertValidated = watch("expertValidated");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");

  const [imagePreviewError, setImagePreviewError] = useState(false);

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
            unit: ing.unit || ""
          };
        });
      }
      if (ingredientsList.length === 0) {
        ingredientsList = [{ name: "", amount: "", unit: "" }];
      }

      reset({
        name: recipe.name || "",
        category: recipe.category || "Breakfast",
        hssTarget: recipe.hssTarget || "Stable (80-100)",
        foodSourceType: recipe.foodSourceType || "Home Recipe",
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
        hssTarget: "Stable (80-100)",
        foodSourceType: "Home Recipe",
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
        ingredients: mappedIngredients,
        steps: mappedSteps,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-2xl bg-white max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {recipe ? "Edit Food / Meal Entry" : "Create New Entry"}
            </h3>
            <p className="text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase mt-1">
              Define algorithmic nutritional values
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          
          {/* GENERAL */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              GENERAL
            </h4>
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
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Food Source Type
                </label>
                <select
                  {...register("foodSourceType")}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.foodSourceType ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none focus:bg-white transition-colors`}
                >
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
                {errors.foodSourceType && <p className="text-[11px] text-red-500 mt-1">{errors.foodSourceType.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    Meal Category
                  </label>
                  <select
                    {...register("category")}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.category ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors`}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    HSS Suitability
                  </label>
                  <select
                    {...register("hssTarget")}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.hssTarget ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors`}
                  >
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Moderate (60-79)">Moderate (60-79)</option>
                    <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                    <option value="Critical (<50)">Critical &lt;50</option>
                  </select>
                  {errors.hssTarget && <p className="text-[11px] text-red-500 mt-1">{errors.hssTarget.message}</p>}
                </div>
              </div>

              {/* MEDIA */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Media Image
                </label>
                <div className="mb-3 w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center justify-center relative">
                  {!mediaUrl || imagePreviewError ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                      <ImageIcon size={24} className="text-slate-300" />
                      <span className="text-[10px] font-medium">Recipe image unavailable</span>
                      {imagePreviewError && (
                        <span className="text-[9px] text-amber-500 font-semibold mt-1">
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
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const data = await apiUpload(file, "recipes");
                          setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                        } catch (err) {
                          console.error("Recipe image upload error:", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setValue("mediaUrl", reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NUTRITION */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <Activity size={12} /> NUTRITION
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          {/* INGREDIENTS */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              INGREDIENTS
            </h4>

            {errors.ingredients?.root && (
              <p className="text-[11px] text-red-500 mb-3">{errors.ingredients.root.message}</p>
            )}

            <div className="space-y-3 mb-4">
              {ingredientsFields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      {...register(`ingredients.${index}.amount`)}
                      placeholder="Amt"
                      className={`w-20 px-3 py-2 text-xs bg-slate-50 border ${
                        errors.ingredients?.[index]?.amount ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                      } rounded-xl focus:outline-none focus:bg-white transition-colors`}
                    />
                    <input
                      type="text"
                      {...register(`ingredients.${index}.unit`)}
                      placeholder="Unit (e.g. g, cup)"
                      className={`w-28 px-3 py-2 text-xs bg-slate-50 border ${
                        errors.ingredients?.[index]?.unit ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                      } rounded-xl focus:outline-none focus:bg-white transition-colors`}
                    />
                    <input
                      type="text"
                      {...register(`ingredients.${index}.name`)}
                      placeholder="Ingredient Name"
                      className={`flex-1 px-3 py-2 text-xs bg-slate-50 border ${
                        errors.ingredients?.[index]?.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                      } rounded-xl focus:outline-none focus:bg-white transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {errors.ingredients?.[index]?.name && (
                    <span className="text-[10px] text-red-500 block ml-1">
                      {errors.ingredients[index].name.message}
                    </span>
                  )}
                  {errors.ingredients?.[index]?.amount && (
                    <span className="text-[10px] text-red-500 block ml-1">
                      {errors.ingredients[index].amount.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendIngredient({ name: "", amount: "", unit: "" })}
              className="flex items-center gap-1.5 text-[10px] font-medium hover:opacity-75 transition-opacity"
              style={{ color: "#0f172a" }}
            >
              <PlusCircle size={13} /> Add Ingredient
            </button>
          </div>

          {/* INSTRUCTIONS */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              INSTRUCTIONS
            </h4>

            {errors.steps?.root && (
              <p className="text-[11px] text-red-500 mb-3">{errors.steps.root.message}</p>
            )}

            <div className="space-y-4 mb-4">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        STEP {index + 1}
                      </span>
                      <textarea
                        rows="2"
                        {...register(`steps.${index}.value`)}
                        placeholder="Step description..."
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border ${
                          errors.steps?.[index]?.value ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                        } rounded-xl focus:outline-none focus:bg-white transition-colors resize-none`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { if (index > 0) swapSteps(index, index - 1); }}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (index < stepsFields.length - 1) swapSteps(index, index + 1); }}
                        disabled={index === stepsFields.length - 1}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {errors.steps?.[index]?.value && (
                    <span className="text-[10px] text-red-500 block ml-1">
                      {errors.steps[index].value.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendStep({ value: "" })}
              className="flex items-center gap-1.5 text-[10px] font-medium hover:opacity-75 transition-opacity"
              style={{ color: "#0f172a" }}
            >
              <PlusCircle size={13} /> Add Step
            </button>
          </div>

          {/* REVIEW */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              REVIEW
            </h4>
            <div className={`p-4 rounded-xl border ${
              expertValidated
                ? "bg-emerald-50/50 border-emerald-100"
                : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4
                    className={`text-xs font-semibold ${
                      expertValidated ? "text-emerald-700" : "text-slate-900"
                    } flex items-center gap-2 mb-1.5`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-emerald-600" />
                    ) : (
                      <ShieldAlert size={14} className="text-slate-400" />
                    )}
                    {expertValidated ? "Expert Reviewed" : "Pending Review"}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {expertValidated
                      ? "Reviewed or developed with input from a qualified nutrition expert."
                      : "Sourced from an external reference and has not yet been reviewed by a nutrition expert."}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    disabled={userRole !== "medical"}
                    {...register("expertValidated")}
                  />
                  <div
                    className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      userRole !== "medical"
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    } peer-checked:bg-emerald-500`}
                  ></div>
                </label>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              STATUS
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex gap-2">
                {["draft", "published", "archived"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setValue("status", st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                      status === st
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 leading-normal">
                {status === "draft" && "Draft recipes are hidden from mobile recommendations and searches."}
                {status === "published" && "Published recipes are immediately live on mobile screens."}
                {status === "archived" && "Archived recipes are hidden from mobile and kept in admin history."}
              </span>
            </div>
          </div>

        </form>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {status === "archived" ? (
              <button
                type="button"
                onClick={() => setValue("status", "draft")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <CheckCircle2 size={14} /> Restore Entry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setValue("status", "archived")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-orange-500 transition-colors"
              >
                <Archive size={14} /> Archive Entry
              </button>
            )}

            {recipe && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to permanently delete this entry?")) {
                    onDelete(recipe.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} /> Delete Entry
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ backgroundColor: "#0f172a" }}
            >
              <Save size={14} /> Save to Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodFormModal;
