import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
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
} from "lucide-react";
import AdminLayout from "../../../components/layouts/AdminLayout"; // Adjust path

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
  },
];

const Recipes = () => {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Drawer & Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Toggle this between "sysadmin" and "medical" to test the Validation Toggle
  const [userRole] = useState("medical");

  // Form State Handlers
  const [formData, setFormData] = useState({});
  const [ingredients, setIngredients] = useState([]);

  // Open Drawer for Create or Edit
  const openDrawer = (recipe = null) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setFormData(recipe);
      setIngredients(["Mock Ingredient 1", "Mock Ingredient 2"]); // Mock dynamic load
    } else {
      setEditingRecipe(null);
      setFormData({
        name: "",
        category: "Breakfast",
        cssTarget: "Stable (80-100)",
        sodium: 0,
        calories: 0,
        satFat: 0,
        cholesterol: 0,
        fiber: 0,
        status: "draft",
        expertValidated: false,
      });
      setIngredients([""]);
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
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
      return "bg-blue-50 text-[#1e4ed8] border-blue-100";
    if (target.includes("Monitor"))
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-600 border-red-100";
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Content Library
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Recipe <span className="text-[#1e4ed8]">Management.</span>
          </h2>
        </div>
        <button
          onClick={() => openDrawer()}
          className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm shadow-blue-900/20 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Create New Recipe
        </button>
      </div>

      {/* Main View: Data Table Container */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-50 bg-[#f8fafc]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search recipe names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm"
              />
            </div>
            <div className="relative">
              <Filter
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
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
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/3">
                  Recipe Name
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  CSS Suitability
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Nutrition Snapshot
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">
                  Validation
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRecipes.map((recipe) => (
                <tr
                  key={recipe.id}
                  className={`hover:bg-[#f8fafc] transition-colors group cursor-pointer ${recipe.status === "archived" ? "opacity-50" : ""}`}
                  onClick={() => openDrawer(recipe)}
                >
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Utensils size={14} />
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-[11px] mb-0.5">
                          {recipe.name}
                        </p>
                        <p className="text-gray-500 text-[9px] font-medium">
                          {recipe.category} • {recipe.status}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span
                      className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase ${getCssBadgeColor(recipe.cssTarget)}`}
                    >
                      {recipe.cssTarget}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-900 text-[11px] font-bold flex items-center gap-1">
                      <Activity size={12} className="text-red-500" />{" "}
                      {recipe.sodium}mg{" "}
                      <span className="text-[9px] text-gray-400 font-normal">
                        Sodium
                      </span>
                    </p>
                    <p className="text-gray-500 text-[9px] mt-0.5">
                      {recipe.calories} kcal
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle text-center">
                    {recipe.expertValidated ? (
                      <div
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-600 border border-green-100"
                        title="Clinically Validated"
                      >
                        <ShieldCheck size={14} />
                      </div>
                    ) : (
                      <div
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100"
                        title="Pending Validation"
                      >
                        <ShieldAlert size={14} />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 text-gray-400 hover:text-[#1e4ed8] hover:bg-blue-50 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(recipe);
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Recipe Editor           */}
      {/* ========================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafc]">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {editingRecipe ? "Edit Recipe" : "Create New Recipe"}
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Define algorithmic nutritional values
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {/* Expert Validation Workflow */}
              <div
                className={`p-4 rounded-xl border ${formData.expertValidated ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4
                      className={`text-xs font-bold ${formData.expertValidated ? "text-green-800" : "text-[#1e4ed8]"} flex items-center gap-1.5 mb-1`}
                    >
                      {formData.expertValidated ? (
                        <ShieldCheck size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      Medical Expert Validation
                    </h4>
                    <p className="text-[9px] text-gray-600 leading-relaxed">
                      Only Authorized Medical Experts can sign off on
                      nutritional accuracy before pushing to users.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.expertValidated}
                      disabled={userRole !== "medical"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expertValidated: e.target.checked,
                        })
                      }
                    />
                    <div
                      className={`w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all ${
                        userRole !== "medical"
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      } peer-checked:bg-green-500`}
                    ></div>
                  </label>
                </div>
              </div>

              {/* Section 1: Basic Information */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3">
                  Basic Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      Recipe Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                      placeholder="e.g. Low-Sodium Chicken Broth"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">
                        Meal Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                      >
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 mb-1">
                        CSS Target Level
                      </label>
                      <select
                        value={formData.cssTarget}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cssTarget: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
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
                    <label className="block text-[10px] font-bold text-gray-700 mb-1">
                      Media URL
                    </label>
                    <div className="relative">
                      <ImageIcon
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Nutritional Details (Critical) */}
              <div>
                <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> Algorithmic Nutrition Data
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      type="number"
                      value={formData.calories}
                      onChange={(e) =>
                        setFormData({ ...formData, calories: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-red-500 mb-1">
                      Sodium (mg)
                    </label>
                    <input
                      type="number"
                      value={formData.sodium}
                      onChange={(e) =>
                        setFormData({ ...formData, sodium: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200 rounded-lg focus:outline-none focus:border-red-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-yellow-600 mb-1">
                      Sat. Fat (g)
                    </label>
                    <input
                      type="number"
                      value={formData.satFat}
                      onChange={(e) =>
                        setFormData({ ...formData, satFat: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-1">
                      Cholesterol (mg)
                    </label>
                    <input
                      type="number"
                      value={formData.cholesterol}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cholesterol: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-1">
                      Fiber (g)
                    </label>
                    <input
                      type="number"
                      value={formData.fiber}
                      onChange={(e) =>
                        setFormData({ ...formData, fiber: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Recipe Construction */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-3">
                  Construction
                </h4>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-700 mb-1.5">
                    Ingredients List
                  </label>
                  <div className="space-y-2 mb-2">
                    {ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ing}
                          onChange={(e) => {
                            const newIng = [...ingredients];
                            newIng[i] = e.target.value;
                            setIngredients(newIng);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors"
                          placeholder="e.g., 1 cup low-sodium chicken broth"
                        />
                        <button
                          onClick={() =>
                            setIngredients(
                              ingredients.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setIngredients([...ingredients, ""])}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#1e4ed8] hover:text-[#113296]"
                  >
                    <PlusCircle size={12} /> Add Ingredient
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1.5">
                    Cooking Instructions
                  </label>
                  <textarea
                    rows="4"
                    className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors resize-none"
                    placeholder="Step-by-step instructions..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Actions */}
            <div className="p-4 border-t border-gray-100 bg-[#f8fafc] flex justify-between items-center shrink-0">
              {formData.status === "archived" ? (
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-700 transition-colors px-3 py-1.5">
                  <CheckCircle2 size={14} /> Restore Recipe
                </button>
              ) : (
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5">
                  <Archive size={14} /> Archive Recipe
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={closeDrawer}
                  className="px-4 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                >
                  Cancel
                </button>
                <button className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
                  <Save size={14} /> Save to Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Recipes;
