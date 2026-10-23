import { useState } from "react";
import {
  Search,
  MessageSquare,
  Bug,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import TicketModal from "../../../components/modals/TicketModal";
import FeedbackCategoryBadge from "../../../components/ui/FeedbackCategoryBadge";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { Skeleton } from "../../../components/ui/Skeleton";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader, KpiCard } from "../../../styles/designSystem";

const NO_TICKETS = [];

const Feedback = () => {
  // Checks for new tickets every 30 seconds while the tab is open (paused while it's hidden), and again when
  // the tab gets focus; a save through apiFetch refreshes it too
  const ticketsQuery = useApiQuery("/api/feedback/", {
    select: (d) => (Array.isArray(d) ? d : NO_TICKETS),
    refetchInterval: 30 * 1000,
  });
  const tickets = ticketsQuery.data ?? NO_TICKETS;
  const loading = ticketsQuery.isPending;
  const fetchError = ticketsQuery.isError;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active"); // Default to "Active Tickets"
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Resolution Form State
  const [adminNotes, setAdminNotes] = useState("");

  // Open Modal
  const openModal = (ticket) => {
    setActiveTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
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
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
    closeModal();
  };

  const handleArchiveTicket = async (id, notes) => {
    try {
      await apiFetch(`/api/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Archived", adminNotes: notes !== undefined ? notes : adminNotes }),
      });
    } catch (err) {
      console.error("Error archiving ticket:", err);
    }
    closeModal();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
    setSortOrder("newest");
  };

  // Filter Logic
  let filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      (t.ticketId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.fullMessage || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.userId || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || t.category === filterCategory;
    
    let matchesStatus;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else if (filterStatus === "active") {
      matchesStatus = t.status !== "Archived";
    } else {
      matchesStatus = (t.status || "").toLowerCase() === filterStatus.toLowerCase();
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
  const openTicketsCount = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === "Resolved").length;
  const bugReportsCount = tickets.filter((t) => t.category === "Bug Report").length;

  // Back to page 1 when the search, filters or sort change (noticed during render, not in an effect)
  const filterKey = [searchQuery, filterCategory, filterStatus, sortOrder].join("|");
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  if (filterKey !== pageFilterKey) {
    setPageFilterKey(filterKey);
    setCurrentPage(1);
  }

  // UI Helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-mint text-ds-charcoal border border-ds-mint whitespace-nowrap">
            <CheckCircle2 size={10} /> Resolved
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold whitespace-nowrap">
            <Activity size={10} className="animate-pulse" /> In Progress
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold uppercase tracking-wider bg-ds-surface text-ds-slate border border-ds-hairline whitespace-nowrap">
            <Inbox size={10} /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider bg-ds-tint text-ds-on-tint border border-ds-tint whitespace-nowrap">
            <AlertCircle size={10} /> Open
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(searchQuery) || filterCategory !== "all" || filterStatus !== "active" || sortOrder !== "newest";

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="System support"
          eyebrowIcon={MessageSquare}
          title="Feedback & support inquiries"
          description="Review user feedback submissions, technical bug tickets, and product improvement ideas."
        />

        {/* ── METRICS ROW ── */}
        <div className={UI.kpi.grid}>
          <KpiCard
            label="Total Tickets"
            value={totalTickets}
            icon={Inbox}
          />
          <KpiCard
            label="Open / In Progress"
            value={openTicketsCount}
            icon={Activity}
            iconBg="bg-ds-tint"
            iconColor="text-ds-primary"
            iconBorder="border-ds-tint"
            valueColor="text-ds-primary"
          />
          <KpiCard
            label="Resolved"
            value={resolvedTicketsCount}
            icon={CheckCircle2}
            iconBg="bg-ds-mint"
            iconColor="text-ds-charcoal"
            iconBorder="border-ds-mint"
            valueColor="text-ds-charcoal"
          />
          <KpiCard
            label="Bug Reports"
            value={bugReportsCount}
            icon={Bug}
            iconBg="bg-ds-rose"
            iconColor="text-ds-danger"
            iconBorder="border-ds-rose"
            valueColor="text-ds-danger"
          />
        </div>

        {/* ── FEEDBACK INBOX TABLE CARD ── */}
        <div className="bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden ">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-ds-hairline bg-ds-canvas space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by Ticket ID, keywords, or Account ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                {/* Category Dropdown */}
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                  >
                    <option value="all">All Categories</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="UI/UX Suggestion">UI/UX Suggestion</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Question">Question</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-ds-steel" />
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                  >
                    <option value="active">Active Tickets</option>
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-ds-steel" />
                  </div>
                </div>

                {/* Sort Order */}
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink appearance-none cursor-pointer hover:border-ds-steel transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-ds-steel" />
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-ds-ink font-semibold px-3 py-2 rounded-[8px] border border-ds-rose bg-ds-rose hover:bg-ds-rose transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {fetchError && (
            <div className="mx-4 my-3 p-3 bg-ds-rose border border-ds-rose rounded-[8px] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ds-danger flex items-center gap-2">
                <AlertCircle size={14} /> Unable to refresh feedback tickets.
              </span>
              <button
                onClick={() => ticketsQuery.refetch()}
                className="px-3 py-1 bg-ds-danger hover:bg-ds-danger text-white text-[11px] font-bold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-ds-hairline bg-ds-surface/40">
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Ticket ID & Date
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Category
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">
                    Account ID
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] w-2/5">
                    User Message Preview
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-hairline">
                {loading ? (
                  [1, 2, 3, 4].map((idx) => (
                    <tr key={`skeleton-${idx}`}>
                      <td className="py-3.5 px-5"><Skeleton className="w-24 h-4 bg-ds-hairline/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-ds-hairline/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-48 h-4 bg-ds-hairline/70 rounded" /></td>
                      <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-4 ml-auto bg-ds-hairline/70 rounded" /></td>
                    </tr>
                  ))
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-ds-surface/60 transition-colors group cursor-pointer ${ticket.status === "Resolved" ? "opacity-75" : ""}`}
                      onClick={() => openModal(ticket)}
                    >
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-ds-ink font-bold text-[12.5px] mb-0.5 group-hover:text-ds-primary transition-colors">
                          {ticket.ticketId}
                        </p>
                        <p className="text-ds-steel text-[11px] font-medium flex items-center gap-1">
                          <Clock size={10} /> {ticket.date}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <FeedbackCategoryBadge category={ticket.category} />
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-[11px] font-bold text-ds-ink bg-ds-surface px-2 py-0.5 rounded-[5px] border border-ds-hairline">
                          {ticket.userId || "N/A"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-ds-slate text-[12.5px] font-medium truncate max-w-[320px]">
                          {(ticket.fullMessage || "").length > 60 ? `${ticket.fullMessage.substring(0, 60)}…` : (ticket.fullMessage || "No message provided")}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right">
                        <div className="flex items-center justify-end">
                          {getStatusBadge(ticket.status)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-ds-slate text-[13px] font-medium">
                      No feedback tickets found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-ds-hairline bg-ds-canvas flex items-center justify-between">
              <span className="text-[12px] font-medium text-ds-slate">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} entries
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-[6px] border border-ds-hairline bg-ds-surface text-ds-ink hover:bg-ds-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[12px] font-bold text-ds-ink min-w-[32px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-[6px] border border-ds-hairline bg-ds-surface text-ds-ink hover:bg-ds-hairline disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

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
