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
import ExpertEvaluationModal from "../../../components/modals/ExpertEvaluationModal";

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
      telemetry: {
        recommended: {
          targetTier: "Monitor Closely",
          suggestedMeal: "Low-Sodium Chicken Broth",
          suggestedActivity: "15-Minute Chair Yoga",
        },
        actual: {
          vitals: "BP 155/95, HR 98",
          loggedMeal: "Pork Sinugba (High Sodium)",
          loggedActivity: "Basketball - High Exertion",
          conflict: true,
        },
      },
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
      telemetry: {
        recommended: {
          targetTier: "Stable",
          suggestedMeal: "Grilled Salmon & Quinoa",
          suggestedActivity: "Brisk Jogging (30m)",
        },
        actual: {
          vitals: "BP 135/85, HR 82",
          loggedMeal: "Fast Food Cheeseburger",
          loggedActivity: "Attempted Brisk Jogging",
          conflict: true,
        },
      },
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
      telemetry: {
        recommended: {
          targetTier: "Critical Care",
          suggestedMeal: "Oatmeal with Fresh Berries",
          suggestedActivity: "Rest / Light Stretching",
        },
        actual: {
          vitals: "BP 160/100, HR 105",
          loggedMeal: "Canned Soup (Very High Sodium)",
          loggedActivity: "None logged in 7 days",
          conflict: true,
        },
      },
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
      telemetry: {
        recommended: {
          targetTier: "Stable",
          suggestedMeal: "Any Low-Sodium Meal",
          suggestedActivity: "Yoga (30 mins)",
        },
        actual: {
          vitals: "BP 120/80, HR 72",
          loggedMeal: "Instant Noodles (High Sodium)",
          loggedActivity: "Yoga (30 mins)",
          conflict: true,
        },
      },
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
  const [filterDateRange, setFilterDateRange] = useState("7days");

  // Modal & Evaluation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCase, setActiveCase] = useState(null);

  // Open Modal for Evaluation
  const openModal = (caseItem) => {
    setActiveCase(caseItem);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
      
    let matchesDate = true;
    if (filterDateRange !== "all") {
      const flagged = new Date(c.flaggedDate);
      // Mocking 'now' to June 11, 2026 so the mock data correctly falls into the 7 and 30 day buckets
      const now = new Date("Jun 11, 2026 12:00");
      const diffTime = now - flagged;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDateRange === "7days") matchesDate = diffDays <= 7 && diffDays >= 0;
      if (filterDateRange === "30days") matchesDate = diffDays <= 30 && diffDays >= 0;
    }

    return matchesSearch && matchesSeverity && matchesStatus && matchesDate;
  });

  // Badge Color Helper
  const getRiskBadgeColor = (category) => {
    if (category === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (category === "Warning")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-100";
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
            Case Review Queue.
          </h2>
        </div>

        {/* Global Date Filter */}
        <div className="relative">
          <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            className="pl-10 pr-10 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm relative z-0"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        </div>
      </div>

      {/* Main View: Triage Data Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
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
                placeholder="Search anonymized Case ID..."
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
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
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
                  <option value="pending review">Pending Review</option>
                  <option value="evaluated">Evaluated</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Case List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CASE ID
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-center">
                  COMPUTED CSS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  RISK CATEGORY
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  FLAGGED DATE
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  REVIEW STATUS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => openModal(c)}
                >
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-slate-400" />
                      <span className="text-slate-900 font-semibold text-[11px] font-mono">
                        {c.caseId}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle text-center">
                    <span className="text-xl font-bold text-slate-900">
                      {c.computedCss}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span
                      className={`inline-flex items-center text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${
                        c.riskCategory === "Critical" 
                        ? "bg-red-50 text-red-600" 
                        : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {c.riskCategory.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="text-slate-500 text-[10px] font-medium">
                      {c.flaggedDate}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                        c.status === "Evaluated" ? "text-emerald-600" : "text-orange-500"
                      }`}
                    >
                      {c.status === "Evaluated" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Activity size={13} className="animate-pulse" />
                      )}
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle text-right">
                    <button
                      className={`text-[10px] font-medium px-4 py-2 rounded-xl transition-colors shadow-sm ${
                        c.status === "Evaluated"
                          ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "text-white transition-all hover:opacity-90 active:scale-[0.99] border border-transparent"
                      }`}
                      style={c.status !== "Evaluated" ? { backgroundColor: "#0f172a" } : {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(c);
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

      <ExpertEvaluationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        activeCase={activeCase}
        onSave={(data) => {
          console.log("Saving expert evaluation:", data);
        }}
      />
    </AdminLayout>
  );
};

export default Cases;
