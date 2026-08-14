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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import AdminLayout from "../../../components/layouts/adminLayout";
import CalibrationModal from "../../../components/modals/CalibrationModal";

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

  const handleRetrain = async () => {
    try {
      setIsRetraining(true);
      setRetrainMetrics(null);
      const res = await apiFetch("/api/admin/retrain", { method: "POST" });
      if (res && res.metrics) {
        setRetrainMetrics(res.metrics);
        fetchLogs(); // refresh statuses
      }
    } catch (e) {
      console.error("Retrain failed", e);
      alert("Model retraining failed. Check console for details.");
    } finally {
      setIsRetraining(false);
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
        body: JSON.stringify({ allow_mixed_models: true })
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

  // Filter Logic
  const uniqueHashes = Array.from(new Set(
    logs
      .map(log => log.model_metadata?.model_hash)
      .filter(Boolean)
  ));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.case_id.toLowerCase().includes(searchQuery.toLowerCase());
      
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
  const eligibleLogs = logs.filter(log => {
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
    ? ((eligibleLogs.filter(log => log.tier_agreement).length / eligibleCount) * 100).toFixed(1)
    : "0.0";
    
  const highErrorCount = eligibleLogs.filter(log => (log.absolute_error || 0) >= 10).length;

  const reasonKeys = [
    { key: "blood_pressure_pattern", label: "Blood pressure pattern" },
    { key: "heart_rate_pattern", label: "Heart-rate pattern" },
    { key: "symptoms", label: "Symptoms" },
    { key: "medication_related_factor", label: "Medication-related factor" },
    { key: "activity_pattern", label: "Activity pattern" },
    { key: "nutrition_sodium_pattern", label: "Nutrition / sodium pattern" },
    { key: "sleep_pattern", label: "Sleep pattern" },
    { key: "baseline_information", label: "Baseline information" }
  ];

  const getReasonCount = (reasonKey) => {
    return eligibleLogs.filter(log => log.adjustment_reasons && log.adjustment_reasons.includes(reasonKey)).length;
  };

  const getCalibrationStatus = (log) => {
    if (log.status === "Archived") {
      return {
        label: "Archived",
        style: "bg-slate-100 text-slate-600 border-slate-200",
        tooltip: "Evaluation archived and excluded from dataset compilation."
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
        style: "bg-emerald-50 text-emerald-700 border-emerald-100",
        tooltip: "Evaluation is fully eligible for calibration analysis."
      };
    }
    
    const missingSnapshot = !log.input_snapshot?.model_features || Object.keys(log.input_snapshot.model_features).length === 0;
    if (missingSnapshot) {
      return {
        label: "Incomplete",
        style: "bg-amber-50 text-amber-700 border-amber-100",
        tooltip: "Evaluation is incomplete: missing model features snapshot."
      };
    }
    
    return {
      label: "Excluded",
      style: "bg-rose-50 text-rose-700 border-rose-100",
      tooltip: "Evaluation excluded: missing required expert scores or predictions."
    };
  };

  // Calculate Chart Data
  // We want to show the trend of Error Margin over time
  const chartData = logs
    .filter(log => log.ml_predicted_hss != null && log.expert_hss_score != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((log, index) => {
      const errorMargin = Math.abs(log.expert_hss_score - log.ml_predicted_hss);
      return {
        name: `Eval ${index + 1}`,
        error: errorMargin,
        expert: log.expert_hss_score,
        ml: log.ml_predicted_hss,
        date: new Date(log.created_at).toLocaleDateString()
      };
    });



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
            EXPERT REVIEW
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Model Calibration.
          </h2>
        </div>

        {/* Critical Feature: Export Dataset & Retrain Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
           {retrainMetrics && (
             <div className="text-[10px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 size={14} /> 
                <span>Model Retrained! MAE: <strong>{retrainMetrics.mae}</strong> | R²: <strong>{retrainMetrics.r2}</strong> | Samples: <strong>{retrainMetrics.sample_count}</strong></span>
             </div>
           )}
           <button
             onClick={handleExportDataset}
             disabled={isExporting}
             className="flex items-center gap-2 bg-slate-900 text-white border border-slate-900 px-4 py-2.5 rounded-xl text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
           >
             {isExporting ? "Compiling..." : "Generate Calibration Dataset"}
           </button>
           <div className="flex flex-col gap-1 items-start max-w-xs bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-600">
             <div className="flex items-center gap-1.5 text-[11px] font-semibold">
               <Lock size={12} className="text-slate-400" />
               <span>Model retraining is performed offline.</span>
             </div>
             <p className="text-[9px] text-slate-400 leading-normal">
               Current expert evaluations are used for calibration analysis. A compatible labeled training dataset is required before the production model can be retrained.
             </p>
           </div>
        </div>
      </div>

      {/* Calibration Summary Statistics (Compact Banners) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Eligible Evaluations</span>
          <div className="text-xl font-bold text-slate-800">{eligibleCount}</div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Active calibration samples</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Average Absolute Error</span>
          <div className="text-xl font-bold text-slate-800">{averageError} <span className="text-xs font-normal text-slate-500">pts</span></div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Mean expert vs ML delta</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tier Agreement</span>
          <div className="text-xl font-bold text-slate-800">{tierAgreementRate}%</div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Category matching rate</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">High-Error Cases</span>
          <div className="text-xl font-bold text-red-600">{highErrorCount}</div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Error ≥ 10 points</span>
        </div>
      </div>

      {/* Model Accuracy Dashboard */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">MODEL ACCURACY TREND</p>
              <h3 className="text-lg font-bold text-slate-900">Absolute Error Margin</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Tracks the absolute difference between the ML-predicted HSS and the expert's ground-truth HSS over time.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mt-4">
               <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5"><Activity size={14}/> Goal:</p>
               <p className="text-[11px] text-emerald-700 mt-1">As more expert evaluations are applied to the algorithm, the error margin should trend towards zero.</p>
            </div>

            {/* Production Model Details */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Production Model</span>
              <div className="space-y-1.5 text-[10px] text-slate-700">
                <div><span className="text-slate-400">Identifier:</span> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">heartlink_model.pkl</code></div>
                <div><span className="text-slate-400">Pipeline Version:</span> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">v1.0</code></div>
                <div><span className="text-slate-400">Binary Hash:</span> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px]">d6b9f2...</code></div>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-2/3 h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  name="Error Margin"
                  stroke="#0f172a" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                  activeDot={{ r: 6, fill: "#0f172a", stroke: "#fff", strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap gap-2.5">
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="eligible">Active / Eligible</option>
                  <option value="archived">Archived</option>
                  <option value="disagreement">Tier Disagreement</option>
                  <option value="high_error">High Absolute Error (≥10)</option>
                  <option value="conf_high">Confidence: High</option>
                  <option value="conf_medium">Confidence: Medium</option>
                  <option value="conf_low">Confidence: Low</option>
                </select>
              </div>

              {/* Adjustment Reason Filter */}
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors max-w-[200px] truncate"
                >
                  <option value="all">All Adjustment Reasons</option>
                  {reasonKeys.map(r => (
                    <option key={r.key} value={r.key}>{r.label} ({getReasonCount(r.key)})</option>
                  ))}
                </select>
              </div>

              {uniqueHashes.length > 0 && (
                <div className="relative">
                  <Filter
                    size={12}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={selectedHash}
                    onChange={(e) => setSelectedHash(e.target.value)}
                    className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors max-w-[150px] truncate"
                  >
                    <option value="all">All Models</option>
                    {uniqueHashes.map(h => (
                      <option key={h} value={h}>Hash: {h.substring(0, 8)}...</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calibration List Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  EVALUATION
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CASE
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  MODEL HSS
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  EXPERT HSS
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  ERROR
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  TIER AGREEMENT
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  CONFIDENCE
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  MODEL VERSION
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  DATE
                </th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr>
                   <td colSpan="10" className="py-8 text-center text-slate-500 text-sm">
                     Loading evaluations...
                   </td>
                 </tr>
               ) : filteredLogs.length === 0 ? (
                 <tr>
                   <td colSpan="10" className="py-8 text-center text-slate-500 text-sm">
                     No evaluations found.
                   </td>
                 </tr>
               ) : filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50/60 transition-colors group cursor-pointer ${log.status === "Archived" ? "opacity-60" : ""}`}
                  onClick={() => openModal(log)}
                >
                  <td className="py-4 px-5 align-middle">
                    <p className="text-slate-900 font-semibold text-[11px] font-mono mb-1">
                      {log.id}
                    </p>
                    {(() => {
                      const statusInfo = getCalibrationStatus(log);
                      return (
                        <span 
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${statusInfo.style}`}
                          title={statusInfo.tooltip}
                        >
                          {statusInfo.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="text-slate-600 font-semibold text-[10px] font-mono bg-slate-100 px-2 py-1 rounded-md">
                      {log.case_id}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] font-semibold text-slate-700">
                    {log.ml_predicted_hss ?? "--"}
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] font-semibold text-slate-700">
                    {log.expert_hss_score}
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] font-semibold text-slate-600">
                    {log.absolute_error != null ? `${log.absolute_error} pts` : "--"}
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] font-semibold">
                    {log.tier_agreement ? (
                      <span className="text-emerald-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-rose-600 font-medium">No</span>
                    )}
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px]">
                    <span className="capitalize text-slate-600 font-medium">{log.reviewer_confidence || "Not recorded"}</span>
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] font-mono text-slate-500 max-w-[100px] truncate" title={log.model_metadata?.model_hash}>
                    {log.model_metadata?.model_hash ? `${log.model_metadata.model_hash.substring(0, 8)}...` : "--"}
                  </td>
                  <td className="py-4 px-5 align-middle text-[11px] text-slate-500">
                    {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-4 px-5 align-middle text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(log); }}
                      className="text-[10px] font-medium px-4 py-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
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
