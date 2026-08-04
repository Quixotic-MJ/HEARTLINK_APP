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
  const [filterStatus, setFilterStatus] = useState("all");

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

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.case_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      log.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Calculate Chart Data
  // We want to show the trend of Error Margin over time
  const chartData = logs
    .filter(log => log.ml_predicted_css != null && log.expert_css_score != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((log, index) => {
      const errorMargin = Math.abs(log.expert_css_score - log.ml_predicted_css);
      return {
        name: `Eval ${index + 1}`,
        error: errorMargin,
        expert: log.expert_css_score,
        ml: log.ml_predicted_css,
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
            CLINICAL PORTAL
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Calibration History.
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
             onClick={handleRetrain}
             disabled={isRetraining}
             className="flex items-center gap-1.5 text-white font-medium text-[11px] px-5 py-2.5 rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50" 
             style={{ backgroundColor: "#0f172a" }}>
             <Activity size={14} strokeWidth={2.5} className={isRetraining ? "animate-spin" : ""} /> 
             {isRetraining ? "Retraining Model..." : "Retrain Model from Feedback"}
           </button>
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
                Tracks the absolute difference between the ML-predicted CSS and the expert's ground-truth CSS over time.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mt-4">
               <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5"><Activity size={14}/> Goal:</p>
               <p className="text-[11px] text-emerald-700 mt-1">As more expert evaluations are applied to the algorithm, the error margin should trend towards zero.</p>
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
            <div className="flex gap-2.5">
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
                  EXPERT SCORE
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  REVIEWER
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
              {loading ? (
                 <tr>
                   <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
                     Loading evaluations...
                   </td>
                 </tr>
               ) : filteredLogs.length === 0 ? (
                 <tr>
                   <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
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
                    <p className="text-slate-500 text-[10px] font-medium">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span className="text-slate-600 font-semibold text-[10px] font-mono bg-slate-100 px-2 py-1 rounded-md">
                      {log.case_id}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                      {log.expert_css_score} <span className="text-[10px] text-slate-400 font-normal ml-1">(vs {log.ml_predicted_css ?? "--"})</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <UserCircle size={14} />
                      </div>
                      <span className="text-slate-700 text-[11px] font-medium">
                        {log.reviewer_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="py-4 px-5 align-middle text-right">
                    <button
                      className="text-[10px] font-medium px-4 py-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(log);
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
