import React, { useEffect } from "react";
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
} from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";

const foodSchema = z.object({
  name: z.string().min(1, "Name is required."),
  foodSourceType: z.string().default("Home Recipe"),
  category: z.string().default("Breakfast"),
  cssTarget: z.string().default("Stable (80-100)"),
  calories: z.coerce.number().min(0, "Cannot be negative"),
  sodium: z.coerce.number().min(0, "Cannot be negative"),
  satFat: z.coerce.number().min(0, "Cannot be negative"),
  cholesterol: z.coerce.number().min(0, "Cannot be negative"),
  fiber: z.coerce.number().min(0, "Cannot be negative"),
  expertValidated: z.boolean().default(false),
  status: z.string().default("draft"),
  mediaUrl: z.string().optional(),
  instructions: z.string().optional(),
  ingredients: z.array(
    z.object({ value: z.string() })
  ).optional(),
});

const FoodFormModal = ({ isOpen, onClose, recipe, userRole = "medical", onSave }) => {
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
      cssTarget: "Stable (80-100)",
      foodSourceType: "Home Recipe",
      sodium: 0,
      calories: 0,
      satFat: 0,
      cholesterol: 0,
      fiber: 0,
      status: "draft",
      expertValidated: false,
      mediaUrl: "",
      instructions: "",
      ingredients: [{ value: "" }],
    },
    mode: "onTouched",
  });

  const { fields: ingredientsFields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  const expertValidated = watch("expertValidated");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");

  useEffect(() => {
    if (recipe) {
      reset({
        ...recipe,
        foodSourceType: recipe.foodSourceType || "Home Recipe",
        mediaUrl: recipe.mediaUrl || "",
        instructions: recipe.instructions || "",
        ingredients: recipe.ingredients 
          ? recipe.ingredients.map(ing => ({ value: ing }))
          : [{ value: "Mock Ingredient 1" }, { value: "Mock Ingredient 2" }],
      });
    } else {
      reset({
        name: "",
        category: "Breakfast",
        cssTarget: "Stable (80-100)",
        foodSourceType: "Home Recipe",
        sodium: 0,
        calories: 0,
        satFat: 0,
        cholesterol: 0,
        fiber: 0,
        status: "draft",
        expertValidated: false,
        mediaUrl: "",
        instructions: "",
        ingredients: [{ value: "" }],
      });
    }
  }, [recipe, isOpen, reset]);

  const onSubmit = (data) => {
    if (onSave) {
      // Unpack ingredients array of objects back to array of strings
      const flatIngredients = data.ingredients ? data.ingredients.map(i => i.value) : [];
      onSave({ ...data, ingredients: flatIngredients });
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
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          {/* Expert Validation Workflow */}
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
                    Medical Expert Validation
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Only Authorized Medical Experts can sign off on
                    nutritional accuracy before pushing to users.
                  </p>
                </div>
  
                {/* Toggle Switch */}
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

          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Basic Information
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
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                    CSS Target Level
                  </label>
                  <select
                    {...register("cssTarget")}
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.cssTarget ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors`}
                  >
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Monitor Closely (50-79)">
                      Monitor Closely (50-79)
                    </option>
                    <option value="Critical (<50)">
                      Critical (&lt;50)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Media Image
                </label>
                {mediaUrl && (
                  <div className="mb-3 w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setValue("mediaUrl", reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Nutritional Details (Critical) */}
          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] border-b pb-2 mb-4 flex items-center gap-2" style={{ color: "#0f172a", borderColor: "rgba(15,23,42,0.1)" }}>
              <Activity size={12} /> Algorithmic Nutrition Data
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

          {/* Section 3: Recipe Construction */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Construction
            </h4>

            <div className="mb-5">
              <label className="flex items-center text-[11px] font-medium text-slate-700 mb-2">
                Ingredients List <span className="text-[9px] text-slate-400 font-normal ml-1.5">(Optional for restaurant items)</span>
              </label>
              <div className="space-y-2.5 mb-3">
                {ingredientsFields.map((field, index) => (
                  <div key={field.id} className="flex items-start flex-col gap-1">
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        {...register(`ingredients.${index}.value`)}
                        className={`flex-1 px-3 py-2 text-xs bg-slate-50 border ${errors.ingredients?.[index]?.value ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none focus:bg-white transition-colors`}
                        placeholder="e.g., 1 cup low-sodium chicken broth"
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {errors.ingredients?.[index]?.value && (
                      <span className="text-[10px] text-red-500 ml-1">
                        {errors.ingredients[index].value.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => append({ value: "" })}
                className="flex items-center gap-1.5 text-[10px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: "#0f172a" }}
              >
                <PlusCircle size={13} /> Add Ingredient
              </button>
            </div>

            <div>
              <label className="flex items-center text-[11px] font-medium text-slate-700 mb-2">
                Preparation / Description <span className="text-[9px] text-slate-400 font-normal ml-1.5">(Optional)</span>
              </label>
              <textarea
                rows="4"
                {...register("instructions")}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.instructions ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none`}
                placeholder="Step-by-step instructions..."
              ></textarea>
              {errors.instructions && <p className="text-[11px] text-red-500 mt-1">{errors.instructions.message}</p>}
            </div>
          </div>
        </form>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
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
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <Archive size={14} /> Archive Entry
            </button>
          )}

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
