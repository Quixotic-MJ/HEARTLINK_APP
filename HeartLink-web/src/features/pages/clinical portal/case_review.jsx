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

import { apiFetch } from "../../../api";

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("7days");

  // Modal & Evaluation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCase, setActiveCase] = useState(null);

  // Fetch cases
  React.useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/admin/cases");
      if (data) setCases(data);
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Modal for Evaluation
  const openModal = async (caseItem) => {
    try {
      const fullDetail = await apiFetch(`/api/admin/cases/${caseItem.user_id}`);
      setActiveCase(fullDetail);
      setIsModalOpen(true);
    } catch (e) {
      console.error("Failed to load case details", e);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveCase(null);
  };

  // Filter Logic
  const filteredCases = cases.filter((c) => {
    const matchesSearch = c.case_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Pseudo risk category based on ml_predicted_hss for filtering/badges
    const riskCategory = c.ml_predicted_hss !== null 
      ? (c.ml_predicted_hss < 50 ? "critical" : (c.ml_predicted_hss < 60 ? "warning" : "stable"))
      : "stable";
    const matchesSeverity = filterSeverity === "all" || riskCategory === filterSeverity;
    
    const matchesStatus = filterStatus === "all" || c.status?.toLowerCase() === filterStatus;
      
    // Removing date filter for now as we don't have flaggedDate in real cases easily without full alert tracking
    return matchesSearch && matchesSeverity && matchesStatus;
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
                  COMPUTED HSS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  RISK CATEGORY
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CONDITIONS
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
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
                    Loading cases...
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
                    No cases found.
                  </td>
                </tr>
              ) : filteredCases.map((c, idx) => (
                <tr
                  key={c.case_id || idx}
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => openModal(c)}
                >
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-slate-400" />
                      <span className="text-slate-900 font-semibold text-[11px] font-mono">
                        {c.case_id}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle text-center">
                    <span className="text-xl font-bold text-slate-900">
                      {c.ml_predicted_hss ?? "--"}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {c.ml_predicted_hss !== null && c.ml_predicted_hss < 60 ? (
                      <span
                        className={`inline-flex items-center text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${
                          c.ml_predicted_hss < 50
                          ? "bg-red-50 text-red-600" 
                          : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {c.ml_predicted_hss < 50 ? "CRITICAL" : "WARNING"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">None</span>
                    )}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="text-slate-500 text-[10px] font-medium">
                      {c.conditions?.length ? c.conditions.join(", ") : "None"}
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
                          ? "bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"
                          : "text-white transition-all hover:opacity-90 active:scale-[0.99] border border-transparent"
                      }`}
                      style={c.status !== "Evaluated" ? { backgroundColor: "#0f172a" } : {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(c);
                      }}
                    >
                      {c.status === "Evaluated"
                        ? "Edit Evaluation"
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
        onSave={async (data) => {
          if (!activeCase?.user_id) return;
          try {
            await apiFetch(`/api/admin/cases/${activeCase.user_id}/evaluate`, {
              method: "POST",
              body: JSON.stringify(data)
            });
            closeModal();
            fetchCases(); // Refresh list
          } catch (e) {
            console.error("Failed to submit evaluation", e);
          }
        }}
      />
    </AdminLayout>
  );
};

export default Cases;
