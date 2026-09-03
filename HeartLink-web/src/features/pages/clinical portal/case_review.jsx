import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  Activity,
  ChevronDown,
  Lock,
  Stethoscope,
  RotateCcw,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layouts/adminLayout";
import ExpertEvaluationModal from "../../../components/modals/ExpertEvaluationModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";
import { UI, FONTS, PageHeader } from "../../../styles/designSystem";

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
    
    const riskCategory = c.ml_predicted_hss !== null 
      ? (c.ml_predicted_hss < 50 ? "critical" : (c.ml_predicted_hss < 60 ? "warning" : "stable"))
      : "stable";
    const matchesSeverity = filterSeverity === "all" || riskCategory === filterSeverity;
    
    const matchesStatus = filterStatus === "all" || c.status?.toLowerCase() === filterStatus;
      
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Badge Color Helper
  const getRiskBadgeColor = (hss) => {
    if (hss === null || hss === undefined) return "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]";
    if (hss < 50) return "bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8]";
    if (hss < 60) return "bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD]";
    if (hss < 80) return "bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8]";
    return "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]";
  };

  const hasActiveFilters = Boolean(searchQuery) || filterSeverity !== "all" || filterStatus !== "all";

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Clinical portal"
          eyebrowIcon={Stethoscope}
          title="Case review queue"
          description="Evaluate anonymized patient telemetry, review ML model assessments, and record clinical calibration."
        />

        {/* ── MAIN CARD: SEARCH, FILTER & TABLE ── */}
        <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[10px] shadow-2xs overflow-hidden">
          
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-[#DCE3DF] bg-[#FFFFFF] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893]"
                />
                <input
                  type="text"
                  placeholder="Search anonymized Case ID or Patient ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
                />
              </div>

              {/* Filters Row */}
              <div className="flex gap-2 flex-wrap items-center">
                {/* Severity */}
                <div className="relative">
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical (&lt;50)</option>
                    <option value="warning">Warning (50-59)</option>
                    <option value="stable">Stable (60-100)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending review">Pending Review</option>
                    <option value="evaluated">Evaluated</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-[#A93226] font-semibold px-3 py-1.5 rounded-[8px] border border-[#F0C4B8] bg-[#F7E4E1] hover:bg-[#F0C4B8] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Case List Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-[26%]">
                    Case profile
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-center w-[12%]">
                    ML HSS
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-[15%]">
                    Risk tier
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-[18%]">
                    Review status
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-[17%]">
                    Model / Expert
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-right w-[12%]">
                    Action
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-[#DCE3DF]/60">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-[8px] bg-[#DCE3DF]/70 shrink-0" />
                          <div>
                            <Skeleton className="w-24 h-4 mb-1 bg-[#DCE3DF]/70 rounded" />
                            <Skeleton className="w-16 h-3 bg-[#DCE3DF]/70 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <Skeleton className="w-10 h-6 mx-auto bg-[#DCE3DF]/70 rounded-md" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-20 h-5 rounded-full bg-[#DCE3DF]/70" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-24 h-4 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5">
                        <Skeleton className="w-28 h-4 bg-[#DCE3DF]/70 rounded" />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Skeleton className="w-20 h-8 ml-auto rounded-[8px] bg-[#DCE3DF]/70" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredCases.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-[#5C6B66] text-[13px]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="font-medium text-[#5C6B66]">
                          {cases.length === 0 ? "No cases currently in review queue." : "No cases match your filters."}
                        </p>
                        {cases.length > 0 && (
                          <button
                            onClick={clearFilters}
                            className="mt-1 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] transition-colors cursor-pointer"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-[#DCE3DF]">
                  {filteredCases.map((c, idx) => {
                    const isEvaluated = c.status?.toLowerCase() === "evaluated";
                    const riskTier = c.ml_tier || "Stable";
                    const badgeClass = getRiskBadgeColor(c.ml_predicted_hss);
                    
                    return (
                      <tr
                        key={c.case_id || idx}
                        className="hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer"
                        onClick={() => openModal(c)}
                      >
                        {/* Case Profile */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[8px] bg-[#FBEAE6] border border-[#DCE3DF] flex items-center justify-center shrink-0">
                              <Lock size={13} className="text-[#E8532E]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[#152131] font-bold text-[13px] font-mono leading-tight">
                                {c.case_id}
                              </span>
                              <span className="text-[11px] text-[#5C6B66] font-medium mt-0.5">
                                {c.age} yrs • {c.sex}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ML HSS */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle text-center">
                          <span 
                            className="text-[16px] font-bold text-[#152131]"
                            style={{ fontFamily: "'Fraunces', serif" }}
                          >
                            {c.ml_predicted_hss ?? "--"}
                          </span>
                        </td>

                        {/* Risk Tier */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          {c.ml_predicted_hss !== null ? (
                            <span
                              className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                            >
                              {riskTier}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#8B9893] font-medium">None</span>
                          )}
                        </td>

                        {/* Review Status */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              isEvaluated ? "text-[#1B6E63]" : "text-[#E8532E]"
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

                        {/* Model / Expert comparison */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle text-[12px] font-medium leading-tight">
                          {isEvaluated ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[#5C6B66]">Model: <strong className="text-[#152131]">{c.ml_predicted_hss}</strong></span>
                              <span className="text-[#5C6B66]">Expert: <strong className="text-[#1B6E63]">{c.expert_hss_score}</strong></span>
                              {c.absolute_error !== null && (
                                <span className="text-[10px] text-[#8B9893] font-mono mt-0.5">
                                  Diff: {c.absolute_error} pts
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8B9893] font-medium italic">Pending evaluation</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/users/${c.user_id}`);
                              }}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-[#DCE3DF] text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] transition-colors cursor-pointer"
                            >
                              Summary
                            </button>
                            <button
                              className={`text-[12px] font-semibold px-3 py-1 rounded-[6px] transition-colors cursor-pointer ${
                                isEvaluated
                                  ? "bg-[#FFFFFF] border border-[#DCE3DF] text-[#152131] hover:bg-[#EDF1EF]"
                                  : "bg-[#E8532E] hover:bg-[#C13E20] text-white shadow-2xs"
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
                  })}
                </tbody>
              )}
          </table>
        </div>
      </div>

      {/* Expert Evaluation Modal */}
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
    </div>
  </AdminLayout>
  );
};

export default Cases;
