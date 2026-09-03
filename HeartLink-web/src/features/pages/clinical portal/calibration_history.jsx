import React, { useState } from "react";
import {
  Search,
  Download,
  History,
  Activity,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import AdminLayout from "../../../components/layouts/adminLayout";
import CalibrationModal from "../../../components/modals/CalibrationModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";

const CustomLightTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] p-2.5 shadow-xl text-[12px] text-[#152131]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <p className="font-semibold text-[#152131] mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E8532E]" />
          <span className="text-[#5C6B66]">Error Margin:</span>
          <span className="font-bold text-[#152131]">{payload[0].value} pts</span>
        </div>
      </div>
    );
  }
  return null;
};

const Calibration = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedHash, setSelectedHash] = useState("all");
  const [selectedReason, setSelectedReason] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLog, setActiveLog] = useState(null);

  // Fetch evaluations
  React.useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/admin/evaluations");
      if (data) setLogs(data);
    } catch (e) {
      console.error("Failed to fetch evaluations", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (logId) => {
    try {
      setLoading(true);
      await apiFetch(`/api/admin/evaluations/${logId}/archive`, { method: "PUT" });
      await fetchLogs();
      closeModal();
    } catch (e) {
      console.error("Failed to archive log", e);
      alert("Failed to archive log");
    } finally {
      setLoading(false);
    }
  };

  // Open Modal for Detail View
  const openModal = (log) => {
    setActiveLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveLog(null);
  };

  const handleExportDataset = async () => {
    try {
      setIsExporting(true);
      setExportMessage("");
      const res = await apiFetch("/api/admin/datasets/generate", {
        method: "POST",
        body: JSON.stringify({ allow_mixed_models: true }),
      });
      if (res && res.dataset) {
        setExportMessage(`Dataset ${res.dataset.dataset_id} generated!`);
        alert(`Versioned training dataset ${res.dataset.dataset_id} successfully compiled on backend database registry. Use offline dataset training script.`);
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export dataset. " + (e.message || "Please resolve mixed model hashes."));
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setSelectedHash("all");
    setSelectedReason("all");
  };

  // Filter Logic
  const uniqueHashes = Array.from(
    new Set(
      logs
        .map((log) => log.model_metadata?.model_hash)
        .filter(Boolean)
    )
  );

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (log.id || "").toLowerCase().includes(query) ||
      (log.case_id || "").toLowerCase().includes(query);
      
    let matchesType = true;
    if (filterType === "eligible") {
      matchesType = log.status !== "Archived" && log.expert_hss_score != null && log.input_snapshot?.model_features;
    } else if (filterType === "archived") {
      matchesType = log.status === "Archived";
    } else if (filterType === "disagreement") {
      matchesType = log.status !== "Archived" && !log.tier_agreement;
    } else if (filterType === "high_error") {
      matchesType = log.status !== "Archived" && (log.absolute_error || 0) >= 10;
    } else if (filterType === "conf_high") {
      matchesType = log.status !== "Archived" && log.reviewer_confidence === "high";
    } else if (filterType === "conf_medium") {
      matchesType = log.status !== "Archived" && log.reviewer_confidence === "medium";
    } else if (filterType === "conf_low") {
      matchesType = log.status !== "Archived" && log.reviewer_confidence === "low";
    }
    
    const matchesHash = selectedHash === "all" || log.model_metadata?.model_hash === selectedHash;
    const matchesReason = selectedReason === "all" || (log.adjustment_reasons && log.adjustment_reasons.includes(selectedReason));
    
    return matchesSearch && matchesType && matchesHash && matchesReason;
  });

  // Calculate Summary Statistics
  const eligibleLogs = logs.filter((log) => {
    return (
      log.status !== "Archived" &&
      log.expert_hss_score != null &&
      log.ml_predicted_hss != null &&
      log.input_snapshot?.model_features &&
      Object.keys(log.input_snapshot.model_features).length > 0
    );
  });
  
  const eligibleCount = eligibleLogs.length;
  
  const averageError = eligibleCount > 0 
    ? (eligibleLogs.reduce((sum, log) => sum + (log.absolute_error || 0), 0) / eligibleCount).toFixed(1)
    : "0.0";
    
  const tierAgreementRate = eligibleCount > 0
    ? ((eligibleLogs.filter((log) => log.tier_agreement).length / eligibleCount) * 100).toFixed(1)
    : "0.0";
    
  const highErrorCount = eligibleLogs.filter((log) => (log.absolute_error || 0) >= 10).length;

  const reasonKeys = [
    { key: "blood_pressure_pattern", label: "Blood pressure pattern" },
    { key: "heart_rate_pattern", label: "Heart-rate pattern" },
    { key: "symptoms", label: "Symptoms" },
    { key: "medication_related_factor", label: "Medication-related factor" },
    { key: "activity_pattern", label: "Activity pattern" },
    { key: "nutrition_sodium_pattern", label: "Nutrition / sodium pattern" },
    { key: "sleep_pattern", label: "Sleep pattern" },
    { key: "baseline_information", label: "Baseline information" },
  ];

  const getReasonCount = (reasonKey) => {
    return eligibleLogs.filter((log) => log.adjustment_reasons && log.adjustment_reasons.includes(reasonKey)).length;
  };

  const getCalibrationStatus = (log) => {
    if (log.status === "Archived") {
      return {
        label: "Archived",
        style: "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]",
        tooltip: "Evaluation archived and excluded from dataset compilation.",
      };
    }
    
    const isEligible = 
      log.expert_hss_score != null &&
      log.ml_predicted_hss != null &&
      log.input_snapshot?.model_features &&
      Object.keys(log.input_snapshot.model_features).length > 0;
      
    if (isEligible) {
      return {
        label: "Eligible",
        style: "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]",
        tooltip: "Evaluation is fully eligible for calibration analysis.",
      };
    }
    
    const missingSnapshot = !log.input_snapshot?.model_features || Object.keys(log.input_snapshot.model_features).length === 0;
    if (missingSnapshot) {
      return {
        label: "Incomplete",
        style: "bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8]",
        tooltip: "Evaluation is incomplete: missing model features snapshot.",
      };
    }
    
    return {
      label: "Excluded",
      style: "bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8]",
      tooltip: "Evaluation excluded: missing required expert scores or predictions.",
    };
  };

  // Calculate Chart Data
  const chartData = logs
    .filter((log) => log.ml_predicted_hss != null && log.expert_hss_score != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((log, index) => {
      const errorMargin = Math.abs(log.expert_hss_score - log.ml_predicted_hss);
      return {
        name: `Eval ${index + 1}`,
        error: errorMargin,
        expert: log.expert_hss_score,
        ml: log.ml_predicted_hss,
        date: new Date(log.created_at).toLocaleDateString(),
      };
    });

  const hasActiveFilters = Boolean(searchQuery) || filterType !== "all" || selectedReason !== "all" || selectedHash !== "all";

  return (
    <AdminLayout>
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── PAGE HEAD ── */}
        <div className="flex flex-wrap gap-4 justify-between items-end mb-6">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5">
              <History size={13} className="text-[#E8532E]" /> Clinical portal
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Model calibration history
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]">
              Monitor ground-truth clinical evaluations, algorithm accuracy margins, and offline training datasets.
            </p>
          </div>

          <button
            onClick={handleExportDataset}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#E8532E] hover:bg-[#C13E20] text-white px-4 py-2.5 rounded-[8px] text-[13px] font-semibold shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>{isExporting ? "Compiling…" : "Generate calibration dataset"}</span>
          </button>
        </div>

        {/* ── METRIC STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
            <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">Eligible evaluations</span>
            <div 
              className="text-[26px] font-medium text-[#152131] leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {eligibleCount}
            </div>
            <span className="text-[11px] text-[#5C6B66] font-medium block mt-1">Active calibration samples</span>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
            <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">Average absolute error</span>
            <div 
              className="text-[26px] font-medium text-[#152131] leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {averageError} <span className="text-[13px] font-normal text-[#5C6B66]">pts</span>
            </div>
            <span className="text-[11px] text-[#5C6B66] font-medium block mt-1">Mean expert vs ML delta</span>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
            <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">Tier agreement</span>
            <div 
              className="text-[26px] font-medium text-[#1B6E63] leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {tierAgreementRate}%
            </div>
            <span className="text-[11px] text-[#5C6B66] font-medium block mt-1">Category matching rate</span>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] shadow-2xs">
            <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">High-error cases</span>
            <div 
              className="text-[26px] font-medium text-[#A93226] leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {highErrorCount}
            </div>
            <span className="text-[11px] text-[#5C6B66] font-medium block mt-1">Error ≥ 10 points</span>
          </div>
        </div>

        {/* ── ACCURACY TREND DASHBOARD ── */}
        {chartData.length > 0 && (
          <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] p-5 mb-6 shadow-2xs flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-3.5 border-b md:border-b-0 md:border-r border-[#DCE3DF] pb-4 md:pb-0 md:pr-6">
              <div>
                <p className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">Model accuracy trend</p>
                <h3 
                  className="text-[18px] font-medium text-[#152131]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  Absolute error margin
                </h3>
                <p className="text-[12px] text-[#5C6B66] mt-1 leading-relaxed">
                  Tracks the absolute difference between ML-predicted HSS and expert ground-truth HSS over time.
                </p>
              </div>

              <div className="bg-[#E3EFEC] border border-[#C5DFD8] p-3.5 rounded-[8px]">
                <p className="text-[12px] font-semibold text-[#1B6E63] flex items-center gap-1.5">
                  <Activity size={14} /> Accuracy objective
                </p>
                <p className="text-[11px] text-[#1B6E63]/90 mt-0.5 leading-relaxed font-medium">
                  As more expert evaluations are applied, the model error margin trends toward zero.
                </p>
              </div>

              {/* Production Model Details */}
              <div className="bg-[#EDF1EF] border border-[#DCE3DF] p-3 rounded-[8px] space-y-1 text-[11.5px]">
                <span className="text-[9.5px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-0.5">Production Model</span>
                <div className="flex justify-between text-[#152131] font-medium">
                  <span className="text-[#5C6B66]">Identifier:</span>
                  <code className="text-[#E8532E] font-mono text-[11px]">heartlink_model.pkl</code>
                </div>
                <div className="flex justify-between text-[#152131] font-medium">
                  <span className="text-[#5C6B66]">Pipeline:</span>
                  <code className="text-[#152131] font-mono text-[11px]">v1.0 (offline)</code>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-2/3 h-56 relative pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DCE3DF" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8B9893" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8B9893" }} />
                  <Tooltip content={<CustomLightTooltip />} />
                  <ReferenceLine y={0} stroke="#DCE3DF" />
                  <Line 
                    type="monotone" 
                    dataKey="error" 
                    name="Error Margin"
                    stroke="#E8532E" 
                    strokeWidth={2.5}
                    dot={{ r: 3.5, strokeWidth: 1.5, fill: "#FFFFFF", stroke: "#E8532E" }} 
                    activeDot={{ r: 5.5, fill: "#E8532E", stroke: "#FFFFFF", strokeWidth: 2 }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── MAIN CARD: REFERENCE LOG TABLE ── */}
        <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] shadow-2xs overflow-hidden">
          
          {/* Search & Filter Bar */}
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
                  placeholder="Search by Feedback ID or Case ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Status */}
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="eligible">Active / Eligible</option>
                    <option value="archived">Archived</option>
                    <option value="disagreement">Tier Disagreement</option>
                    <option value="high_error">High Error (≥10)</option>
                    <option value="conf_high">Confidence: High</option>
                    <option value="conf_medium">Confidence: Medium</option>
                    <option value="conf_low">Confidence: Low</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {/* Adjustment Reason Filter */}
                <div className="relative">
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors max-w-[200px] truncate"
                  >
                    <option value="all">All Adjustment Reasons</option>
                    {reasonKeys.map((r) => (
                      <option key={r.key} value={r.key}>{r.label} ({getReasonCount(r.key)})</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {uniqueHashes.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedHash}
                      onChange={(e) => setSelectedHash(e.target.value)}
                      className="pl-3 pr-7 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors max-w-[150px] truncate"
                    >
                      <option value="all">All Models</option>
                      {uniqueHashes.map((h) => (
                        <option key={h} value={h}>Hash: {h.substring(0, 8)}…</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                      <ChevronDown size={12} className="text-[#8B9893]" />
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
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

          {/* Calibration List Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Evaluation ID
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Case
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Model HSS
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Expert HSS
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Error
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Tier agreement
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Confidence
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Model version
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Date
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-right">
                    Action
                  </th>
                </tr>
              </thead>

              {loading ? (
                <tbody>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <tr key={item} className="border-b border-[#DCE3DF]/60">
                      <td className="py-3.5 px-5"><Skeleton className="w-24 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-8 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-8 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-12 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-12 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-16 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5"><Skeleton className="w-12 h-4 bg-[#DCE3DF]/70 rounded" /></td>
                      <td className="py-3.5 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-[#DCE3DF]/70 rounded-[6px]" /></td>
                    </tr>
                  ))}
                </tbody>
              ) : filteredLogs.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan="10" className="p-12 text-center text-[#5C6B66] text-[13px]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="font-medium text-[#5C6B66]">
                          {logs.length === 0 ? "No calibration logs recorded yet." : "No evaluations match your filters."}
                        </p>
                        {logs.length > 0 && (
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
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-[#EDF1EF]/60 transition-colors group cursor-pointer ${log.status === "Archived" ? "opacity-60 bg-[#EDF1EF]/30" : ""}`}
                      onClick={() => openModal(log)}
                    >
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-[#152131] font-bold text-[12.5px] font-mono mb-0.5">
                          {log.id}
                        </p>
                        {(() => {
                          const statusInfo = getCalibrationStatus(log);
                          return (
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[8.5px] font-bold uppercase tracking-wider ${statusInfo.style}`}
                              title={statusInfo.tooltip}
                            >
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-[#152131] font-semibold text-[11px] font-mono bg-[#EDF1EF] border border-[#DCE3DF] px-2 py-0.5 rounded-[5px]">
                          {log.case_id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[12.5px] font-bold text-[#152131]">
                        {log.ml_predicted_hss ?? "--"}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[12.5px] font-bold text-[#1B6E63]">
                        {log.expert_hss_score}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[12px] font-semibold text-[#5C6B66]">
                        {log.absolute_error != null ? `${log.absolute_error} pts` : "--"}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[12px] font-semibold">
                        {log.tier_agreement ? (
                          <span className="text-[#1B6E63] font-bold">Yes</span>
                        ) : (
                          <span className="text-[#A93226] font-bold">No</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[12px]">
                        <span className="capitalize text-[#5C6B66] font-medium">{log.reviewer_confidence || "Not recorded"}</span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[11.5px] font-mono text-[#8B9893] max-w-[100px] truncate" title={log.model_metadata?.model_hash}>
                        {log.model_metadata?.model_hash ? `${log.model_metadata.model_hash.substring(0, 8)}…` : "--"}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-[11.5px] text-[#8B9893] font-medium">
                        {new Date(log.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>

                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openModal(log); }}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] text-[#152131] hover:bg-[#DCE3DF] transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>

        <CalibrationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          activeLog={activeLog}
          onArchive={handleArchive}
        />
      </div>
    </AdminLayout>
  );
};

export default Calibration;
