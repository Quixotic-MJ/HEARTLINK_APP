import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  X,
  MessageSquare,
  Bug,
  Lightbulb,
  UserCircle,
  HelpCircle,
  Smartphone,
  Save,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  Activity,
  User,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Inbox,
  ChevronDown,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import TicketModal from "../../../components/modals/TicketModal";
import FeedbackCategoryBadge from "../../../components/ui/FeedbackCategoryBadge";
import { apiFetch } from "../../../api";

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
  const itemsPerPage = 5;

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

  // Filter Logic
  let filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fullMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || t.category === filterCategory;
    
    let matchesStatus = false;
    if (filterStatus === "all") {
      matchesStatus = true; // Include ALL tickets (Open, In Progress, Resolved, Archived)
    } else if (filterStatus === "active") {
      matchesStatus = t.status !== "Archived"; // Active excludes Archived
    } else {
      matchesStatus = t.status.toLowerCase() === filterStatus.toLowerCase();
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <CheckCircle2 size={10} /> Resolved
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
            <Activity size={10} className="animate-pulse" /> In Progress
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-slate-400 border border-white/10 whitespace-nowrap">
            <Inbox size={10} /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
            <AlertCircle size={10} /> Open
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
              <MessageSquare size={11} />
              <span>System Support</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
              Feedback & Inquiries
            </h2>
            <p className="text-[#89899C] text-xs mt-1 font-medium">
              Review user feedback, technical bug submissions, and system improvement requests.
            </p>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">Total Tickets</p>
              <p className="text-2xl font-extrabold text-white">{totalTickets}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#21202E] border border-white/10 flex items-center justify-center">
              <Inbox size={18} className="text-slate-400" />
            </div>
          </div>
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">Open / In Progress</p>
              <p className="text-2xl font-extrabold text-blue-400">{openTicketsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity size={18} className="text-blue-400" />
            </div>
          </div>
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">Resolved</p>
              <p className="text-2xl font-extrabold text-emerald-400">{resolvedTicketsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
          </div>
          <div className="bg-[#1A1A1A] p-5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">Bug Reports</p>
              <p className="text-2xl font-extrabold text-rose-400">{bugReportsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Bug size={18} className="text-rose-400" />
            </div>
          </div>
        </div>

        {/* Main View: Feedback Inbox Table */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-white/10 bg-[#161616]">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by Ticket ID or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                  >
                    <option value="all" className="bg-[#161616]">All Categories</option>
                    <option value="Bug Report" className="bg-[#161616]">Bug Report</option>
                    <option value="UI/UX Suggestion" className="bg-[#161616]">UI/UX Suggestion</option>
                    <option value="Account Issue" className="bg-[#161616]">Account Issue</option>
                    <option value="Question" className="bg-[#161616]">Question</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                    <ChevronDown size={12} className="text-slate-400" />
                  </div>
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                  >
                    <option value="active" className="bg-[#161616]">Active Tickets</option>
                    <option value="all" className="bg-[#161616]">All Statuses</option>
                    <option value="Open" className="bg-[#161616]">Open</option>
                    <option value="In Progress" className="bg-[#161616]">In Progress</option>
                    <option value="Resolved" className="bg-[#161616]">Resolved</option>
                    <option value="Archived" className="bg-[#161616]">Archived</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                    <ChevronDown size={12} className="text-slate-400" />
                  </div>
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                  >
                    <option value="newest" className="bg-[#161616]">Newest First</option>
                    <option value="oldest" className="bg-[#161616]">Oldest First</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                    <ChevronDown size={12} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {fetchError && (
            <div className="mx-4 my-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                <AlertCircle size={14} /> Unable to refresh feedback.
              </span>
              <button
                onClick={() => {
                  setFetchError(false);
                  setRetryCount(prev => prev + 1);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                    Ticket ID & Date
                  </th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                    Category
                  </th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                    Account ID
                  </th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-1/3">
                    Preview
                  </th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [1, 2, 3, 4].map((idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-4 px-6 align-middle">
                        <div className="h-3.5 w-16 bg-white/10 rounded mb-1"></div>
                        <div className="h-2.5 w-20 bg-white/5 rounded"></div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="h-5 w-16 bg-white/10 rounded-full"></div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="h-3.5 w-20 bg-white/10 rounded font-mono"></div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="h-3 w-48 bg-white/10 rounded"></div>
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="h-4 w-16 bg-white/10 rounded ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-white/5 transition-colors group cursor-pointer ${ticket.status === "Resolved" ? "opacity-60" : ""}`}
                      onClick={() => openModal(ticket)}
                    >
                      <td className="py-4 px-6 align-middle">
                        <p className="text-white font-bold text-xs font-mono mb-0.5 group-hover:text-[#E55F37] transition-colors">
                          {ticket.ticketId}
                        </p>
                        <p className="text-[#89899C] text-[10px] font-medium flex items-center gap-1.5">
                          <Clock size={10} /> {ticket.date}
                        </p>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <FeedbackCategoryBadge category={ticket.category} />
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <span className="text-xs font-bold text-slate-300 font-mono bg-[#21202E] px-2 py-1 rounded-lg border border-white/10">
                          {ticket.userId || "N/A"}
                        </span>
                      </td>

                      <td className="py-4 px-6 align-middle">
                        <p className="text-slate-300 text-xs font-medium truncate max-w-[280px]">
                          {(ticket.fullMessage || "").length > 50 ? `${ticket.fullMessage.substring(0, 50)}...` : (ticket.fullMessage || "No message provided")}
                        </p>
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="flex items-center justify-end">
                          {getStatusBadge(ticket.status)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 text-xs font-medium">
                      No tickets found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 bg-[#161616] flex items-center justify-between">
              <span className="text-xs font-medium text-[#89899C]">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-white min-w-[32px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* SLIDE-OUT DRAWER: Ticket Resolution View  */}
        {/* ========================================= */}
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

