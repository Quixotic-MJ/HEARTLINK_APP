import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  X,
  Dumbbell,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Save,
  Activity,
  PlaySquare,
  PlusCircle,
  Trash2,
  Clock,
  Edit2,
  MoreVertical,
  Play,
  Image,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExerciseFormModal from "../../../components/modals/ExerciseFormModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch, BASE_URL } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

const Exercises = () => {
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHss, setFilterHss] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterIntensity, setFilterIntensity] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeMenuId, setActiveMenuId] = useState(null);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/exercises/");
      const mapped = data.map((r) => {
        let hssLabel = "Stable (80-100)";
        if (r.hss_tier === "Moderate") hssLabel = "Moderate (60-79)";
        if (r.hss_tier === "Elevated Risk") hssLabel = "Elevated Risk (50-59)";
        if (r.hss_tier === "Critical") hssLabel = "Critical (<50)";
        
        return {
          id: r.id,
          name: r.name || "",
          description: r.description || "",
          duration: r.duration_minutes || 0,
          hssTarget: hssLabel,
          mediaUrl: r.media_url || "",
          videoUrl: r.video_url || "",
          guideImages: r.guide_images || [],
          status: r.status || "draft",
          expertValidated: r.expert_validated || false,
          steps: r.steps || [],
          type: r.type || "General",
          intensity: r.intensity || "Low",
          goal: r.goal || "",
        };
      });
      setExercises(mapped);
    } catch (err) {
      console.error("Failed to fetch exercises", err);
      setError("Unable to load exercises.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExercises();
  }, []);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role;

  // Open Modal for Create or Edit
  const openModal = (exercise = null) => {
    setEditingExercise(exercise || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExercise(null);
  };

  const handleUpdateStatus = async (exercise, newStatus) => {
    try {
      const payload = {
        name: exercise.name,
        description: exercise.description,
        duration: exercise.duration,
        hssTarget: exercise.hssTarget,
        mediaUrl: exercise.mediaUrl,
        videoUrl: exercise.videoUrl,
        type: exercise.type,
        intensity: exercise.intensity,
        goal: exercise.goal,
        status: newStatus,
        expertValidated: exercise.expertValidated,
        steps: exercise.steps,
        guideImages: exercise.guideImages,
      };

      await apiFetch(`/api/exercises/${exercise.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchExercises();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteExercise = async (exercise) => {
    if (window.confirm(`Are you sure you want to permanently delete "${exercise.name}"?`)) {
      try {
        await apiFetch(`/api/exercises/${exercise.id}`, {
          method: "DELETE",
        });
        fetchExercises();
      } catch (err) {
        console.error("Failed to delete exercise", err);
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterHss("all");
    setFilterType("all");
    setFilterIntensity("all");
    setFilterReview("all");
  };

  // Filter Logic
  const filteredExercises = exercises.filter((e) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (e.name || "").toLowerCase().includes(query) ||
      (e.description || "").toLowerCase().includes(query) ||
      (e.type || "").toLowerCase().includes(query) ||
      (e.goal || "").toLowerCase().includes(query);

    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    const matchesHss = filterHss === "all" || e.hssTarget === filterHss;
    const matchesType = filterType === "all" || e.type === filterType;
    const matchesIntensity = filterIntensity === "all" || e.intensity === filterIntensity;
    const matchesReview = filterReview === "all" || 
      (filterReview === "validated" && e.expertValidated) ||
      (filterReview === "pending" && !e.expertValidated);

    return matchesSearch && matchesStatus && matchesHss && matchesType && matchesIntensity && matchesReview;
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
            Exercise Management
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Manage cardiovascular routines, guided movement sets, and clinical HSS targets.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 text-white font-semibold text-xs px-4 py-2.5 rounded-xl bg-[#E55F37] hover:bg-[#D4542E] shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Create New Exercise</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
          <p className="text-xs font-semibold text-red-400">{error}</p>
          <button 
            onClick={fetchExercises}
            className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main View: Data Table Container */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-white/10 bg-[#161616] space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search exercises, goals, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>

            {/* Clear Filters */}
            {(searchQuery || filterStatus !== "all" || filterHss !== "all" || filterType !== "all" || filterIntensity !== "all" || filterReview !== "all") && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0 flex items-center gap-1 self-start md:self-auto cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Horizontally aligned filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 pt-1">
            {/* Status */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">Status: All</option>
                <option value="draft" className="bg-[#161616]">Draft</option>
                <option value="published" className="bg-[#161616]">Published</option>
                <option value="archived" className="bg-[#161616]">Archived</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* HSS */}
            <div className="relative">
              <select
                value={filterHss}
                onChange={(e) => setFilterHss(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">HSS: All</option>
                <option value="Stable (80-100)" className="bg-[#161616]">Stable (80-100)</option>
                <option value="Moderate (60-79)" className="bg-[#161616]">Moderate (60-79)</option>
                <option value="Elevated Risk (50-59)" className="bg-[#161616]">Elevated Risk (50-59)</option>
                <option value="Critical (<50)" className="bg-[#161616]">Critical (&lt;50)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Type */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">Type: All</option>
                <option value="Breathing" className="bg-[#161616]">Breathing</option>
                <option value="Light Cardio" className="bg-[#161616]">Light Cardio</option>
                <option value="Stationary" className="bg-[#161616]">Stationary</option>
                <option value="General" className="bg-[#161616]">General</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Intensity */}
            <div className="relative">
              <select
                value={filterIntensity}
                onChange={(e) => setFilterIntensity(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">Intensity: All</option>
                <option value="None" className="bg-[#161616]">None</option>
                <option value="Low" className="bg-[#161616]">Low</option>
                <option value="Medium" className="bg-[#161616]">Medium</option>
                <option value="High" className="bg-[#161616]">High</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>

            {/* Review */}
            <div className="relative">
              <select
                value={filterReview}
                onChange={(e) => setFilterReview(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-1.5 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="all" className="bg-[#161616]">Review: All</option>
                <option value="validated" className="bg-[#161616]">Expert Reviewed</option>
                <option value="pending" className="bg-[#161616]">Pending Review</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                <ChevronDown size={12} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Exercise List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] table-auto">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[35%]">
                  Exercise
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[18%]">
                  Type / Intensity
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[15%]">
                  HSS Target
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[10%]">
                  Duration
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[10%]">
                  Media
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[12%]">
                  Status / Review
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right w-16">
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
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0 bg-white/10" />
                        <div>
                          <Skeleton className="w-32 h-4 mb-1 bg-white/10" />
                          <Skeleton className="w-48 h-3 bg-white/10" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-20 h-3 mb-1 bg-white/10" />
                      <Skeleton className="w-16 h-3 bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-24 h-5 rounded-full bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-12 h-4 bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex gap-2">
                        <Skeleton className="w-12 h-3 bg-white/10" />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-16 h-3 mb-1 bg-white/10" />
                      <Skeleton className="w-20 h-3 bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex justify-end">
                        <Skeleton className="w-6 h-6 rounded-md bg-white/10" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody className="divide-y divide-white/5">
                {filteredExercises.map((exercise, index) => {
                  const badgeClass = getHssBadgeColor(exercise.hssTarget);
                  return (
                    <tr
                      key={exercise.id}
                      className={`hover:bg-white/5 transition-colors group cursor-pointer ${exercise.status === "archived" ? "opacity-50" : ""}`}
                      onClick={() => openModal(exercise)}
                    >
                      {/* 1. EXERCISE */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors overflow-hidden bg-[#36272B] border border-[#E55F37]/30 text-[#E55F37] shadow-sm"
                          >
                            {(() => {
                              const resolvedUrl = resolveMediaUrl(exercise.mediaUrl);
                              if (!resolvedUrl) return <Dumbbell size={18} className="text-[#E55F37]" />;
                              
                              const ytMatch = resolvedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                              if (ytMatch && ytMatch[1]) {
                                return <img src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} alt={exercise.name} className="w-full h-full object-cover" />;
                              }
                              
                              if (resolvedUrl.startsWith("data:video") || resolvedUrl.endsWith(".mp4")) {
                                return <video src={resolvedUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />;
                              }
                              
                              return <img src={resolvedUrl} alt={exercise.name} className="w-full h-full object-cover" />;
                            })()}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-xs mb-0.5">
                              {exercise.name}
                            </p>
                            <p className="text-[#89899C] text-[10px] font-medium truncate max-w-[240px]">
                              {exercise.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. TYPE / INTENSITY */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-xs">{exercise.type}</span>
                          <span className="text-[#89899C] text-[10px] font-medium">{exercise.intensity} intensity</span>
                        </div>
                      </td>

                      {/* 3. HSS */}
                      <td className="py-4 px-5 align-middle">
                        <span
                          className={`inline-flex items-center text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${badgeClass}`}
                        >
                          {exercise.hssTarget.split(" ")[0]}
                        </span>
                      </td>

                      {/* 4. DURATION */}
                      <td className="py-4 px-5 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Clock size={13} className="text-[#E55F37]" />
                          {exercise.duration} min
                        </span>
                      </td>

                      {/* 5. MEDIA */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col gap-1 text-[10px] font-medium">
                          {exercise.videoUrl ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <Play size={11} strokeWidth={2.5} /> Video
                            </span>
                          ) : (
                            <span className="text-slate-600 flex items-center gap-1">— Video</span>
                          )}
                          {exercise.guideImages && exercise.guideImages.length > 0 ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <Image size={11} strokeWidth={2.5} /> {exercise.guideImages.length} Guides
                            </span>
                          ) : (
                            <span className="text-slate-600 flex items-center gap-1">— Guides</span>
                          )}
                        </div>
                      </td>

                      {/* 6. STATUS / REVIEW */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${
                              exercise.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : exercise.status === "draft"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-white/5 text-slate-400 border border-white/10"
                            }`}
                          >
                            {exercise.status}
                          </span>
                          {exercise.expertValidated ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                              ✓ Expert Reviewed
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                              ⚠ Pending Review
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-4 px-5 align-middle text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            onClick={(e) => toggleMenu(e, exercise.id)}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        {activeMenuId === exercise.id && (
                          <div
                            className={`absolute right-5 w-44 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 text-left ${
                              index >= filteredExercises.length - 2 && filteredExercises.length > 2
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                            }`}
                          >
                            {/* Edit Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                openModal(exercise);
                              }}
                              className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Edit2 size={13} className="text-[#E55F37]" /> Edit Exercise
                            </button>

                            {/* Publish Action (DRAFT only) */}
                            {exercise.status === "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleUpdateStatus(exercise, "published");
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <CheckCircle2 size={13} className="text-emerald-400" /> Publish
                              </button>
                            )}

                            {/* Archive Action (PUBLISHED only) */}
                            {exercise.status === "published" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleUpdateStatus(exercise, "archived");
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Archive size={13} className="text-amber-400" /> Archive
                              </button>
                            )}

                            {/* Restore Action (ARCHIVED only) */}
                            {exercise.status === "archived" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleUpdateStatus(exercise, "draft");
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
                                setActiveMenuId(null);
                                handleDeleteExercise(exercise);
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
            )}
          </table>
          {!loading && filteredExercises.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 border-t border-white/5">
              {exercises.length === 0 ? (
                <p className="font-medium text-slate-400">No exercises available.</p>
              ) : (
                <>
                  <p className="font-medium text-slate-400">No exercises match your filters.</p>
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
      <ExerciseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        exercise={editingExercise}
        userRole={userRole}
        onSave={async (data) => {
          try {
            if (editingExercise?.id) {
              await apiFetch(`/api/exercises/${editingExercise.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            } else {
              await apiFetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
            }
            closeModal();
            fetchExercises();
          } catch (err) {
            console.error("Error saving exercise:", err);
          }
        }}
        onDelete={async (id) => {
          try {
            await apiFetch(`/api/exercises/${id}`, { method: "DELETE" });
            closeModal();
            fetchExercises();
          } catch (err) {
            console.error("Error deleting exercise:", err);
          }
        }}
      />
    </AdminLayout>
  );
};

export default Exercises;

