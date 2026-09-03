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
  Trash2,
  Edit2,
  MoreVertical,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import FoodFormModal from "../../../components/modals/FoodFormModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import RecipeImage from "../../../components/ui/RecipeImage";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";

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

  // Animated Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: null,
    entityInfo: null,
    impactDetails: [],
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuRecipeId(activeMenuRecipeId === id ? null : id);
  };

  // Close actions dropdown when clicking anywhere outside
  React.useEffect(() => {
    const handleDocumentClick = () => setActiveMenuRecipeId(null);
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

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

  const requestArchiveRecipe = (recipe) => {
    if (!recipe) return;
    setConfirmConfig({
      isOpen: true,
      title: "Archive Recipe?",
      subtitle: "Hide from Mobile Patients",
      description: `Archive "${recipe.name}"? This recipe will be hidden from mobile patient recommendations while remaining accessible in your admin library.`,
      confirmText: "Archive Recipe",
      cancelText: "Cancel",
      variant: "warning",
      icon: Archive,
      entityInfo: {
        name: recipe.name,
        badge: "Published -> Archived",
        email: `${recipe.category} • ${recipe.hssTarget}`,
        id: recipe.id,
      },
      impactDetails: [
        "Hidden from patient search results and personalized meal plans.",
        "Can be restored back to Draft status at any time.",
      ],
      onConfirm: async () => {
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
          toast.success("Recipe Archived", {
            description: `"${recipe.name}" has been moved to archive.`,
          });
          fetchFoods();
        } catch (err) {
          console.error("Failed to archive recipe", err);
          toast.error("Failed to Archive Recipe", {
            description: err?.data?.detail || "Could not archive recipe.",
          });
        }
      },
    });
  };

  const requestDeleteRecipe = (recipe) => {
    if (!recipe) return;
    setConfirmConfig({
      isOpen: true,
      title: "Delete Recipe Permanently?",
      subtitle: "Permanent Database Action",
      description: `Permanently delete "${recipe.name}"? This action cannot be undone and will remove all nutritional profiles, ingredients, and steps.`,
      confirmText: "Delete Permanently",
      cancelText: "Cancel",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: recipe.name,
        badge: recipe.status?.toUpperCase() || "RECIPE",
        email: `${recipe.category} • ${recipe.hssTarget}`,
        id: recipe.id,
      },
      impactDetails: [
        "Permanently removed from the nutritional database.",
        "Patient meal plan logs referencing this recipe will retain historical logs only.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
          toast.success("Recipe Deleted", {
            description: `"${recipe.name}" was permanently removed.`,
          });
          if (editingRecipe?.id === recipe.id) {
            closeModal();
          }
          fetchFoods();
        } catch (err) {
          console.error("Failed to delete recipe", err);
          toast.error("Failed to Delete Recipe", {
            description: err?.data?.detail || "Could not delete recipe.",
          });
        }
      },
    });
  };

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/recipes");
      const list = Array.isArray(res) ? res : res.data || [];
      const mapped = list.map((r) => {
        let hssTier = "Stable";
        const hssVal = r.hss_target || "";
        if (hssVal.includes("Moderate")) hssTier = "Moderate";
        else if (hssVal.includes("Elevated")) hssTier = "Elevated Risk";
        else if (hssVal.includes("Critical")) hssTier = "Critical";

        return {
          id: r.id,
          name: r.name,
          category: r.category || "Breakfast",
          hssTarget: r.hss_target || "Stable (80-100)",
          hssTier: hssTier,
          prepTimeMinutes: r.prep_time_minutes || 15,
          servings: r.servings || 1,
          difficulty: r.difficulty || "Easy",
          sodium: r.sodium || 0,
          calories: r.calories || 0,
          satFat: r.sat_fat || 0,
          cholesterol: r.cholesterol || 0,
          fiber: r.fiber || 0,
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

  // HSS Badge Styling
  const getHssBadgeStyle = (target) => {
    if (target.includes("Stable"))
      return "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]";
    if (target.includes("Moderate"))
      return "bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8]";
    if (target.includes("Elevated"))
      return "bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD]";
    return "bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8]";
  };

  const hasActiveFilters = 
    Boolean(searchQuery) ||
    filterStatus !== "all" ||
    filterHss !== "all" ||
    filterCategory !== "all" ||
    filterFoodSource !== "all" ||
    filterReview !== "all";

  return (
    <AdminLayout>
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── PAGE HEAD ── */}
        <div className="flex flex-wrap gap-4 justify-between items-end mb-6">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1">
              Content library
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Food &amp; recipe library
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[50ch] leading-[1.5]">
              Manage nutritional databases, heart-healthy recipes, and clinical HSS targets.
            </p>
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 text-white font-semibold text-[13px] px-4 py-2.5 rounded-[8px] bg-[#E8532E] hover:bg-[#C13E20] shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create new entry</span>
          </button>
        </div>

        {/* ── MAIN CARD: SEARCH, FILTER & TABLE ── */}
        <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] shadow-2xs overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-[#DCE3DF] bg-[#FFFFFF] space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893]"
                />
                <input
                  type="text"
                  placeholder="Search recipes, categories, or tags…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
                />
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-[#A93226] font-semibold px-3 py-2 rounded-[8px] border border-[#F0C4B8] bg-[#F7E4E1] hover:bg-[#F0C4B8] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Clear filters</span>
                </button>
              )}
            </div>

            {/* Dropdown Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 pt-0.5">
              {/* Status */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">All status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* HSS Tier */}
              <div className="relative">
                <select
                  value={filterHss}
                  onChange={(e) => setFilterHss(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">All HSS tiers</option>
                  <option value="Stable">Stable</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Elevated Risk">Elevated Risk</option>
                  <option value="Critical">Critical</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Category */}
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">All categories</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Food Source */}
              <div className="relative">
                <select
                  value={filterFoodSource}
                  onChange={(e) => setFilterFoodSource(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">All food sources</option>
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Review Status */}
              <div className="relative">
                <select
                  value={filterReview}
                  onChange={(e) => setFilterReview(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">All review status</option>
                  <option value="reviewed">Expert Reviewed</option>
                  <option value="pending">Pending Review</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-1/3">
                    Food / meal name
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    HSS suitability
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Nutrition snapshot
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-center">
                    Expert review
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-[#DCE3DF]/60">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-[8px] shrink-0 bg-[#DCE3DF]/70" />
                          <div>
                            <Skeleton className="w-32 h-4 mb-1.5 bg-[#DCE3DF]/70 rounded" />
                            <Skeleton className="w-20 h-3 bg-[#DCE3DF]/70 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-24 h-5 rounded-full bg-[#DCE3DF]/70" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-4 mb-1 bg-[#DCE3DF]/70 rounded" />
                        <Skeleton className="w-16 h-3 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5 flex justify-center">
                        <Skeleton className="w-7 h-7 rounded-full bg-[#DCE3DF]/70" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Skeleton className="w-6 h-6 rounded-md bg-[#DCE3DF]/70 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredRecipes.length > 0 ? (
                <tbody className="divide-y divide-[#DCE3DF]">
                  {filteredRecipes.map((recipe, index) => {
                    const badgeClass = getHssBadgeStyle(recipe.hssTarget);
                    return (
                      <tr
                        key={recipe.id}
                        onClick={() => openModal(recipe)}
                        className={`hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer ${
                          recipe.status === "archived" ? "opacity-60 bg-[#EDF1EF]/30" : ""
                        }`}
                      >
                        {/* Food Name & Image */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <RecipeImage
                              src={recipe.mediaUrl}
                              alt={recipe.name}
                              containerClassName="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden bg-[#FBEAE6] border border-[#DCE3DF] text-[#E8532E] shadow-2xs"
                              fallbackIconSize={16}
                              fallbackIconClassName="text-[#E8532E]"
                            />
                            <div className="min-w-0 pr-2">
                              <p className="text-[#152131] font-semibold text-[13px] leading-tight mb-0.5 truncate">
                                {recipe.name}
                              </p>
                              <p className="text-[#5C6B66] text-[11px] font-medium truncate">
                                {recipe.category} · <span className="capitalize">{recipe.status}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* HSS Badge */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {recipe.hssTarget}
                          </span>
                        </td>

                        {/* Nutrition */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <p className="text-[#152131] text-[12.5px] font-semibold flex items-center gap-1.5 m-0 leading-tight">
                            <Activity size={13} className="text-[#E8532E] shrink-0" />
                            {recipe.sodium}mg{" "}
                            <span className="text-[10.5px] text-[#5C6B66] font-normal">
                              Sodium
                            </span>
                          </p>
                          <p className="text-[#5C6B66] text-[11px] font-medium mt-0.5 ml-[18px]">
                            {recipe.calories} kcal
                          </p>
                        </td>

                        {/* Expert Review Status */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle text-center">
                          {recipe.expertValidated ? (
                            <div
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] mx-auto"
                              title="Expert Reviewed"
                            >
                              <ShieldCheck size={14} />
                            </div>
                          ) : (
                            <div
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] mx-auto"
                              title="Pending Review"
                            >
                              <ShieldAlert size={14} />
                            </div>
                          )}
                        </td>

                        {/* Actions Menu */}
                        <td 
                          className="py-3.5 px-4 sm:px-5 align-middle text-right relative" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="p-1.5 text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-[8px] transition-colors cursor-pointer"
                              onClick={(e) => toggleMenu(e, recipe.id)}
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>

                          {activeMenuRecipeId === recipe.id && (
                            <div
                              className={`absolute right-4 w-44 bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] shadow-xl p-1.5 z-50 text-left ${
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
                                className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Edit2 size={13} className="text-[#E8532E]" />
                                <span>Edit recipe</span>
                              </button>

                              {/* Publish Action (DRAFT only) */}
                              {recipe.status === "draft" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuRecipeId(null);
                                    handleUpdateStatus(recipe, "published");
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-[#1B6E63]" />
                                  <span>Publish</span>
                                </button>
                              )}

                              {/* Archive Action (PUBLISHED only) */}
                              {recipe.status === "published" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuRecipeId(null);
                                    requestArchiveRecipe(recipe);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Archive size={13} className="text-[#A9741B]" />
                                  <span>Archive</span>
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-[#1B6E63]" />
                                  <span>Restore to draft</span>
                                </button>
                              )}

                              {/* Divider */}
                              <div className="border-t border-[#DCE3DF] my-1" />

                              {/* Delete Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  requestDeleteRecipe(recipe);
                                }}
                                className="w-full px-2.5 py-1.5 text-[12px] text-[#A93226] hover:bg-[#F7E4E1] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
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

            {/* Empty State */}
            {!loading && filteredRecipes.length === 0 && (
              <div className="p-12 text-center text-[#5C6B66] text-[13px] flex flex-col items-center justify-center gap-2.5 border-t border-[#DCE3DF]">
                {recipes.length === 0 ? (
                  <p className="font-medium text-[#5C6B66]">No recipes available in the library.</p>
                ) : (
                  <>
                    <p className="font-medium text-[#152131]">No recipes match your filter criteria.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-1 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] transition-colors cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Component for Create / Edit */}
        <FoodFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          recipe={editingRecipe}
          userRole={userRole}
          onSave={async (formData) => {
            try {
              if (editingRecipe?.id) {
                await apiFetch(`/api/recipes/${editingRecipe.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData),
                });
                toast.success("Recipe Updated", {
                  description: `"${formData.name}" was saved successfully.`,
                });
              } else {
                await apiFetch("/api/recipes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData),
                });
                toast.success("Recipe Created", {
                  description: `"${formData.name}" was added to the food library.`,
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
          onDelete={(recipeToDelete) => {
            requestDeleteRecipe(recipeToDelete || editingRecipe);
          }}
        />

        {/* Reusable Action Confirmation Modal */}
        <ConfirmActionModal
          isOpen={confirmConfig.isOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          subtitle={confirmConfig.subtitle}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          variant={confirmConfig.variant}
          icon={confirmConfig.icon}
          entityInfo={confirmConfig.entityInfo}
          impactDetails={confirmConfig.impactDetails}
        />
      </div>
    </AdminLayout>
  );
};

export default Foods;
