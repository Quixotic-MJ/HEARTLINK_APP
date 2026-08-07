import React, { useState, useEffect } from "react";
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
  Inbox
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import TicketModal from "../../../components/modals/TicketModal";

const Feedback = () => {
  const [tickets, setTickets] = useState([]);
  
  useEffect(() => {
    const fetchTickets = () => {
      fetch("http://localhost:8000/api/feedback")
        .then(res => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setTickets(data);
          }
        })
        .catch(err => console.error("Error fetching tickets:", err));
    };

    fetchTickets(); // Fetch immediately on mount
    const intervalId = setInterval(fetchTickets, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
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
      const res = await fetch(`http://localhost:8000/api/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNotes: newNotes }),
      });
      if (res.ok) {
        const updatedTicket = await res.json();
        setTickets(tickets.map((t) => (t.id === id ? updatedTicket : t)));
      }
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
    closeModal();
  };

  const handleArchiveTicket = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived", adminNotes: adminNotes }),
      });
      if (res.ok) {
        const updatedTicket = await res.json();
        setTickets(tickets.map((t) => (t.id === id ? updatedTicket : t)));
      }
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
      matchesStatus = t.status !== "Archived";
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
  const getCategoryBadge = (category) => {
    switch (category) {
      case "Bug Report":
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Bug size={10} /> Bug
          </span>
        );
      case "UI/UX Suggestion":
        return (
          <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Lightbulb size={10} /> Suggestion
          </span>
        );
      case "Account Issue":
        return (
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <UserCircle size={10} /> Account
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <HelpCircle size={10} /> Question
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1.5 text-blue-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
            <Activity size={12} className="animate-pulse" /> In Progress
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
            <Inbox size={12} /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
            <AlertCircle size={12} /> Open
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full bg-slate-50/50">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
              System Support
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              Feedback & <span className="text-[#0f172a]">Reports.</span>
            </h2>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Total Tickets</p>
              <p className="text-2xl font-bold text-slate-900">{totalTickets}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
              <Inbox size={18} className="text-slate-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Open/In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{openTicketsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Activity size={18} className="text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-emerald-600">{resolvedTicketsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Bug Reports</p>
              <p className="text-2xl font-bold text-red-600">{bugReportsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Bug size={18} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Main View: Feedback Inbox Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
          {/* Search & Filter Bar */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by Ticket ID or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm"
                />
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Filter
                    size={13}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="UI/UX Suggestion">UI/UX Suggestion</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Question">Question</option>
                  </select>
                </div>
                <div className="relative">
                  <Filter
                    size={13}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="pl-4 pr-10 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    Ticket ID & Date
                  </th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    Category
                  </th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    Account ID
                  </th>

                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/3">
                    Preview
                  </th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${ticket.status === "Resolved" ? "opacity-70 grayscale-[0.3]" : ""}`}
                    onClick={() => openModal(ticket)}
                  >
                    <td className="py-4 px-6 align-middle">
                      <p className="text-slate-900 font-semibold text-xs font-mono mb-0.5">
                        {ticket.ticketId}
                      </p>
                      <p className="text-slate-500 text-[10px] font-medium flex items-center gap-1.5">
                        <Clock size={10} /> {ticket.date}
                      </p>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {getCategoryBadge(ticket.category)}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <p className="text-xs font-semibold text-slate-700 font-mono">
                        {ticket.userId || "N/A"}
                      </p>
                    </td>

                    <td className="py-4 px-6 align-middle">
                      <p className="text-slate-600 text-xs font-medium truncate max-w-[280px]">
                        {ticket.fullMessage.length > 50 ? `${ticket.fullMessage.substring(0, 50)}...` : ticket.fullMessage}
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
                    <td colSpan="5" className="py-12 text-center text-slate-500 text-sm font-medium">
                      No tickets found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-700 min-w-[32px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
