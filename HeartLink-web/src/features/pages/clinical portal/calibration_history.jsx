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
import AdminLayout from "../../../components/layouts/adminLayout";
import CalibrationDrawer from "../../../components/modals/CalibrationDrawer";

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
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <CheckCircle2 size={12} /> APPLIED
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <Archive size={12} /> ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <Clock size={12} /> LOGGED
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] font-medium text-slate-400 tracking-[0.22em] uppercase mb-2">
            CLINICAL PORTAL
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Calibration History.
          </h2>
        </div>

        {/* Critical Feature: Export Dataset Button */}
        <button className="flex items-center gap-1.5 text-white font-medium text-[11px] px-5 py-2.5 rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-[0.99]" style={{ backgroundColor: "#0f172a" }}>
          <Download size={14} strokeWidth={2.5} /> Export Calibration Data (CSV)
        </button>
      </div>

      {/* Main View: Reference Log Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by Feedback ID or Case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white"
              />
            </div>
            <div className="flex gap-2.5">
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
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
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  FEEDBACK ID & DATE
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CASE ID
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  REVIEWER
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  APPROPRIATENESS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CALIBRATION STATUS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${log.status === "Archived" ? "opacity-60" : ""}`}
                  onClick={() => openDrawer(log)}
                >
                  <td className="py-4 px-5 align-middle">
                    <p className="text-slate-900 font-semibold text-[11px] font-mono mb-1">
                      {log.feedbackId}
                    </p>
                    <p className="text-slate-500 text-[10px] font-medium">
                      {log.timestamp}
                    </p>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="text-slate-600 font-semibold text-[10px] font-mono bg-slate-100 px-2 py-1 rounded-md">
                      {log.caseId}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <UserCircle size={14} />
                      </div>
                      <span className="text-slate-700 text-[11px] font-medium">
                        {log.reviewer}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {renderStars(log.rating)}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="py-4 px-5 align-middle text-right">
                    <button
                      className="text-[10px] font-medium px-4 py-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
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

      <CalibrationDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        activeLog={activeLog}
      />
    </AdminLayout>
  );
};

export default Calibration;
