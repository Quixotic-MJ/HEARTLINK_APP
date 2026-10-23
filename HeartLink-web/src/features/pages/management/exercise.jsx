import React, { useState } from "react";
import {
  Search,
  Plus,
  Dumbbell,
  CheckCircle2,
  Archive,
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
import { BulkApproveBar, SelectBox } from "../../../components/modals/BulkApprove";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch, BASE_URL } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import LoadError from "../../../components/ui/LoadError";
import { useAuth } from "../../../contexts/useAuth";
import { toast } from "sonner";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader } from "../../../styles/designSystem";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

// The library as the screen shows it, from the API's rows (HL-035: loaded through React Query)
const NO_EXERCISES = [];
const toExercises = (data) => {
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
      calories: r.calories || 0,
      requirements: r.requirements || [],
      setupSteps: r.setup_steps || [],
      rounds: r.rounds || 1,
      restSeconds: r.rest_seconds || 0,
      position: r.position || "",
      setting: r.setting || "",
      skipIf: r.skip_if || [],
      stopIf: r.stop_if || [],
      easierVersion: r.easier_version || "",
      effortHint: r.effort_hint || "",
      frequency: r.frequency || "",
      reviewedAt: r.reviewed_at || null,
      reviewNote: r.review_note || "",
    };
  });
  return mapped;
};

const Exercises = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHss, setFilterHss] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterIntensity, setFilterIntensity] = useState("all");
  const [filterReview, setFilterReview] = useState("all");
  // A save through apiFetch refreshes this list by itself
  const exercisesQuery = useApiQuery("/api/exercises/", { select: toExercises });
  const exercises = exercisesQuery.data ?? NO_EXERCISES;
  const loading = exercisesQuery.isPending;

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
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    // The menu is pinned to the screen, so it closes when anything scrolls instead of floating away.
    window.addEventListener("scroll", handleOutsideClick, true);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleOutsideClick, true);
    };
  }, []);


  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role;
  // Approving several at once: only the Physical Therapist who approves sees the checkboxes (HL-026/037).
  const canApprove = userRole === "medical_expert" && user?.expert_type === "Physical Therapist";
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
        calories: exercise.calories,
        requirements: exercise.requirements,
      };

      await apiFetch(`/api/exercises/${exercise.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast.success(newStatus === "published" ? "Routine Published" : "Routine Updated", {
        description: `"${exercise.name}" status updated to ${newStatus}.`,
      });
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
  const waitingShown = canApprove ? filteredExercises.filter((x) => !x.expertValidated) : [];

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
    filterType !== "all" ||
    filterIntensity !== "all" ||
    filterReview !== "all";

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Content library"
          title="Exercise library"
          description="Manage workout regimens, movement guides, and clinical HSS targets."
          actions={
            <button
              onClick={() => openModal()}
              className={UI.button.primary}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Create new routine</span>
            </button>
          }
        />

        {/* ── MAIN CARD: SEARCH, FILTER & TABLE ── */}
        <div className="bg-ds-canvas border border-ds-hairline rounded-xl overflow-hidden">
          
          {/* Search & Filter Toolbar */}
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
                  placeholder="Search exercises, goals, or descriptions…"
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
                  <option value="all">Status: All</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* HSS */}
              <div className="relative">
                <select
                  value={filterHss}
                  onChange={(e) => setFilterHss(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">HSS: All</option>
                  <option value="Stable (80-100)">Stable (80-100)</option>
                  <option value="Moderate (60-79)">Moderate (60-79)</option>
                  <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                  <option value="Critical (<50)">Critical (&lt;50)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Type */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">Type: All</option>
                  <option value="Breathing">Breathing</option>
                  <option value="Light Cardio">Light Cardio</option>
                  <option value="Stationary">Stationary</option>
                  <option value="General">General</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Intensity */}
              <div className="relative">
                <select
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">Intensity: All</option>
                  <option value="None">None</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>

              {/* Review */}
              <div className="relative">
                <select
                  value={filterReview}
                  onChange={(e) => setFilterReview(e.target.value)}
                  className="w-full md:w-auto pl-3 pr-7 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                >
                  <option value="all">Review: All</option>
                  <option value="validated">PT approved</option>
                  <option value="pending">Waiting for PT</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown size={12} className="text-ds-steel" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-ds-hairline bg-ds-surface/40">
{canApprove && (
                    <th className="py-3 pl-4 sm:pl-5 pr-0 w-10">
                      <SelectBox
                        label="Select every exercise waiting for approval"
                        checked={waitingShown.length > 0 && waitingShown.every((x) => selectedIds.has(x.id))}
                        indeterminate={waitingShown.some((x) => selectedIds.has(x.id))}
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(waitingShown.map((x) => x.id)) : new Set())}
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] w-[32%]">
                    Exercise routine
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Type / Intensity
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    HSS target
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Duration
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Media
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Status / Review
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
                            <Skeleton className="w-44 h-3 bg-ds-hairline/70 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-4 mb-1 bg-ds-hairline/70 rounded" />
                        <Skeleton className="w-16 h-3 bg-ds-hairline/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-5 rounded-full bg-ds-hairline/70" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-14 h-4 bg-ds-hairline/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-16 h-3 mb-1 bg-ds-hairline/70 rounded" />
                        <Skeleton className="w-20 h-3 bg-ds-hairline/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Skeleton className="w-6 h-6 rounded-md bg-ds-hairline/70 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredExercises.length > 0 ? (
                <tbody className="divide-y divide-ds-hairline">
                  {filteredExercises.map((exercise) => {
                    const badgeClass = getHssBadgeStyle(exercise.hssTarget);
                    return (
                      <tr
                        key={exercise.id}
                        onClick={() => openModal(exercise)}
                        className={`hover:bg-ds-surface/60 transition-colors group cursor-pointer ${
                          exercise.status === "archived" ? "opacity-60 bg-ds-surface/30" : ""
                        }`}
                      >
{canApprove && (
                          <td className="py-3.5 pl-4 sm:pl-5 pr-0 align-middle" onClick={(e) => e.stopPropagation()}>
                            {!exercise.expertValidated && (
                              <SelectBox
                                label={`Select ${exercise.name}`}
                                checked={selectedIds.has(exercise.id)}
                                onChange={() => toggleSelected(exercise.id)}
                              />
                            )}
                          </td>
                        )}
                        {/* 1. EXERCISE */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden bg-ds-tint border border-ds-hairline text-ds-on-tint ">
                              {(() => {
                                const resolvedUrl = resolveMediaUrl(exercise.mediaUrl);
                                if (!resolvedUrl) return <Dumbbell size={16} className="text-ds-primary" />;
                                
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
                              <p className="text-ds-ink font-semibold text-[13px] leading-tight mb-0.5 truncate">
                                {exercise.name}
                              </p>
                              <p className="text-ds-slate text-[11px] font-medium truncate max-w-[240px]">
                                {exercise.description || exercise.goal || "Physical rehabilitation regimen"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. TYPE / INTENSITY */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col">
                            <span className="text-ds-ink font-semibold text-[12.5px] leading-tight">
                              {exercise.type}
                            </span>
                            <span className="text-ds-slate text-[11px] font-medium mt-0.5">
                              {exercise.intensity} intensity
                            </span>
                          </div>
                        </td>

                        {/* 3. HSS TARGET */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {exercise.hssTarget.split(" ")[0]}
                          </span>
                        </td>

                        {/* 4. DURATION */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ds-ink">
                            <Clock size={13} className="text-ds-primary" />
                            {exercise.duration} min
                          </span>
                        </td>

                        {/* 5. MEDIA */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col gap-0.5 text-[11px] font-medium">
                            {exercise.videoUrl ? (
                              <span className="flex items-center gap-1 text-ds-charcoal font-semibold">
                                <Play size={11} strokeWidth={2.5} /> Video
                              </span>
                            ) : (
                              <span className="text-ds-steel flex items-center gap-1">— Video</span>
                            )}
                            {exercise.guideImages && exercise.guideImages.length > 0 ? (
                              <span className="flex items-center gap-1 text-ds-charcoal font-semibold">
                                <Image size={11} strokeWidth={2.5} /> {exercise.guideImages.length} Guides
                              </span>
                            ) : (
                              <span className="text-ds-steel flex items-center gap-1">— Guides</span>
                            )}
                          </div>
                        </td>

                        {/* 6. STATUS / REVIEW */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px] ${
                                exercise.status === "published"
                                  ? "bg-ds-mint text-ds-charcoal border border-ds-mint"
                                  : exercise.status === "draft"
                                  ? "bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold"
                                  : "bg-ds-surface text-ds-slate border border-ds-hairline"
                              }`}
                            >
                              {exercise.status}
                            </span>
                            {exercise.expertValidated ? (
                              <span className="text-[11px] text-ds-charcoal font-semibold flex items-center gap-1">
                                ✓ PT approved
                              </span>
                            ) : (
                              <span
                                className="text-[11px] text-ds-warm-text font-semibold flex items-center gap-1"
                                title={exercise.reviewNote ? `Physical therapist's note: ${exercise.reviewNote}` : undefined}
                              >
                                ⚠ {exercise.reviewNote ? "Sent back by PT" : "Waiting for PT"}
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
                              className="p-1.5 text-ds-slate hover:text-ds-ink hover:bg-ds-surface rounded-[8px] transition-colors cursor-pointer"
                              onClick={(e) => toggleMenu(e, exercise.id)}
                              title="Actions"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>

                          {activeMenuId === exercise.id && (
                            <div
                              className="fixed w-44 bg-ds-canvas border border-ds-hairline rounded-xl shadow-xl p-1.5 z-50 text-left"
                              style={menuPos || undefined}
                            >
                              {/* Edit Action */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  openModal(exercise);
                                }}
                                className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <Edit2 size={13} className="text-ds-primary" />
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="text-ds-charcoal" />
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
                                  className="w-full px-2.5 py-1.5 text-[12px] text-ds-ink hover:bg-ds-surface rounded-[6px] flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Archive size={13} className="text-ds-warm-text" />
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
                                  setActiveMenuId(null);
                                  requestDeleteExercise(exercise);
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
            {!loading && filteredExercises.length === 0 && (
              <div className="p-12 text-center text-ds-slate text-[13px] flex flex-col items-center justify-center gap-2.5 border-t border-ds-hairline">
                {exercisesQuery.isError ? (
                  <LoadError what="the exercise library" onRetry={exercisesQuery.refetch} className="py-2" />
                ) : exercises.length === 0 ? (
                  <p className="font-medium text-ds-slate">No exercises available in the library.</p>
                ) : (
                  <>
                    <p className="font-medium text-ds-ink">No exercise routines match your filter criteria.</p>
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

        {/* Slide-over Form Modal */}
        <ExerciseFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          exercise={editingExercise}
          userRole={userRole}
          isPT={userRole === "medical_expert" && user?.expert_type === "Physical Therapist"}
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
                await apiFetch("/api/exercises/", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                toast.success("Routine Created", {
                  description: `"${data.name}" was added to the exercise library.`,
                });
              }
              closeModal();
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

{canApprove && (
          <BulkApproveBar
            selected={exercises.filter((x) => selectedIds.has(x.id))}
            noun="exercise"
            approve={(x) =>
              apiFetch(`/api/exercises/${x.id}`, {
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
