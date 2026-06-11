import React, { useState } from "react";
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
  User
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import TicketModal from "../../../components/modals/TicketModal";

// Mock Data for Feedback Inbox
const initialTickets = [
  {
    id: 1,
    ticketId: "FB-1042",
    date: "May 28, 2026",
    user: "Robert Villanueva",
    userEmail: "robert.v@email.com",
    userId: "USR-A492",
    category: "Bug Report",
    preview: "The barcode scanner crashes when...",
    fullMessage:
      "The barcode scanner crashes when I try to scan a generic oat brand. The camera opens, but right after it recognizes the barcode, the app completely freezes and closes itself.",
    status: "Open",
    deviceMeta: {
      os: "Android 14",
      model: "Samsung Galaxy S23 Ultra",
      appVersion: "v1.2.4",
    },
    adminNotes: "",
  },
  {
    id: 2,
    ticketId: "FB-1041",
    date: "May 27, 2026",
    user: "Elena Marasigan",
    userEmail: "elena.m@email.com",
    userId: "USR-B118",
    category: "UI/UX Suggestion",
    preview: "Could you make the recipe font bigger?",
    fullMessage:
      "I love the heart-healthy recipes, but when I am cooking in the kitchen, the font for the ingredients list is very hard to read from a distance. Could you add a text size toggle?",
    status: "In Progress",
    deviceMeta: {
      os: "iOS 17.4",
      model: "iPhone 13 Pro",
      appVersion: "v1.2.4",
    },
    adminNotes:
      "Assigned to UI team. Planning to add an accessibility slider in the next minor patch.",
  },
  {
    id: 3,
    ticketId: "FB-1039",
    date: "May 25, 2026",
    user: "Miguel Santos",
    userEmail: "miguel88@email.com",
    userId: "USR-C882",
    category: "Account Issue",
    preview: "I cannot reset my password...",
    fullMessage:
      "I forgot my password, but when I click the reset link in my email, it says the token is invalid or expired. I've tried this three times now.",
    status: "Resolved",
    deviceMeta: {
      os: "Android 13",
      model: "Google Pixel 6a",
      appVersion: "v1.2.3",
    },
    adminNotes:
      "Known Firebase auth token expiration bug. Sent manual reset link and patched backend token lifespan.",
  },
  {
    id: 4,
    ticketId: "FB-1035",
    date: "May 22, 2026",
    user: "Anonymous User",
    userEmail: "Not Provided",
    userId: "N/A",
    category: "Question",
    preview: "Does the CSS score update automatically?",
    fullMessage:
      "If I log my blood pressure today, does my Cardiovascular Stability Score update right away, or does it take 24 hours?",
    status: "Resolved",
    deviceMeta: { os: "Unknown", model: "Unknown", appVersion: "Unknown" },
    adminNotes: "Replied via in-app notification confirming real-time updates.",
  },
];

const Feedback = () => {
  const [tickets, setTickets] = useState(initialTickets);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

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

  const handleUpdateTicket = (id, newStatus, newNotes) => {
    setTickets(
      tickets.map((t) =>
        t.id === id ? { ...t, status: newStatus, adminNotes: newNotes } : t
      )
    );
    closeModal();
  };

  const handleArchiveTicket = (id) => {
    setTickets(
      tickets.map((t) =>
        t.id === id ? { ...t, status: "Archived" } : t
      )
    );
    closeModal();
  };

  // Filter Logic
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fullMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || t.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" ||
      t.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus;
  });

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
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Inbox Table */}
          <div className="w-full overflow-x-auto custom-scrollbar">
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
                    User Account
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
                {filteredTickets.map((ticket) => (
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
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${ticket.user === "Anonymous User" ? "bg-slate-100 text-slate-500" : "bg-[#0f172a] text-white"}`}>
                          {ticket.user === "Anonymous User" ? <User size={10} /> : ticket.user.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {ticket.user}
                        </span>
                      </div>
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
                ))}
              </tbody>
            </table>
          </div>
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
