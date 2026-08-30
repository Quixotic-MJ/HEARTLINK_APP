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

// Mock Data
const initialExercises = [
  {
    id: 1,
    name: "15-Minute Chair Yoga",
    description: "Low-impact seated stretching focusing on flexibility and deep breathing.",
    duration: 15,
    hssTarget: "Moderate (60-79)",
    mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    status: "published",
    expertValidated: true,
    steps: [
      "Sit upright in a sturdy chair with feet flat on the floor.",
      "Inhale deeply while raising both arms towards the ceiling.",
      "Exhale and slowly lower arms back to your sides.",
    ],
  },
  {
    id: 2,
    name: "Light Paced Walking",
    description: "Gentle cardiovascular activation through steady, flat-surface walking.",
    duration: 20,
    hssTarget: "Stable (80-100)",
    mediaUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=150&h=150",
    status: "published",
    expertValidated: true,
    steps: [
      "Ensure you are wearing supportive athletic shoes.",
      "Begin walking at a pace where you can comfortably hold a conversation.",
      "Cool down for the last 3 minutes by slowing your pace.",
    ],
  },
  {
    id: 3,
    name: "Bed-Assisted Ankle Pumps",
    description: "Extremely low-exertion movement to promote blood flow while resting.",
    duration: 5,
    hssTarget: "Critical (<50)",
    mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    status: "draft",
    expertValidated: false,
    steps: [
      "Lie flat on your back or sit slightly propped up in bed.",
      "Point your toes downward away from your body, then pull them back up towards your shins.",
      "Repeat 10 times per foot, breathing normally.",
    ],
  },
  {
    id: 4,
    name: "Brisk Jogging Intervals",
    description: "Moderate intensity intervals for cardiovascular strengthening.",
    duration: 30,
    hssTarget: "Stable (80-100)",
    mediaUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=150&h=150",
    status: "archived",
    expertValidated: false,
    steps: [
      "Warm up with a 5-minute brisk walk.",
      "Jog at a moderate pace for 2 minutes, then walk for 1 minute.",
      "Repeat interval 5 times.",
    ],
  },
];

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

  // Filter Logic
  const filteredExercises = exercises.filter((e) => {
    const query = searchQuery.toLowerCase();
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
      return { bg: "rgba(15,23,42,0.05)", text: "#0f172a", border: "transparent" };
    if (target.includes("Moderate"))
      return { bg: "rgba(245,158,11,0.08)", text: "#d97706", border: "transparent" };
    if (target.includes("Elevated Risk"))
      return { bg: "rgba(249,115,22,0.08)", text: "#ea580c", border: "transparent" };
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
            Exercise Management.
          </h2>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 text-white font-medium text-[11px] px-3.5 py-2 rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Plus size={14} strokeWidth={2} /> Create New Exercise
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button 
            onClick={fetchExercises}
            className="text-[10px] font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg transition-colors hover:bg-red-700 active:scale-95"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main View: Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col xl:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white text-slate-700 font-medium"
                />
              </div>

              {/* Horizontally aligned filters */}
              <div className="flex flex-wrap gap-2">
                {/* Status */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-8 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Status: All</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* HSS */}
                <div className="relative">
                  <select
                    value={filterHss}
                    onChange={(e) => setFilterHss(e.target.value)}
                    className="pl-3 pr-8 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="all">HSS: All</option>
                    <option value="Stable (80-100)">Stable (80-100)</option>
                    <option value="Moderate (60-79)">Moderate (60-79)</option>
                    <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                    <option value="Critical (<50)">Critical (&lt;50)</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* Type */}
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-3 pr-8 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Type: All</option>
                    <option value="Breathing">Breathing</option>
                    <option value="Light Cardio">Light Cardio</option>
                    <option value="Stationary">Stationary</option>
                    <option value="General">General</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* Intensity */}
                <div className="relative">
                  <select
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(e.target.value)}
                    className="pl-3 pr-8 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Intensity: All</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* Review */}
                <div className="relative">
                  <select
                    value={filterReview}
                    onChange={(e) => setFilterReview(e.target.value)}
                    className="pl-3 pr-8 py-2 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="all">Review: All</option>
                    <option value="validated">Expert Reviewed</option>
                    <option value="pending">Pending Review</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exercise List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] table-auto">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[35%]">
                  Exercise
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[18%]">
                  Type / Intensity
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[15%]">
                  HSS Target
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[10%]">
                  Duration
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[10%]">
                  Media
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] w-[12%]">
                  Status / Review
                </th>
                <th className="py-3 px-5 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] text-right w-16">
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
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div>
                          <Skeleton className="w-32 h-4 mb-1" />
                          <Skeleton className="w-48 h-3" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-20 h-3 mb-1" />
                      <Skeleton className="w-16 h-3" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-24 h-5 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-12 h-4" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex gap-2">
                        <Skeleton className="w-12 h-3" />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-16 h-3 mb-1" />
                      <Skeleton className="w-20 h-3" />
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
                {filteredExercises.map((exercise, index) => {
                  const badge = getHssBadgeColor(exercise.hssTarget);
                  return (
                    <tr
                      key={exercise.id}
                      className={`hover:bg-slate-50/40 transition-colors group cursor-default ${exercise.status === "archived" ? "opacity-60" : ""}`}
                    >
                      {/* 1. EXERCISE */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors overflow-hidden bg-slate-100 border border-slate-200"
                          >
                            {(() => {
                              const resolvedUrl = resolveMediaUrl(exercise.mediaUrl);
                              if (!resolvedUrl) return <Dumbbell size={16} className="text-slate-500" />;
                              
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
                            <p className="text-slate-900 font-semibold text-xs mb-0.5">
                              {exercise.name}
                            </p>
                            <p className="text-slate-400 text-[10px] truncate max-w-[240px]">
                              {exercise.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. TYPE / INTENSITY */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-semibold text-[11px]">{exercise.type}</span>
                          <span className="text-slate-400 text-[10px]">{exercise.intensity} intensity</span>
                        </div>
                      </td>

                      {/* 3. HSS */}
                      <td className="py-4 px-5 align-middle">
                        <span
                          className="inline-flex items-center text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em]"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                          }}
                        >
                          {exercise.hssTarget.split(" ")[0]}
                        </span>
                      </td>

                      {/* 4. DURATION */}
                      <td className="py-4 px-5 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Clock size={12} className="text-slate-400" />
                          {exercise.duration} min
                        </span>
                      </td>

                      {/* 5. MEDIA */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-medium">
                          {exercise.videoUrl ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Play size={11} strokeWidth={2.5} /> Video
                            </span>
                          ) : (
                            <span className="text-slate-300 flex items-center gap-1">— Video</span>
                          )}
                          {exercise.guideImages && exercise.guideImages.length > 0 ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Image size={11} strokeWidth={2.5} /> {exercise.guideImages.length} Guides
                            </span>
                          ) : (
                            <span className="text-slate-300 flex items-center gap-1">— Guides</span>
                          )}
                        </div>
                      </td>

                      {/* 6. STATUS / REVIEW */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${
                              exercise.status === "published"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : exercise.status === "draft"
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}
                          >
                            {exercise.status}
                          </span>
                          {exercise.expertValidated ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              ✓ Expert Reviewed
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                              ⚠ Pending Review
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-4 px-5 align-middle text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={(e) => toggleMenu(e, exercise.id)}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        {activeMenuId === exercise.id && (
                          <div
                            className={`absolute right-5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-left ${
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
                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                            >
                              <Edit2 size={13} /> Edit Exercise
                            </button>

                            {/* Publish Action (DRAFT only) */}
                            {exercise.status === "draft" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleUpdateStatus(exercise, "published");
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                              >
                                <CheckCircle2 size={13} className="text-emerald-500" /> Publish
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
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                              >
                                <Archive size={13} className="text-amber-500" /> Archive
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
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
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
                                setActiveMenuId(null);
                                handleDeleteExercise(exercise);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
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
            <div className="p-8 text-center text-slate-400 text-xs">
              {exercises.length === 0 ? "No exercises available." : "No exercises match your filters."}
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
