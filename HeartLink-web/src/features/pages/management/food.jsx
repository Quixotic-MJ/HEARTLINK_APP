import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Edit2,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
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

// Database hss_tier -> the label the recipe form uses
const HSS_TIER_LABELS = {
  Stable: "Stable (80-100)",
  Moderate: "Moderate (60-79)",
  "Elevated Risk": "Elevated Risk (50-59)",
  Critical: "Critical (<50)",
};

const STATUS_TABS = [
  ["all", "All"],
  ["published", "Published"],
  ["draft", "Draft"],
  ["archived", "Archived"],
];

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

// HL-030: an "Others" recipe shows the name typed for it
const categoryLabel = (recipe) =>
  recipe.category === "Others" && recipe.categoryOther
    ? recipe.categoryOther
    : recipe.category;

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

const getHssBadge = (tier, label) => {
  if (tier === "Stable") {
    return {
      tone: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
      dot: "bg-cal-success",
      text: label,
    };
  }
  if (tier === "Moderate") {
    return {
      tone: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      dot: "bg-cal-warning",
      text: label,
    };
  }
  return {
    tone: "border-cal-error/25 bg-cal-error/10 text-cal-ink",
    dot: "bg-cal-error",
    text: label,
  };
};

const getStatusPill = (status) => {
  if (status === "published") {
    return "border-cal-success/25 bg-cal-success/10 text-cal-ink";
  }
  if (status === "draft") {
    return "border-cal-warning/35 bg-cal-warning/15 text-cal-ink";
  }
  return "border-cal-hairline bg-cal-surface-card text-cal-muted";
};

const Foods = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHss, setFilterHss] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFoodSource, setFilterFoodSource] = useState("all");
  const [filterReview, setFilterReview] = useState("all");

  // Support ?search= links cleanly during render
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }

  // A save through apiFetch refreshes this list by itself
  const recipesQuery = useApiQuery("/api/recipes", { select: toRecipes });
  const recipes = recipesQuery.data ?? NO_RECIPES;
  const loading = recipesQuery.isPending;

  const [activeMenuRecipeId, setActiveMenuRecipeId] = useState(null);

  // Confirmation Modal State
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
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setActiveMenuRecipeId(activeMenuRecipeId === id ? null : id);
  };

  // Close actions dropdown when clicking anywhere outside
  React.useEffect(() => {
    const handleDocumentClick = () => setActiveMenuRecipeId(null);
    document.addEventListener("click", handleDocumentClick);
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
      toast.success(
        newStatus === "published" ? "Recipe published" : "Recipe restored to draft",
        {
          description: `"${recipe.name}" status updated to ${newStatus}.`,
        }
      );
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update status", {
        description: err?.data?.detail || "Could not change status.",
      });
    }
  };

  const requestArchiveRecipe = (recipe) => {
    if (!recipe) return;
    setConfirmConfig({
      isOpen: true,
      title: "Archive recipe?",
      subtitle: "Hide from mobile patients",
      description: `Archive "${recipe.name}"? This recipe will be hidden from mobile patient recommendations while remaining accessible in your library.`,
      confirmText: "Archive recipe",
      cancelText: "Cancel",
      variant: "warning",
      icon: Archive,
      entityInfo: {
        name: recipe.name,
        badge: "Published → Archived",
        email: `${categoryLabel(recipe)} · ${recipe.hssTarget}`,
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
          toast.success("Recipe archived", {
            description: `"${recipe.name}" has been moved to archive.`,
          });
        } catch (err) {
          console.error("Failed to archive recipe", err);
          toast.error("Failed to archive recipe", {
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
      title: "Delete recipe permanently?",
      subtitle: "Permanent database action",
      description: `Permanently delete "${recipe.name}"? This action cannot be undone and removes all nutritional profiles, ingredients, and steps.`,
      confirmText: "Delete permanently",
      cancelText: "Cancel",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: recipe.name,
        badge: recipe.status?.toUpperCase() || "RECIPE",
        email: `${categoryLabel(recipe)} · ${recipe.hssTarget}`,
        id: recipe.id,
      },
      impactDetails: [
        "Permanently removed from the nutritional database.",
        "Patient meal plan logs referencing this recipe retain historical logs only.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
          toast.success("Recipe deleted", {
            description: `"${recipe.name}" was permanently removed.`,
          });
          if (editingRecipe?.id === recipe.id) {
            closeModal();
          }
        } catch (err) {
          console.error("Failed to delete recipe", err);
          toast.error("Failed to delete recipe", {
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
  const canApprove =
    userRole === "medical_expert" && user?.expert_type === "Dietitian";
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

  const clearSearch = () => {
    setSearchQuery("");
    if (searchParams.has("search")) {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    clearSearch();
    setFilterStatus("all");
    setFilterHss("all");
    setFilterCategory("all");
    setFilterFoodSource("all");
    setFilterReview("all");
  };

  // KPI & Tab Counts
  const statusCounts = {
    all: recipes.length,
    published: recipes.filter((r) => r.status === "published").length,
    draft: recipes.filter((r) => r.status === "draft").length,
    archived: recipes.filter((r) => r.status === "archived").length,
  };
  const approvedCount = recipes.filter((r) => r.expertValidated).length;
  const waitingCount = recipes.filter((r) => !r.expertValidated).length;

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
    const matchesCategory =
      filterCategory === "all" || r.category === filterCategory;
    const matchesFoodSource =
      filterFoodSource === "all" || r.foodSourceType === filterFoodSource;

    let matchesReview = true;
    if (filterReview === "reviewed") {
      matchesReview = r.expertValidated === true;
    } else if (filterReview === "pending") {
      matchesReview = r.expertValidated === false;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesHss &&
      matchesCategory &&
      matchesFoodSource &&
      matchesReview
    );
  });
  const waitingShown = canApprove
    ? filteredRecipes.filter((x) => !x.expertValidated)
    : [];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterStatus !== "all" ||
    filterHss !== "all" ||
    filterCategory !== "all" ||
    filterFoodSource !== "all" ||
    filterReview !== "all";

  const selectClass =
    "h-9 w-full md:w-auto appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer";

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Utensils size={13.5} className="text-cal-ink" />
              <span>Clinical &amp; library · Nutritional database</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Food &amp; recipe library
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Manage heart-healthy meals, nutritional macros, clinical HSS suitability tiers, and dietitian sign-offs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
          >
            <Plus size={15.5} />
            <span>Create new entry</span>
          </button>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Total entries</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Utensils size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : statusCounts.all}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Recipes, chains &amp; raw items</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Published</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                <CheckCircle2 size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : statusCounts.published}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Visible in mobile meal plans</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Dietitian approved</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink">
                <ShieldCheck size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : approvedCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Clinically validated nutrition</div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">Waiting for dietitian</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                <ShieldAlert size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none text-cal-ink">
              {loading ? "—" : waitingCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">Pending nutritional sign-off</div>
          </div>
        </div>

        {/* ─── 3. MAIN DIRECTORY CARD: FILTERS & TABLE ──────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Primary Toolbar: Status Nav-Pill-Group + Search */}
          <div className="space-y-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Filter recipes by status"
                className="inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
              >
                {STATUS_TABS.map(([key, label]) => {
                  const active = filterStatus === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilterStatus(key)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all cursor-pointer ${
                        active
                          ? "bg-cal-canvas text-cal-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                          : "text-cal-muted hover:text-cal-ink"
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`font-cal-mono text-[11.5px] tabular-nums ${
                          active ? "text-cal-ink" : "text-cal-muted-soft"
                        }`}
                      >
                        {loading ? "—" : statusCounts[key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-80">
                <label htmlFor="recipe-search" className="sr-only">
                  Search recipes, categories, or tags
                </label>
                <Search
                  size={14.5}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cal-muted"
                />
                <input
                  id="recipe-search"
                  type="text"
                  placeholder="Search recipes, categories, or tags…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13px] text-cal-ink placeholder:text-cal-muted focus:border-cal-ink focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Facet Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:w-auto md:flex-wrap">
                {/* HSS Tier */}
                <div className="relative">
                  <label htmlFor="filter-hss" className="sr-only">
                    Filter by HSS tier
                  </label>
                  <select
                    id="filter-hss"
                    value={filterHss}
                    onChange={(e) => setFilterHss(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All HSS tiers</option>
                    <option value="Stable">Stable</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Elevated Risk">Elevated Risk</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <ChevronDown
                    size={13.5}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>

                {/* Category */}
                <div className="relative">
                  <label htmlFor="filter-category" className="sr-only">
                    Filter by meal category
                  </label>
                  <select
                    id="filter-category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All categories</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                    <option value="Others">Others</option>
                  </select>
                  <ChevronDown
                    size={13.5}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>

                {/* Food Source */}
                <div className="relative">
                  <label htmlFor="filter-food-source" className="sr-only">
                    Filter by food source
                  </label>
                  <select
                    id="filter-food-source"
                    value={filterFoodSource}
                    onChange={(e) => setFilterFoodSource(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All food sources</option>
                    <option value="Home Recipe">Home Recipe</option>
                    <option value="Fast Food Chain">Fast Food Chain</option>
                    <option value="Local Carenderia">Local Carenderia</option>
                    <option value="Raw Ingredient">Raw Ingredient</option>
                  </select>
                  <ChevronDown
                    size={13.5}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>

                {/* Review Status */}
                <div className="relative">
                  <label htmlFor="filter-review" className="sr-only">
                    Filter by review status
                  </label>
                  <select
                    id="filter-review"
                    value={filterReview}
                    onChange={(e) => setFilterReview(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All review status</option>
                    <option value="reviewed">Dietitian approved</option>
                    <option value="pending">Waiting for dietitian</option>
                  </select>
                  <ChevronDown
                    size={13.5}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset filters</span>
                  </button>
                )}
                {!loading && !recipesQuery.isError && (
                  <span className="font-cal-mono text-[12px] text-cal-muted">
                    {filteredRecipes.length} of {recipes.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                <tr>
                  {canApprove && (
                    <th scope="col" className="w-10 py-3 pl-4 pr-0 sm:pl-5">
                      <SelectBox
                        label="Select every recipe waiting for approval"
                        checked={
                          waitingShown.length > 0 &&
                          waitingShown.every((x) => selectedIds.has(x.id))
                        }
                        indeterminate={waitingShown.some((x) => selectedIds.has(x.id))}
                        onChange={(e) =>
                          setSelectedIds(
                            e.target.checked
                              ? new Set(waitingShown.map((x) => x.id))
                              : new Set()
                          )
                        }
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="w-[36%] px-5 py-3 text-[12px] font-medium text-cal-muted"
                  >
                    Food / meal
                  </th>
                  <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                    HSS suitability
                  </th>
                  <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                    Nutrition snapshot
                  </th>
                  <th scope="col" className="px-4 py-3 text-[12px] font-medium text-cal-muted">
                    Dietitian review
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right text-[12px] font-medium text-cal-muted"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cal-hairline">
                {loading ? (
                  [1, 2, 3, 4, 5].map((item) => (
                    <tr key={item}>
                      <td colSpan={canApprove ? 6 : 5} className="px-5 py-4">
                        <Skeleton className="h-10 w-full rounded-[8px] bg-cal-surface-strong/60" />
                      </td>
                    </tr>
                  ))
                ) : recipesQuery.isError ? (
                  <tr>
                    <td colSpan={canApprove ? 6 : 5}>
                      <LoadError
                        what="the recipe library"
                        onRetry={recipesQuery.refetch}
                        className="py-12"
                      />
                    </td>
                  </tr>
                ) : filteredRecipes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canApprove ? 6 : 5}
                      className="px-5 py-14 text-center"
                    >
                      <p className="text-[14px] font-semibold text-cal-ink">
                        {recipes.length === 0
                          ? "No recipes in the library yet"
                          : "No recipes match these filters"}
                      </p>
                      <p className="mt-1 text-[13px] text-cal-muted">
                        {recipes.length === 0
                          ? "Create your first heart-healthy recipe or nutritional entry to populate mobile meal plans."
                          : "Try resetting one or more active filters or clearing your search query."}
                      </p>
                      {recipes.length > 0 && hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                        >
                          Reset filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const hss = getHssBadge(recipe.hssTier, recipe.hssTarget);
                    return (
                      <tr
                        key={recipe.id}
                        onClick={() => openModal(recipe)}
                        className={`group hover:bg-cal-surface-soft/80 transition-colors cursor-pointer ${
                          recipe.status === "archived" ? "opacity-65 bg-cal-surface-soft/40" : ""
                        }`}
                      >
                        {canApprove && (
                          <td
                            className="py-3.5 pl-4 pr-0 align-middle sm:pl-5"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex items-center gap-3.5">
                            <RecipeImage
                              src={recipe.mediaUrl}
                              alt={recipe.name}
                              containerClassName="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-surface-soft"
                              fallbackIconSize={16}
                              fallbackIconClassName="text-cal-muted"
                            />
                            <div className="min-w-0 pr-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[13.5px] font-semibold text-cal-ink group-hover:underline">
                                  {recipe.name}
                                </p>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize ${getStatusPill(
                                    recipe.status
                                  )}`}
                                >
                                  {recipe.status}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[12px] text-cal-muted">
                                {categoryLabel(recipe)} · {recipe.foodSourceType}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* HSS Suitability */}
                        <td className="px-4 py-3.5 align-middle">
                          <span className={`${PILL} ${hss.tone}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${hss.dot}`} />
                            <span>{hss.text}</span>
                          </span>
                        </td>

                        {/* Nutrition */}
                        <td className="px-4 py-3.5 align-middle">
                          <p className="m-0 font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink">
                            {recipe.sodium}{" "}
                            <span className="font-cal-sans text-[11.5px] font-normal text-cal-muted">
                              mg sodium
                            </span>
                          </p>
                          <p className="mt-0.5 font-cal-mono text-[12px] tabular-nums text-cal-muted">
                            {recipe.calories} kcal · {recipe.prepTimeMinutes} min
                          </p>
                        </td>

                        {/* Expert Review Status */}
                        <td className="px-4 py-3.5 align-middle">
                          {recipe.expertValidated ? (
                            <span
                              className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
                            >
                              <ShieldCheck
                                size={12.5}
                                className="text-cal-success"
                                aria-hidden="true"
                              />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span
                              className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
                              title={
                                recipe.reviewNote
                                  ? `Dietitian's note: ${recipe.reviewNote}`
                                  : undefined
                              }
                            >
                              <ShieldAlert
                                size={12.5}
                                className="text-cal-ink"
                                aria-hidden="true"
                              />
                              <span>{recipe.reviewNote ? "Sent back" : "Waiting"}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions Menu */}
                        <td
                          className="relative px-5 py-3.5 text-right align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => toggleMenu(e, recipe.id)}
                              title="Actions"
                              aria-label={`Actions for ${recipe.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-cal-muted hover:border-cal-hairline hover:bg-cal-canvas hover:text-cal-ink transition-colors cursor-pointer"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>

                          {activeMenuRecipeId === recipe.id && (
                            <div
                              className="fixed z-50 w-44 rounded-[10px] border border-cal-hairline bg-cal-canvas p-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                              style={menuPos || undefined}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  openModal(recipe);
                                }}
                                className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                              >
                                <Edit2 size={13.5} className="text-cal-muted" />
                                <span>Edit recipe</span>
                              </button>

                              {recipe.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuRecipeId(null);
                                    handleUpdateStatus(recipe, "published");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <CheckCircle2 size={13.5} className="text-cal-success" />
                                  <span>Publish</span>
                                </button>
                              )}

                              {recipe.status === "published" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuRecipeId(null);
                                    requestArchiveRecipe(recipe);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <Archive size={13.5} className="text-cal-muted" />
                                  <span>Archive</span>
                                </button>
                              )}

                              {recipe.status === "archived" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuRecipeId(null);
                                    handleUpdateStatus(recipe, "draft");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <CheckCircle2 size={13.5} className="text-cal-muted" />
                                  <span>Restore to draft</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-cal-hairline" />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuRecipeId(null);
                                  requestDeleteRecipe(recipe);
                                }}
                                className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium text-cal-error hover:bg-cal-error/10 cursor-pointer"
                              >
                                <Trash2 size={13.5} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal Component for Create / Edit */}
        <FoodFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          recipe={editingRecipe}
          userRole={userRole}
          isDietitian={
            userRole === "medical_expert" && user?.expert_type === "Dietitian"
          }
          onSave={async (formData) => {
            try {
              if (editingRecipe?.id) {
                await apiFetch(`/api/recipes/${editingRecipe.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData),
                });
                toast.success("Recipe updated", {
                  description: `"${formData.name}" was saved successfully.`,
                });
              } else {
                await apiFetch("/api/recipes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData),
                });
                toast.success("Recipe created", {
                  description: `"${formData.name}" was added to the food library.`,
                });
              }
            } catch (err) {
              console.error("Error saving recipe:", err);
              toast.error("Failed to save recipe", {
                description:
                  err?.data?.detail || "Could not save recipe to database.",
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
