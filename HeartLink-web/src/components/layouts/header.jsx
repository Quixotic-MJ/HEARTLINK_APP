import React, { useState } from "react";
import {
  Menu,
  Search,
  Activity,
  Bell,
  Zap,
  ChevronDown,
  LogOut,
  Utensils,
  BellRing,
  FileText,
  Stethoscope,
  Download,
  UserPlus,
  Dumbbell,
} from "lucide-react";
import { Link } from "react-router-dom";

// ─── Quick action item ────────────────────────────────────────────────────────

function ActionItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
      style={{ fontSize: 12, color: "rgba(15,23,42,0.7)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <Icon size={13} style={{ color: "#0f172a", flexShrink: 0 }} strokeWidth={1.8} />
      {label}
    </button>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = ({ 
  setSidebarOpen, 
  title = "Dashboard",
  openBroadcastModal,
  openStaffDrawer,
  openRecipeDrawer,
  openExerciseDrawer
}) => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [unreadAlerts] = useState(12);
  const [userRole] = useState("sysadmin");

  const handleAnalyticsExport = () => {
    alert("Export downloaded");
    setQuickActionsOpen(false);
  };

  const handleLogExport = () => {
    alert("Logs downloaded securely");
    setQuickActionsOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between flex-shrink-0 px-5 sm:px-6 rounded-none"
      style={{
        height: 64,
        backgroundColor: "#fff",
        borderBottom: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <button
          className="lg:hidden p-2 rounded-xl transition-colors"
          style={{ color: "rgba(15,23,42,0.5)", backgroundColor: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={17} />
        </button>

        {/* Page title */}
        <h1
          className="hidden lg:block text-[15px] font-medium tracking-tight"
          style={{ color: "#0f172a" }}
        >
          {title}
        </h1>

        {/* Search */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 transition-all"
          style={{
            height: 36,
            backgroundColor: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.08)",
            width: 240,
          }}
        >
          <Search size={13} style={{ color: "rgba(15,23,42,0.3)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search patients, logs…"
            className="bg-transparent border-none outline-none w-full"
            style={{ fontSize: 13, color: "#0f172a" }}
          />
        </div>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2.5">

        {/* Quick actions */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="flex items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-all"
            style={{
              height: 36,
              backgroundColor: "#0f172a",
              color: "#fff",
              fontSize: 12,
            }}
          >
            <Zap size={13} strokeWidth={2.5} />
            <span>Quick actions</span>
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              style={{
                transition: "transform 0.2s",
                transform: quickActionsOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {quickActionsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickActionsOpen(false)} />
              <div
                className="absolute right-0 mt-2 z-50 py-1.5 rounded-2xl overflow-hidden"
                style={{
                  width: 200,
                  backgroundColor: "#fff",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
                }}
              >
                {userRole === "sysadmin" ? (
                  <>
                    <p
                      className="px-4 pt-1.5 pb-2.5 text-[9px] tracking-[0.18em] uppercase font-semibold"
                      style={{ color: "rgba(15,23,42,0.35)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}
                    >
                      SYSTEM ACTIONS
                    </p>
                    <ActionItem icon={BellRing} label="Send broadcast alert" onClick={() => { openBroadcastModal?.(); setQuickActionsOpen(false); }} />
                    <ActionItem icon={UserPlus} label="Provision staff account" onClick={() => { openStaffDrawer?.(); setQuickActionsOpen(false); }} />
                    <ActionItem icon={Download} label="Export analytics CSV" onClick={handleAnalyticsExport} />
                  </>
                ) : (
                  <>
                    <p
                      className="px-4 pt-1.5 pb-2.5 text-[9px] tracking-[0.18em] uppercase font-semibold"
                      style={{ color: "rgba(15,23,42,0.35)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}
                    >
                      CLINICAL & CONTENT
                    </p>
                    <ActionItem icon={Utensils} label="Add healthy recipe" onClick={() => { openRecipeDrawer?.(); setQuickActionsOpen(false); }} />
                    <ActionItem icon={Dumbbell} label="Add physical activity" onClick={() => { openExerciseDrawer?.(); setQuickActionsOpen(false); }} />
                    <ActionItem icon={FileText} label="Export clinical logs" onClick={handleLogExport} />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* System status */}
        <div
          className="hidden lg:flex items-center gap-3 rounded-xl px-3"
          style={{
            height: 36,
            backgroundColor: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div>
            <p className="text-[11px] font-medium leading-tight" style={{ color: "#0f172a" }}>
              System status
            </p>
            <p className="text-[8px] tracking-widest uppercase leading-tight mt-0.5" style={{ color: "rgba(15,23,42,0.35)" }}>
              Live monitoring
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <Activity size={13} strokeWidth={2} style={{ color: "rgba(15,23,42,0.4)" }} />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5" style={{ backgroundColor: "rgba(15,23,42,0.08)" }} />

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center rounded-xl transition-colors"
          style={{
            width: 36, height: 36,
            backgroundColor: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.08)",
            color: "rgba(15,23,42,0.5)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,23,42,0.5)")}
        >
          <Bell size={16} />
          {unreadAlerts > 0 && (
            <div
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full border-2 border-white"
              style={{
                minWidth: 16, height: 16,
                backgroundColor: "#ef4444",
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                paddingLeft: 3,
                paddingRight: 3,
              }}
            >
              {unreadAlerts > 99 ? "99+" : unreadAlerts}
            </div>
          )}
        </button>

        {/* Sign out */}
        <Link to="/">
          <button
            className="flex items-center justify-center rounded-xl transition-colors"
            style={{
              width: 36, height: 36,
              backgroundColor: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
              color: "rgba(15,23,42,0.4)",
            }}
            title="Sign out"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fef2f2";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
              e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)";
              e.currentTarget.style.color = "rgba(15,23,42,0.4)";
            }}
          >
            <LogOut size={15} strokeWidth={2} />
          </button>
        </Link>
      </div>
    </header>
  );
};

export default Header;