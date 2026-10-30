import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Megaphone,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import AdminLayout from "../../../components/layouts/adminLayout";
import NewBroadcastModal from "../../../components/modals/NewBroadcastModal";
import ViewBroadcastModal, {
  CategoryBadge,
} from "../../../components/modals/ViewBroadcastModal";

const NO_BROADCASTS = [];

const CATEGORY_TABS = [
  ["all", "All"],
  ["Maintenance", "Maintenance"],
  ["App Update", "App update"],
  ["Safety Reminder", "Safety"],
  ["General", "General"],
];

function PublishConfirmModal({
  isOpen,
  pendingBroadcast,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  useDialogFocus(isOpen, dialogRef, () => {
    if (!isSubmitting) onClose();
  });

  if (!isOpen || !pendingBroadcast) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity cursor-pointer"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-broadcast-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.14)]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-cal-hairline px-6 pt-5 pb-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
            <AlertTriangle size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="confirm-broadcast-title"
              className="font-cal-display text-[20px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
            >
              Confirm announcement
            </h3>
            <p className="mt-0.5 text-[12.5px] text-cal-muted">
              Review details before publishing to all registered users.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-5">
          {/* Title & Category */}
          <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-medium text-cal-muted">
                Title
              </span>
              <CategoryBadge category={pendingBroadcast.type} />
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-cal-ink">
              {pendingBroadcast.title || "Untitled announcement"}
            </p>
          </div>

          {/* Audience */}
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-3.5 py-2.5 text-[13px]">
            <span className="font-medium text-cal-muted">Target audience</span>
            <span className="font-semibold text-cal-ink">
              {pendingBroadcast.targetAudience || "All Registered Accounts"}
            </span>
          </div>

          {/* Message Preview */}
          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-cal-muted">
              Message preview
            </span>
            <div className="max-h-36 overflow-y-auto rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-cal-ink">
                {pendingBroadcast.message}
              </p>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-cal-muted">
            This announcement will be delivered to{" "}
            <strong className="font-semibold text-cal-ink">
              {pendingBroadcast.targetAudience || "all users"}
            </strong>{" "}
            immediately.
          </p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            Back to edit
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>{isSubmitting ? "Publishing…" : "Yes, publish"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const Broadcasts = () => {
  // Publishing or deleting through apiFetch refreshes this list by itself
  const broadcastsQuery = useApiQuery("/api/admin/broadcasts", {
    select: (d) => d || [],
  });
  const broadcasts = broadcastsQuery.data ?? NO_BROADCASTS;
  const isLoading = broadcastsQuery.isPending;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState(null);

  // Pending Broadcast State for Confirmation
  const [pendingBroadcast, setPendingBroadcast] = useState(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setPendingBroadcast(null);
  };

  const handlePublishClick = (type, msg, targetAudience, title) => {
    setPendingBroadcast({ type, message: msg, targetAudience, title });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!pendingBroadcast) return;
    setIsSubmitting(true);
    try {
      await apiFetch("/api/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title: pendingBroadcast.title,
          type: pendingBroadcast.type,
          message: pendingBroadcast.message,
          targetAudience: pendingBroadcast.targetAudience,
        }),
      });
      toast.success("Announcement published", {
        description: `"${pendingBroadcast.title}" was delivered to all registered accounts.`,
      });
      setIsConfirmModalOpen(false);
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish announcement", {
        description:
          err?.data?.detail || "Could not publish announcement right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId) => {
    try {
      await apiFetch(`/api/admin/broadcasts/${broadcastId}`, {
        method: "DELETE",
      });
      toast.success("Announcement deleted", {
        description: "Removed from user announcement feeds.",
      });
      setViewModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete announcement", {
        description: err?.data?.detail || "Could not delete announcement.",
      });
    }
  };

  const counts = useMemo(() => {
    const normalizeType = (t) =>
      ["Maintenance", "App Update", "Safety Reminder"].includes(t)
        ? t
        : "General";
    return {
      all: broadcasts.length,
      Maintenance: broadcasts.filter(
        (b) => normalizeType(b.type) === "Maintenance"
      ).length,
      "App Update": broadcasts.filter(
        (b) => normalizeType(b.type) === "App Update"
      ).length,
      "Safety Reminder": broadcasts.filter(
        (b) => normalizeType(b.type) === "Safety Reminder"
      ).length,
      General: broadcasts.filter((b) => normalizeType(b.type) === "General")
        .length,
    };
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return broadcasts.filter((b) => {
      const normalized = [
        "Maintenance",
        "App Update",
        "Safety Reminder",
      ].includes(b.type)
        ? b.type
        : "General";
      const matchesCategory =
        filterCategory === "all" || normalized === filterCategory;
      const matchesSearch =
        !q ||
        (b.title || "").toLowerCase().includes(q) ||
        (b.message || "").toLowerCase().includes(q) ||
        (b.display_publisher || b.publisher || "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [broadcasts, filterCategory, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Megaphone size={13.5} className="text-cal-ink" />
              <span>Users &amp; feedback · Platform announcements</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              System announcements
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Publish platform announcements, clinical safety reminders, and
              maintenance advisories to all registered accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
          >
            <Plus size={15.5} />
            <span>Create announcement</span>
          </button>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Total published
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Megaphone size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {isLoading ? "—" : counts.all}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Active broadcast feed items
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Safety reminders
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
                <ShieldAlert size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {isLoading ? "—" : counts["Safety Reminder"]}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Patient wellness &amp; warning notices
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Maintenance
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                <Wrench size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {isLoading ? "—" : counts.Maintenance}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Scheduled service advisories
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Updates &amp; general
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink">
                <Info size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {isLoading ? "—" : counts["App Update"] + counts.General}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Release notes &amp; general news
            </div>
          </div>
        </div>

        {/* ─── 3. MAIN DIRECTORY CARD: FILTERS & TABLE ──────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3.5 sm:px-5">
            <div
              role="group"
              aria-label="Filter announcements by category"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
            >
              {CATEGORY_TABS.map(([key, label]) => {
                const active = filterCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterCategory(key)}
                    className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="broadcast-category-filter-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-xs"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    <span
                      className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums ${
                        active ? "text-white/90 font-medium" : "text-cal-muted-soft"
                      }`}
                    >
                      {isLoading ? "—" : counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-80">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search announcements"
                placeholder="Search title, message, or publisher…"
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

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Published
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Category
                  </th>
                  <th className="w-[44%] px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Announcement
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Publisher
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Action
                  </th>
                </tr>
              </thead>

              {isLoading ? (
                <tbody className="divide-y divide-cal-hairline">
                  {[1, 2, 3, 4].map((item) => (
                    <tr key={item}>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-4 w-28 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-5 w-24 rounded-full bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="mb-1.5 h-4 w-48 rounded bg-cal-surface-card" />
                        <Skeleton className="h-3 w-72 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-4 w-28 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <Skeleton className="ml-auto h-8 w-24 rounded-[8px] bg-cal-surface-card" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredBroadcasts.length > 0 ? (
                <tbody className="divide-y divide-cal-hairline">
                  {filteredBroadcasts.map((b) => {
                    const publisherName =
                      b.display_publisher ||
                      (b.publisher
                        ? b.publisher.replace(/^[^(]+\((.+)\)$/, "$1")
                        : "System Admin");

                    return (
                      <tr
                        key={b.id}
                        onClick={() => {
                          setActiveBroadcast(b);
                          setViewModalOpen(true);
                        }}
                        className="group cursor-pointer transition-colors hover:bg-cal-surface-soft/70"
                      >
                        <td className="px-4 py-3.5 sm:px-5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-cal-mono text-[12.5px] tabular-nums text-cal-muted">
                            <Clock size={12.5} aria-hidden="true" />
                            <span>{b.date}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <CategoryBadge category={b.type} />
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="max-w-[440px]">
                            <p className="truncate text-[13.5px] font-semibold text-cal-ink">
                              {b.title || "Announcement"}
                            </p>
                            <p className="mt-0.5 truncate text-[12.5px] text-cal-muted">
                              {b.message}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 sm:px-5 align-middle">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-cal-ink">
                              {publisherName}
                            </span>
                            {typeof b.recipients_count === "number" && (
                              <span className="mt-0.5 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                                {b.recipients_count}{" "}
                                {b.recipients_count === 1
                                  ? "recipient"
                                  : "recipients"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td
                          className="px-4 py-3.5 sm:px-5 text-right align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBroadcast(b);
                              setViewModalOpen(true);
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>View details</span>
                            <ChevronRight
                              size={13}
                              className="text-cal-muted"
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ) : null}
            </table>

            {/* Empty / Error States */}
            {!isLoading && filteredBroadcasts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2.5 border-t border-cal-hairline px-6 py-14 text-center">
                {broadcastsQuery.isError ? (
                  <LoadError
                    what="announcements"
                    onRetry={broadcastsQuery.refetch}
                    className="py-2"
                  />
                ) : broadcasts.length === 0 ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                      <Megaphone size={18} />
                    </div>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No announcements published yet
                    </p>
                    <p className="max-w-sm text-[13px] text-cal-muted">
                      Publish your first platform announcement, app update, or
                      clinical safety reminder.
                    </p>
                    <button
                      type="button"
                      onClick={openModal}
                      className="mt-1.5 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create announcement</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-cal-ink">
                      No announcements match your filters
                    </p>
                    <p className="text-[13px] text-cal-muted">
                      Try clearing your search or switching category filters.
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
      </div>

      {/* Composer Modal */}
      <NewBroadcastModal
        isOpen={isModalOpen}
        isCovered={isConfirmModalOpen}
        onClose={closeModal}
        onPublish={handlePublishClick}
      />

      {/* Read-Only View Modal */}
      <ViewBroadcastModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        broadcast={activeBroadcast}
        onDelete={handleDeleteBroadcast}
      />

      {/* Publish Confirmation Modal */}
      <PublishConfirmModal
        isOpen={isConfirmModalOpen}
        pendingBroadcast={pendingBroadcast}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmPublish}
      />
    </AdminLayout>
  );
};

export default Broadcasts;
