import React, { useState } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Archive,
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
import { BulkApproveBar, SelectBox } from "../../../components/modals/BulkApprove";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import RecipeImage from "../../../components/ui/RecipeImage";
import { useAuth } from "../../../contexts/useAuth";
import { toast } from "sonner";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader } from "../../../styles/designSystem";

// Database hss_tier -> the label the recipe form uses
const HSS_TIER_LABELS = {
  Stable: "Stable (80-100)",
  Moderate: "Moderate (60-79)",
  "Elevated Risk": "Elevated Risk (50-59)",
  Critical: "Critical (<50)",
};

// HL-030: an "Others" recipe shows the name typed for it
const categoryLabel = (recipe) =>
  recipe.category === "Others" && recipe.categoryOther ? recipe.categoryOther : recipe.category;

// The library as the screen shows it, from the API's rows (HL-035: loaded through React Query)
const NO_RECIPES = [];
const toRecipes = (res) => {
  const list = Array.isArray(res) ? res : res.data || [];
  const mapped = list.map((r) => {
    // The API returns database column names (hss_tier, sodium_mg, ...). Reading the wrong
    // names showed 0 here, and saving the recipe then wrote those 0s back.
    const hssTier = HSS_TIER_LABELS[r.hss_tier] ? r.hss_tier : "Stable";

    return {
      id: r.id,
      name: r.name,
      category: r.category || "Breakfast",
      categoryOther: r.category_other || "",
      hssTarget: HSS_TIER_LABELS[hssTier],
      hssTier: hssTier,
      prepTimeMinutes: r.prep_time_minutes || 15,
      servings: r.servings || 1,
      difficulty: r.difficulty || "Easy",
      sodium: r.sodium_mg || 0,
      calories: r.calories || 0,
      satFat: r.saturated_fat_g || 0,
      cholesterol: r.cholesterol_mg || 0,
      fiber: r.fiber_g || 0,
      heartBenefit: r.heart_benefit || "",
      status: r.status || "draft",
      expertValidated: r.expert_validated || false,
      reviewedAt: r.reviewed_at || null,
      reviewNote: r.review_note || "",
      mediaUrl: r.image_url || "",
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      foodSourceType: r.foodSourceType || "Home Recipe",
      tags: r.tags || [],
    };
  });
  return mapped;
};

const Foods = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHss, setFilterHss] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFoodSource, setFilterFoodSource] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  // A save through apiFetch refreshes this list by itself
  const recipesQuery = useApiQuery("/api/recipes", { select: toRecipes });
  const recipes = recipesQuery.data ?? NO_RECIPES;
  const loading = recipesQuery.isPending;

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

  // The row menu is pinned to the screen next to its button, so the table's scroll box can't cut it off.
  const [menuPos, setMenuPos] = useState(null);
  const toggleMenu = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + 200 > window.innerHeight;
    setMenuPos({
      right: window.innerWidth - rect.right,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
    setActiveMenuRecipeId(activeMenuRecipeId === id ? null : id);
  };

  // Close actions dropdown when clicking anywhere outside
  React.useEffect(() => {
    const handleDocumentClick = () => setActiveMenuRecipeId(null);
    document.addEventListener("click", handleDocumentClick);
    // The menu is pinned to the screen, so it closes when anything scrolls instead of floating away.
    window.addEventListener("scroll", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("scroll", handleDocumentClick, true);
    };
  }, []);

  const handleUpdateStatus = async (recipe, newStatus) => {
    try {
      const payload = {
        name: recipe.name,
        category: recipe.category,
        categoryOther: recipe.categoryOther,
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
        email: `${categoryLabel(recipe)} • ${recipe.hssTarget}`,
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
            categoryOther: recipe.categoryOther,
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
        email: `${categoryLabel(recipe)} • ${recipe.hssTarget}`,
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
        } catch (err) {
          console.error("Failed to delete recipe", err);
          toast.error("Failed to Delete Recipe", {
            description: err?.data?.detail || "Could not delete recipe.",
          });
        }
      },
    });
  };


  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role;
  // Approving several at once: only the Dietitian who approves sees the checkboxes (HL-026/037).
  const canApprove = userRole === "medical_expert" && user?.expert_type === "Dietitian";
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
      categoryLabel(r).toLowerCase().includes(q) ||
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
  const waitingShown = canApprove ? filteredRecipes.filter((x) => !x.expertValidated) : [];

  // HSS Badge Styling
  const getHssBadgeStyle = (target) => {
    if (target.includes("Stable"))
      return "bg-ds-mint text-ds-charcoal border border-ds-mint";
    if (target.includes("Moderate"))
      return "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold";
    if (target.includes("Elevated"))
      return "bg-ds-tint text-ds-on-tint border border-ds-tint";
    return "bg-ds-rose text-ds-ink border border-ds-rose";
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
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Content library"
          title="Food & recipe library"
          description="Manage nutritional databases, heart-healthy recipes, and clinical HSS targets."
          actions={
            <button
              onClick={() => openModal()}
              className={UI.button.primary}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Create new entry</span>
            </button>
          }
        />

        {/* ── MAIN CARD: SEARCH, FILTER & TABLE ── */}
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-ds-hairline bg-ds-canvas space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel"
                />
                <input
                  type="text"
                  placeholder="Search recipes, categories, or tags…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel"
                />
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-ds-ink font-semibold px-3 py-2 rounded-[8px] border border-ds-rose bg-ds-rose hover:bg-ds-rose transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
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
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">All status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* HSS Tier */}
              <div className="relative">
                <select
                  value={filterHss}
                  onChange={(e) => setFilterHss(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">All HSS tiers</option>
                  <option value="Stable">Stable</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Elevated Risk">Elevated Risk</option>
                  <option value="Critical">Critical</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Category */}
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">All categories</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                  <option value="Others">Others</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Food Source */}
              <div className="relative">
                <select
                  value={filterFoodSource}
                  onChange={(e) => setFilterFoodSource(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">All food sources</option>
                  <option value="Home Recipe">Home Recipe</option>
                  <option value="Fast Food Chain">Fast Food Chain</option>
                  <option value="Local Carenderia">Local Carenderia</option>
                  <option value="Raw Ingredient">Raw Ingredient</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Review Status */}
              <div className="relative">
                <select
                  value={filterReview}
                  onChange={(e) => setFilterReview(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">All review status</option>
                  <option value="reviewed">Dietitian approved</option>
                  <option value="pending">Waiting for dietitian</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-ds-hairline bg-ds-surface/40">
{canApprove && (
                    <th className="py-3 pl-4 sm:pl-5 pr-0 w-10">
                      <SelectBox
                        label="Select every recipe waiting for approval"
                        checked={waitingShown.length > 0 && waitingShown.every((x) => selectedIds.has(x.id))}
                        indeterminate={waitingShown.some((x) => selectedIds.has(x.id))}
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(waitingShown.map((x) => x.id)) : new Set())}
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] w-1/3">
                    Food / meal name
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    HSS suitability
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Nutrition snapshot
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-center">
                    Expert review
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-ds-hairline/60">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-[8px] shrink-0 bg-ds-hairline/70" />
                          <div>
                            <Skeleton className="w-32 h-4 mb-1.5 bg-ds-hairline/70 rounded" />
                            <Skeleton className="w-20 h-3 bg-ds-hairline/70 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-24 h-5 rounded-full bg-ds-hairline/70" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-4 mb-1 bg-ds-hairline/70 rounded" />
                        <Skeleton className="w-16 h-3 bg-ds-hairline/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5 flex justify-center">
                        <Skeleton className="w-7 h-7 rounded-full bg-ds-hairline/70" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Skeleton className="w-6 h-6 rounded-md bg-ds-hairline/70 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredRecipes.length > 0 ? (
                <tbody className="divide-y divide-ds-hairline">
                  {filteredRecipes.map((recipe) => {
                    const badgeClass = getHssBadgeStyle(recipe.hssTarget);
                    return (
                      <tr
                        key={recipe.id}
                        onClick={() => openModal(recipe)}
                        className={`hover:bg-ds-surface/60 transition-colors group cursor-pointer ${
                          recipe.status === "archived" ? "opacity-60 bg-ds-surface/30" : ""
                        }`}
                      >
{canApprove && (
                          <td className="py-3.5 pl-4 sm:pl-5 pr-0 align-middle" onClick={(e) => e.stopPropagation()}>
                            {!recipe.expertValidated && (
                              <SelectBox
                                label={`Select ${recipe.name}`}
                                checked={selectedIds.has(recipe.id)}
                                onChange={() => toggleSelected(recipe.id)}
                              />
                            )}
                          </td>
                        )}
                        {/* Food Name & Image */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <RecipeImage
                              src={recipe.mediaUrl}
                              alt={recipe.name}
                              containerClassName="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden bg-ds-tint border border-ds-hairline text-ds-on-tint "
                              fallbackIconSize={16}
                              fallbackIconClassName="text-ds-primary"
                            />
                            <div className="min-w-0 pr-2">
                              <p className="text-ds-ink font-semibold text-[13px] leading-tight mb-0.5 truncate">
                                {recipe.name}
                              </p>
                              <p className="text-ds-slate text-[11px] font-medium truncate">
                                {categoryLabel(recipe)} · <span className="capitalize">{recipe.status}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* HSS Badge */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {recipe.hssTarget}
                          </span>
                        </td>

                        {/* Nutrition */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <p className="text-ds-ink text-[12.5px] font-semibold flex items-center gap-1.5 m-0 leading-tight">
                            <Activity size={13} className="text-ds-primary shrink-0" />
                            {recipe.sodium}mg{" "}
                            <span className="text-[11px] text-ds-slate font-normal">
                              Sodium
                            </span>
                          </p>
                          <p className="text-ds-slate text-[11px] font-medium mt-0.5 ml-[18px]">
                            {recipe.calories} kcal
                          </p>
                        </td>

                        {/* Expert Review Status */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle text-center">
                          {recipe.expertValidated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-ds-mint text-ds-charcoal text-[11.5px] font-semibold whitespace-nowrap">
                              <ShieldCheck size={13} aria-hidden="true" /> Approved
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold text-[11.5px] font-semibold whitespace-nowrap"
                              title={recipe.reviewNote ? `Dietitian's note: ${recipe.reviewNote}` : undefined}
                            >
                              <ShieldAlert size={13} aria-hidden="true" /> {recipe.reviewNote ? "Sent back" : "Waiting"}
                            </span>
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
                              className="p-1.5 text-ds-slate hover:text-ds-ink hover:bg-ds-surface rounded-[8px] transition-colors cursor-pointer"
                              onClick={(e) => toggleMenu(e, recipe.id)}
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>

                          {activeMenuRecipeId === recipe.id && (
                            <div
                              className="fixed w-44 bg-ds-canvas border border-ds-hairline rounded-xl shadow-xl p-1.5 z-50 text-left"
                              style={menuPos || undefined}
                            >
                              {/* Edit Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  openModal(recipe);
                                }}
                                className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Edit2 size={13} className="text-ds-primary" />
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-ds-charcoal" />
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Archive size={13} className="text-ds-warm-text" />
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-ds-charcoal" />
                                  <span>Restore to draft</span>
                                </button>
                              )}

                              {/* Divider */}
                              <div className="border-t border-ds-hairline my-1" />

                              {/* Delete Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  requestDeleteRecipe(recipe);
                                }}
                                className="w-full px-2.5 py-1.5 text-[12px] text-ds-danger hover:bg-ds-rose rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
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
              <div className="p-12 text-center text-ds-slate text-[13px] flex flex-col items-center justify-center gap-2.5 border-t border-ds-hairline">
                {recipesQuery.isError ? (
                  <LoadError what="the recipe library" onRetry={recipesQuery.refetch} className="py-2" />
                ) : recipes.length === 0 ? (
                  <p className="font-medium text-ds-slate">No recipes available in the library.</p>
                ) : (
                  <>
                    <p className="font-medium text-ds-ink">No recipes match your filter criteria.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-1 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer"
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
          isDietitian={userRole === "medical_expert" && user?.expert_type === "Dietitian"}
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

{canApprove && (
          <BulkApproveBar
            selected={recipes.filter((x) => selectedIds.has(x.id))}
            noun="recipe"
            approve={(x) =>
              apiFetch(`/api/recipes/${x.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expertValidated: true }),
              })
            }
            onClear={() => setSelectedIds(new Set())}
            onDone={(failed) => {
              setSelectedIds(new Set(failed.map((x) => x.id)));
            }}
          />
        )}

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
