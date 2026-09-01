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
  Sparkles,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExpertEvaluationModal from "../../../components/modals/ExpertEvaluationModal";
import { Skeleton } from "../../../components/ui/Skeleton";
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
      const match = cases.find((c) => c.user_id === patientIdParam);
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

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSeverity("all");
    setFilterStatus("all");
  };

  // Filter Logic
  const filteredCases = cases.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (c.case_id || "").toLowerCase().includes(query) ||
      (c.user_id || "").toLowerCase().includes(query);
    
    // Pseudo risk category based on ml_predicted_hss for filtering/badges
    const riskCategory = c.ml_predicted_hss !== null 
      ? (c.ml_predicted_hss < 50 ? "critical" : (c.ml_predicted_hss < 60 ? "warning" : "stable"))
      : "stable";
    const matchesSeverity = filterSeverity === "all" || riskCategory === filterSeverity;
    
    const matchesStatus = filterStatus === "all" || c.status?.toLowerCase() === filterStatus;
      
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Badge Color Helper
  const getRiskBadgeColor = (hss) => {
    if (hss === null || hss === undefined) return "bg-white/5 text-slate-400 border-white/10";
    if (hss < 50) return "bg-red-500/10 text-red-400 border border-red-500/20";
    if (hss < 60) return "bg-[#E55F37]/10 text-[#E55F37] border border-[#E55F37]/20";
    if (hss < 80) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <Stethoscope size={11} />
            <span>Clinical Portal</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            Case Review Queue
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Evaluate anonymized patient telemetry, review ML model assessments, and record clinical calibration.
          </p>
        </div>
      </div>

      {/* Main View: Triage Data Table Container */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-[#161616]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search anonymized Case ID or Patient ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {/* Severity Filter */}
              <div className="relative">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="all" className="bg-[#161616]">All Severities</option>
                  <option value="critical" className="bg-[#161616]">Critical (&lt;50)</option>
                  <option value="warning" className="bg-[#161616]">Warning (50-59)</option>
                  <option value="stable" className="bg-[#161616]">Stable (60-100)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="all" className="bg-[#161616]">All Statuses</option>
                  <option value="pending review" className="bg-[#161616]">Pending Review</option>
                  <option value="evaluated" className="bg-[#161616]">Evaluated</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterSeverity !== "all" || filterStatus !== "all") && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Case List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] table-auto">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[25%]">
                  Case
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-center w-[12%]">
                  HSS
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[15%]">
                  Risk Tier
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[18%]">
                  Review Status
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-[18%]">
                  Model / Expert
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right w-[12%]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-white/5">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
                        <div>
                          <Skeleton className="w-24 h-4 mb-1 bg-white/10" />
                          <Skeleton className="w-16 h-3 bg-white/10" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <Skeleton className="w-10 h-6 mx-auto bg-white/10 rounded-md" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-20 h-5 rounded-full bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-24 h-4 bg-white/10" />
                    </td>
                    <td className="py-4 px-5">
                      <Skeleton className="w-28 h-4 bg-white/10" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Skeleton className="w-20 h-8 ml-auto rounded-xl bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-medium text-slate-400">
                        {cases.length === 0 ? "No cases currently in review queue." : "No cases match your filters."}
                      </p>
                      {cases.length > 0 && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl transition-all cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c, idx) => {
                  const isEvaluated = c.status?.toLowerCase() === "evaluated";
                  const riskTier = c.ml_tier || "Stable";
                  const badgeClass = getRiskBadgeColor(c.ml_predicted_hss);
                  
                  return (
                    <tr
                      key={c.case_id || idx}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => openModal(c)}
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#36272B] border border-[#E55F37]/30 flex items-center justify-center shrink-0">
                            <Lock size={13} className="text-[#E55F37]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-xs font-mono">
                              {c.case_id}
                            </span>
                            <span className="text-[10px] text-[#89899C] font-medium mt-0.5">
                              {c.age} yrs • {c.sex}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 align-middle text-center">
                        <span className="text-sm font-extrabold text-white">
                          {c.ml_predicted_hss ?? "--"}
                        </span>
                      </td>

                      <td className="py-4 px-5 align-middle">
                        {c.ml_predicted_hss !== null ? (
                          <span
                            className={`inline-flex items-center text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.15em] ${badgeClass}`}
                          >
                            {riskTier}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">None</span>
                        )}
                      </td>

                      <td className="py-4 px-5 align-middle">
                        <span
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                            isEvaluated ? "text-emerald-400" : "text-[#E55F37]"
                          }`}
                        >
                          {isEvaluated ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Activity size={13} className="animate-pulse" />
                          )}
                          {c.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-5 align-middle text-xs font-medium leading-normal">
                        {isEvaluated ? (
                          <div className="flex flex-col">
                            <span className="text-slate-300">Model: <strong className="text-white">{c.ml_predicted_hss}</strong></span>
                            <span className="text-slate-300">Expert: <strong className="text-emerald-400">{c.expert_hss_score}</strong></span>
                            {c.absolute_error !== null && (
                              <span className="text-[9px] text-[#89899C] font-mono mt-0.5">
                                Diff: {c.absolute_error} pts
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium italic">Pending evaluation</span>
                        )}
                      </td>

                      <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/users/${c.user_id}`);
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 bg-[#21202E] hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                          >
                            Summary
                          </button>
                          <button
                            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                              isEvaluated
                                ? "bg-[#21202E] border border-white/10 text-slate-200 hover:text-white hover:border-white/20"
                                : "bg-[#E55F37] hover:bg-[#D4542E] text-white shadow-sm shadow-[#E55F37]/25"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(c);
                            }}
                          >
                            {isEvaluated ? "Edit" : "Evaluate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
              body: JSON.stringify(data),
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

