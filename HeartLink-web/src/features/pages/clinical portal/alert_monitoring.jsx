import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  AlertTriangle,
  HeartPulse,
  Utensils,
  WifiOff,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  Activity,
  FileText,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/AdminLayout"; // Adjust path based on your structure

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

  // UI Helpers
  const getSeverityStyles = (severity) => {
    if (severity === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (severity === "Warning")
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-blue-50 text-[#1e4ed8] border-blue-100";
  };

  const getTypeIcon = (type) => {
    if (type === "Symptom Spike")
      return <HeartPulse size={12} className="text-red-500" />;
    if (type === "Dietary Threshold")
      return <Utensils size={12} className="text-yellow-600" />;
    return <WifiOff size={12} className="text-[#1e4ed8]" />;
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Live Monitoring
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Real-Time <span className="text-[#1e4ed8]">Alert Feed.</span>
          </h2>
        </div>

        {/* Critical Feature: Auto-Refresh / Polling Indicator */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg shadow-sm">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </div>
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
            Live • Synced: {lastSynced}
          </span>
        </div>
      </div>

      {/* Main View: Live Alert Data Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-50 bg-[#f8fafc]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by Alert ID or User ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2.5">
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                >
                  <option value="all">All Types</option>
                  <option value="Symptom Spike">Symptom Spike</option>
                  <option value="Dietary Threshold">Dietary Threshold</option>
                  <option value="System Maintenance">System Maintenance</option>
                </select>
              </div>
              <div className="relative">
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
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
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Trigger Timestamp
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  User ID
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  Alert Type
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/3">
                  Alert Message
                </th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={`hover:bg-[#f8fafc] transition-colors group cursor-pointer ${alert.status === "Resolved" ? "opacity-60" : ""}`}
                  onClick={() => openDrawer(alert)}
                >
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-900 font-bold text-[11px] font-mono mb-0.5">
                      {alert.alertId}
                    </p>
                    <p className="text-gray-500 text-[9px] font-medium">
                      {alert.timestamp}
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-400" />
                      <span className="text-gray-700 text-[11px] font-mono font-bold hover:text-[#1e4ed8] transition-colors">
                        {alert.userId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest uppercase ${getSeverityStyles(alert.severity)}`}
                    >
                      {getTypeIcon(alert.type)} {alert.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <p className="text-gray-800 text-[11px] font-medium truncate max-w-[250px]">
                      {alert.message}
                    </p>
                  </td>
                  <td className="py-3 px-4 align-middle text-right">
                    <button
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1 ml-auto transition-colors shadow-sm ${
                        alert.status === "Unresolved" ||
                        alert.status === "Escalated"
                          ? "bg-[#1e4ed8] border-blue-700 text-white hover:bg-[#113296]"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer(alert);
                      }}
                    >
                      {alert.status === "Unresolved"
                        ? "Investigate"
                        : "View Details"}{" "}
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* SLIDE-OUT DRAWER: Alert Triage View       */}
      {/* ========================================= */}
      {isDrawerOpen && activeAlert && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-[#f8fafc] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activeAlert.severity === "Critical"
                      ? "bg-red-50 text-red-600"
                      : activeAlert.severity === "Warning"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-blue-50 text-[#1e4ed8]"
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 font-mono">
                    {activeAlert.alertId}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border tracking-widest uppercase ${getSeverityStyles(activeAlert.severity)}`}
                    >
                      {activeAlert.severity}
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium flex items-center gap-1">
                    <Clock size={10} /> {activeAlert.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 p-1.5 rounded-md border border-gray-200 shadow-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    Triage Status
                  </p>
                  <p
                    className={`text-[11px] font-bold ${
                      activeAlert.status === "Resolved"
                        ? "text-green-600"
                        : activeAlert.status === "Escalated"
                          ? "text-red-600"
                          : "text-[#1e4ed8]"
                    }`}
                  >
                    {activeAlert.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                    Affected Entity
                  </p>
                  <a
                    href="#"
                    className="text-[11px] font-bold text-gray-900 font-mono hover:text-[#1e4ed8] flex items-center gap-1 transition-colors"
                  >
                    {activeAlert.userId} <ArrowRight size={10} />
                  </a>
                </div>
              </div>

              {/* Alert Context Display: The Trigger Event */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> The Trigger Event
                </h4>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Alert Message
                    </p>
                    <p className="text-[11px] font-bold text-gray-900">
                      {activeAlert.message}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50/50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <FileText size={10} /> Source Log:{" "}
                      <span className="font-mono text-gray-600">
                        {activeAlert.triggerContext.logId}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-800 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-gray-200 mt-2">
                      {activeAlert.triggerContext.data}
                    </p>
                  </div>
                </div>
              </div>

              {/* System Action Taken */}
              <div>
                <h4 className="text-[10px] font-bold text-[#1e4ed8] uppercase tracking-widest border-b border-blue-100 pb-1.5 mb-3 flex items-center gap-1.5">
                  <Activity size={12} /> System Action Taken
                </h4>
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 shadow-inner">
                  <p className="text-[11px] font-medium text-gray-800 leading-relaxed">
                    {activeAlert.systemAction}
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Footer / Role-Dependent Actions */}
            <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
              {userRole === "sysadmin" ? (
                /* System Admin Controls */
                <div className="flex flex-col gap-2.5">
                  <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
                    <ShieldAlert size={14} /> Escalate to Medical Expert
                  </button>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm">
                      Acknowledge Alert
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-[#1e4ed8] hover:bg-[#113296] rounded-lg transition-colors shadow-sm shadow-blue-900/20">
                      <CheckCircle2 size={14} /> Mark as Resolved
                    </button>
                  </div>
                </div>
              ) : (
                /* Medical Expert Controls */
                <div className="flex flex-col gap-2.5">
                  <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 border border-red-700 rounded-lg transition-colors shadow-sm shadow-red-900/20">
                    <Stethoscope size={14} /> Trigger Emergency Check-up
                    Suggestion
                  </button>
                  <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm">
                    <CheckCircle2 size={14} /> Mark as Clinically Resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Alerts;
