import React, { useState, useEffect } from "react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";
import {
  Search,
  Filter,
  Activity,
  Shield,
  Settings,
  Headset,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  Clock,
  ChevronDown,
  Sparkles,
  Utensils,
  Dumbbell,
  Radio,
  FileSpreadsheet,
} from "lucide-react";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounce search query to reduce API hits
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search or filter changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (e) => {
    setEventTypeFilter(e.target.value);
    setPage(1);
  };

  // Fetch log events from API
  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let url = `/api/admin/activity?page=${page}&page_size=${pageSize}`;
        if (debouncedSearch && debouncedSearch.trim()) {
          url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
        }
        if (eventTypeFilter && eventTypeFilter !== "all") {
          url += `&target_type=${eventTypeFilter}`;
        }

        const data = await apiFetch(url);
        if (active) {
          setLogs(data.items || []);
          setTotal(data.total || 0);
          setTotalPages(data.total_pages || 0);
          setFetchError(false);
          setAccessDenied(false);
        }
      } catch (err) {
        console.error("Failed to load activity logs:", err);
        if (active) {
          if (err.status === 403) {
            setAccessDenied(true);
          } else {
            setFetchError(true);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchLogs();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, eventTypeFilter, retryCount]);

  const getEventBadge = (type) => {
    const formattedType = type ? type.toLowerCase() : "";
    switch (formattedType) {
      case "case":
        return {
          bg: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
          icon: <Activity size={11} />,
          label: "CASE REVIEW",
        };
      case "staff":
        return {
          bg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
          icon: <Shield size={11} />,
          label: "STAFF",
        };
      case "recipe":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          icon: <Utensils size={11} />,
          label: "RECIPE",
        };
      case "exercise":
        return {
          bg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          icon: <Dumbbell size={11} />,
          label: "EXERCISE",
        };
      case "feedback":
        return {
          bg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          icon: <Headset size={11} />,
          label: "FEEDBACK",
        };
      case "broadcast":
        return {
          bg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          icon: <Radio size={11} />,
          label: "BROADCAST",
        };
      case "user":
        return {
          bg: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
          icon: <Shield size={11} />,
          label: "USER",
        };
      case "dataset":
        return {
          bg: "bg-white/5 text-slate-300 border border-white/10",
          icon: <FileSpreadsheet size={11} />,
          label: "DATASET",
        };
      default:
        return {
          bg: "bg-white/5 text-slate-300 border border-white/10",
          icon: <Activity size={11} />,
          label: "GENERAL",
        };
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDetails = (log) => {
    const actionStr = log.action ? log.action.charAt(0).toUpperCase() + log.action.slice(1) : "";
    const typeStr = log.target_type ? log.target_type : "";
    const nameStr = log.target_name || log.target_id || "";
    if (nameStr) {
      return `${actionStr} ${typeStr}: ${nameStr}`;
    }
    return `${actionStr} ${typeStr}`;
  };

  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={`sk-${idx}`} className="animate-pulse">
        <td className="py-4 px-5 align-middle">
          <div className="h-3.5 bg-white/10 rounded w-28"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-5 bg-white/10 rounded-full w-24"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-3.5 bg-white/10 rounded w-64"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-6 bg-white/10 rounded-xl w-28"></div>
        </td>
        <td className="py-4 px-5 align-middle text-right">
          <div className="h-4 bg-white/10 rounded-md w-16 ml-auto"></div>
        </td>
      </tr>
    ));
  };

  const getPaginationText = () => {
    if (total === 0) return "Showing 0 of 0 events";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (
      <>
        Showing <span className="text-white font-bold">{start}-{end}</span> of{" "}
        <span className="text-white font-bold">{total}</span> events
      </>
    );
  };

  if (accessDenied) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/20">
            <Shield size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Access Denied</h3>
          <p className="text-[#89899C] text-xs max-w-sm mb-6">
            You do not have the required permissions to view the system audit activity logs. Only administrators are allowed.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const showSkeleton = loading && logs.length === 0;
  const isEmpty = !loading && !fetchError && logs.length === 0;
  const isSearchOrFilterApplied = debouncedSearch.trim() !== "" || eventTypeFilter !== "all";

  return (
    <AdminLayout>
      {/* 1. Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4 animate-in fade-in duration-300">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
            <Activity size={11} />
            <span>Audit Trail</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
            Admin Activity Log
          </h2>
          <p className="text-[#89899C] text-xs mt-1 font-medium">
            Immutable clinical and administrative audit trail of all platform activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 hover:border-white/20 rounded-xl transition-colors shadow-sm cursor-pointer">
            <Download size={14} /> Export Audit CSV
          </button>
          <button
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer"
          >
            <CheckCircle size={14} /> Mark All as Read
          </button>
        </div>
      </div>

      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden animate-in fade-in duration-300">
        {/* 2. Search & Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-[#161616]">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by User ID, keyword, or event..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-4 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={eventTypeFilter}
                  onChange={handleFilterChange}
                  className="pl-3 pr-8 py-2 text-xs font-semibold text-white bg-[#1A1A1A] border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] appearance-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="all" className="bg-[#161616]">All Categories</option>
                  <option value="recipe" className="bg-[#161616]">Recipes</option>
                  <option value="exercise" className="bg-[#161616]">Exercises</option>
                  <option value="case" className="bg-[#161616]">Case Reviews</option>
                  <option value="staff" className="bg-[#161616]">Staff</option>
                  <option value="feedback" className="bg-[#161616]">Feedback</option>
                  <option value="broadcast" className="bg-[#161616]">Broadcasts</option>
                  <option value="user" className="bg-[#161616]">Users</option>
                  <option value="dataset" className="bg-[#161616]">Datasets</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5">
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Retry Banner on Error */}
        {fetchError && (
          <div className="p-3 mx-4 my-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-xs font-medium">
            <span>Unable to load activity history.</span>
            <button
              onClick={() => {
                setFetchError(false);
                setRetryCount((prev) => prev + 1);
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-bold text-[10px] uppercase tracking-wider cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 3. The Data Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Timestamp
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Event Type
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-2/5">
                  Details
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">
                  Associated User
                </th>
                <th className="py-3 px-5 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-white/5 transition-opacity duration-200 ${loading && !showSkeleton ? "opacity-60" : "opacity-100"}`}>
              {showSkeleton && renderSkeletons()}

              {isEmpty && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                    {isSearchOrFilterApplied
                      ? "No activity matches your filters."
                      : "No administrative activity recorded."}
                  </td>
                </tr>
              )}

              {!showSkeleton && logs.map((log) => {
                const badge = getEventBadge(log.target_type);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 transition-colors group cursor-default"
                  >
                    <td className="py-4 px-5 align-middle">
                      <span className="text-xs font-mono font-medium text-[#89899C]">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${badge.bg}`}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <p className="text-xs text-white leading-relaxed font-semibold">
                        {formatDetails(log)}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 bg-[#21202E] border border-white/10 px-2.5 py-1 rounded-xl">
                        <Shield size={11} className="text-[#E55F37]" />
                        {log.admin_name || log.admin_user_id || "System"}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Logged
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        <div className="p-4 border-t border-white/10 bg-[#161616] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#89899C] font-medium">
            {getPaginationText()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/10 bg-[#21202E] transition-all cursor-pointer ${
                page <= 1 || loading
                  ? "text-slate-500 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:text-white hover:border-white/20 active:scale-95"
              }`}
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-white/10 bg-[#21202E] transition-all cursor-pointer ${
                page >= totalPages || loading
                  ? "text-slate-500 cursor-not-allowed opacity-40"
                  : "text-slate-300 hover:text-white hover:border-white/20 active:scale-95"
              }`}
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;

