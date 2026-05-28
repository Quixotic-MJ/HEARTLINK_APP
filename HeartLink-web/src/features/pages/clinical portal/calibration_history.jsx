import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  Download,
  History,
  Star,
  FileText,
  ExternalLink,
  Archive,
  CheckCircle2,
  Clock,
  UserCircle,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path based on your structure

// Mock Data for Calibration Logs
const initialCalibrationData = [
  {
    id: 1,
    feedbackId: "CAL-9021",
    caseId: "CASE-8142",
    reviewer: "Dr. Sarah Jenkins (MED-04)",
    timestamp: "May 25, 2026 10:45 AM",
    rating: 3,
    status: "Logged",
    notes:
      "The warning was appropriate, but the CSS penalty for isolated dietary sodium without any physical symptoms might be too aggressive in this demographic. Recommend lowering the weight of isolated dietary flags by 5% unless accompanied by elevated heart rate logs.",
  },
  {
    id: 2,
    feedbackId: "CAL-9020",
    caseId: "CASE-8150",
    reviewer: "Dr. Mark Rivera (MED-02)",
    timestamp: "May 25, 2026 09:12 AM",
    rating: 5,
    status: "Applied to Algorithm",
    notes:
      "Excellent algorithmic catch. The system correctly identified a high-risk progression by cross-referencing severe fatigue with a 3-day history of dietary sodium breaches. The Cardiologist Locator trigger was perfectly timed.",
  },
  {
    id: 3,
    feedbackId: "CAL-9018",
    caseId: "CASE-8099",
    reviewer: "Dr. Elena Santos (MED-07)",
    timestamp: "May 22, 2026 16:30 PM",
    rating: 2,
    status: "Archived",
    notes:
      "False positive on 'Shortness of Breath'. The user had recently logged a 45-minute high-intensity cardio session. The system should cross-reference symptom logs with recent exercise duration before dropping the CSS into critical levels.",
  },
  {
    id: 4,
    feedbackId: "CAL-9015",
    caseId: "CASE-8075",
    reviewer: "Dr. Mark Rivera (MED-02)",
    timestamp: "May 20, 2026 11:20 AM",
    rating: 4,
    status: "Applied to Algorithm",
    notes:
      "Good correlation between skipped meals and mild dizziness. The system accurately recommended a transition to 'Stable' low-intensity workouts. No threshold changes needed here.",
  },
];

const Calibration = () => {
  const [logs, setLogs] = useState(initialCalibrationData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeLog, setActiveLog] = useState(null);

  // Open Drawer for Detail View
  const openDrawer = (log) => {
    setActiveLog(log);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setActiveLog(null);
  };

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.feedbackId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.caseId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating =
      filterRating === "all" || log.rating === parseInt(filterRating);
    const matchesStatus =
      filterStatus === "all" ||
      log.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesRating && matchesStatus;
  });

  // Star Rating Renderer
  const renderStars = (rating) => {
    return (
      <div
        className="flex items-center gap-0.5"
        title={`${rating} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-100 text-gray-200"
            }
          />
        ))}
      </div>
    );
  };

  // Status Badge Renderer
  const getStatusBadge = (status) => {
    switch (status) {
      case "Applied to Algorithm":
        return (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <CheckCircle2 size={10} /> Applied
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <Archive size={10} /> Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-[#1e4ed8] border border-blue-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">
            <Clock size={10} /> Logged
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
            Clinical Portal
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Calibration <span className="text-[#1e4ed8]">History.</span>
          </h2>
        </div>

        {/* Critical Feature: Export Dataset Button */}
        <button className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-4 py-2 rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
          <Download size={14} strokeWidth={2.5} /> Export Calibration Data (CSV)
        </button>
      </div>

      {/* Main View: Reference Log Data Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
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
                placeholder="Search by Feedback ID or Case ID..."
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
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars (Excellent)</option>
                  <option value="4">4 Stars (Good)</option>
                  <option value="3">3 Stars (Moderate)</option>
                  <option value="2">2 Stars (Poor)</option>
                  <option value="1">1 Star (Inaccurate)</option>
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
                  <option value="logged">Logged</option>
                  <option value="applied to algorithm">
                    Applied to Algorithm
                  </option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Calibration List Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Feedback ID & Date
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Case ID
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Reviewer
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Appropriateness
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Calibration Status
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-[#f8fafc] transition-colors group cursor-pointer ${log.status === "Archived" ? "opacity-60" : ""}`}
                  onClick={() => openDrawer(log)}
                >
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-900 font-bold text-[11px] font-mono mb-0.5">
                      {log.feedbackId}
                    </p>
                    <p className="text-gray-500 text-[9px] font-medium">
                      {log.timestamp}
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span className="text-gray-600 font-bold text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {log.caseId}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1.5">
                      <UserCircle size={14} className="text-gray-400" />
                      <span className="text-gray-700 text-[11px] font-medium">
                        {log.reviewer}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    {renderStars(log.rating)}
                  </td>
                  <td className="py-3 px-4 align-middle">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
                    <button
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(log);
                      }}
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Feedback Detail View    */}
      {/* ========================================= */}
      {isDrawerOpen && activeLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafc]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1e4ed8]">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                    {activeLog.feedbackId}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {activeLog.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-white p-1.5 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {/* Status & Rating Banner */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Expert Rating
                  </p>
                  {renderStars(activeLog.rating)}
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Status
                  </p>
                  {getStatusBadge(activeLog.status)}
                </div>
              </div>

              {/* Reviewer Details */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-2.5">
                  Reviewer Info
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[#1e4ed8]">
                    <UserCircle size={14} />
                  </div>
                  <p className="text-[11px] font-bold text-gray-900">
                    {activeLog.reviewer}
                  </p>
                </div>
              </div>

              {/* Linked Case Reference */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-2.5">
                  Linked Reference
                </h4>
                <a
                  href={`/cases/${activeLog.caseId}`} // Simulated routing logic
                  className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[#1e4ed8]" />
                    <div>
                      <p className="text-[11px] font-bold text-[#1e4ed8] font-mono">
                        {activeLog.caseId}
                      </p>
                      <p className="text-[9px] text-blue-600">
                        View original anonymized health logs
                      </p>
                    </div>
                  </div>
                  <ExternalLink
                    size={14}
                    className="text-[#1e4ed8] opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>

              {/* Expert Notes Display (Read-Only) */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1.5 mb-2.5">
                  Risk Interpretation Notes
                </h4>
                <div className="bg-[#f8fafc] border border-gray-200 p-4 rounded-xl shadow-inner">
                  <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap italic">
                    "{activeLog.notes}"
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Actions */}
            <div className="p-4 border-t border-gray-100 bg-[#f8fafc] flex justify-between items-center shrink-0">
              <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5">
                <Archive size={14} /> Archive Log
              </button>

              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-colors">
                  <Download size={14} /> Export Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Calibration;
