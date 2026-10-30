import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  MessageSquare,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import TicketModal from "../../../components/modals/TicketModal";
import FeedbackCategoryBadge from "../../../components/ui/FeedbackCategoryBadge";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";

const NO_TICKETS = [];

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const STATUS_TABS = [
  { key: "active", label: "Active" },
  { key: "all", label: "All tickets" },
  { key: "Open", label: "Open" },
  { key: "In Progress", label: "In progress" },
  { key: "Resolved", label: "Resolved" },
  { key: "Archived", label: "Archived" },
];

function StatusBadge({ status }) {
  switch (status) {
    case "Resolved":
      return (
        <span
          className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
        >
          <CheckCircle2
            size={11}
            className="text-cal-success"
            aria-hidden="true"
          />
          <span>Resolved</span>
        </span>
      );
    case "In Progress":
      return (
        <span
          className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
        >
          <Activity
            size={11}
            className="text-cal-warning animate-pulse"
            aria-hidden="true"
          />
          <span>In progress</span>
        </span>
      );
    case "Archived":
      return (
        <span
          className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-muted`}
        >
          <Inbox size={11} className="text-cal-muted" aria-hidden="true" />
          <span>Archived</span>
        </span>
      );
    default:
      return (
        <span
          className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}
        >
          <AlertCircle
            size={11}
            className="text-cal-error"
            aria-hidden="true"
          />
          <span>Open</span>
        </span>
      );
  }
}

const Feedback = () => {
  // Checks for new tickets every 30 seconds while the tab is open
  const ticketsQuery = useApiQuery("/api/feedback/", {
    select: (d) => (Array.isArray(d) ? d : NO_TICKETS),
    refetchInterval: 30 * 1000,
  });
  const tickets = ticketsQuery.data ?? NO_TICKETS;
  const loading = ticketsQuery.isPending;
  const fetchError = ticketsQuery.isError;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  const openModal = (ticket) => {
    setActiveTicket(ticket);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTicket(null);
  };

  const handleUpdateTicket = async (id, newStatus, newNotes) => {
    try {
      await apiFetch(`/api/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus, adminNotes: newNotes }),
      });
      toast.success("Ticket updated", {
        description: `Ticket ${id} marked as ${newStatus}.`,
      });
      closeModal();
    } catch (err) {
      console.error("Error updating ticket:", err);
      toast.error("Failed to update ticket", {
        description: err?.data?.detail || "Could not update ticket.",
      });
    }
  };

  const handleArchiveTicket = async (id, notes) => {
    try {
      await apiFetch(`/api/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "Archived",
          adminNotes: notes,
        }),
      });
      toast.success("Ticket archived", {
        description: `Ticket ${id} moved to archive.`,
      });
      closeModal();
    } catch (err) {
      console.error("Error archiving ticket:", err);
      toast.error("Failed to archive ticket", {
        description: err?.data?.detail || "Could not archive ticket.",
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("active");
    setSortOrder("newest");
  };

  // Filter Logic
  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (t.ticketId || "").toLowerCase().includes(q) ||
      (t.fullMessage || "").toLowerCase().includes(q) ||
      (t.userId || "").toLowerCase().includes(q);
    const matchesCategory =
      filterCategory === "all" || t.category === filterCategory;

    let matchesStatus;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else if (filterStatus === "active") {
      matchesStatus = t.status !== "Archived";
    } else {
      matchesStatus =
        (t.status || "").toLowerCase() === filterStatus.toLowerCase();
    }
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort Logic
  filteredTickets.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA === dateB) {
      return sortOrder === "newest" ? b.id - a.id : a.id - b.id;
    }
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Metrics Logic
  const totalTickets = tickets.length;
  const openTicketsCount = tickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;
  const resolvedTicketsCount = tickets.filter(
    (t) => t.status === "Resolved"
  ).length;
  const bugReportsCount = tickets.filter(
    (t) => t.category === "Bug Report"
  ).length;

  // Reset page when filters change (render-derived, no effect)
  const filterKey = [
    searchQuery,
    filterCategory,
    filterStatus,
    sortOrder,
  ].join("|");
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  if (filterKey !== pageFilterKey) {
    setPageFilterKey(filterKey);
    setCurrentPage(1);
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterCategory !== "all" ||
    filterStatus !== "active" ||
    sortOrder !== "newest";

  const rangeStart =
    filteredTickets.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(
    currentPage * itemsPerPage,
    filteredTickets.length
  );

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <MessageSquare size={13.5} className="text-cal-ink" />
              <span>User support · Feedback &amp; bug reports</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Feedback &amp; reports
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Review mobile user bug tickets, UI/UX improvement ideas, and
              account inquiries submitted through the patient app.
            </p>
          </div>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Total tickets
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Inbox size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : totalTickets}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              All submitted user inquiries
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Open &amp; in progress
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                <Activity size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : openTicketsCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Awaiting admin resolution
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Resolved
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
                <CheckCircle2 size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : resolvedTicketsCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Addressed &amp; closed tickets
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Bug reports
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
                <Bug size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : bugReportsCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Technical issues reported
            </div>
          </div>
        </div>

        {/* ─── 3. FEEDBACK INBOX CARD ────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3 sm:px-5">
            <div
              role="group"
              aria-label="Filter tickets by status"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
            >
              {STATUS_TABS.map((tab) => {
                const active = filterStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="feedback-status-filter-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-xs"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search feedback tickets"
                placeholder="Search ticket ID, account, message…"
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

          {/* Secondary Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-surface-soft/40 px-4 py-2.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <select
                  aria-label="Filter by category"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-8 appearance-none rounded-[6px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[12.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="all">All categories</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="UI/UX Suggestion">UI/UX Suggestion</option>
                  <option value="Account Issue">Account Issue</option>
                  <option value="Question">Question</option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              <div className="relative">
                <select
                  aria-label="Sort order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-8 appearance-none rounded-[6px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[12.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-cal-hairline bg-cal-canvas px-2.5 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} className="text-cal-muted" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            <div className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
              {filteredTickets.length}{" "}
              {filteredTickets.length === 1 ? "ticket" : "tickets"}
            </div>
          </div>

          {/* Error Banner */}
          {fetchError && (
            <div className="border-b border-cal-hairline px-6 py-4">
              <LoadError
                what="feedback tickets"
                onRetry={ticketsQuery.refetch}
                className="py-1"
              />
            </div>
          )}

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-cal-hairline bg-cal-surface-soft/70">
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Ticket ID &amp; Date
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Category
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Account ID
                  </th>
                  <th className="w-[42%] px-4 py-3 sm:px-5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    User Message
                  </th>
                  <th className="px-4 py-3 sm:px-5 text-right text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cal-hairline">
                {loading ? (
                  [1, 2, 3, 4, 5].map((idx) => (
                    <tr key={`skeleton-${idx}`}>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-4 w-28 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-5 w-24 rounded-full bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-4 w-24 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Skeleton className="h-4 w-64 rounded bg-cal-surface-card" />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <Skeleton className="ml-auto h-5 w-20 rounded-full bg-cal-surface-card" />
                      </td>
                    </tr>
                  ))
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => openModal(ticket)}
                      className="group cursor-pointer transition-colors hover:bg-cal-surface-soft/70"
                    >
                      <td className="px-4 py-3.5 sm:px-5 align-middle whitespace-nowrap">
                        <p className="font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink group-hover:underline">
                          {ticket.ticketId}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                          <Clock size={11} aria-hidden="true" />
                          <span>{ticket.date}</span>
                        </p>
                      </td>

                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <FeedbackCategoryBadge category={ticket.category} />
                      </td>

                      <td className="px-4 py-3.5 sm:px-5 align-middle whitespace-nowrap">
                        <span className="font-cal-mono text-[12.5px] tabular-nums text-cal-muted">
                          {ticket.userId || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 sm:px-5 align-middle">
                        <p className="max-w-[420px] truncate text-[13.5px] text-cal-ink">
                          {ticket.fullMessage || "No message provided"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 sm:px-5 text-right align-middle whitespace-nowrap">
                        <StatusBadge status={ticket.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                          <Inbox size={18} aria-hidden="true" />
                        </div>
                        <p className="text-[14px] font-semibold text-cal-ink">
                          No feedback tickets found
                        </p>
                        <p className="max-w-sm text-[13px] text-cal-muted">
                          {hasActiveFilters
                            ? "Try adjusting your search query, status tabs, or category filter."
                            : "Patient feedback submissions will appear here automatically."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                          >
                            <RotateCcw size={13.5} />
                            <span>Reset filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredTickets.length > 0 && (
            <div className="flex flex-col justify-between gap-3 border-t border-cal-hairline bg-cal-canvas px-4 py-3 sm:flex-row sm:items-center sm:px-5">
              <span className="text-[12.5px] text-cal-muted">
                Showing{" "}
                <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                  {filteredTickets.length}
                </span>{" "}
                entries
              </span>

              <div className="flex items-center gap-2">
                <span className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Modal: Ticket Resolution Workspace */}
        <TicketModal
          isOpen={isModalOpen}
          onClose={closeModal}
          ticket={activeTicket}
          onUpdate={handleUpdateTicket}
          onArchive={handleArchiveTicket}
        />
      </div>
    </AdminLayout>
  );
};

export default Feedback;
