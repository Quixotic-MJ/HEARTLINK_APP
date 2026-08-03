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
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import FoodFormModal from "../../../components/modals/FoodFormModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";

// Mock Data
const initialRecipes = [
  {
    id: 1,
    name: "Oatmeal with Fresh Berries",
    category: "Breakfast",
    cssTarget: "Stable (80-100)",
    sodium: 15,
    calories: 210,
    satFat: 0.5,
    cholesterol: 0,
    fiber: 8,
    status: "published",
    expertValidated: true,
    mediaUrl: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: 2,
    name: "Grilled Salmon & Quinoa",
    category: "Dinner",
    cssTarget: "Monitor Closely (50-79)",
    sodium: 120,
    calories: 450,
    satFat: 2.5,
    cholesterol: 55,
    fiber: 5,
    status: "published",
    expertValidated: true,
    mediaUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: 3,
    name: "Low-Sodium Chicken Broth",
    category: "Lunch",
    cssTarget: "Critical (<50)",
    sodium: 140,
    calories: 120,
    satFat: 1.0,
    cholesterol: 15,
    fiber: 1,
    status: "draft",
    expertValidated: false,
    mediaUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: 4,
    name: "Avocado Toast on Whole Wheat",
    category: "Breakfast",
    cssTarget: "Stable (80-100)",
    sodium: 150,
    calories: 280,
    satFat: 2.0,
    cholesterol: 0,
    fiber: 11,
    status: "archived",
    expertValidated: false,
    mediaUrl: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=150&h=150",
  },
];

const Foods = () => {
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/recipes");
      const mapped = data.map((r) => {
        let cssLabel = "Stable (80-100)";
        if (r.css_tier === "Monitor Closely" || r.css_tier === "Caution") cssLabel = "Monitor Closely (50-79)";
        if (r.css_tier === "Elevated Risk" || r.css_tier === "Critical") cssLabel = "Critical (<50)";
        
        return {
          id: r.id,
          name: r.name || "",
          category: r.category || "Meal",
          cssTarget: cssLabel,
          sodium: r.sodium_mg || 0,
          calories: r.calories || 0,
          satFat: r.saturated_fat_g || 0,
          cholesterol: r.cholesterol_mg || 0,
          fiber: r.fiber_g || 0,
          status: r.status || "draft",
          expertValidated: r.expert_validated || false,
          mediaUrl: r.image_url || "",
        };
      });
      setRecipes(mapped.length > 0 ? mapped : initialRecipes);
    } catch (err) {
      console.error("Failed to fetch foods", err);
      setRecipes(initialRecipes);
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

  // Filter Logic
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch = r.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Badge Color Helper
  const getCssBadgeColor = (target) => {
    if (target.includes("Stable"))
      return { bg: "rgba(15,23,42,0.05)", text: "#0f172a", border: "transparent" };
    if (target.includes("Monitor"))
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search recipes, fast food, local dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white"
              />
            </div>
            <div className="relative">
              <Filter
                size={12}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/3">
                  Food / Meal Name
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CSS Suitability
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Nutrition Snapshot
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-center">
                  Validation
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
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
          ) : (
            <tbody className="divide-y divide-slate-50">
              {filteredRecipes.map((recipe) => {
                const badge = getCssBadgeColor(recipe.cssTarget);
                return (
                  <tr
                    key={recipe.id}
                    className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${recipe.status === "archived" ? "opacity-50" : ""}`}
                    onClick={() => openModal(recipe)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors overflow-hidden bg-slate-100"
                          style={{ backgroundColor: "rgba(15,23,42,0.04)" }}
                        >
                          {recipe.mediaUrl ? (
                            <img src={recipe.mediaUrl} alt={recipe.name} className="w-full h-full object-cover" />
                          ) : (
                            <Utensils size={14} style={{ color: "#0f172a" }} />
                          )}
                        </div>
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
                        {recipe.cssTarget}
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
                          title="Clinically Validated"
                        >
                          <ShieldCheck size={14} />
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-500 mx-auto"
                          title="Pending Validation"
                        >
                          <ShieldAlert size={14} />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(recipe);
                          }}
                          title="Edit Entry"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
          </table>
          {!loading && filteredRecipes.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">No foods or meals found.</div>
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
    </AdminLayout>
  );
};

export default Foods;
