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
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout"; // Adjust path
import ExpertEvaluationModal from "../../../components/modals/ExpertEvaluationModal";

import { apiFetch } from "../../../api";

const Cases = () => {
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient_id");
  const navigate = useNavigate();

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

  // Auto-open modal if patient_id query param matches a case
  React.useEffect(() => {
    if (patientIdParam && cases.length > 0) {
      const match = cases.find(c => c.user_id === patientIdParam);
      if (match) {
        openModal(match);
      }
    }
  }, [patientIdParam, cases]);

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
            EXPERT REVIEWER
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
                  CASE
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-center">
                  HSS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  RISK
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  REVIEW STATUS
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  MODEL / EXPERT
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
              ) : filteredCases.map((c, idx) => {
                const isEvaluated = c.status?.toLowerCase() === "evaluated";
                const riskTier = c.ml_tier || "Stable";
                
                return (
                  <tr
                    key={c.case_id || idx}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                    onClick={() => openModal(c)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-slate-400" />
                          <span className="text-slate-900 font-semibold text-[11px] font-mono">
                            {c.case_id}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {c.age} yrs • {c.sex}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle text-center">
                      <span className="text-sm font-bold text-slate-900">
                        {c.ml_predicted_hss ?? "--"}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      {c.ml_predicted_hss !== null ? (
                        <span
                          className={`inline-flex items-center text-[9px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            c.ml_predicted_hss < 50
                            ? "bg-red-50 text-red-600 border-red-100" 
                            : c.ml_predicted_hss < 60
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : c.ml_predicted_hss < 80
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          } border`}
                        >
                          {riskTier}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">None</span>
                      )}
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                          isEvaluated ? "text-emerald-600" : "text-orange-500"
                        }`}
                      >
                        {isEvaluated ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Activity size={12} className="animate-pulse" />
                        )}
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-[10px] text-slate-600 font-semibold leading-normal">
                      {isEvaluated ? (
                        <div className="flex flex-col">
                          <span>Model {c.ml_predicted_hss}</span>
                          <span>Expert {c.expert_hss_score}</span>
                          {c.absolute_error !== null && (
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              Difference: {c.absolute_error} pts
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Not yet reviewed</span>
                      )}
                    </td>
                    <td className="py-4 px-5 align-middle text-right flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/users/${c.user_id}`);
                        }}
                        className="text-[10px] font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                      >
                        User Summary
                      </button>
                      <button
                        className={`text-[10px] font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer ${
                          isEvaluated
                            ? "bg-white border border-slate-200 text-[#0f172a] hover:bg-slate-50"
                            : "text-white transition-all hover:opacity-90 active:scale-[0.99] border border-transparent"
                        }`}
                        style={!isEvaluated ? { backgroundColor: "#0f172a" } : {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(c);
                        }}
                      >
                        {isEvaluated
                          ? "Edit Evaluation"
                          : "Evaluate Case"}
                      </button>
                    </td>
                  </tr>
                );
              })}
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
