import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  HeartPulse,
  Utensils,
  WifiOff,
  User,
  ArrowRight,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import AlertTriageDrawer from "../../../components/modals/AlertTriageDrawer";

// Mock Data for Live Alert Feed
const initialAlerts = [
  {
    id: 1,
    alertId: "ALT-9921",
    timestamp: "May 28, 2026 15:42 PM",
    userId: "USR-A492",
    severity: "Critical",
    type: "Symptom Spike",
    message: "Severe chest pain and shortness of breath reported.",
    status: "Unresolved",
    triggerContext: {
      logId: "LOG-5521",
      data: "Pain Level: 8/10. Duration: >15 mins. Context: Resting.",
    },
    systemAction:
      "Activated Cardiologist Locator. Sent emergency protocol push notification to device.",
  },
  {
    id: 2,
    alertId: "ALT-9920",
    timestamp: "May 28, 2026 14:15 PM",
    userId: "USR-B118",
    severity: "Warning",
    type: "Dietary Threshold",
    message: "Daily sodium intake exceeded safe limit by 40%.",
    status: "Acknowledged",
    triggerContext: {
      logId: "LOG-5518",
      data: "Meal Logged: Instant Ramen (1,800mg Sodium). Daily Total: 3,200mg.",
    },
    systemAction:
      "Generated dietary warning prompt and suggested low-sodium dinner recipe.",
  },
  {
    id: 3,
    alertId: "ALT-9919",
    timestamp: "May 28, 2026 11:05 AM",
    userId: "SYSTEM",
    severity: "Info",
    type: "System Maintenance",
    message: "Open Food Facts API latency detected.",
    status: "Resolved",
    triggerContext: {
      logId: "SYS-092",
      data: "API Response Time: >3500ms. Endpoints affected: /v2/search",
    },
    systemAction: "Switched to local cached nutritional database fallback.",
  },
  {
    id: 4,
    alertId: "ALT-9918",
    timestamp: "May 27, 2026 19:30 PM",
    userId: "USR-C882",
    severity: "Critical",
    type: "Symptom Spike",
    message: "Dizziness accompanied by elevated resting heart rate.",
    status: "Escalated",
    triggerContext: {
      logId: "LOG-5490",
      data: "Symptom: Dizziness. Self-measured HR: 115 bpm resting.",
    },
    systemAction:
      "Flagged case for medical expert review. Halted high-intensity exercise recommendations.",
  },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  // Simulated Polling State
  const [lastSynced, setLastSynced] = useState("Just Now");

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);

  // Toggle this between "sysadmin" and "medical" to test the Triage Buttons
  const [userRole] = useState("sysadmin");

  // Simulate real-time polling updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSynced("Just Now");
      setTimeout(() => setLastSynced("5s ago"), 5000);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Open Drawer for Triage
  const openDrawer = (alert) => {
    setActiveAlert(alert);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setActiveAlert(null);
  };

  // Filter Logic
  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.alertId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.userId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || a.type === filterType;
    const matchesSeverity =
      filterSeverity === "all" || a.severity.toLowerCase() === filterSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  });

  const getTypeIcon = (type) => {
    if (type === "Symptom Spike")
      return <HeartPulse size={12} className="text-red-500" />;
    if (type === "Dietary Threshold")
      return <Utensils size={12} className="text-amber-600" />;
    return <WifiOff size={12} className="text-slate-600" />;
  };

  const getTypeBadgeStyles = (type) => {
    if (type === "Symptom Spike") return "bg-red-50 text-red-700 border-red-200";
    if (type === "Dietary Threshold") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
            Clinical Portal
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight leading-[1.1]">
            Real-Time Alert Feed
          </h2>
        </div>

        {/* Critical Feature: Auto-Refresh / Polling Indicator */}
        <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-lg shadow-sm">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">
            Live • Synced: {lastSynced}
          </span>
        </div>
      </div>

      {/* Main View: Live Alert Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by Alert ID or User ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900/5"
                >
                  <option value="all">All Types</option>
                  <option value="Symptom Spike">Symptom Spike</option>
                  <option value="Dietary Threshold">Dietary Threshold</option>
                  <option value="System Maintenance">System Maintenance</option>
                </select>
              </div>
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none appearance-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900/5"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed Table */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Trigger Timestamp
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  User ID
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  Alert Type
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/3">
                  Alert Message
                </th>
                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${alert.status === "Resolved" ? "opacity-60" : ""}`}
                  onClick={() => openDrawer(alert)}
                >
                  <td className="py-4 px-5 align-middle">
                    <p className="text-slate-900 font-semibold text-xs font-mono mb-0.5">
                      {alert.alertId}
                    </p>
                    <p className="text-slate-400 text-[10px] font-medium">
                      {alert.timestamp}
                    </p>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <User size={12} />
                      </div>
                      <span className="text-slate-700 text-xs font-mono font-semibold group-hover:text-slate-900 transition-colors">
                        {alert.userId}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full border tracking-[0.15em] uppercase ${getTypeBadgeStyles(alert.type)}`}
                    >
                      {getTypeIcon(alert.type)} {alert.type}
                    </span>
                  </td>
                  <td className="py-4 px-5 align-middle">
                    <p className="text-slate-800 text-xs font-medium truncate max-w-[280px]">
                      {alert.message}
                    </p>
                  </td>
                  <td className="py-4 px-5 align-middle text-right">
                    <button
                      className={`text-[11px] font-medium px-4 py-2 rounded-xl border flex items-center gap-1.5 ml-auto transition-all shadow-sm ${
                        alert.status === "Unresolved" ||
                        alert.status === "Escalated"
                          ? "bg-[#0f172a] border-[#0f172a] text-white hover:opacity-90 active:scale-[0.99]"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(alert);
                      }}
                    >
                      {alert.status === "Unresolved"
                        ? "Investigate"
                        : "View Details"}{" "}
                      <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertTriageDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        activeAlert={activeAlert}
        userRole={userRole}
      />
    </AdminLayout>
  );
};

export default Alerts;
