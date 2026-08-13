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
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import FoodFormModal from "../../../components/modals/FoodFormModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import RecipeImage from "../../../components/ui/RecipeImage";

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
      showToast(newStatus === "published" ? "Recipe published." : "Recipe restored to draft.");
      fetchFoods();
    } catch (err) {
      console.error("Failed to update status", err);
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
      showToast("Recipe archived.");
      fetchFoods();
    } catch (err) {
      console.error("Failed to archive recipe", err);
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    const confirmed = window.confirm(
      `Delete '${recipe.name}'?\n\nDeleted recipes cannot be recovered.`
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      showToast("Recipe deleted.");
      fetchFoods();
    } catch (err) {
      console.error("Failed to delete recipe", err);
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
          category: r.category || "Meal",
          hssTarget: hssLabel,
          hssTier: r.hss_tier || "Stable",
          sodium: r.sodium_mg || 0,
          calories: r.calories || 0,
          satFat: r.saturated_fat_g || 0,
          cholesterol: r.cholesterol_mg || 0,
          fiber: r.fiber_g || 0,
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

  // Toggle this between "sysadmin" and "medical" to test the Validation Toggle
  const [userRole] = useState("medical");

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
      return { bg: "rgba(15,23,42,0.05)", text: "#0f172a", border: "transparent" };
    if (target.includes("Moderate") || target.includes("Elevated Risk"))
      return { bg: "rgba(245,158,11,0.08)", text: "#d97706", border: "transparent" };
    return { bg: "rgba(239,68,68,0.08)", text: "#dc2626", border: "transparent" };
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] font-medium text-slate-400 tracking-[0.22em] uppercase mb-2">
            Content Library
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Food & Meal Library.
          </h2>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 text-white font-medium text-[11px] px-3.5 py-2 rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Plus size={14} strokeWidth={2} /> Create New Entry
        </button>
      </div>

      {/* Main View: Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search recipes, categories, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white"
              />
            </div>
            
            {/* Quick Clear button */}
            {(searchQuery || filterStatus !== "all" || filterHss !== "all" || filterCategory !== "all" || filterFoodSource !== "all" || filterReview !== "all") && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-red-500 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors shrink-0 flex items-center gap-1 self-start md:self-auto"
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
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={11} className="text-slate-400" />
              </div>
            </div>

            {/* HSS Tier Dropdown */}
            <div className="relative">
              <select
                value={filterHss}
                onChange={(e) => setFilterHss(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All HSS Tiers</option>
                <option value="Stable">Stable</option>
                <option value="Moderate">Moderate</option>
                <option value="Elevated Risk">Elevated Risk</option>
                <option value="Critical">Critical</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={11} className="text-slate-400" />
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Categories</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={11} className="text-slate-400" />
              </div>
            </div>

            {/* Food Source Dropdown */}
            <div className="relative">
              <select
                value={filterFoodSource}
                onChange={(e) => setFilterFoodSource(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Food Sources</option>
                <option value="Home Recipe">Home Recipe</option>
                <option value="Fast Food Chain">Fast Food Chain</option>
                <option value="Local Carenderia">Local Carenderia</option>
                <option value="Raw Ingredient">Raw Ingredient</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={11} className="text-slate-400" />
              </div>
            </div>

            {/* Review Dropdown */}
            <div className="relative">
              <select
                value={filterReview}
                onChange={(e) => setFilterReview(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Review Status</option>
                <option value="reviewed">Expert Reviewed</option>
                <option value="pending">Pending Review</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={11} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Directory List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 w-1/3">
                  Food / Meal Name
                </th>
                <th className="py-3 px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">
                  HSS Suitability
                </th>
                <th className="py-3 px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">
                  Nutrition Snapshot
                </th>
                <th className="py-3 px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 text-center">
                  Expert Review
                </th>
                <th className="py-3 px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-slate-50">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <div>
                          <Skeleton className="w-32 h-4 mb-1" />
                          <Skeleton className="w-20 h-3" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-24 h-5 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-20 h-4 mb-1" />
                      <Skeleton className="w-16 h-3" />
                    </td>
                    <td className="py-4 px-5 flex justify-center">
                      <Skeleton className="w-7 h-7 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex justify-end">
                        <Skeleton className="w-6 h-6 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : filteredRecipes.length > 0 ? (
              <tbody className="divide-y divide-slate-50">
                {filteredRecipes.map((recipe, index) => {
                  const badge = getHssBadgeColor(recipe.hssTarget);
                  return (
                    <tr
                      key={recipe.id}
                      className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${recipe.status === "archived" ? "opacity-50" : ""}`}
                      onClick={() => openModal(recipe)}
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <RecipeImage
                            src={recipe.mediaUrl}
                            alt={recipe.name}
                            containerClassName="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-slate-100 border border-slate-200/50"
                            fallbackIconSize={14}
                          />
                          <div>
                            <p className="text-slate-900 font-semibold text-xs mb-0.5">
                              {recipe.name}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              {recipe.category} • {recipe.status}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <span
                          className="inline-flex items-center text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                          }}
                        >
                          {recipe.hssTarget}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <p className="text-slate-900 text-xs font-semibold flex items-center gap-1.5">
                          <Activity size={13} style={{ color: "#0f172a" }} />{" "}
                          {recipe.sodium}mg{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            Sodium
                          </span>
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1 ml-[18px]">
                          {recipe.calories} kcal
                        </p>
                      </td>
                      <td className="py-4 px-5 align-middle text-center">
                        {recipe.expertValidated ? (
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 mx-auto"
                            title="Expert Reviewed"
                          >
                            <ShieldCheck size={14} />
                          </div>
                        ) : (
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-500 mx-auto"
                            title="Pending Review"
                          >
                            <ShieldAlert size={14} />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 align-middle text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={(e) => toggleMenu(e, recipe.id)}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        {activeMenuRecipeId === recipe.id && (
                          <div
                            className={`absolute right-5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-left ${
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
                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <Edit2 size={13} /> Edit Recipe
                            </button>

                            {/* Publish Action (DRAFT only) */}
                            {recipe.status === "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  handleUpdateStatus(recipe, "published");
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                              >
                                <CheckCircle2 size={13} className="text-emerald-500" /> Publish
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
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                              >
                                <Archive size={13} className="text-amber-500" /> Archive
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
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                              >
                                <CheckCircle2 size={13} className="text-blue-500" /> Restore to Draft
                              </button>
                            )}

                            {/* Divider */}
                            <div className="border-t border-slate-100 my-1" />

                            {/* Delete Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuRecipeId(null);
                                handleDeleteRecipe(recipe);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
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
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3 border-t border-slate-50">
              {recipes.length === 0 ? (
                <p className="font-medium text-slate-400">No recipes available.</p>
              ) : (
                <>
                  <p className="font-medium text-slate-400">No recipes match your filters.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 px-4 py-2 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{ backgroundColor: "#0f172a" }}
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
            } else {
              await apiFetch("/api/recipes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            }
            fetchFoods();
          } catch (err) {
            console.error("Error saving recipe:", err);
          }
        }}
        onDelete={async (id) => {
          try {
            await apiFetch(`/api/recipes/${id}`, { method: "DELETE" });
            fetchFoods();
          } catch (err) {
            console.error("Error deleting recipe:", err);
          }
        }}
      />
      {/* Floating Success Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl z-[9999] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={14} className="text-emerald-400" />
          {toastMessage}
        </div>
      )}
      </AdminLayout>
  );
};

export default Foods;
