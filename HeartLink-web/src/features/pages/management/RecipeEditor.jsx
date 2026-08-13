import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Trash2,
  PlusCircle,
  Save,
  CheckCircle2,
  Archive,
  ArrowUp,
  ArrowDown,
  Info,
  Clock,
  Users,
  Flame,
  Heart,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  Check,
  AlertTriangle
} from "lucide-react";

// Formatting helper for preview rendering
const formatPreviewIngredient = (ing) => {
  if (typeof ing === "string") return ing;
  if (!ing) return "";
  const hasAmount = ing.amount !== null && ing.amount !== undefined && ing.amount !== 0 && ing.amount !== "";
  if (hasAmount) {
    return `${ing.amount} ${ing.unit || ""} ${ing.name || ""}`.trim().replace(/\s+/g, " ");
  }
  return ing.name || "";
};

const foodSchema = z.object({
  name: z.string().min(1, "Name is required."),
  foodSourceType: z.string().default("Home Recipe"),
  category: z.string().default("Lunch"),
  hssTarget: z.string().default("Stable (80-100)"),
  sodium: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative()),
  calories: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative()),
  satFat: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative()),
  cholesterol: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative()),
  fiber: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative()),
  prepTime: z.preprocess((val) => (val === "" ? 15 : Number(val)), z.number().nonnegative()),
  servings: z.preprocess((val) => (val === "" ? 1 : Number(val)), z.number().nonnegative()),
  difficulty: z.string().default("Easy"),
  heartBenefit: z.string().optional().default(""),
  tags: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map(t => t.trim());
    return [];
  }, z.array(z.string())),
  status: z.string().default("draft"),
  expertValidated: z.boolean().default(false),
  mediaUrl: z.string().optional().default(""),
});

const RecipeEditor = ({ recipe, userRole, onSave, onDelete, onBack }) => {
  const [stepsList, setStepsList] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      foodSourceType: "Home Recipe",
      category: "Lunch",
      hssTarget: "Stable (80-100)",
      sodium: 0,
      calories: 0,
      satFat: 0,
      cholesterol: 0,
      fiber: 0,
      prepTime: 15,
      servings: 1,
      difficulty: "Easy",
      heartBenefit: "",
      tags: [],
      status: "draft",
      expertValidated: false,
      mediaUrl: "",
    },
  });

  const watchAll = watch();

  useEffect(() => {
    if (recipe) {
      const mappedIngs = (recipe.ingredients || []).map((ing) => {
        if (typeof ing === "string") {
          return { name: ing, amount: "", unit: "", isFreeText: true };
        }
        const amountStr = ing.amount !== null && ing.amount !== undefined ? String(ing.amount) : "";
        const isFree = ing.amount === null && ing.unit === null;
        return {
          name: ing.name || "",
          amount: amountStr,
          unit: ing.unit || "",
          isFreeText: isFree,
        };
      });
      setIngredientsList(mappedIngs);
      setStepsList(recipe.steps || []);

      reset({
        name: recipe.name || "",
        foodSourceType: recipe.foodSourceType || "Home Recipe",
        category: recipe.category || "Lunch",
        hssTarget: recipe.hssTarget || "Stable (80-100)",
        sodium: recipe.sodium || 0,
        calories: recipe.calories || 0,
        satFat: recipe.satFat || 0,
        cholesterol: recipe.cholesterol || 0,
        fiber: recipe.fiber || 0,
        prepTime: recipe.prepTime || 15,
        servings: recipe.servings || 1,
        difficulty: recipe.difficulty || "Easy",
        heartBenefit: recipe.heartBenefit || "",
        tags: recipe.tags || [],
        status: recipe.status || "draft",
        expertValidated: recipe.expertValidated || false,
        mediaUrl: recipe.mediaUrl || "",
      });
    } else {
      setIngredientsList([]);
      setStepsList([]);
      reset({
        name: "",
        foodSourceType: "Home Recipe",
        category: "Lunch",
        hssTarget: "Stable (80-100)",
        sodium: 0,
        calories: 0,
        satFat: 0,
        cholesterol: 0,
        fiber: 0,
        prepTime: 15,
        servings: 1,
        difficulty: "Easy",
        heartBenefit: "",
        tags: [],
        status: "draft",
        expertValidated: false,
        mediaUrl: "",
      });
    }
  }, [recipe, reset]);

  // Add / Remove / Reorder steps
  const addStep = () => setStepsList([...stepsList, ""]);
  const removeStep = (index) => setStepsList(stepsList.filter((_, i) => i !== index));
  const updateStepVal = (index, value) => {
    const updated = [...stepsList];
    updated[index] = value;
    setStepsList(updated);
  };
  const moveStepUp = (index) => {
    if (index === 0) return;
    const updated = [...stepsList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setStepsList(updated);
  };
  const moveStepDown = (index) => {
    if (index === stepsList.length - 1) return;
    const updated = [...stepsList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setStepsList(updated);
  };

  // Add / Remove / Toggle Ingredients
  const addIngredientRow = (isFree = false) => {
    setIngredientsList([...ingredientsList, { name: "", amount: "", unit: "", isFreeText: isFree }]);
  };
  const removeIngredientRow = (index) => {
    setIngredientsList(ingredientsList.filter((_, i) => i !== index));
  };
  const updateIngredientRow = (index, field, value) => {
    const updated = [...ingredientsList];
    updated[index] = { ...updated[index], [field]: value };
    setIngredientsList(updated);
  };
  const toggleIngredientMode = (index) => {
    const updated = [...ingredientsList];
    updated[index] = { 
      ...updated[index], 
      isFreeText: !updated[index].isFreeText,
      amount: "",
      unit: ""
    };
    setIngredientsList(updated);
  };

  // Handle Save
  const onSubmit = (formData) => {
    const formattedIngs = ingredientsList.map((ing) => {
      if (ing.isFreeText) {
        return { name: ing.name, amount: null, unit: null };
      }
      const amountVal = ing.amount === "" ? null : Number(ing.amount);
      return {
        name: ing.name,
        amount: amountVal,
        unit: ing.unit || null,
      };
    });

    onSave({
      ...formData,
      steps: stepsList.filter(s => s.trim() !== ""),
      ingredients: formattedIngs.filter(i => i.name.trim() !== ""),
    });
  };

  // Algorithmic Dietary Exclusions Check
  const getDietaryCompatibility = () => {
    const items = ingredientsList.map(ing => (ing.name || "").toLowerCase());
    const nameLower = (watchAll.name || "").toLowerCase();
    const tagList = Array.isArray(watchAll.tags) ? watchAll.tags.map(t => t.toLowerCase()) : [];

    const containsForbidden = (keywords) => {
      return items.some(item => keywords.some(k => item.includes(k))) ||
             keywords.some(k => nameLower.includes(k)) ||
             tagList.some(t => keywords.some(k => t.includes(k)));
    };

    const exclusions = {
      halal: ["pork", "bacon", "ham", "lard", "gelatin_pork"],
      vegetarian: ["chicken", "pork", "beef", "salmon", "fish", "shrimp", "bacon", "ham", "lard"],
      vegan: ["chicken", "pork", "beef", "salmon", "fish", "shrimp", "bacon", "ham", "lard", "egg", "milk", "cheese", "butter", "cream", "honey"],
      pescatarian: ["chicken", "pork", "beef", "bacon", "ham", "lard"]
    };

    return {
      vegan: !containsForbidden(exclusions.vegan),
      vegetarian: !containsForbidden(exclusions.vegetarian),
      halal: !containsForbidden(exclusions.halal),
      pescatarian: !containsForbidden(exclusions.pescatarian)
    };
  };

  const dietMap = getDietaryCompatibility();

  // Helper to determine recipe completeness
  const getCompletenessInfo = () => {
    const missing = [];
    if (!watchAll.name) missing.push("name");
    if (!watchAll.mediaUrl) missing.push("image");
    if (!watchAll.calories && !watchAll.sodium) missing.push("nutrition");
    if (!ingredientsList || ingredientsList.length === 0) missing.push("ingredients");
    if (!stepsList || stepsList.length === 0) missing.push("steps");
    
    if (missing.length === 0) {
      return { 
        isComplete: true, 
        label: "Complete", 
        colorClass: "text-emerald-700 bg-emerald-50 border-emerald-100" 
      };
    } else {
      return { 
        isComplete: false, 
        label: "Needs attention", 
        missingText: `Missing: ${missing.join(", ")}`,
        colorClass: "text-amber-700 bg-amber-50 border-amber-100" 
      };
    }
  };

  const completeness = getCompletenessInfo();

  return (
    <div className="flex flex-col min-h-0 bg-white">
      {/* Back Button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium mb-1.5 transition-colors"
          >
            <ChevronLeft size={13} /> Back to Food & Recipe Library
          </button>
          
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 leading-none">
              {recipe ? "Edit Recipe" : "Create Recipe"}
            </h2>
            
            {/* Completeness indicator */}
            <span 
              className={`text-[9px] px-2 py-0.5 rounded font-medium border leading-tight ${completeness.colorClass}`}
              title={completeness.missingText || "All content fields present"}
            >
              {completeness.label}
            </span>

            {/* Usage Counter */}
            {recipe && (
              <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                {recipe.usageCount || 0} logged meals
              </span>
            )}
          </div>
        </div>

        {/* Top Status Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-slate-500">Status:</label>
          <select
            {...register("status")}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white cursor-pointer transition-colors"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Editor Screen Workspace */}
      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        
        {/* Left Side: Editorial Form Scroll Area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-12">
          
          {/* Section 1: Recipe Details */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-1 uppercase tracking-wider">
              1. Recipe Details
            </h3>
            
            <InputField
              id="name"
              label="Recipe Name"
              placeholder="e.g. Garlic Herb Salmon"
              error={errors.name}
              {...register("name")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Food Source
                </label>
                <select
                  {...register("foodSourceType")}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-450 focus:bg-white transition-colors"
                >
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Meal Category
                </label>
                <select
                  {...register("category")}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-450 focus:bg-white transition-colors"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  HSS Suitability Target
                </label>
                <select
                  {...register("hssTarget")}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-450 focus:bg-white transition-colors"
                >
                  <option value="Stable (80-100)">Stable (80-100) — Fallback</option>
                  <option value="Moderate (60-79)">Moderate (60-79)</option>
                  <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                  <option value="Critical (<50)">Critical (&lt;50)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Low Sodium, Seafood, Oven Baked"
                onChange={(e) => {
                  const tagsArr = e.target.value.split(",").map(t => t.trim());
                  setValue("tags", tagsArr);
                }}
                defaultValue={recipe?.tags ? recipe.tags.join(", ") : ""}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-450 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Image Banner URL
              </label>
              {watchAll.mediaUrl && (
                <div className="mb-3 w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                  <img src={watchAll.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => setValue("mediaUrl", "")}
                    className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-slate-950"
                  >
                    <X size={10} />
                  </button>
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

          {/* Section 2: Nutrition */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-1 uppercase tracking-wider">
              2. Nutrition & Details
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <InputField
                id="servings"
                type="number"
                label="Servings"
                error={errors.servings}
                {...register("servings")}
              />
              <InputField
                id="prepTime"
                type="number"
                label="Prep Time (mins)"
                error={errors.prepTime}
                {...register("prepTime")}
              />
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Difficulty
                </label>
                <select
                  {...register("difficulty")}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-450 focus:bg-white transition-colors"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
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

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Heart Benefits Overview
              </label>
              <textarea
                rows="2"
                placeholder="Briefly summarize benefits..."
                {...register("heartBenefit")}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none"
              ></textarea>
            </div>
          </div>

          {/* Section 3: Ingredients Builder */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Ingredients
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addIngredientRow(false)}
                  className="text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-100"
                >
                  + Structured
                </button>
                <button
                  type="button"
                  onClick={() => addIngredientRow(true)}
                  className="text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-100"
                >
                  + Free-text
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {ingredientsList.map((ing, index) => (
                <div key={index} className="flex items-center gap-2">
                  {ing.isFreeText ? (
                    <input
                      type="text"
                      placeholder="e.g. 1 cup low-sodium chicken broth"
                      value={ing.name}
                      onChange={(e) => updateIngredientRow(index, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
                    />
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ing.amount}
                        onChange={(e) => updateIngredientRow(index, "amount", e.target.value)}
                        className="w-16 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ing.unit}
                        onChange={(e) => updateIngredientRow(index, "unit", e.target.value)}
                        className="w-16 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Ingredient Name (Chicken breast)"
                        value={ing.name}
                        onChange={(e) => updateIngredientRow(index, "name", e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleIngredientMode(index)}
                    className="text-[9px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded"
                  >
                    {ing.isFreeText ? "Structure" : "Free-text"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {ingredientsList.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-2">No ingredients added yet.</p>
              )}
            </div>
          </div>

          {/* Section 4: Instructions Builder */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Instructions
              </h3>
              <button
                type="button"
                onClick={addStep}
                className="text-[9px] font-bold bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-100"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-3">
              {stepsList.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-[9px] font-bold text-slate-400 mt-2.5 w-10 shrink-0">
                    STEP {index + 1}
                  </span>
                  
                  <textarea
                    rows="2"
                    placeholder="Describe step..."
                    value={step}
                    onChange={(e) => updateStepVal(index, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 resize-none"
                  ></textarea>

                  <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveStepUp(index)}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={index === stepsList.length - 1}
                      onClick={() => moveStepDown(index)}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-100 mt-1 shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {stepsList.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-2">No steps added yet.</p>
              )}
            </div>
          </div>

          {/* Section 5: Expert Review & Dietary Compatibility */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-1 uppercase tracking-wider">
              5. Expert Review & Dietary Compatibility
            </h3>

            {/* Expert Switch Toggle */}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <div>
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  {watchAll.expertValidated ? (
                    <ShieldCheck size={14} className="text-emerald-600" />
                  ) : (
                    <ShieldAlert size={14} className="text-slate-400" />
                  )}
                  {watchAll.expertValidated ? "Expert Reviewed" : "Pending Review"}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {watchAll.expertValidated
                    ? "Reviewed or developed with input from a qualified nutrition expert."
                    : "Sourced from an external reference and has not yet been reviewed by a nutrition expert."}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={userRole !== "medical"}
                  checked={watchAll.expertValidated}
                  onChange={(e) => setValue("expertValidated", e.target.checked)}
                />
                <div
                  className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    userRole !== "medical" ? "cursor-not-allowed opacity-50" : ""
                  } peer-checked:bg-emerald-500`}
                ></div>
              </label>
            </div>

            {/* Compact Dietary row */}
            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
              <span className="font-semibold text-slate-700">Dietary Compatibility:</span>
              <div className="flex items-center gap-3">
                {Object.keys(dietMap).map((key) => (
                  <span 
                    key={key} 
                    className={`font-semibold capitalize flex items-center gap-0.5 ${
                      dietMap[key] ? "text-emerald-700" : "text-slate-300"
                    }`}
                  >
                    {dietMap[key] ? "✓" : "—"} {key}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Lightweight Preview Frame */}
        <div className="w-[280px] shrink-0 hidden xl:flex flex-col bg-slate-50/50 p-4 border border-slate-200 rounded-2xl h-[560px] overflow-y-auto custom-scrollbar">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={11} className="text-slate-500" /> Mobile View Preview
          </h4>
          
          <div className="flex-1 bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col shadow-inner text-[10px]">
            {/* Preview Banner */}
            <div className="w-full h-24 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
              {watchAll.mediaUrl ? (
                <img src={watchAll.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Utensils size={18} className="text-slate-300 stroke-1" />
              )}
              <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white font-bold text-[7px] px-1 py-0.2 rounded uppercase">
                {watchAll.category}
              </span>
            </div>

            {/* Preview Content */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <h5 className="font-bold text-slate-900 leading-tight">
                  {watchAll.name || "Recipe Title"}
                </h5>
                <p className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide font-medium">
                  {watchAll.difficulty} • {watchAll.prepTime} mins • {watchAll.servings} serving{watchAll.servings === 1 ? "" : "s"}
                </p>
              </div>

              {/* HSS Suitability block */}
              <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">HSS SUITABILITY</span>
                  <span className="font-bold text-slate-800">{watchAll.hssTarget}</span>
                </div>
                {watchAll.expertValidated ? (
                  <span className="text-[7px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">Reviewed</span>
                ) : (
                  <span className="text-[7px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">Unreviewed</span>
                )}
              </div>

              {/* Nutrition */}
              <div className="grid grid-cols-5 gap-0.5 text-center">
                {[
                  { label: "kcal", val: watchAll.calories },
                  { label: "sodium", val: `${watchAll.sodium}mg` },
                  { label: "satFat", val: `${watchAll.satFat}g` },
                  { label: "fiber", val: `${watchAll.fiber}g` },
                  { label: "chol.", val: `${watchAll.cholesterol}mg` }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-100/40 p-1 border border-slate-50 rounded flex flex-col items-center">
                    <span className="text-[6px] text-slate-400 font-medium uppercase leading-none">{item.label}</span>
                    <span className="text-[8px] font-bold text-slate-800 mt-0.5 leading-none">{item.val}</span>
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ingredients</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[9px]">
                  {ingredientsList.map((ing, idx) => (
                    <li key={idx} className="truncate">
                      {formatPreviewIngredient(ing)}
                    </li>
                  ))}
                  {ingredientsList.length === 0 && (
                    <p className="text-[8px] text-slate-400 italic">No ingredients.</p>
                  )}
                </div>
              </div>

              {/* Steps */}
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructions</p>
                <div className="space-y-1">
                  {stepsList.map((step, idx) => (
                    <div key={idx} className="flex gap-1 items-start text-[8px] text-slate-600 leading-snug">
                      <span className="font-bold text-slate-900 shrink-0">{idx + 1}.</span>
                      <p>{step}</p>
                    </div>
                  ))}
                  {stepsList.length === 0 && (
                    <p className="text-[8px] text-slate-400 italic">No instructions.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Editor Screen Footer Actions */}
      <div className="pt-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0 mt-6">
        <div className="flex items-center gap-4">
          {/* Status Actions */}
          {watchAll.status === "archived" && (
            <button
              type="button"
              onClick={() => setValue("status", "draft")}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle2 size={13} /> Restore to Draft
            </button>
          )}
          {watchAll.status === "draft" && (
            <button
              type="button"
              onClick={() => setValue("status", "published")}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle2 size={13} /> Publish Recipe
            </button>
          )}
          {watchAll.status === "published" && (
            <button
              type="button"
              onClick={() => setValue("status", "archived")}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-orange-500 transition-colors"
            >
              <Archive size={13} /> Archive Entry
            </button>
          )}

          {recipe && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently delete this entry?")) {
                  onDelete(recipe.id);
                  onBack();
                }
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} /> Delete Entry
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-semibold text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Save size={13} /> Save Changes
          </button>
        </div>
      </div>

    </div>
  );
};

export default RecipeEditor;
