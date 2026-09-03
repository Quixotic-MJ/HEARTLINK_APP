import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MessageSquare,
  Bug,
  Save,
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
import { Skeleton } from "../../../components/ui/Skeleton";

const Feedback = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isFetchingRef = useRef(false);
  
  useEffect(() => {
    let intervalId;
    const fetchTickets = () => {
      if (isFetchingRef.current || document.visibilityState === "hidden") return;
      isFetchingRef.current = true;
      
      apiFetch("/api/feedback")
        .then(data => {
          if (Array.isArray(data)) {
            setTickets(data);
            setFetchError(false);
          }
        })
        .catch(err => {
          console.error("Error fetching tickets:", err);
          setFetchError(true);
        })
        .finally(() => {
          setLoading(false);
          isFetchingRef.current = false;
        });
    };

    fetchTickets(); // Fetch immediately on mount or manual retry

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTickets();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    intervalId = setInterval(fetchTickets, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [retryCount]);

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
  const [ticketStatus, setTicketStatus] = useState("");

  // Open Modal
  const openModal = (ticket) => {
    setActiveTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
    setTicketStatus(ticket.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTicket(null);
  };

  const handleUpdateTicket = async (id, newStatus, newNotes) => {
    try {
      const updatedTicket = await apiFetch(`/api/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus, adminNotes: newNotes }),
      });
      setTickets(tickets.map((t) => (t.id === id ? updatedTicket : t)));
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
    closeModal();
  };

  const handleArchiveTicket = async (id, notes) => {
    try {
      const updatedTicket = await apiFetch(`/api/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "Archived", adminNotes: notes !== undefined ? notes : adminNotes }),
      });
      setTickets(tickets.map((t) => (t.id === id ? updatedTicket : t)));
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
    
    let matchesStatus = false;
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

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStatus, sortOrder]);

  // UI Helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] whitespace-nowrap">
            <CheckCircle2 size={10} /> Resolved
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] whitespace-nowrap">
            <Activity size={10} className="animate-pulse" /> In Progress
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-semibold uppercase tracking-wider bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF] whitespace-nowrap">
            <Inbox size={10} /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD] whitespace-nowrap">
            <AlertCircle size={10} /> Open
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(searchQuery) || filterCategory !== "all" || filterStatus !== "active" || sortOrder !== "newest";

  return (
    <AdminLayout>
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── PAGE HEAD ── */}
        <div className="flex flex-wrap gap-4 justify-between items-end mb-6">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#E8532E]" /> System support
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Feedback & support inquiries
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]">
              Review user feedback submissions, technical bug tickets, and product improvement ideas.
            </p>
          </div>
        </div>

        {/* ── METRICS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">Total Tickets</p>
              <p 
                className="text-[26px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {totalTickets}
              </p>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#EDF1EF] border border-[#DCE3DF] flex items-center justify-center text-[#5C6B66]">
              <Inbox size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">Open / In Progress</p>
              <p 
                className="text-[26px] font-medium text-[#E8532E] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {openTicketsCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#FBEAE6] border border-[#F5C7BD] flex items-center justify-center text-[#E8532E]">
              <Activity size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">Resolved</p>
              <p 
                className="text-[26px] font-medium text-[#1B6E63] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {resolvedTicketsCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#E3EFEC] border border-[#C5DFD8] flex items-center justify-center text-[#1B6E63]">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">Bug Reports</p>
              <p 
                className="text-[26px] font-medium text-[#A93226] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {bugReportsCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#F7E4E1] border border-[#F0C4B8] flex items-center justify-center text-[#A93226]">
              <Bug size={16} />
            </div>
          </div>
        </div>

        {/* ── FEEDBACK INBOX TABLE CARD ── */}
        <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] flex flex-col overflow-hidden shadow-2xs">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-[#DCE3DF] bg-[#FFFFFF] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893] pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by Ticket ID, keywords, or Account ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                {/* Category Dropdown */}
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="all">All Categories</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="UI/UX Suggestion">UI/UX Suggestion</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Question">Question</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="active">Active Tickets</option>
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {/* Sort Order */}
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-[#A93226] font-semibold px-3 py-2 rounded-[8px] border border-[#F0C4B8] bg-[#F7E4E1] hover:bg-[#F0C4B8] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
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
            <div className="mx-4 my-3 p-3 bg-[#F7E4E1] border border-[#F0C4B8] rounded-[8px] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#A93226] flex items-center gap-2">
                <AlertCircle size={14} /> Unable to refresh feedback tickets.
              </span>
              <button
                onClick={() => {
                  setFetchError(false);
                  setRetryCount(prev => prev + 1);
                }}
                className="px-3 py-1 bg-[#A93226] hover:bg-[#8A1F1A] text-white text-[11px] font-bold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Ticket ID & Date
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Category
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Account ID
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-2/5">
                    User Message Preview
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3DF]">
                {loading ? (
                  [1, 2, 3, 4].map((idx) => (
                    <tr key={`skeleton-${idx}`}>
                      <td className="py-3.5 px-5"><Skeleton className="w-24 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-48 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-4 ml-auto bg-[#DCE3DF]/70 rounded" /></td>
                    </tr>
                  ))
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer ${ticket.status === "Resolved" ? "opacity-75" : ""}`}
                      onClick={() => openModal(ticket)}
                    >
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-[#152131] font-bold text-[12.5px] font-mono mb-0.5 group-hover:text-[#E8532E] transition-colors">
                          {ticket.ticketId}
                        </p>
                        <p className="text-[#8B9893] text-[11px] font-medium flex items-center gap-1">
                          <Clock size={10} /> {ticket.date}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <FeedbackCategoryBadge category={ticket.category} />
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-[11px] font-semibold text-[#152131] font-mono bg-[#EDF1EF] px-2 py-0.5 rounded-[5px] border border-[#DCE3DF]">
                          {ticket.userId || "N/A"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-[#5C6B66] text-[12.5px] font-medium truncate max-w-[320px]">
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
                    <td colSpan="5" className="py-12 text-center text-[#5C6B66] text-[13px] font-medium">
                      No feedback tickets found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#5C6B66]">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} entries
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] text-[#152131] hover:bg-[#DCE3DF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[12px] font-bold text-[#152131] min-w-[32px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] text-[#152131] hover:bg-[#DCE3DF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
