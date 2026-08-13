import React, { useState } from "react";
import AdminLayout from "../../../components/layouts/adminLayout";
import PatientDetailsModal from "../../../components/modals/PatientDetailsModal";
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

// Mock Data
const initialLogs = [
  {
    id: "LOG-1029",
    timestamp: "Jun 13, 2026, 10:15 AM",
    type: "critical",
    details: "Patient USR-A492 HSS dropped below safe threshold (45).",
    user: "USR-A492",
    status: "Unread",
  },
  {
    id: "LOG-1028",
    timestamp: "Jun 13, 2026, 09:42 AM",
    type: "security",
    details: "Multiple failed login attempts from IP 192.168.1.45.",
    user: "SYS-ADMIN",
    status: "Resolved",
  },
  {
    id: "LOG-1027",
    timestamp: "Jun 13, 2026, 08:30 AM",
    type: "system",
    details: "Automated nightly database backup completed successfully.",
    user: "SYSTEM",
    status: "Resolved",
  },
  {
    id: "LOG-1026",
    timestamp: "Jun 12, 2026, 04:15 PM",
    type: "support",
    details: "New support ticket FB-1043 created by med-expert.",
    user: "MED-EXP01",
    status: "Unread",
  },
  {
    id: "LOG-1025",
    timestamp: "Jun 12, 2026, 02:20 PM",
    type: "critical",
    details: "Patient USR-B711 missed 3 consecutive medication doses.",
    user: "USR-B711",
    status: "Resolved",
  },
];

const ActivityLog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("24h");
  const [selectedAuditUser, setSelectedAuditUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const handleOpenUser = (userId) => {
    setSelectedAuditUser({
      id: userId,
      name: `User ${userId}`,
      status: "Active",
      metrics: {
        loginsThisWeek: Math.floor(Math.random() * 20) + 1,
        avgSession: `${Math.floor(Math.random() * 30) + 5} mins`,
        alertsTriggered: Math.floor(Math.random() * 5),
      }
    });
    setIsUserModalOpen(true);
  };

  const getEventBadge = (type) => {
    switch (type) {
      case "critical":
        return {
          bg: "bg-red-50",
          text: "text-red-600",
          icon: <Activity size={12} />,
          label: "CRITICAL ALERT",
        };
      case "security":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          icon: <Shield size={12} />,
          label: "SECURITY",
        };
      case "system":
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          icon: <Settings size={12} />,
          label: "SYSTEM",
        };
      case "support":
        return {
          bg: "bg-amber-50",
          text: "text-amber-600",
          icon: <Headset size={12} />,
          label: "SUPPORT",
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

  return (
    <AdminLayout>
      {/* 1. Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <p className="text-[10px] font-medium text-slate-400 tracking-[0.22em] uppercase mb-2">
            SYSTEM AUDIT
          </p>
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Activity & Notifications Log.
          </h2>
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Events</option>
                  <option value="critical">Clinical Alerts</option>
                  <option value="security">Security</option>
                  <option value="support">Support</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="relative">
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-4 pr-8 py-2 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

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
            <tbody className="divide-y divide-slate-50">
              {initialLogs.map((log) => {
                const badge = getEventBadge(log.type);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 transition-colors group cursor-default"
                  >
                    <td className="py-4 px-5 align-middle">
                      <span className="text-xs font-medium text-slate-700">
                        {log.timestamp}
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
                      <p className="text-xs text-slate-900 leading-relaxed">
                        {log.details}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <button 
                        onClick={() => handleOpenUser(log.user)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
                      >
                        {log.user} <ExternalLink size={10} />
                      </button>
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <span
                        className={`text-[10px] font-medium ${
                          log.status === "Resolved"
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {log.status}
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
            Showing <span className="text-slate-900 font-semibold">1-5</span> of <span className="text-slate-900 font-semibold">245</span> events
          </p>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-not-allowed opacity-50">
              <ChevronLeft size={12} /> Previous
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors">
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      <PatientDetailsModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        patient={selectedAuditUser}
        onDeactivate={() => {}}
        onEnable={() => {}}
      />
    </AdminLayout>
  );
};

export default ActivityLog;
