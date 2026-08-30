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
          bg: "bg-red-50",
          text: "text-red-600",
          icon: <Activity size={12} />,
          label: "CASE REVIEW",
        };
      case "staff":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          icon: <Shield size={12} />,
          label: "STAFF",
        };
      case "recipe":
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          icon: <Settings size={12} />,
          label: "RECIPE",
        };
      case "exercise":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          icon: <Activity size={12} />,
          label: "EXERCISE",
        };
      case "feedback":
        return {
          bg: "bg-amber-50",
          text: "text-amber-600",
          icon: <Headset size={12} />,
          label: "FEEDBACK",
        };
      case "broadcast":
        return {
          bg: "bg-amber-50",
          text: "text-amber-600",
          icon: <Headset size={12} />,
          label: "BROADCAST",
        };
      case "user":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          icon: <Shield size={12} />,
          label: "USER",
        };
      case "dataset":
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          icon: <Settings size={12} />,
          label: "DATASET",
        };
      default:
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          icon: <Activity size={12} />,
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
          <div className="h-3 bg-slate-200 rounded w-24"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-5 bg-slate-200 rounded-full w-20"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-3 bg-slate-200 rounded w-64"></div>
        </td>
        <td className="py-4 px-5 align-middle">
          <div className="h-6 bg-slate-200 rounded-lg w-24"></div>
        </td>
        <td className="py-4 px-5 align-middle text-right">
          <div className="h-3 bg-slate-200 rounded w-16 ml-auto"></div>
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
        Showing <span className="text-slate-900 font-semibold">{start}-{end}</span> of{" "}
        <span className="text-slate-900 font-semibold">{total}</span> events
      </>
    );
  };

  if (accessDenied) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
            <Shield size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
          <p className="text-slate-500 text-xs max-w-sm mb-6">
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
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <p className="text-[10px] font-medium text-slate-400 tracking-[0.22em] uppercase mb-2">
            ADMIN AUDIT TRAIL
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Admin Activity Log.
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Administrative actions performed in HeartLink.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export Audit CSV
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ backgroundColor: "#0f172a" }}
          >
            <CheckCircle size={14} /> Mark All as Read
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* 2. Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by User ID, keyword, or event..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 text-[11px] border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-all bg-white"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={eventTypeFilter}
                  onChange={handleFilterChange}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Categories</option>
                  <option value="recipe">Recipes</option>
                  <option value="exercise">Exercises</option>
                  <option value="case">Case Reviews</option>
                  <option value="staff">Staff</option>
                  <option value="feedback">Feedback</option>
                  <option value="broadcast">Broadcasts</option>
                  <option value="user">Users</option>
                  <option value="dataset">Datasets</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Retry Banner on Error */}
        {fetchError && (
          <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between text-red-700 text-xs font-medium">
            <span>Unable to load activity history.</span>
            <button
              onClick={() => {
                setFetchError(false);
                setRetryCount((prev) => prev + 1);
              }}
              className="px-3 py-1 bg-white border border-red-200 rounded-lg text-red-700 hover:bg-red-50 active:scale-95 transition-all font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* 3. The Data Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Timestamp
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Event Type
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-2/5">
                  Details
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Associated User
                </th>
                <th className="py-3 px-5 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-50 transition-opacity duration-200 ${loading && !showSkeleton ? "opacity-60" : "opacity-100"}`}>
              {showSkeleton && renderSkeletons()}

              {isEmpty && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50/20">
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
                    className="hover:bg-slate-50/60 transition-colors group cursor-default"
                  >
                    <td className="py-4 px-5 align-middle">
                      <span className="text-xs font-medium text-slate-700">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider ${badge.bg} ${badge.text}`}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <p className="text-xs text-slate-900 leading-relaxed font-medium">
                        {formatDetails(log)}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Shield size={11} className="text-slate-400" />
                        {log.admin_name || log.admin_user_id || "System"}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500 font-medium">
            {getPaginationText()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                page <= 1 || loading
                  ? "text-slate-400 bg-white border-slate-200 cursor-not-allowed opacity-50"
                  : "text-slate-600 bg-white border-slate-200 hover:text-slate-900 hover:bg-slate-50 active:scale-95"
              }`}
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                page >= totalPages || loading
                  ? "text-slate-400 bg-white border-slate-200 cursor-not-allowed opacity-50"
                  : "text-slate-600 bg-white border-slate-200 hover:text-slate-900 hover:bg-slate-50 active:scale-95"
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
