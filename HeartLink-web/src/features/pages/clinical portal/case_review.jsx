import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  CheckCircle2,
  ShieldAlert,
  Save,
  Activity,
  Calendar,
  ChevronDown,
  Lock,
  User,
  HeartPulse,
  Utensils,
  AlertTriangle,
  FileText,
  Star,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path

// Mock Data
const initialCases = [
  {
    id: 1,
    caseId: "CASE-8204",
    computedCss: 42,
    riskCategory: "Critical",
    flaggedDate: "May 28, 2026 14:21",
    status: "Pending Review",
    patientContext: {
      age: 58,
      sex: "Male",
      conditions: ["Hypertension", "Type 2 Diabetes"],
      dietaryAvg: "3,200mg Sodium/day (High)",
      recentSymptoms: "Level 3 Chest Pain reported on May 26.",
    },
    systemAction:
      "Triggered Critical Alert & activated Cardiologist Locator mapping.",
  },
  {
    id: 2,
    caseId: "CASE-8199",
    computedCss: 65,
    riskCategory: "Warning",
    flaggedDate: "May 27, 2026 09:15",
    status: "Pending Review",
    patientContext: {
      age: 45,
      sex: "Female",
      conditions: ["Hyperlipidemia"],
      dietaryAvg: "2,400mg Sodium/day (Moderate)",
      recentSymptoms: "Mild shortness of breath during routine exercise.",
    },
    systemAction:
      "Triggered Precautionary Notification & suggested dietary recipe adjustment.",
  },
  {
    id: 3,
    caseId: "CASE-8150",
    computedCss: 48,
    riskCategory: "Critical",
    flaggedDate: "May 25, 2026 18:45",
    status: "Evaluated",
    patientContext: {
      age: 62,
      sex: "Male",
      conditions: ["Previous Myocardial Infarction"],
      dietaryAvg: "2,800mg Sodium/day (Moderate-High)",
      recentSymptoms: "Severe fatigue and lightheadedness.",
    },
    systemAction:
      "Triggered Critical Alert & activated Cardiologist Locator mapping.",
    expertFeedback: {
      rating: 5,
      notes:
        "Algorithm correctly identified high-risk progression based on fatigue coupled with dietary sodium breach.",
    },
  },
  {
    id: 4,
    caseId: "CASE-8142",
    computedCss: 55,
    riskCategory: "Warning",
    flaggedDate: "May 25, 2026 10:10",
    status: "Evaluated",
    patientContext: {
      age: 50,
      sex: "Female",
      conditions: ["None"],
      dietaryAvg: "4,000mg Sodium/day (Very High)",
      recentSymptoms: "None reported.",
    },
    systemAction: "Triggered Dietary Warning.",
    expertFeedback: {
      rating: 3,
      notes:
        "Warning was appropriate, but CSS penalty for isolated dietary sodium without symptoms might be too aggressive. Consider threshold tweak.",
    },
  },
];

const Cases = () => {
  const [cases, setCases] = useState(initialCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Drawer & Evaluation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeCase, setActiveCase] = useState(null);

  // Feedback Form State
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  // Open Drawer for Evaluation
  const openDrawer = (caseItem) => {
    setActiveCase(caseItem);
    setRating(caseItem.expertFeedback?.rating || 0);
    setNotes(caseItem.expertFeedback?.notes || "");
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setActiveCase(null);
  };

  // Filter Logic
  const filteredCases = cases.filter((c) => {
    const matchesSearch = c.caseId
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSeverity =
      filterSeverity === "all" ||
      c.riskCategory.toLowerCase() === filterSeverity;
    const matchesStatus =
      filterStatus === "all" || c.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Badge Color Helper
  const getRiskBadgeColor = (category) => {
    if (category === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (category === "Warning")
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-blue-50 text-[#1e4ed8] border-blue-100";
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
            Case Review <span className="text-[#1e4ed8]">Queue.</span>
          </h2>
        </div>

        {/* Global Date Filter */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-[11px] font-bold text-gray-700">
            Last 7 Days
          </span>
          <ChevronDown size={14} className="text-gray-400 ml-1" />
        </div>
      </div>

      {/* Main View: Triage Data Table Container */}
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
                placeholder="Search anonymized Case ID..."
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
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
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
                  <option value="pending review">Pending Review</option>
                  <option value="evaluated">Evaluated</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Case List Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Case ID
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-center">
                  Computed CSS
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Risk Category
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Flagged Date
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Review Status
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-[#f8fafc] transition-colors group cursor-pointer"
                  onClick={() => openDrawer(c)}
                >
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-gray-400" />
                      <span className="text-gray-900 font-bold text-[11px] font-mono">
                        {c.caseId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle text-center">
                    <span className="text-lg font-black text-gray-900">
                      {c.computedCss}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span
                      className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border tracking-widest uppercase ${getRiskBadgeColor(c.riskCategory)}`}
                    >
                      {c.riskCategory}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span className="text-gray-500 text-[10px] font-medium">
                      {c.flaggedDate}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${c.status === "Evaluated" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {c.status === "Evaluated" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Activity size={12} />
                      )}
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
                    <button
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors shadow-sm ${
                        c.status === "Evaluated"
                          ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          : "bg-[#1e4ed8] border-blue-700 text-white hover:bg-[#113296]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(c);
                      }}
                    >
                      {c.status === "Evaluated"
                        ? "View Review"
                        : "Evaluate Case"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Expert Evaluation       */}
      {/* ========================================= */}
      {isDrawerOpen && activeCase && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel - Wider for Clinical Review */}
          <div className="relative w-full max-w-2xl bg-[#f8fafc] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1e4ed8]">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Expert Evaluation Interface
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded border tracking-widest uppercase ${getRiskBadgeColor(activeCase.riskCategory)}`}
                    >
                      {activeCase.riskCategory}
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-mono flex items-center gap-1">
                    <Lock size={10} /> {activeCase.caseId} • Flagged:{" "}
                    {activeCase.flaggedDate}
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
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
              {/* Critical Feature: Privacy Guardrails */}
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-start gap-2.5">
                <ShieldCheck
                  size={16}
                  className="text-green-600 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-0.5">
                    Privacy Guardrails Active
                  </p>
                  <p className="text-[10px] text-green-700 leading-relaxed">
                    All Personally Identifiable Information (PII) including
                    names, contacts, and exact locations have been stripped. You
                    are viewing strictly anonymized clinical and behavioral
                    telemetry.
                  </p>
                </div>
              </div>

              {/* Panel A: Anonymized Patient Context */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={12} /> Panel A: Patient Context
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {/* Baseline Data Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#f8fafc] p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Baseline Profile
                      </p>
                      <p className="text-xs font-bold text-gray-900">
                        {activeCase.patientContext.age} yrs •{" "}
                        {activeCase.patientContext.sex}
                      </p>
                    </div>
                    <div className="col-span-2 bg-[#f8fafc] p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Reported Conditions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCase.patientContext.conditions.map((cond, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-md"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dietary & Symptoms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-gray-100 p-3 rounded-lg">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Utensils size={10} /> 7-Day Dietary Snapshot
                      </p>
                      <p className="text-[11px] font-medium text-gray-800 leading-relaxed">
                        {activeCase.patientContext.dietaryAvg}
                      </p>
                    </div>
                    <div className="border border-red-100 bg-red-50/30 p-3 rounded-lg">
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <HeartPulse size={10} /> Daily Health Indicators
                      </p>
                      <p className="text-[11px] font-medium text-gray-800 leading-relaxed">
                        {activeCase.patientContext.recentSymptoms}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel B: System Analysis */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-blue-50/30">
                  <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest flex items-center gap-1.5">
                    <Activity size={12} /> Panel B: Algorithmic Output
                  </h4>
                </div>
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-full sm:w-1/3 text-center border-r border-gray-100 pr-0 sm:pr-4">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Computed CSS
                    </p>
                    <p className="text-4xl font-black text-gray-900">
                      {activeCase.computedCss}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded border tracking-widest uppercase ${getRiskBadgeColor(activeCase.riskCategory)}`}
                    >
                      {activeCase.riskCategory}
                    </span>
                  </div>
                  <div className="w-full sm:w-2/3">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      System Action Taken
                    </p>
                    <p className="text-xs font-medium text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {activeCase.systemAction}
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel C: Expert Calibration Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={12} /> Panel C: Expert Calibration
                  </h4>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">
                    Updates EXPERT_FEEDBACK table
                  </span>
                </div>
                <div className="p-4 space-y-5">
                  {/* Rating Control */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-2">
                      Appropriateness Rating
                    </label>
                    <p className="text-[9px] text-gray-500 mb-3">
                      Rate how accurately the system handled this user's data (1
                      = Poor, 5 = Excellent).
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setRating(num)}
                          className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${
                            rating === num
                              ? "bg-[#1e4ed8] border-blue-700 text-white shadow-sm shadow-blue-900/20"
                              : "bg-white border-gray-200 text-gray-600 hover:border-[#1e4ed8] hover:text-[#1e4ed8]"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 mb-2">
                      Risk Interpretation Notes
                    </label>
                    <p className="text-[9px] text-gray-500 mb-2">
                      Document clinical reasoning or suggest rule-based
                      threshold adjustments to refine the algorithm.
                    </p>
                    <textarea
                      rows="4"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:bg-white transition-colors resize-none leading-relaxed"
                      placeholder="e.g. The CSS penalty for isolated dietary sodium without symptoms might be too aggressive..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Actions */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
              <button
                onClick={closeDrawer}
                className="px-5 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
              >
                Cancel
              </button>
              <button className="flex items-center gap-1.5 px-6 py-2 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
                <Save size={14} /> Submit Feedback to Calibrate
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Cases;
