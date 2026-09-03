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
});

const FoodFormModal = ({ isOpen, onClose, recipe, userRole = "medical", onSave, onDelete }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Panel */}
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#DCE3DF] max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF]">
          <div>
            <h3 
              className="text-[18px] font-medium text-[#152131] tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {recipe ? "Edit food / meal entry" : "Create new entry"}
            </h3>
            <p className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider mt-0.5">
              Define algorithmic nutritional values
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* ── GENERAL ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              General information
            </h4>
            <div className="space-y-3.5">
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
                <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                  Food Source Type
                </label>
                <select
                  {...register("foodSourceType")}
                  className={`w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border ${
                    errors.foodSourceType ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                  } rounded-[8px] focus:outline-none text-[#152131] transition-colors cursor-pointer`}
                >
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
                {errors.foodSourceType && <p className="text-[11px] text-[#A93226] mt-1">{errors.foodSourceType.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    Meal Category
                  </label>
                  <select
                    {...register("category")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border ${
                      errors.category ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                    } rounded-[8px] focus:outline-none text-[#152131] transition-colors cursor-pointer`}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  {errors.category && <p className="text-[11px] text-[#A93226] mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    HSS Suitability
                  </label>
                  <select
                    {...register("hssTarget")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border ${
                      errors.hssTarget ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                    } rounded-[8px] focus:outline-none text-[#152131] transition-colors cursor-pointer`}
                  >
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Moderate (60-79)">Moderate (60-79)</option>
                    <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                    <option value="Critical (<50)">Critical &lt;50</option>
                  </select>
                  {errors.hssTarget && <p className="text-[11px] text-[#A93226] mt-1">{errors.hssTarget.message}</p>}
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
                  <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                    Difficulty
                  </label>
                  <select
                    {...register("difficulty")}
                    className={`w-full px-3 py-2 text-[13px] font-medium bg-[#EDF1EF] border ${
                      errors.difficulty ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                    } rounded-[8px] focus:outline-none text-[#152131] transition-colors cursor-pointer`}
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

              {/* Media Image */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B66] uppercase tracking-wider mb-1">
                  Media Image
                </label>
                <div className="mb-2.5 w-full h-32 rounded-[8px] overflow-hidden bg-[#EDF1EF] border border-[#DCE3DF] flex flex-col items-center justify-center relative">
                  {!mediaUrl || imagePreviewError ? (
                    <div className="flex flex-col items-center justify-center text-[#8B9893] gap-1 p-4 text-center">
                      <ImageIcon size={22} className="text-[#8B9893]" />
                      <span className="text-[11px] font-medium">Recipe image preview</span>
                      {imagePreviewError && (
                        <span className="text-[10px] text-[#A9741B] font-semibold mt-1">
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
                    className="w-full px-3 py-1.5 text-[12px] bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] focus:outline-none text-[#152131] transition-colors file:mr-3 file:py-1 file:px-2.5 file:rounded-[6px] file:border-0 file:text-[11px] file:font-semibold file:bg-[#FFFFFF] file:text-[#152131] file:border file:border-[#DCE3DF] hover:file:border-[#E8532E] hover:file:text-[#E8532E] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── NUTRITION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5 flex items-center gap-1.5">
              <Activity size={13} className="text-[#E8532E]" /> Nutritional snapshot
            </h4>
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

          {/* ── INGREDIENTS ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Ingredients
            </h4>

            {errors.ingredients?.root && (
              <p className="text-[11px] text-[#A93226] mb-2">{errors.ingredients.root.message}</p>
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
                      className={`w-20 px-2.5 py-1.5 text-[12.5px] bg-[#EDF1EF] border ${
                        errors.ingredients?.[index]?.amount ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                      } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors`}
                    />
                    <input
                      type="text"
                      {...register(`ingredients.${index}.unit`)}
                      placeholder="Unit (e.g. g, cup)"
                      className={`w-28 px-2.5 py-1.5 text-[12.5px] bg-[#EDF1EF] border ${
                        errors.ingredients?.[index]?.unit ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                      } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors`}
                    />
                    <input
                      type="text"
                      {...register(`ingredients.${index}.name`)}
                      placeholder="Ingredient Name"
                      className={`flex-1 px-2.5 py-1.5 text-[12.5px] bg-[#EDF1EF] border ${
                        errors.ingredients?.[index]?.name ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                      } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-[#5C6B66] hover:text-[#A93226] p-1.5 rounded-lg hover:bg-[#F7E4E1] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {errors.ingredients?.[index]?.name && (
                    <span className="text-[10px] text-[#A93226] block ml-1">
                      {errors.ingredients[index].name.message}
                    </span>
                  )}
                  {errors.ingredients?.[index]?.amount && (
                    <span className="text-[10px] text-[#A93226] block ml-1">
                      {errors.ingredients[index].amount.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendIngredient({ name: "", amount: "", unit: "" })}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E8532E] hover:text-[#C13E20] transition-colors cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add ingredient</span>
            </button>
          </div>

          {/* ── INSTRUCTIONS ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3.5">
              Cooking instructions
            </h4>

            {errors.steps?.root && (
              <p className="text-[11px] text-[#A93226] mb-2">{errors.steps.root.message}</p>
            )}

            <div className="space-y-3 mb-3">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-start gap-2.5 w-full">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-[#8B9893] uppercase block mb-1">
                        STEP {index + 1}
                      </span>
                      <textarea
                        rows="2"
                        {...register(`steps.${index}.value`)}
                        placeholder="Describe preparation step…"
                        className={`w-full px-3 py-2 text-[12.5px] bg-[#EDF1EF] border ${
                          errors.steps?.[index]?.value ? 'border-[#A93226]' : 'border-[#DCE3DF] focus:border-[#152131]'
                        } rounded-[8px] focus:outline-none text-[#152131] placeholder:text-[#8B9893] transition-colors resize-none`}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { if (index > 0) swapSteps(index, index - 1); }}
                        disabled={index === 0}
                        className="text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 p-1.5 rounded-[6px] hover:bg-[#EDF1EF] transition-colors cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (index < stepsFields.length - 1) swapSteps(index, index + 1); }}
                        disabled={index === stepsFields.length - 1}
                        className="text-[#5C6B66] hover:text-[#152131] disabled:opacity-30 p-1.5 rounded-[6px] hover:bg-[#EDF1EF] transition-colors cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="text-[#5C6B66] hover:text-[#A93226] p-1.5 rounded-[6px] hover:bg-[#F7E4E1] transition-colors cursor-pointer"
                        title="Delete step"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {errors.steps?.[index]?.value && (
                    <span className="text-[10px] text-[#A93226] block ml-1">
                      {errors.steps[index].value.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendStep({ value: "" })}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E8532E] hover:text-[#C13E20] transition-colors cursor-pointer"
            >
              <PlusCircle size={14} /> <span>Add step</span>
            </button>
          </div>

          {/* ── EXPERT VALIDATION ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3">
              Expert validation
            </h4>
            <div
              onClick={() => setValue("expertValidated", !expertValidated, { shouldValidate: true, shouldDirty: true })}
              className={`p-3.5 rounded-[8px] border cursor-pointer transition-colors ${
                expertValidated
                  ? "bg-[#E3EFEC] border-[#C5DFD8]"
                  : "bg-[#EDF1EF]/60 border-[#DCE3DF] hover:border-[#8B9893]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4
                    className={`text-[12.5px] font-semibold ${
                      expertValidated ? "text-[#1B6E63]" : "text-[#152131]"
                    } flex items-center gap-1.5 mb-0.5`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-[#1B6E63]" />
                    ) : (
                      <ShieldAlert size={14} className="text-[#A9741B]" />
                    )}
                    {expertValidated ? "Expert reviewed" : "Pending review"}
                  </h4>
                  <p className="text-[11px] text-[#5C6B66] leading-relaxed select-none">
                    {expertValidated
                      ? "Reviewed or developed with input from a qualified clinical nutrition expert."
                      : "Sourced from an external reference and has not yet been validated by an expert."}
                  </p>
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-0.5 pointer-events-none">
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      expertValidated ? "bg-[#1B6E63]" : "bg-[#DCE3DF]"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-transform ${
                        expertValidated ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PUBLICATION STATUS ── */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-2 mb-3">
              Publication status
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1.5">
                {["draft", "published", "archived"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setValue("status", st)}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border capitalize transition-colors cursor-pointer ${
                      status === st
                        ? "bg-[#E8532E] border-[#E8532E] text-white shadow-2xs"
                        : "bg-[#FFFFFF] border-[#DCE3DF] text-[#5C6B66] hover:text-[#152131]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[#5C6B66] leading-tight font-medium">
                {status === "draft" && "Draft recipes are hidden from mobile patient recommendations."}
                {status === "published" && "Published recipes are immediately live on mobile screens."}
                {status === "archived" && "Archived recipes are hidden from mobile recommendations."}
              </span>
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {status === "archived" ? (
              <button
                type="button"
                onClick={() => setValue("status", "draft")}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1B6E63] hover:text-[#14534B] transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Restore entry</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setValue("status", "archived")}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A9741B] hover:text-[#885d14] transition-colors cursor-pointer"
              >
                <Archive size={14} />
                <span>Archive entry</span>
              </button>
            )}

            {recipe && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(recipe);
                }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A93226] hover:text-[#8A1F1A] transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete entry</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span>Save to database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodFormModal;
