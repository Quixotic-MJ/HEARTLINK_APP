import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Clock,
  Megaphone,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import LoadError from "../../components/ui/loadError.jsx";
import { Skeleton } from "../../components/ui/skeleton.jsx";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import NewBroadcastModal from "./components/newBroadcastModal.jsx";
import ViewBroadcastModal, {
  CategoryBadge,
} from "./components/viewBroadcastModal.jsx";

import { LibraryBanner } from "../../components/ui/libraryBanner.jsx";

const NO_BROADCASTS = [];

const CATEGORY_TABS = [
  ["all", "All"],
  ["Maintenance", "Maintenance"],
  ["App Update", "App update"],
  ["Safety Reminder", "Safety"],
  ["General", "General"],
];

const Broadcasts = () => {
  // Publishing or deleting through apiFetch refreshes this list by itself
  const broadcastsQuery = useApiQuery("/api/admin/broadcasts", {
    select: (data) =>
      (data || []).map((row) => {
        const date = new Date(row.created_at || "invalid");
        return {
          ...row,
          date: Number.isNaN(date.getTime())
            ? "Not recorded"
            : date.toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "short",
              }),
        };
      }),
  });
  const broadcasts = broadcastsQuery.data ?? NO_BROADCASTS;
  const isLoading = broadcastsQuery.isPending;
  const unavailable = isLoading || broadcastsQuery.isError;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState(null);
  const openModal = () => setIsModalOpen(true);

  const handlePublish = async (draft) => {
    const response = await apiFetch("/api/admin/broadcasts", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    if (response?.status !== "success" || !response.data?.id) {
      throw {
        data: {
          detail:
            "Publication was not confirmed. Check the list before retrying.",
        },
      };
    }
    if (response.data.notification_status === "unconfirmed") {
      toast.warning("Announcement saved; notification delivery unconfirmed", {
        description:
          "Do not republish this notice to retry delivery. Check with an Admin.",
      });
    } else {
      toast.success("Announcement published", {
        description:
          "Saved for active app accounts. Push, display and read delivery are not verified.",
      });
    }
  };

  const counts = useMemo(() => {
    return {
      all: broadcasts.length,
      Maintenance: broadcasts.filter((b) => b.type === "Maintenance").length,
      "App Update": broadcasts.filter((b) => b.type === "App Update").length,
      "Safety Reminder": broadcasts.filter((b) => b.type === "Safety Reminder")
        .length,
      General: broadcasts.filter((b) => b.type === "General").length,
    };
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return broadcasts.filter((b) => {
      const matchesCategory =
        filterCategory === "all" || b.type === filterCategory;
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
      <div className="workspace workspace--operations mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        <LibraryBanner
          icon={Megaphone}
          title="System announcements"
          description="Clear notices for the app community. Publish factual service updates, with a preview before anything is sent."
          unavailable={unavailable}
          stats={[
            ["Published notices", counts.all],
            ["Maintenance", counts.Maintenance],
            ["Safety reminders", counts["Safety Reminder"]],
          ]}
          action={
            <button type="button" onClick={openModal}>
              <Plus size={17} aria-hidden="true" />
              Create announcement
            </button>
          }
        />
        <p className="text-sm text-cal-muted">
          Publication history is not a delivery or read receipt. This is not a
          clinical alert system.
        </p>
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
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                    <span
                      className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums ${
                        active
                          ? "text-white/90 font-medium"
                          : "text-cal-muted-soft"
                      }`}
                    >
                      {unavailable ? "—" : counts[key]}
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
          <div
            role="region"
            aria-label="Announcement history table"
            tabIndex={0}
            className="w-full overflow-x-auto"
          >
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

      {isModalOpen && (
        <NewBroadcastModal
          onClose={() => setIsModalOpen(false)}
          onPublish={handlePublish}
        />
      )}
      <ViewBroadcastModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        broadcast={activeBroadcast}
      />
    </AdminLayout>
  );
};

export default Broadcasts;
