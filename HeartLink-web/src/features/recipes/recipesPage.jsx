import { useRef, useState } from "react";
import { LibraryWorkflowTabs } from "../../components/ui/libraryWorkflowTabs.jsx";
import {
  libraryWorkflowCounts,
  matchesLibraryWorkflow,
} from "../../utils/libraryWorkflow.js";
import { LibraryViewSwitch } from "../../components/ui/libraryViewSwitch.jsx";
import { LibraryActionsMenu } from "../../components/ui/libraryActionsMenu.jsx";
import { LibraryBanner } from "../../components/ui/libraryBanner.jsx";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldAlert,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import FoodFormModal from "./components/recipeFormModal.jsx";
import ConfirmActionModal from "../../components/modals/confirmActionModal.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import LoadError from "../../components/ui/loadError.jsx";
import RecipeImage from "./components/recipeImage.jsx";
import { useAuth } from "../../contexts/useAuth.js";
import { canAuthorRecipes, canReviewRecipes } from "../../app/access.js";

const PILL =
  "inline-flex items-center gap-1.5 rounded-[8px] border px-2 py-1 text-[11.5px] font-medium leading-snug whitespace-nowrap";

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
    // The API returns database column names (sodium_mg, ...). Reading the wrong
    // names showed 0 here, and saving the recipe then wrote those 0s back.
    return {
      id: r.id,
      name: r.name,
      category: r.category || "Breakfast",
      categoryOther: r.category_other || "",
      prepTimeMinutes: r.prep_time_minutes || 15,
      servings: r.servings || 1,
      difficulty: r.difficulty || "Easy",
      sodium: r.sodium_mg || 0,
      calories: r.calories || 0,
      satFat: r.saturated_fat_g || 0,
      cholesterol: r.cholesterol_mg || 0,
      fiber: r.fiber_g || 0,
      status: r.status || "draft",
      expertValidated: r.expert_validated || false,
      reviewedAt: r.reviewed_at || null,
      reviewNote: r.review_note || "",
      updatedAt: r.updated_at,
      mediaUrl: r.image_url || "",
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      foodSourceType: r.foodSourceType || "Home Recipe",
      tags: r.tags || [],
    };
  });
  return mapped;
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
  const [view, setView] = useState("grid");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFoodSource, setFilterFoodSource] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const statusInFlight = useRef(false);
  const [statusBusy, setStatusBusy] = useState(false);

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

  const handleUpdateStatus = async (recipe, newStatus) => {
    if (statusInFlight.current) return;
    statusInFlight.current = true;
    setStatusBusy(true);
    try {
      await apiFetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          expectedUpdatedAt: recipe.updatedAt,
        }),
      });
      toast.success(
        newStatus === "published"
          ? "Recipe published"
          : "Recipe restored to draft",
        {
          description: `"${recipe.name}" status updated to ${newStatus}.`,
        },
      );
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update status", {
        description: err?.data?.detail || "Could not change status.",
      });
    } finally {
      statusInFlight.current = false;
      setStatusBusy(false);
    }
  };

  const requestArchiveRecipe = (recipe) => {
    if (!recipe) return;
    setConfirmConfig({
      isOpen: true,
      title: "Archive recipe?",
      subtitle: "",
      description:
        "Remove this recipe from app discovery. Existing records stay intact; this does not delete the recipe.",
      confirmText: "Archive recipe",
      cancelText: "Cancel",
      variant: "warning",
      icon: Archive,
      entityInfo: {
        name: recipe.name,
        avatar: (
          <RecipeImage
            src={recipe.mediaUrl}
            alt=""
            containerClassName="library-card-fallback"
            fallbackIconSize={24}
          />
        ),
        email: categoryLabel(recipe),
      },
      impactDetails: [
        "Restore it to Draft from the Archived tab when needed.",
        "Publishing again requires approval of the current revision.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/recipes/${recipe.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "archived",
              expectedUpdatedAt: recipe.updatedAt,
            }),
          });
          toast.success("Recipe archived", {
            description: `"${recipe.name}" has been moved to archive.`,
          });
        } catch (err) {
          console.error("Failed to archive recipe", err);
          toast.error("Failed to archive recipe", {
            description: err?.data?.detail || "Could not archive recipe.",
          });
          throw err;
        }
      },
    });
  };

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const { user } = useAuth();
  const canAuthor = canAuthorRecipes(user);
  const canReview = canReviewRecipes(user);

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
    setFilterCategory("all");
    setFilterFoodSource("all");
  };

  // KPI & Tab Counts
  const statusCounts = libraryWorkflowCounts(recipes);

  // Filter Logic
  const filteredRecipes = recipes.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      categoryLabel(r).toLowerCase().includes(q) ||
      (r.tags && r.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesStatus = matchesLibraryWorkflow(r, filterStatus);
    const matchesCategory =
      filterCategory === "all" || r.category === filterCategory;
    const matchesFoodSource =
      filterFoodSource === "all" || r.foodSourceType === filterFoodSource;

    return (
      matchesSearch && matchesStatus && matchesCategory && matchesFoodSource
    );
  });
  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterStatus !== "all" ||
    filterCategory !== "all" ||
    filterFoodSource !== "all";

  const renderActions = (recipe) => (
    <LibraryActionsMenu
      name={recipe.name}
      disabled={statusBusy}
      actions={[
        {
          label: canAuthor
            ? "Edit recipe"
            : canReview && recipe.status !== "archived"
              ? "Review recipe"
              : "View recipe",
          icon: Edit2,
          onSelect: () => openModal(recipe),
        },
        ...(canAuthor && recipe.status === "draft" && recipe.expertValidated
          ? [
              {
                label: "Publish",
                icon: CheckCircle2,
                onSelect: () => handleUpdateStatus(recipe, "published"),
              },
            ]
          : []),
        ...(canAuthor && recipe.status === "archived"
          ? [
              {
                label: "Restore to draft",
                icon: RotateCcw,
                onSelect: () => handleUpdateStatus(recipe, "draft"),
              },
            ]
          : []),
        ...(canAuthor && ["draft", "published"].includes(recipe.status)
          ? [
              {
                label: "Archive",
                icon: Archive,
                onSelect: () => requestArchiveRecipe(recipe),
              },
            ]
          : []),
      ]}
    />
  );

  const selectClass =
    "h-9 w-full md:w-auto appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[13px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer";

  return (
    <AdminLayout>
      <div className="workspace mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        <LibraryBanner
          icon={Utensils}
          title={canReview ? "Recipe review" : "Recipe library"}
          description={
            canReview
              ? "A closer look at every ingredient. Review the saved recipe revision before it reaches the app."
              : "Thoughtful recipes, ready for review. Build a draft, refine the details, and publish the approved revision."
          }
          unavailable={loading || recipesQuery.isError}
          stats={[
            ["All recipes", statusCounts.all],
            ["Ready to publish", statusCounts.approved],
            ["Published", statusCounts.published],
          ]}
          action={
            canAuthor && (
              <button type="button" onClick={() => openModal()}>
                <Plus size={17} aria-hidden="true" /> Add recipe
              </button>
            )
          }
        />

        <section aria-label="Recipe library" className="library-panel">
          <div className="library-toolbar">
            <div className="workspace-search-row">
              <LibraryViewSwitch value={view} onChange={setView} />
              <label className="workspace-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">
                  Search recipes, categories, or tags
                </span>
                <input
                  type="search"
                  placeholder="Search recipes, categories, or tags…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="workspace-toolbar-button"
                aria-expanded={showFilters}
                aria-controls="recipe-facets"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
                {filterCategory !== "all" || filterFoodSource !== "all"
                  ? " •"
                  : ""}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="workspace-toolbar-button"
                  onClick={clearFilters}
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reset filters
                </button>
              )}
            </div>
            <div className="library-workflow-row">
              <LibraryWorkflowTabs
                value={filterStatus}
                onChange={setFilterStatus}
                counts={statusCounts}
                unavailable={loading || recipesQuery.isError}
                label="Filter recipes by status"
              />
              <p className="library-results" role="status">
                {loading || recipesQuery.isError
                  ? "Counts unavailable"
                  : `${filteredRecipes.length} of ${recipes.length} recipes`}
              </p>
            </div>
            {showFilters && (
              <div
                id="recipe-facets"
                className="flex flex-wrap gap-3 border-t border-cal-hairline pt-3"
              >
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
              </div>
            )}
          </div>

          {view === "grid" ? (
            loading ? (
              <div
                className="library-grid"
                role="status"
                aria-label="Loading recipes"
              >
                {[1, 2, 3, 4].map((id) => (
                  <Skeleton key={id} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : recipesQuery.isError ? (
              <LoadError
                what="the recipe library"
                onRetry={recipesQuery.refetch}
              />
            ) : !filteredRecipes.length ? (
              <div className="workspace-empty">
                <Utensils size={36} aria-hidden="true" />
                <p>
                  {recipes.length
                    ? "No recipes match these filters"
                    : "Your recipe library starts here"}
                </p>
                <p>
                  {canAuthor
                    ? "Add a recipe to begin, or adjust the filters to find a saved revision."
                    : "Recipes available for your review will appear here."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-lg border border-cal-hairline px-4 py-2 text-sm"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <div className="library-grid" aria-label="Recipe gallery">
                {filteredRecipes.map((recipe) => (
                  <article key={recipe.id} className="library-card">
                    <button
                      type="button"
                      className="library-card-media"
                      aria-label={`Preview ${recipe.name}`}
                      onClick={() => openModal(recipe)}
                    >
                      <RecipeImage
                        src={recipe.mediaUrl}
                        alt=""
                        containerClassName="library-card-fallback"
                        fallbackIconSize={44}
                        fallbackIconClassName="text-cal-primary"
                      />
                    </button>
                    <div className="library-card-body">
                      <div className="flex items-start justify-between gap-2">
                        <h3>
                          <button
                            type="button"
                            onClick={() => openModal(recipe)}
                          >
                            {recipe.name}
                          </button>
                        </h3>
                        <span
                          className="workspace-pill"
                          data-status={recipe.status}
                        >
                          {recipe.status}
                        </span>
                      </div>
                      <p className="library-card-description">
                        {categoryLabel(recipe)} · {recipe.foodSourceType}
                      </p>
                      <div className="library-card-facts">
                        <span>{recipe.prepTimeMinutes} min</span>
                        <span>
                          {recipe.servings}{" "}
                          {recipe.servings === 1 ? "serving" : "servings"}
                        </span>
                        <span>{recipe.sodium} mg sodium</span>
                      </div>
                      <div className="library-card-footer">
                        <span className="library-card-review">
                          <ShieldCheck size={14} aria-hidden="true" />
                          {recipe.expertValidated
                            ? "Dietitian approved"
                            : recipe.reviewNote
                              ? "Changes requested"
                              : "Awaiting review"}
                        </span>
                        {renderActions(recipe)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="border-b border-cal-hairline bg-cal-surface-soft">
                  <tr>
                    <th
                      scope="col"
                      className="w-[36%] px-5 py-3 text-[12px] font-medium text-cal-muted"
                    >
                      Food / meal
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-[12px] font-medium text-cal-muted"
                    >
                      Recipe yield
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-[12px] font-medium text-cal-muted"
                    >
                      Nutrition snapshot
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-[12px] font-medium text-cal-muted"
                    >
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
                        <td colSpan={5} className="px-5 py-4">
                          <Skeleton className="h-10 w-full rounded-[8px] bg-cal-surface-strong/60" />
                        </td>
                      </tr>
                    ))
                  ) : recipesQuery.isError ? (
                    <tr>
                      <td colSpan={5}>
                        <LoadError
                          what="the recipe library"
                          onRetry={recipesQuery.refetch}
                          className="py-12"
                        />
                      </td>
                    </tr>
                  ) : filteredRecipes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center">
                        <p className="text-[14px] font-semibold text-cal-ink">
                          {recipes.length === 0
                            ? "No recipes in the library yet"
                            : "No recipes match these filters"}
                        </p>
                        <p className="mt-1 text-[13px] text-cal-muted">
                          {recipes.length === 0
                            ? canAuthor
                              ? "Create a draft recipe to begin the review workflow."
                              : "Recipes available for your review will appear here."
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
                      return (
                        <tr
                          key={recipe.id}
                          onClick={() => openModal(recipe)}
                          className={`group hover:bg-cal-surface-soft/80 transition-colors cursor-pointer ${
                            recipe.status === "archived"
                              ? "opacity-65 bg-cal-surface-soft/40"
                              : ""
                          }`}
                        >
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
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openModal(recipe);
                                    }}
                                    className="truncate text-left text-[13.5px] font-semibold text-cal-ink group-hover:underline"
                                  >
                                    {recipe.name}
                                  </button>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize ${getStatusPill(
                                      recipe.status,
                                    )}`}
                                  >
                                    {recipe.status}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-[12px] text-cal-muted">
                                  {categoryLabel(recipe)} ·{" "}
                                  {recipe.foodSourceType}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Recipe yield */}
                          <td className="px-4 py-3.5 align-middle">
                            <span className="text-[13px] tabular-nums">
                              {recipe.servings}{" "}
                              {recipe.servings === 1 ? "serving" : "servings"}
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
                              {recipe.calories} kcal · {recipe.prepTimeMinutes}{" "}
                              min
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
                                <span>
                                  {recipe.reviewNote ? "Sent back" : "Waiting"}
                                </span>
                              </span>
                            )}
                          </td>

                          <td
                            className="px-5 py-3.5 text-right align-middle"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {renderActions(recipe)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal Component for Create / Edit */}
        <FoodFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          recipe={editingRecipe}
          canEdit={canAuthor}
          isDietitian={canReview}
          onSave={async (formData) => {
            try {
              let saved;
              if (editingRecipe?.id) {
                saved = await apiFetch(`/api/recipes/${editingRecipe.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...formData,
                    expectedUpdatedAt: editingRecipe.updatedAt,
                  }),
                });
                toast.success("Recipe updated", {
                  description:
                    editingRecipe.status === "published" &&
                    saved.status === "draft"
                      ? `"${formData.name}" was withdrawn until a Dietitian reviews the changes.`
                      : `"${formData.name}" was saved successfully.`,
                });
              } else {
                saved = await apiFetch("/api/recipes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData),
                });
                toast.success("Recipe created", {
                  description: `"${formData.name}" was added to the food library.`,
                });
              }
              return saved;
            } catch (err) {
              console.error("Error saving recipe:", err);
              toast.error("Failed to save recipe", {
                description:
                  err?.data?.detail || "Could not save recipe to database.",
              });
              throw err;
            }
          }}
          onReview={async ({ decision, note }) => {
            try {
              const reviewed = await apiFetch(
                `/api/recipes/${editingRecipe.id}/review`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    decision,
                    expectedUpdatedAt: editingRecipe.updatedAt,
                    note,
                  }),
                },
              );
              toast.success(
                decision === "approve"
                  ? "Recipe approved"
                  : "Changes requested",
                {
                  description:
                    decision === "approve"
                      ? `"${editingRecipe.name}" is ready for an Admin to publish.`
                      : `Your note was sent back with "${editingRecipe.name}".`,
                },
              );
              return reviewed;
            } catch (err) {
              toast.error("Review was not saved", {
                description:
                  err?.data?.detail || "Refresh the recipe and try again.",
              });
              throw err;
            }
          }}
        />

        {/* Reusable Action Confirmation Modal */}
        <ConfirmActionModal
          className="workspace"
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
