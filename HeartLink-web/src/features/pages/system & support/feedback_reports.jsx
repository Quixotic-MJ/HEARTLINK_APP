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
  ChevronRight,
  AlertCircle,
  Activity
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path based on your structure

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

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  // Resolution Form State
  const [adminNotes, setAdminNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");

  // Open Drawer
  const openDrawer = (ticket) => {
    setActiveTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
    setTicketStatus(ticket.status);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setActiveTicket(null);
  };

  const handleSave = () => {
    setTickets(
      tickets.map((t) =>
        t.id === activeTicket.id
          ? { ...t, status: ticketStatus, adminNotes: adminNotes }
          : t,
      ),
    );
    closeDrawer();
  };

  const handleDelete = () => {
    setTickets(tickets.filter((t) => t.id !== activeTicket.id));
    closeDrawer();
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
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <Bug size={10} /> Bug
          </span>
        );
      case "UI/UX Suggestion":
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <Lightbulb size={10} /> Suggestion
          </span>
        );
      case "Account Issue":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <UserCircle size={10} /> Account
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <HelpCircle size={10} /> Question
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Resolved":
        return (
          <span className="inline-flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 text-[#1e4ed8] text-[10px] font-bold uppercase tracking-wider">
            <Activity size={12} /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle size={12} /> Open
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            System Support
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Feedback & <span className="text-[#1e4ed8]">Reports.</span>
          </h2>
        </div>
      </div>

      {/* Main View: Feedback Inbox Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-50 bg-[#f8fafc]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by Ticket ID or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2.5">
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
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
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inbox Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Ticket ID & Date
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Category
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  User Account
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/3">
                  Preview
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`hover:bg-[#f8fafc] transition-colors group cursor-pointer ${ticket.status === "Resolved" ? "opacity-70" : ""}`}
                  onClick={() => openDrawer(ticket)}
                >
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-900 font-bold text-[11px] font-mono mb-0.5">
                      {ticket.ticketId}
                    </p>
                    <p className="text-gray-500 text-[9px] font-medium flex items-center gap-1">
                      <Clock size={10} /> {ticket.date}
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    {getCategoryBadge(ticket.category)}
                  </td>
                  <td className="py-3 px-4 align-middle">
                    {/* Simulated Link to User Management */}
                    <a
                      href={`/admin-users`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-700 hover:text-[#1e4ed8] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserCircle size={12} className="text-gray-400" />{" "}
                      {ticket.user}
                    </a>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-800 text-[11px] font-medium truncate max-w-[250px]">
                      "{ticket.preview}"
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
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
      {isDrawerOpen && activeTicket && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-[#f8fafc] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1e4ed8]">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 font-mono">
                    {activeTicket.ticketId}
                    {getCategoryBadge(activeTicket.category)}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium flex items-center gap-1">
                    <Clock size={10} /> Submitted: {activeTicket.date}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 p-1.5 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {/* User Context */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    Submitted By
                  </p>
                  <a
                    href={`/admin-users`}
                    className="text-[11px] font-bold text-gray-900 hover:text-[#1e4ed8] flex items-center gap-1 transition-colors"
                  >
                    {activeTicket.user} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    Account ID
                  </p>
                  <p className="text-[11px] font-bold text-gray-600 font-mono">
                    {activeTicket.userId}
                  </p>
                </div>
              </div>

              {/* Full Issue Description */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} /> User Message
                </h4>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    "{activeTicket.fullMessage}"
                  </p>
                </div>
              </div>

              {/* Device Metadata (Crucial for RN App) */}
              <div>
                <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Smartphone size={12} /> Device Metadata
                </h4>
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 shadow-inner grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Operating System
                    </p>
                    <p className="text-[11px] font-bold text-gray-900">
                      {activeTicket.deviceMeta.os}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      App Version
                    </p>
                    <p className="text-[11px] font-bold text-gray-900 font-mono">
                      {activeTicket.deviceMeta.appVersion}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-blue-100/50">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Device Model
                    </p>
                    <p className="text-[11px] font-bold text-gray-900">
                      {activeTicket.deviceMeta.model}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Resolution Area */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Save size={12} /> Resolution Logging
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-1.5">
                      Admin / Developer Notes
                    </label>
                    <textarea
                      rows="4"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-colors resize-none leading-relaxed"
                      placeholder="Log cause of issue and specific fixes deployed..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-1.5">
                      Ticket Status
                    </label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-bold bg-white border rounded-lg focus:outline-none transition-colors cursor-pointer ${
                        ticketStatus === "Resolved"
                          ? "border-green-300 text-green-700 focus:border-green-500"
                          : ticketStatus === "In Progress"
                            ? "border-blue-300 text-[#1e4ed8] focus:border-blue-500"
                            : "border-red-300 text-red-600 focus:border-red-500"
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Actions */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete irrelevant or spam submission"
              >
                <Trash2 size={14} /> Delete
              </button>

              <div className="flex gap-2">
                <button
                  onClick={closeDrawer}
                  className="px-4 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-1.5 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg shadow-sm shadow-blue-900/20 transition-colors"
                >
                  <Save size={14} /> Update Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Feedback;
