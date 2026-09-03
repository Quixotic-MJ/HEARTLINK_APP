import React, { useState, useEffect } from "react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { apiFetch } from "../../../api";
import {
  Search,
  Activity,
  Shield,
  Headset,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  Clock,
  ChevronDown,
  Utensils,
  Dumbbell,
  Radio,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import { UI, FONTS, PageHeader } from "../../../styles/designSystem";

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

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setEventTypeFilter("all");
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
          bg: "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]",
          icon: <Activity size={10} />,
          label: "CASE REVIEW",
        };
      case "staff":
        return {
          bg: "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]",
          icon: <Shield size={10} />,
          label: "STAFF",
        };
      case "recipe":
        return {
          bg: "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]",
          icon: <Utensils size={10} />,
          label: "RECIPE",
        };
      case "exercise":
        return {
          bg: "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]",
          icon: <Dumbbell size={10} />,
          label: "EXERCISE",
        };
      case "feedback":
        return {
          bg: "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]",
          icon: <Headset size={10} />,
          label: "FEEDBACK",
        };
      case "broadcast":
        return {
          bg: "bg-[#FBEAE6] text-[#E8532E] border-[#F5C7BD]",
          icon: <Radio size={10} />,
          label: "BROADCAST",
        };
      case "user":
        return {
          bg: "bg-[#EDF1EF] text-[#152131] border-[#DCE3DF]",
          icon: <Shield size={10} />,
          label: "USER",
        };
      case "dataset":
        return {
          bg: "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]",
          icon: <FileSpreadsheet size={10} />,
          label: "DATASET",
        };
      default:
        return {
          bg: "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF]",
          icon: <Activity size={10} />,
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
    return Array.from({ length: 6 }).map((_, idx) => (
      <tr key={`sk-${idx}`}>
        <td className="py-3.5 px-5 align-middle">
          <Skeleton className="h-4 bg-[#DCE3DF]/70 rounded w-28" />
        </td>
        <td className="py-3.5 px-5 align-middle">
          <Skeleton className="h-5 bg-[#DCE3DF]/70 rounded-full w-24" />
        </td>
        <td className="py-3.5 px-5 align-middle">
          <Skeleton className="h-4 bg-[#DCE3DF]/70 rounded w-64" />
        </td>
        <td className="py-3.5 px-5 align-middle">
          <Skeleton className="h-6 bg-[#DCE3DF]/70 rounded-[6px] w-28" />
        </td>
        <td className="py-3.5 px-5 align-middle text-right">
          <Skeleton className="h-4 bg-[#DCE3DF]/70 rounded w-16 ml-auto" />
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
        Showing <span className="text-[#152131] font-bold">{start}–{end}</span> of{" "}
        <span className="text-[#152131] font-bold">{total}</span> events
      </>
    );
  };

  if (accessDenied) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="w-14 h-14 bg-[#F7E4E1] text-[#A93226] rounded-2xl flex items-center justify-center mb-3 border border-[#F0C4B8]">
            <Shield size={28} />
          </div>
          <h3 
            className="text-[20px] font-medium text-[#152131] mb-1"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Access Denied
          </h3>
          <p className="text-[#5C6B66] text-[13px] max-w-sm mb-6">
            You do not have the required permissions to view the system audit activity logs. Only authorized administrators are allowed.
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
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Audit trail"
          eyebrowIcon={Activity}
          title="System activity audit log"
          description="Immutable clinical and administrative audit trail of all platform activities and modifications."
          actions={
            <div className="flex items-center gap-2.5">
              <button className={UI.button.secondary}>
                <Download size={13} /> <span>Export audit CSV</span>
              </button>
              <button className={UI.button.primary}>
                <CheckCircle size={13} /> <span>Mark all as read</span>
              </button>
            </div>
          }
        />

        {/* ── MAIN CARD: AUDIT LOG TABLE ── */}
        <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] flex flex-col overflow-hidden shadow-2xs">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-[#DCE3DF] bg-[#FFFFFF]">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893] pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search by User ID, keyword, or action…"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
                />
              </div>
              <div className="flex gap-2.5 items-center">
                <div className="relative">
                  <select
                    value={eventTypeFilter}
                    onChange={handleFilterChange}
                    className="pl-3 pr-7 py-2 text-[12px] font-semibold text-[#152131] bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] appearance-none cursor-pointer hover:border-[#8B9893] transition-colors"
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <ChevronDown size={12} className="text-[#8B9893]" />
                  </div>
                </div>

                {isSearchOrFilterApplied && (
                  <button
                    onClick={handleClearFilters}
                    className="text-[11px] text-[#A93226] font-semibold px-3 py-2 rounded-[8px] border border-[#F0C4B8] bg-[#F7E4E1] hover:bg-[#F0C4B8] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Retry Banner on Error */}
          {fetchError && (
            <div className="p-3 mx-4 my-3 bg-[#F7E4E1] border border-[#F0C4B8] rounded-[8px] flex items-center justify-between text-[#A93226] text-[12px] font-medium">
              <span>Unable to load activity history.</span>
              <button
                onClick={() => {
                  setFetchError(false);
                  setRetryCount((prev) => prev + 1);
                }}
                className="px-3 py-1 bg-[#A93226] hover:bg-[#8A1F1A] text-white rounded-[6px] transition-colors font-bold text-[10.5px] uppercase tracking-wider cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Timestamp
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Event Type
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] w-2/5">
                    Activity Details
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em]">
                    Associated Admin
                  </th>
                  <th className="py-3 px-4 sm:px-5 text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-[0.1em] text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-[#DCE3DF] ${loading && !showSkeleton ? "opacity-60" : "opacity-100"}`}>
                {showSkeleton && renderSkeletons()}

                {isEmpty && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[13px] text-[#5C6B66] font-medium">
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
                      className="hover:bg-[#EDF1EF]/60 transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-[12px] font-mono font-medium text-[#5C6B66]">
                          {formatTimestamp(log.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[9px] font-bold tracking-wider uppercase border ${badge.bg}`}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p className="text-[13px] text-[#152131] leading-relaxed font-semibold">
                          {formatDetails(log)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono font-bold text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2 py-0.5 rounded-[5px]">
                          <Shield size={11} className="text-[#E8532E]" />
                          {log.admin_name || log.admin_user_id || "System"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right">
                        <span className="text-[9px] font-bold text-[#1B6E63] bg-[#E3EFEC] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                          Logged
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[12px] text-[#5C6B66] font-medium">
              {getPaginationText()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] transition-colors cursor-pointer ${
                  page <= 1 || loading
                    ? "text-[#8B9893] cursor-not-allowed opacity-40"
                    : "text-[#152131] hover:bg-[#DCE3DF]"
                }`}
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] transition-colors cursor-pointer ${
                  page >= totalPages || loading
                    ? "text-[#8B9893] cursor-not-allowed opacity-40"
                    : "text-[#152131] hover:bg-[#DCE3DF]"
                }`}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;
