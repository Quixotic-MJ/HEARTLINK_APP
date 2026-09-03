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
  Trash2,
  Clock,
  Edit2,
  MoreVertical,
  Play,
  Image,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExerciseFormModal from "../../../components/modals/ExerciseFormModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch, BASE_URL } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";

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
      setExercises([]);
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

      toast.success(newStatus === "published" ? "Routine Published" : "Routine Updated", {
        description: `"${exercise.name}" status updated to ${newStatus}.`,
      });
      fetchExercises();
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to Update Status", {
        description: err?.data?.detail || "Could not change status.",
      });
    }
  };

  const requestArchiveExercise = (exercise) => {
    if (!exercise) return;
    setConfirmConfig({
      isOpen: true,
      title: "Archive Exercise Routine?",
      subtitle: "Hide from Mobile Patients",
      description: `Archive "${exercise.name}"? This routine will be hidden from mobile patient recommendations while remaining accessible in your admin library.`,
      confirmText: "Archive Routine",
      cancelText: "Cancel",
      variant: "warning",
      icon: Archive,
      entityInfo: {
        name: exercise.name,
        badge: "Published -> Archived",
        email: `${exercise.type} • ${exercise.hssTarget}`,
        id: exercise.id,
      },
      impactDetails: [
        "Hidden from patient search results and recommended workout regimens.",
        "Can be restored back to Draft status at any time.",
      ],
      onConfirm: async () => {
        try {
          await handleUpdateStatus(exercise, "archived");
          toast.success("Routine Archived", {
            description: `"${exercise.name}" was moved to archive.`,
          });
        } catch (err) {
          console.error("Failed to archive exercise", err);
        }
      },
    });
  };

  const requestDeleteExercise = (exercise) => {
    if (!exercise) return;
    setConfirmConfig({
      isOpen: true,
      title: "Delete Routine Permanently?",
      subtitle: "Permanent Database Action",
      description: `Permanently delete "${exercise.name}"? This action cannot be undone and will remove all movement guides, video links, and instructions.`,
      confirmText: "Delete Permanently",
      cancelText: "Cancel",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: exercise.name,
        badge: exercise.status?.toUpperCase() || "EXERCISE",
        email: `${exercise.type} • ${exercise.hssTarget}`,
        id: exercise.id,
      },
      impactDetails: [
        "Permanently removed from the exercise library database.",
        "Historical patient workout logs will retain activity summary only.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/exercises/${exercise.id}`, { method: "DELETE" });
          toast.success("Routine Deleted", {
            description: `"${exercise.name}" was permanently removed.`,
          });
          if (editingExercise?.id === exercise.id) {
            closeModal();
          }
          fetchExercises();
        } catch (err) {
          console.error("Failed to delete exercise", err);
          toast.error("Failed to Delete Routine", {
            description: err?.data?.detail || "Could not delete routine.",
          });
        }
      },
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterHss("all");
    setFilterType("all");
    setFilterIntensity("all");
    setFilterReview("all");
  };

  // Filter logic
  const filteredExercises = exercises.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.goal && r.goal.toLowerCase().includes(q));

    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesHss = filterHss === "all" || r.hssTarget === filterHss;
    const matchesType = filterType === "all" || r.type === filterType;
    const matchesIntensity = filterIntensity === "all" || r.intensity === filterIntensity;

    let matchesReview = true;
    if (filterReview === "validated") {
      matchesReview = r.expertValidated === true;
    } else if (filterReview === "pending") {
      matchesReview = r.expertValidated === false;
    }

    return matchesSearch && matchesStatus && matchesHss && matchesType && matchesIntensity && matchesReview;
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
    filterType !== "all" ||
    filterIntensity !== "all" ||
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
              Exercise library
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[50ch] leading-[1.5]">
              Manage workout regimens, movement guides, and clinical HSS targets.
            </p>
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 text-white font-semibold text-[13px] px-4 py-2.5 rounded-[8px] bg-[#E8532E] hover:bg-[#C13E20] shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create new routine</span>
          </button>
        </div>

        {/* ── MAIN CARD: SEARCH, FILTER & TABLE ── */}
        <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] shadow-2xs overflow-hidden">
          
          {/* Search & Filter Toolbar */}
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
                  placeholder="Search exercises, goals, or descriptions…"
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
                  <option value="all">Status: All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* HSS */}
              <div className="relative">
                <select
                  value={filterHss}
                  onChange={(e) => setFilterHss(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">HSS: All</option>
                  <option value="Stable (80-100)">Stable (80-100)</option>
                  <option value="Moderate (60-79)">Moderate (60-79)</option>
                  <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                  <option value="Critical (<50)">Critical (&lt;50)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Type */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">Type: All</option>
                  <option value="Breathing">Breathing</option>
                  <option value="Light Cardio">Light Cardio</option>
                  <option value="Stationary">Stationary</option>
                  <option value="General">General</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Intensity */}
              <div className="relative">
                <select
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">Intensity: All</option>
                  <option value="None">None</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>

              {/* Review */}
              <div className="relative">
                <select
                  value={filterReview}
                  onChange={(e) => setFilterReview(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                >
                  <option value="all">Review: All</option>
                  <option value="validated">Expert Reviewed</option>
                  <option value="pending">Pending Review</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-[#8B9893]" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-[32%]">
                    Exercise routine
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Type / Intensity
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    HSS target
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Duration
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Media
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Status / Review
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
                            <Skeleton className="w-44 h-3 bg-[#DCE3DF]/70 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-4 mb-1 bg-[#DCE3DF]/70 rounded" />
                        <Skeleton className="w-16 h-3 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-5 rounded-full bg-[#DCE3DF]/70" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-14 h-4 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-16 h-3 mb-1 bg-[#DCE3DF]/70 rounded" />
                        <Skeleton className="w-20 h-3 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Skeleton className="w-6 h-6 rounded-md bg-[#DCE3DF]/70 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredExercises.length > 0 ? (
                <tbody className="divide-y divide-[#DCE3DF]">
                  {filteredExercises.map((exercise, index) => {
                    const badgeClass = getHssBadgeStyle(exercise.hssTarget);
                    return (
                      <tr
                        key={exercise.id}
                        onClick={() => openModal(exercise)}
                        className={`hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer ${
                          exercise.status === "archived" ? "opacity-60 bg-[#EDF1EF]/30" : ""
                        }`}
                      >
                        {/* 1. EXERCISE */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden bg-[#FBEAE6] border border-[#DCE3DF] text-[#E8532E] shadow-2xs">
                              {(() => {
                                const resolvedUrl = resolveMediaUrl(exercise.mediaUrl);
                                if (!resolvedUrl) return <Dumbbell size={16} className="text-[#E8532E]" />;
                                
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
                            <div className="min-w-0 pr-2">
                              <p className="text-[#152131] font-semibold text-[13px] leading-tight mb-0.5 truncate">
                                {exercise.name}
                              </p>
                              <p className="text-[#5C6B66] text-[11px] font-medium truncate max-w-[240px]">
                                {exercise.description || exercise.goal || "Physical rehabilitation regimen"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. TYPE / INTENSITY */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col">
                            <span className="text-[#152131] font-semibold text-[12.5px] leading-tight">
                              {exercise.type}
                            </span>
                            <span className="text-[#5C6B66] text-[11px] font-medium mt-0.5">
                              {exercise.intensity} intensity
                            </span>
                          </div>
                        </td>

                        {/* 3. HSS TARGET */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {exercise.hssTarget.split(" ")[0]}
                          </span>
                        </td>

                        {/* 4. DURATION */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#152131]">
                            <Clock size={13} className="text-[#E8532E]" />
                            {exercise.duration} min
                          </span>
                        </td>

                        {/* 5. MEDIA */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col gap-0.5 text-[10.5px] font-medium">
                            {exercise.videoUrl ? (
                              <span className="flex items-center gap-1 text-[#1B6E63] font-semibold">
                                <Play size={11} strokeWidth={2.5} /> Video
                              </span>
                            ) : (
                              <span className="text-[#8B9893] flex items-center gap-1">— Video</span>
                            )}
                            {exercise.guideImages && exercise.guideImages.length > 0 ? (
                              <span className="flex items-center gap-1 text-[#1B6E63] font-semibold">
                                <Image size={11} strokeWidth={2.5} /> {exercise.guideImages.length} Guides
                              </span>
                            ) : (
                              <span className="text-[#8B9893] flex items-center gap-1">— Guides</span>
                            )}
                          </div>
                        </td>

                        {/* 6. STATUS / REVIEW */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] ${
                                exercise.status === "published"
                                  ? "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]"
                                  : exercise.status === "draft"
                                  ? "bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8]"
                                  : "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]"
                              }`}
                            >
                              {exercise.status}
                            </span>
                            {exercise.expertValidated ? (
                              <span className="text-[10px] text-[#1B6E63] font-semibold flex items-center gap-1">
                                ✓ Reviewed
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#A9741B] font-semibold flex items-center gap-1">
                                ⚠ Pending
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. ACTIONS */}
                        <td 
                          className="py-3.5 px-4 sm:px-5 align-middle text-right relative" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="p-1.5 text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-[8px] transition-colors cursor-pointer"
                              onClick={(e) => toggleMenu(e, exercise.id)}
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>

                          {activeMenuId === exercise.id && (
                            <div
                              className={`absolute right-4 w-44 bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] shadow-xl p-1.5 z-50 text-left ${
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
                                className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Edit2 size={13} className="text-[#E8532E]" />
                                <span>Edit routine</span>
                              </button>

                              {/* Publish Action (DRAFT only) */}
                              {exercise.status === "draft" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    handleUpdateStatus(exercise, "published");
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-[#1B6E63]" />
                                  <span>Publish</span>
                                </button>
                              )}

                              {/* Archive Action (PUBLISHED only) */}
                              {exercise.status === "published" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    requestArchiveExercise(exercise);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] text-[#152131] hover:bg-[#EDF1EF] rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Archive size={13} className="text-[#A9741B]" />
                                  <span>Archive</span>
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
                                  setActiveMenuId(null);
                                  requestDeleteExercise(exercise);
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
            {!loading && filteredExercises.length === 0 && (
              <div className="p-12 text-center text-[#5C6B66] text-[13px] flex flex-col items-center justify-center gap-2.5 border-t border-[#DCE3DF]">
                {exercises.length === 0 ? (
                  <p className="font-medium text-[#5C6B66]">No exercises available in the library.</p>
                ) : (
                  <>
                    <p className="font-medium text-[#152131]">No exercise routines match your filter criteria.</p>
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

        {/* Slide-over Form Modal */}
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
                toast.success("Routine Updated", {
                  description: `"${data.name}" was saved successfully.`,
                });
              } else {
                await apiFetch("/api/exercises", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                toast.success("Routine Created", {
                  description: `"${data.name}" was added to the exercise library.`,
                });
              }
              closeModal();
              fetchExercises();
            } catch (err) {
              console.error("Error saving exercise:", err);
              toast.error("Failed to Save Routine", {
                description: err?.data?.detail || "Could not save exercise routine.",
              });
            }
          }}
          onDelete={(exToDelete) => {
            requestDeleteExercise(exToDelete || editingExercise);
          }}
        />

        {/* Confirmation Modal */}
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

export default Exercises;
