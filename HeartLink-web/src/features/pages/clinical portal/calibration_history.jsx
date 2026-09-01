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
  Activity,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import AdminLayout from "../../../components/layouts/adminLayout";
import CalibrationModal from "../../../components/modals/CalibrationModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import { apiFetch } from "../../../api";

const Calibration = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainMetrics, setRetrainMetrics] = useState(null);
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
        style: "bg-white/5 text-slate-400 border-white/10",
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
        style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        tooltip: "Evaluation is fully eligible for calibration analysis.",
      };
    }
    
    const missingSnapshot = !log.input_snapshot?.model_features || Object.keys(log.input_snapshot.model_features).length === 0;
    if (missingSnapshot) {
      return {
        label: "Incomplete",
        style: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        tooltip: "Evaluation is incomplete: missing model features snapshot.",
      };
    }
    
    return {
      label: "Excluded",
      style: "bg-rose-500/10 text-rose-400 border-rose-500/20",
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

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <History size={11} />
            <span>Clinical Portal</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            Model Calibration History
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Monitor ground-truth clinical evaluations, algorithm accuracy margins, and offline training datasets.
          </p>
        </div>

        {/* Feature: Export Dataset Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <button
            onClick={handleExportDataset}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#E55F37] hover:bg-[#D4542E] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-[#E55F37]/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>{isExporting ? "Compiling..." : "Generate Calibration Dataset"}</span>
          </button>
        </div>
      </div>

      {/* Calibration Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/10">
          <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest block mb-1">Eligible Evaluations</span>
          <div className="text-2xl font-extrabold text-white">{eligibleCount}</div>
          <span className="text-[10px] text-[#89899C] font-medium block mt-0.5">Active calibration samples</span>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/10">
          <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest block mb-1">Average Absolute Error</span>
          <div className="text-2xl font-extrabold text-white">{averageError} <span className="text-xs font-normal text-slate-400">pts</span></div>
          <span className="text-[10px] text-[#89899C] font-medium block mt-0.5">Mean expert vs ML delta</span>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/10">
          <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest block mb-1">Tier Agreement</span>
          <div className="text-2xl font-extrabold text-emerald-400">{tierAgreementRate}%</div>
          <span className="text-[10px] text-[#89899C] font-medium block mt-0.5">Category matching rate</span>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/10">
          <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest block mb-1">High-Error Cases</span>
          <div className="text-2xl font-extrabold text-red-400">{highErrorCount}</div>
          <span className="text-[10px] text-[#89899C] font-medium block mt-0.5">Error ≥ 10 points</span>
        </div>
      </div>

      {/* Model Accuracy Trend Dashboard */}
      {chartData.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-6 mb-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
            <div>
              <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest mb-1">MODEL ACCURACY TREND</p>
              <h3 className="text-base font-bold text-white">Absolute Error Margin</h3>
              <p className="text-xs text-[#89899C] mt-1.5 leading-relaxed font-medium">
                Tracks the absolute difference between ML-predicted HSS and expert ground-truth HSS over time.
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl">
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><Activity size={14}/> Accuracy Objective</p>
              <p className="text-[11px] text-emerald-300/90 mt-1 leading-relaxed">As more expert evaluations are applied, the error margin trends toward zero.</p>
            </div>

            {/* Production Model Details */}
            <div className="bg-[#161616] border border-white/10 p-3.5 rounded-xl space-y-1.5 text-xs">
              <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest block mb-1">Production Model</span>
              <div className="flex justify-between text-slate-300 font-medium">
                <span className="text-[#89899C]">Identifier:</span>
                <code className="text-[#E55F37] font-mono text-[11px]">heartlink_model.pkl</code>
              </div>
              <div className="flex justify-between text-slate-300 font-medium">
                <span className="text-[#89899C]">Pipeline:</span>
                <code className="text-white font-mono text-[11px]">v1.0 (offline)</code>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-2/3 h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#89899C" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#89899C" }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#161616",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                  }}
                  labelStyle={{ fontWeight: "bold", color: "#fff", marginBottom: "4px" }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  name="Error Margin"
                  stroke="#E55F37" 
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: "#161616", stroke: "#E55F37" }} 
                  activeDot={{ r: 6, fill: "#E55F37", stroke: "#fff", strokeWidth: 2 }}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main View: Reference Log Data Table */}
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
                placeholder="Search by Feedback ID or Case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="all" className="bg-[#161616]">All Statuses</option>
                  <option value="eligible" className="bg-[#161616]">Active / Eligible</option>
                  <option value="archived" className="bg-[#161616]">Archived</option>
                  <option value="disagreement" className="bg-[#161616]">Tier Disagreement</option>
                  <option value="high_error" className="bg-[#161616]">High Error (≥10)</option>
                  <option value="conf_high" className="bg-[#161616]">Confidence: High</option>
                  <option value="conf_medium" className="bg-[#161616]">Confidence: Medium</option>
                  <option value="conf_low" className="bg-[#161616]">Confidence: Low</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>

              {/* Adjustment Reason Filter */}
              <div className="relative">
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors max-w-[200px] truncate"
                >
                  <option value="all" className="bg-[#161616]">All Adjustment Reasons</option>
                  {reasonKeys.map((r) => (
                    <option key={r.key} value={r.key} className="bg-[#161616]">{r.label} ({getReasonCount(r.key)})</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>

              {uniqueHashes.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedHash}
                    onChange={(e) => setSelectedHash(e.target.value)}
                    className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors max-w-[150px] truncate"
                  >
                    <option value="all" className="bg-[#161616]">All Models</option>
                    {uniqueHashes.map((h) => (
                      <option key={h} value={h} className="bg-[#161616]">Hash: {h.substring(0, 8)}...</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                    <ChevronDown size={12} className="text-slate-400" />
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {(searchQuery || filterType !== "all" || selectedReason !== "all" || selectedHash !== "all") && (
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

        {/* Calibration List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] table-auto">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Evaluation
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Case
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Model HSS
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Expert HSS
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Error
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Tier Agreement
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Confidence
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Model Version
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Date
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <tr key={item} className="border-t border-white/5">
                    <td className="py-4 px-5"><Skeleton className="w-24 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-8 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-8 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-12 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-12 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-16 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5"><Skeleton className="w-12 h-4 bg-white/10" /></td>
                    <td className="py-4 px-5 text-right"><Skeleton className="w-16 h-7 ml-auto bg-white/10 rounded-xl" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-medium text-slate-400">
                        {logs.length === 0 ? "No calibration logs recorded yet." : "No evaluations match your filters."}
                      </p>
                      {logs.length > 0 && (
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
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-white/5 transition-colors group cursor-pointer ${log.status === "Archived" ? "opacity-50" : ""}`}
                    onClick={() => openModal(log)}
                  >
                    <td className="py-4 px-5 align-middle">
                      <p className="text-white font-bold text-xs font-mono mb-1">
                        {log.id}
                      </p>
                      {(() => {
                        const statusInfo = getCalibrationStatus(log);
                        return (
                          <span 
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border ${statusInfo.style}`}
                            title={statusInfo.tooltip}
                          >
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="text-slate-300 font-bold text-[10px] font-mono bg-[#21202E] border border-white/10 px-2 py-1 rounded-lg">
                        {log.case_id}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-xs font-bold text-white">
                      {log.ml_predicted_hss ?? "--"}
                    </td>
                    <td className="py-4 px-5 align-middle text-xs font-bold text-emerald-400">
                      {log.expert_hss_score}
                    </td>
                    <td className="py-4 px-5 align-middle text-xs font-semibold text-slate-300">
                      {log.absolute_error != null ? `${log.absolute_error} pts` : "--"}
                    </td>
                    <td className="py-4 px-5 align-middle text-xs font-semibold">
                      {log.tier_agreement ? (
                        <span className="text-emerald-400 font-bold">Yes</span>
                      ) : (
                        <span className="text-rose-400 font-bold">No</span>
                      )}
                    </td>
                    <td className="py-4 px-5 align-middle text-xs">
                      <span className="capitalize text-slate-300 font-medium">{log.reviewer_confidence || "Not recorded"}</span>
                    </td>
                    <td className="py-4 px-5 align-middle text-xs font-mono text-[#89899C] max-w-[100px] truncate" title={log.model_metadata?.model_hash}>
                      {log.model_metadata?.model_hash ? `${log.model_metadata.model_hash.substring(0, 8)}...` : "--"}
                    </td>
                    <td className="py-4 px-5 align-middle text-xs text-[#89899C] font-medium">
                      {new Date(log.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(log); }}
                        className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CalibrationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        activeLog={activeLog}
        onArchive={handleArchive}
      />
    </AdminLayout>
  );
};

export default Calibration;

