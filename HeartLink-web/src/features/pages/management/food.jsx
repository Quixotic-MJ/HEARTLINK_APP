import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  X,
  Utensils,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Save,
  Activity,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Edit2,
  MoreVertical,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import FoodFormModal from "../../../components/modals/FoodFormModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import RecipeImage from "../../../components/ui/RecipeImage";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";

// Authored recipes loaded from database

const Foods = () => {
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHss, setFilterHss] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFoodSource, setFilterFoodSource] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  const [loading, setLoading] = useState(true);

  const [activeMenuRecipeId, setActiveMenuRecipeId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuRecipeId(activeMenuRecipeId === id ? null : id);
  };

  const handleUpdateStatus = async (recipe, newStatus) => {
    try {
      const payload = {
        name: recipe.name,
        category: recipe.category,
        hssTarget: recipe.hssTarget,
        foodSourceType: recipe.foodSourceType,
        prepTimeMinutes: recipe.prepTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        heartBenefit: recipe.heartBenefit,
        sodium: recipe.sodium,
        calories: recipe.calories,
        satFat: recipe.satFat,
        cholesterol: recipe.cholesterol,
        fiber: recipe.fiber,
        status: newStatus,
        expertValidated: recipe.expertValidated,
        mediaUrl: recipe.mediaUrl,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      };
      await apiFetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(newStatus === "published" ? "Recipe Published" : "Recipe Restored to Draft", {
        description: `"${recipe.name}" status updated to ${newStatus}.`,
      });
      fetchFoods();
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to Update Status", {
        description: err?.data?.detail || "Could not change status.",
      });
    }
  };

  const handleArchiveRecipe = async (recipe) => {
    const confirmed = window.confirm(
      `Archive "${recipe.name}"?\n\nThis will hide the recipe from mobile recommendations and search. The recipe will remain in the admin library.`
    );
    if (!confirmed) return;

    try {
      const payload = {
        name: recipe.name,
        category: recipe.category,
        hssTarget: recipe.hssTarget,
        foodSourceType: recipe.foodSourceType,
        prepTimeMinutes: recipe.prepTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        heartBenefit: recipe.heartBenefit,
        sodium: recipe.sodium,
        calories: recipe.calories,
        satFat: recipe.satFat,
        cholesterol: recipe.cholesterol,
        fiber: recipe.fiber,
        status: "archived",
        expertValidated: recipe.expertValidated,
        mediaUrl: recipe.mediaUrl,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      };
      await apiFetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.info("Recipe Archived", {
        description: `"${recipe.name}" is now archived and hidden from mobile.`,
      });
      fetchFoods();
    } catch (err) {
      console.error("Failed to archive recipe", err);
      toast.error("Failed to Archive Recipe", {
        description: err?.data?.detail || "Could not archive recipe.",
      });
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    const confirmed = window.confirm(
      `Delete '${recipe.name}'?\n\nDeleted recipes cannot be recovered.`
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      toast.success("Recipe Deleted", {
        description: `"${recipe.name}" was permanently removed.`,
      });
      fetchFoods();
    } catch (err) {
      console.error("Failed to delete recipe", err);
      toast.error("Failed to Delete Recipe", {
        description: err?.data?.detail || "Could not delete recipe.",
      });
    }
  };

  // Close menus on outside click/Escape
  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuRecipeId(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenuRecipeId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/recipes");
      const mapped = data.map((r) => {
        let hssLabel = "Stable (80-100)";
        if (r.hss_tier === "Moderate") hssLabel = "Moderate (60-79)";
        if (r.hss_tier === "Elevated Risk") hssLabel = "Elevated Risk (50-59)";
        if (r.hss_tier === "Critical") hssLabel = "Critical (<50)";
        
        return {
          id: r.id,
          name: r.name || "",
          subtitle: r.subtitle || "",
          category: r.category || "Meal",
          hssTarget: hssLabel,
          hssTier: r.hss_tier || "Stable",
          sodium: r.sodium_mg || 0,
          calories: r.calories || 0,
          satFat: r.saturated_fat_g || 0,
          cholesterol: r.cholesterol_mg || 0,
          fiber: r.fiber_g || 0,
          prepTimeMinutes: r.prep_time_minutes || 15,
          servings: r.servings || 1,
          difficulty: r.difficulty || "Easy",
          heartBenefit: r.heart_benefit || "",
          status: r.status || "draft",
          expertValidated: r.expert_validated || false,
          mediaUrl: r.image_url || "",
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          foodSourceType: r.foodSourceType || "Home Recipe",
          tags: r.tags || [],
        };
      });
      setRecipes(mapped);
    } catch (err) {
      console.error("Failed to fetch foods", err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFoods();
  }, []);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role;

  // Open Modal for Create or Edit
  const openModal = (recipe = null) => {
    setEditingRecipe(recipe || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecipe(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterHss("all");
    setFilterCategory("all");
    setFilterFoodSource("all");
    setFilterReview("all");
  };

  // Filter Logic
  const filteredRecipes = recipes.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      (r.tags && r.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesHss = filterHss === "all" || r.hssTier === filterHss;
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesFoodSource = filterFoodSource === "all" || r.foodSourceType === filterFoodSource;

    let matchesReview = true;
    if (filterReview === "reviewed") {
      matchesReview = r.expertValidated === true;
    } else if (filterReview === "pending") {
      matchesReview = r.expertValidated === false;
    }

    return matchesSearch && matchesStatus && matchesHss && matchesCategory && matchesFoodSource && matchesReview;
  });

  // Badge Color Helper
  const getHssBadgeColor = (target) => {
    if (target.includes("Stable"))
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (target.includes("Moderate"))
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (target.includes("Elevated Risk"))
      return "bg-[#E55F37]/10 text-[#E55F37] border border-[#E55F37]/20";
    return "bg-red-500/10 text-red-400 border border-red-500/20";
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <Sparkles size={11} />
            <span>Content Library</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            Food & Recipe Library
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Manage nutritional databases, heart-healthy recipes, and clinical HSS targets.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 text-white font-semibold text-xs px-4 py-2.5 rounded-xl bg-[#E55F37] hover:bg-[#D4542E] shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Create New Entry</span>
        </button>
      </div>

      {/* Main View: Data Table Container */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-[#161616] space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search recipes, categories, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>
            
            {/* Quick Clear button */}
            {(searchQuery || filterStatus !== "all" || filterHss !== "all" || filterCategory !== "all" || filterFoodSource !== "all" || filterReview !== "all") && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0 flex items-center gap-1 self-start md:self-auto cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Compact Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 pt-1">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Status</option>
                <option value="published" className="bg-[#161616]">Published</option>
                <option value="draft" className="bg-[#161616]">Draft</option>
                <option value="archived" className="bg-[#161616]">Archived</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* HSS Tier Dropdown */}
            <div className="relative">
              <select
                value={filterHss}
                onChange={(e) => setFilterHss(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All HSS Tiers</option>
                <option value="Stable" className="bg-[#161616]">Stable</option>
                <option value="Moderate" className="bg-[#161616]">Moderate</option>
                <option value="Elevated Risk" className="bg-[#161616]">Elevated Risk</option>
                <option value="Critical" className="bg-[#161616]">Critical</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Categories</option>
                <option value="Breakfast" className="bg-[#161616]">Breakfast</option>
                <option value="Lunch" className="bg-[#161616]">Lunch</option>
                <option value="Dinner" className="bg-[#161616]">Dinner</option>
                <option value="Snack" className="bg-[#161616]">Snack</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Food Source Dropdown */}
            <div className="relative">
              <select
                value={filterFoodSource}
                onChange={(e) => setFilterFoodSource(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Food Sources</option>
                <option value="Home Recipe" className="bg-[#161616]">Home Recipe</option>
                <option value="Fast Food Chain" className="bg-[#161616]">Fast Food Chain</option>
                <option value="Local Carenderia" className="bg-[#161616]">Local Carenderia</option>
                <option value="Raw Ingredient" className="bg-[#161616]">Raw Ingredient</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Review Dropdown */}
            <div className="relative">
              <select
                value={filterReview}
                onChange={(e) => setFilterReview(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">All Review Status</option>
                <option value="reviewed" className="bg-[#161616]">Expert Reviewed</option>
                <option value="pending" className="bg-[#161616]">Pending Review</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Directory List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 w-1/3">
                  Food / Meal Name
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10">
                  HSS Suitability
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10">
                  Nutrition Snapshot
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 text-center">
                  Expert Review
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-white/5">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0 bg-white/10" />
                        <div>
                          <Skeleton className="w-32 h-4 mb-1 bg-white/10" />
                          <Skeleton className="w-20 h-3 bg-white/10" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-24 h-5 rounded-full bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-20 h-4 mb-1 bg-white/10" />
                      <Skeleton className="w-16 h-3 bg-white/10" />
                    </td>
                    <td className="py-4 px-5 flex justify-center">
                      <Skeleton className="w-7 h-7 rounded-full bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex justify-end">
                        <Skeleton className="w-6 h-6 rounded-md bg-white/10" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : filteredRecipes.length > 0 ? (
              <tbody className="divide-y divide-white/5">
                {filteredRecipes.map((recipe, index) => {
                  const badgeClass = getHssBadgeColor(recipe.hssTarget);
                  return (
                    <tr
                      key={recipe.id}
                      className={`hover:bg-white/5 transition-colors group cursor-pointer ${recipe.status === "archived" ? "opacity-50" : ""}`}
                      onClick={() => openModal(recipe)}
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <RecipeImage
                            src={recipe.mediaUrl}
                            alt={recipe.name}
                            containerClassName="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-[#36272B] border border-[#E55F37]/30 text-[#E55F37] shadow-sm"
                            fallbackIconSize={15}
                            fallbackIconClassName="text-[#E55F37]"
                          />
                          <div>
                            <p className="text-white font-semibold text-xs mb-0.5">
                              {recipe.name}
                            </p>
                            <p className="text-[#89899C] text-[10px] font-medium">
                              {recipe.category} • <span className="capitalize">{recipe.status}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <span
                          className={`inline-flex items-center text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${badgeClass}`}
                        >
                          {recipe.hssTarget}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <p className="text-white text-xs font-semibold flex items-center gap-1.5">
                          <Activity size={13} className="text-[#E55F37]" />{" "}
                          {recipe.sodium}mg{" "}
                          <span className="text-[10px] text-[#89899C] font-normal">
                            Sodium
                          </span>
                        </p>
                        <p className="text-[#89899C] text-[10px] font-medium mt-1 ml-[18px]">
                          {recipe.calories} kcal
                        </p>
                      </td>
                      <td className="py-4 px-5 align-middle text-center">
                        {recipe.expertValidated ? (
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto"
                            title="Expert Reviewed"
                          >
                            <ShieldCheck size={14} />
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto"
                            title="Pending Review"
                          >
                            <ShieldAlert size={14} />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 align-middle text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            onClick={(e) => toggleMenu(e, recipe.id)}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        {activeMenuRecipeId === recipe.id && (
                          <div
                            className={`absolute right-5 w-44 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 text-left ${
                              index >= filteredRecipes.length - 2 && filteredRecipes.length > 2
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                            }`}
                          >
                            {/* Edit Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuRecipeId(null);
                                openModal(recipe);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Edit2 size={13} className="text-[#E55F37]" /> Edit Recipe
                            </button>

                            {/* Publish Action (DRAFT only) */}
                            {recipe.status === "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  handleUpdateStatus(recipe, "published");
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <CheckCircle2 size={13} className="text-emerald-400" /> Publish
                              </button>
                            )}

                            {/* Archive Action (PUBLISHED only) */}
                            {recipe.status === "published" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  handleArchiveRecipe(recipe);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Archive size={13} className="text-amber-400" /> Archive
                              </button>
                            )}

                            {/* Restore Action (ARCHIVED only) */}
                            {recipe.status === "archived" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  handleUpdateStatus(recipe, "draft");
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <CheckCircle2 size={13} className="text-blue-400" /> Restore to Draft
                              </button>
                            )}

                            {/* Divider */}
                            <div className="border-t border-white/10 my-1" />

                            {/* Delete Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuRecipeId(null);
                                handleDeleteRecipe(recipe);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ) : null}
          </table>

          {!loading && filteredRecipes.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 border-t border-white/5">
              {recipes.length === 0 ? (
                <p className="font-medium text-slate-400">No recipes available.</p>
              ) : (
                <>
                  <p className="font-medium text-slate-400">No recipes match your filters.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Modal Component */}
      <FoodFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        recipe={editingRecipe}
        userRole={userRole}
        onSave={async (data) => {
          try {
            if (editingRecipe?.id) {
              await apiFetch(`/api/recipes/${editingRecipe.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              toast.success("Recipe Updated", {
                description: `"${data.name}" was saved successfully.`,
              });
            } else {
              await apiFetch("/api/recipes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              toast.success("Recipe Created", {
                description: `"${data.name}" was added to the food library.`,
              });
            }
            fetchFoods();
          } catch (err) {
            console.error("Error saving recipe:", err);
            toast.error("Failed to Save Recipe", {
              description: err?.data?.detail || "Could not save recipe to database.",
            });
          }
        }}
        onDelete={async (id) => {
          try {
            await apiFetch(`/api/recipes/${id}`, { method: "DELETE" });
            toast.success("Recipe Deleted", {
              description: "The recipe has been permanently removed.",
            });
            fetchFoods();
          } catch (err) {
            console.error("Error deleting recipe:", err);
            toast.error("Failed to Delete Recipe", {
              description: err?.data?.detail || "Could not delete recipe.",
            });
          }
        }}
      />
      {/* Floating Success Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#1A1A1A] border border-white/10 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl z-[9999] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={14} className="text-emerald-400" />
          {toastMessage}
        </div>
      )}
      </AdminLayout>
  );
};

export default Foods;
