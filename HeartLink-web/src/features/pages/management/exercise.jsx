import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  Edit2,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExerciseFormModal from "../../../components/modals/ExerciseFormModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import {
  BulkApproveBar,
  SelectBox,
} from "../../../components/modals/BulkApprove";
import { Skeleton } from "../../../components/ui/Skeleton";
import LoadError from "../../../components/ui/LoadError";
import { apiFetch, BASE_URL } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useAuth } from "../../../contexts/useAuth";
import { toast } from "sonner";

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
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

function ExerciseMediaThumb({ src, alt }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const resolved = resolveMediaUrl(src);

  const ytMatch = resolved.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/
  );
  const imgUrl = ytMatch?.[1]
    ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
    : resolved;

  const isVideo =
    !ytMatch &&
    (resolved.startsWith("data:video") || resolved.endsWith(".mp4"));
  const hasError = !!imgUrl && failedSrc === imgUrl;

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-cal-hairline bg-cal-surface-soft text-cal-muted">
      {!resolved || hasError ? (
        <Dumbbell size={15} className="text-cal-muted" />
      ) : isVideo ? (
        <video
          src={resolved}
          className="h-full w-full object-cover"
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <img
          src={imgUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(imgUrl)}
        />
      )}
    </div>
  );
}

// The library as the screen shows it, from the API's rows (HL-035: loaded through React Query)
const NO_EXERCISES = [];
const toExercises = (res) => {
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((r) => {
    const hssTier = HSS_TIER_LABELS[r.hss_tier] ? r.hss_tier : "Stable";
    return {
      id: r.id,
      name: r.name || "",
      description: r.description || "",
      duration: r.duration_minutes || 0,
      hssTier,
      hssTarget: HSS_TIER_LABELS[hssTier],
      mediaUrl: r.media_url || "",
      videoUrl: r.video_url || "",
      guideImages: r.guide_images || [],
      status: r.status || "draft",
      expertValidated: r.expert_validated || false,
      steps: r.steps || [],
      type: r.type || "General",
      intensity: r.intensity === "Medium" ? "Moderate" : r.intensity || "Low",
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
};

const getHssBadge = (tier, label) => {
  if (tier === "Stable") {
    return {
      tone: "border-cal-success/25 bg-cal-success/10 text-cal-ink",
      dot: "bg-cal-success",
      text: label.split(" ")[0],
    };
  }
  if (tier === "Moderate") {
    return {
      tone: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      dot: "bg-cal-warning",
      text: label.split(" ")[0],
    };
  }
  return {
    tone: "border-cal-error/25 bg-cal-error/10 text-cal-ink",
    dot: "bg-cal-error",
    text: tier,
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

const Exercises = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHss, setFilterHss] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterIntensity, setFilterIntensity] = useState("all");
  const [filterReview, setFilterReview] = useState("all");

  // Support ?search= links cleanly during render
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }

  // A save through apiFetch refreshes this list by itself
  const exercisesQuery = useApiQuery("/api/exercises/", {
    select: toExercises,
  });
  const exercises = exercisesQuery.data ?? NO_EXERCISES;
  const loading = exercisesQuery.isPending;

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);

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
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleOutsideClick, true);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleOutsideClick, true);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const { user } = useAuth();
  const userRole = user?.role;
  // Approving several at once: only the Physical Therapist who approves sees the checkboxes (HL-026/037).
  const canApprove =
    userRole === "medical_expert" && user?.expert_type === "Physical Therapist";

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
        setupSteps: exercise.setupSteps,
        rounds: exercise.rounds,
        restSeconds: exercise.restSeconds,
        position: exercise.position || null,
        setting: exercise.setting || null,
        skipIf: exercise.skipIf,
        stopIf: exercise.stopIf,
        easierVersion: exercise.easierVersion,
        effortHint: exercise.effortHint,
        frequency: exercise.frequency,
      };

      await apiFetch(`/api/exercises/${exercise.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const title =
        newStatus === "published"
          ? "Routine published"
          : newStatus === "archived"
            ? "Routine archived"
            : "Routine restored to draft";

      toast.success(title, {
        description: `"${exercise.name}" status updated to ${newStatus}.`,
      });
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update status", {
        description: err?.data?.detail || "Could not change status.",
      });
    }
  };

  const requestArchiveExercise = (exercise) => {
    if (!exercise) return;
    setConfirmConfig({
      isOpen: true,
      title: "Archive exercise routine?",
      subtitle: "Hide from mobile patients",
      description: `Archive "${exercise.name}"? This routine will be hidden from mobile patient recommendations while remaining accessible in your library.`,
      confirmText: "Archive routine",
      cancelText: "Cancel",
      variant: "warning",
      icon: Archive,
      entityInfo: {
        name: exercise.name,
        badge: "Published → Archived",
        email: `${exercise.type} · ${exercise.hssTarget}`,
        id: exercise.id,
      },
      impactDetails: [
        "Hidden from patient search results and recommended workout regimens.",
        "Can be restored back to Draft status at any time.",
      ],
      onConfirm: async () => {
        await handleUpdateStatus(exercise, "archived");
      },
    });
  };

  const requestDeleteExercise = (exercise) => {
    if (!exercise) return;
    setConfirmConfig({
      isOpen: true,
      title: "Delete routine permanently?",
      subtitle: "Permanent database action",
      description: `Permanently delete "${exercise.name}"? This action cannot be undone and removes all movement guides, video links, and instructions.`,
      confirmText: "Delete permanently",
      cancelText: "Cancel",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: exercise.name,
        badge: exercise.status?.toUpperCase() || "EXERCISE",
        email: `${exercise.type} · ${exercise.hssTarget}`,
        id: exercise.id,
      },
      impactDetails: [
        "Permanently removed from the exercise library database.",
        "Historical patient workout logs retain activity summary only.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/exercises/${exercise.id}`, {
            method: "DELETE",
          });
          toast.success("Routine deleted", {
            description: `"${exercise.name}" was permanently removed.`,
          });
          if (editingExercise?.id === exercise.id) {
            closeModal();
          }
        } catch (err) {
          console.error("Failed to delete exercise", err);
          toast.error("Failed to delete routine", {
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
    if (searchParams.has("search")) {
      const next = new URLSearchParams(searchParams);
      next.delete("search");
      setSearchParams(next, { replace: true });
    }
  };

  // KPI & Status Counts
  const statusCounts = useMemo(() => {
    return {
      all: exercises.length,
      published: exercises.filter((r) => r.status === "published").length,
      draft: exercises.filter((r) => r.status === "draft").length,
      archived: exercises.filter((r) => r.status === "archived").length,
    };
  }, [exercises]);

  const approvedCount = useMemo(
    () => exercises.filter((r) => r.expertValidated).length,
    [exercises]
  );
  const waitingCount = useMemo(
    () =>
      exercises.filter((r) => !r.expertValidated && r.status !== "archived")
        .length,
    [exercises]
  );

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
    const matchesType =
      filterType === "all" ||
      r.type === filterType ||
      (filterType === "Stationary" && r.type === "Stretching");
    const matchesIntensity =
      filterIntensity === "all" || r.intensity === filterIntensity;

    let matchesReview = true;
    if (filterReview === "validated") {
      matchesReview = r.expertValidated === true;
    } else if (filterReview === "pending") {
      matchesReview = r.expertValidated === false;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesHss &&
      matchesType &&
      matchesIntensity &&
      matchesReview
    );
  });

  const waitingShown = canApprove
    ? filteredExercises.filter((x) => !x.expertValidated)
    : [];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterStatus !== "all" ||
    filterHss !== "all" ||
    filterType !== "all" ||
    filterIntensity !== "all" ||
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
              <Dumbbell size={13.5} className="text-cal-ink" />
              <span>Clinical &amp; library · Rehabilitation database</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Exercise library
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Manage cardiac rehabilitation routines, guided movement steps,
              clinical HSS suitability tiers, and physical therapist sign-offs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
          >
            <Plus size={15.5} />
            <span>Create new routine</span>
          </button>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Total routines
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Dumbbell size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : statusCounts.all}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Breathing, cardio &amp; stationary
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Published
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                <CheckCircle2 size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : statusCounts.published}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Visible in mobile regimens
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                PT approved
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink">
                <ShieldCheck size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : approvedCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Clinically cleared movements
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Waiting for PT
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                <ShieldAlert size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : waitingCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Pending therapist sign-off
            </div>
          </div>
        </div>

        {/* ─── 3. MAIN DIRECTORY CARD: FILTERS & TABLE ──────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Toolbar */}
          <div className="space-y-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status Nav-Pill-Group */}
              <div
                role="group"
                aria-label="Filter routines by status"
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

              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
                />
                <input
                  type="text"
                  aria-label="Search exercise routines"
                  placeholder="Search routines, goals, or descriptions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cal-muted hover:text-cal-ink cursor-pointer"
                  >
                    <X size={13.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Facet Selects */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* HSS Tier */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  aria-label="Filter by HSS tier"
                  value={filterHss}
                  onChange={(e) => setFilterHss(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">HSS tier: All</option>
                  <option value="Stable (80-100)">Stable (80-100)</option>
                  <option value="Moderate (60-79)">Moderate (60-79)</option>
                  <option value="Elevated Risk (50-59)">
                    Elevated Risk (50-59)
                  </option>
                  <option value="Critical (<50)">Critical (&lt;50)</option>
                </select>
                <ChevronDown
                  size={13.5}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {/* Exercise Type */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  aria-label="Filter by exercise type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">Type: All</option>
                  <option value="Breathing">Breathing</option>
                  <option value="Light Cardio">Light Cardio</option>
                  <option value="Stationary">Stationary</option>
                  <option value="General">General</option>
                </select>
                <ChevronDown
                  size={13.5}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {/* Intensity */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  aria-label="Filter by intensity"
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">Intensity: All</option>
                  <option value="None">None</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
                <ChevronDown
                  size={13.5}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {/* Review Status */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  aria-label="Filter by review status"
                  value={filterReview}
                  onChange={(e) => setFilterReview(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">Review: All</option>
                  <option value="validated">PT approved</option>
                  <option value="pending">Waiting for PT</option>
                </select>
                <ChevronDown
                  size={13.5}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset filters</span>
                </button>
              )}

              <span className="ml-auto hidden lg:inline-block font-cal-mono text-[12px] tabular-nums text-cal-muted">
                {loading
                  ? "Loading…"
                  : `Showing ${filteredExercises.length} of ${exercises.length}`}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                  {canApprove && (
                    <th className="w-10 py-3 pl-4 sm:pl-5 pr-0">
                      <SelectBox
                        label="Select every exercise waiting for approval"
                        checked={
                          waitingShown.length > 0 &&
                          waitingShown.every((x) => selectedIds.has(x.id))
                        }
                        indeterminate={waitingShown.some((x) =>
                          selectedIds.has(x.id)
                        )}
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
                  <th className="w-[30%] px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Exercise routine
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Type &amp; intensity
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    HSS target
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Duration &amp; load
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Media
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Status &amp; review
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Actions
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody className="divide-y divide-cal-hairline">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item}>
                      {canApprove && (
                        <td className="py-3.5 pl-4 sm:pl-5 pr-0">
                          <Skeleton className="h-4 w-4 rounded bg-cal-surface-card" />
                        </td>
                      )}
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 shrink-0 rounded-[8px] bg-cal-surface-card" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36 rounded bg-cal-surface-card" />
                            <Skeleton className="h-3 w-48 rounded bg-cal-surface-card" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="mb-1.5 h-4 w-24 rounded bg-cal-surface-card" />
                        <Skeleton className="h-3 w-20 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-5 w-24 rounded-full bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="mb-1.5 h-4 w-16 rounded bg-cal-surface-card" />
                        <Skeleton className="h-3 w-20 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="mb-1.5 h-3.5 w-16 rounded bg-cal-surface-card" />
                        <Skeleton className="h-3.5 w-16 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="mb-1.5 h-5 w-20 rounded-full bg-cal-surface-card" />
                        <Skeleton className="h-3 w-24 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <Skeleton className="ml-auto h-8 w-8 rounded-[8px] bg-cal-surface-card" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredExercises.length > 0 ? (
                <tbody className="divide-y divide-cal-hairline">
                  {filteredExercises.map((exercise) => {
                    const hss = getHssBadge(
                      exercise.hssTier,
                      exercise.hssTarget
                    );
                    const guideCount = Array.isArray(exercise.guideImages)
                      ? exercise.guideImages.length
                      : 0;

                    return (
                      <tr
                        key={exercise.id}
                        onClick={() => openModal(exercise)}
                        className={`group cursor-pointer transition-colors hover:bg-cal-surface-soft/70 ${
                          exercise.status === "archived" ? "opacity-65" : ""
                        }`}
                      >
                        {canApprove && (
                          <td
                            className="py-3.5 pl-4 sm:pl-5 pr-0 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!exercise.expertValidated && (
                              <SelectBox
                                label={`Select ${exercise.name}`}
                                checked={selectedIds.has(exercise.id)}
                                onChange={() => toggleSelected(exercise.id)}
                              />
                            )}
                          </td>
                        )}

                        {/* 1. EXERCISE ROUTINE */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <ExerciseMediaThumb
                              src={exercise.mediaUrl}
                              alt={exercise.name}
                            />
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-[13.5px] font-semibold leading-tight text-cal-ink">
                                {exercise.name}
                              </p>
                              <p className="mt-0.5 max-w-[260px] truncate text-[12px] text-cal-muted">
                                {exercise.description ||
                                  exercise.goal ||
                                  "Physical rehabilitation regimen"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. TYPE & INTENSITY */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold leading-tight text-cal-ink">
                              {exercise.type}
                            </span>
                            <span className="mt-0.5 text-[12px] text-cal-muted">
                              {exercise.intensity} intensity
                            </span>
                          </div>
                        </td>

                        {/* 3. HSS TARGET */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <span className={`${PILL} ${hss.tone}`}>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${hss.dot}`}
                            />
                            <span>{hss.text}</span>
                          </span>
                        </td>

                        {/* 4. DURATION & LOAD */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink">
                              <Clock size={13} className="text-cal-muted" />
                              <span>{exercise.duration} min</span>
                            </span>
                            <span className="mt-0.5 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                              {exercise.calories > 0
                                ? `~${exercise.calories} kcal`
                                : exercise.rounds > 1
                                  ? `${exercise.rounds} rounds`
                                  : `${(exercise.steps || []).length} steps`}
                            </span>
                          </div>
                        </td>

                        {/* 5. MEDIA */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex flex-col gap-0.5 text-[12px]">
                            {exercise.videoUrl ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-cal-ink">
                                <Play size={11.5} className="text-cal-ink" />
                                <span>Video</span>
                              </span>
                            ) : (
                              <span className="text-cal-muted-soft">
                                — Video
                              </span>
                            )}
                            {guideCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 font-cal-mono text-[11.5px] font-medium tabular-nums text-cal-ink">
                                <ImageIcon
                                  size={11.5}
                                  className="text-cal-muted"
                                />
                                <span>
                                  {guideCount}{" "}
                                  {guideCount === 1 ? "guide" : "guides"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-cal-muted-soft">
                                — Guides
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. STATUS & REVIEW */}
                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] ${getStatusPill(
                                exercise.status
                              )}`}
                            >
                              {exercise.status}
                            </span>
                            {exercise.expertValidated ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-cal-ink">
                                <ShieldCheck
                                  size={12.5}
                                  className="text-cal-success"
                                />
                                <span>PT approved</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-cal-muted"
                                title={
                                  exercise.reviewNote
                                    ? `Physical therapist's note: ${exercise.reviewNote}`
                                    : undefined
                                }
                              >
                                <AlertCircle
                                  size={12.5}
                                  className="text-cal-warning"
                                />
                                <span>
                                  {exercise.reviewNote
                                    ? "Sent back by PT"
                                    : "Waiting for PT"}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. ACTIONS */}
                        <td
                          className="relative px-4 py-3.5 sm:px-5 text-right align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              aria-label={`Actions for ${exercise.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-surface-card hover:text-cal-ink transition-colors cursor-pointer"
                              onClick={(e) => toggleMenu(e, exercise.id)}
                              title="Actions"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>

                          {activeMenuId === exercise.id && (
                            <div
                              role="menu"
                              className="fixed z-50 w-44 rounded-[10px] border border-cal-hairline bg-cal-canvas p-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                              style={menuPos || undefined}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  openModal(exercise);
                                }}
                                className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                              >
                                <Edit2
                                  size={13.5}
                                  className="text-cal-muted"
                                />
                                <span>Edit routine</span>
                              </button>

                              {exercise.status === "draft" && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    handleUpdateStatus(exercise, "published");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <CheckCircle2
                                    size={13.5}
                                    className="text-cal-success"
                                  />
                                  <span>Publish</span>
                                </button>
                              )}

                              {exercise.status === "published" && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    requestArchiveExercise(exercise);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <Archive
                                    size={13.5}
                                    className="text-cal-muted"
                                  />
                                  <span>Archive</span>
                                </button>
                              )}

                              {exercise.status === "archived" && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    handleUpdateStatus(exercise, "draft");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-medium text-cal-ink hover:bg-cal-surface-soft cursor-pointer"
                                >
                                  <RotateCcw
                                    size={13.5}
                                    className="text-cal-muted"
                                  />
                                  <span>Restore to draft</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-cal-hairline" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  requestDeleteExercise(exercise);
                                }}
                                className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] font-medium text-cal-error hover:bg-cal-error/10 cursor-pointer"
                              >
                                <Trash2 size={13.5} />
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

            {/* Empty / Error States */}
            {!loading && filteredExercises.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2.5 border-t border-cal-hairline px-6 py-14 text-center">
                {exercisesQuery.isError ? (
                  <LoadError
                    what="the exercise library"
                    onRetry={exercisesQuery.refetch}
                    className="py-2"
                  />
                ) : exercises.length === 0 ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                      <Dumbbell size={18} />
                    </div>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No exercise routines yet
                    </p>
                    <p className="max-w-sm text-[13px] text-cal-muted">
                      Add your first cardiac rehabilitation routine to begin
                      building personalized movement regimens.
                    </p>
                    <button
                      type="button"
                      onClick={() => openModal()}
                      className="mt-1.5 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create new routine</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No exercise routines match your filters
                    </p>
                    <p className="text-[13px] text-cal-muted">
                      Try clearing your search or adjusting the status and HSS
                      filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13.5} />
                      <span>Reset filters</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Review & Edit Modal */}
        <ExerciseFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          exercise={editingExercise}
          isPT={canApprove}
          onSave={async (data) => {
            try {
              if (editingExercise?.id) {
                await apiFetch(`/api/exercises/${editingExercise.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                toast.success("Routine updated", {
                  description: `"${data.name}" was saved successfully.`,
                });
              } else {
                await apiFetch("/api/exercises/", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                toast.success("Routine created", {
                  description: `"${data.name}" was added to the exercise library.`,
                });
              }
              closeModal();
            } catch (err) {
              console.error("Error saving exercise:", err);
              toast.error("Failed to save routine", {
                description:
                  err?.data?.detail || "Could not save exercise routine.",
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
