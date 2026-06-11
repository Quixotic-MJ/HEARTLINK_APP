import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  User,
  ShieldCheck,
  ShieldAlert,
  Archive,
  Save,
  Activity,
  UserPlus,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  MoreVertical,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout"; 
import PatientListView from "../../../components/lists/PatientListView";
import PatientDetailsModal from "../../../components/modals/PatientDetailsModal";
import StaffListView from "../../../components/lists/StaffListView";
import StaffDetailsModal from "../../../components/modals/StaffDetailsModal";
import StaffFormModal from "../../../components/modals/StaffFormModal";

// Mock Data
const initialAppUsers = [
  {
    id: "USR-A492",
    name: "Robert Villanueva",
    phone: "+63 917 123 4567",
    regDate: "Mar 12, 2026",
    status: "Active",
    metrics: { loginsThisWeek: 14, avgSession: "8m", alertsTriggered: 3 },
  },
  {
    id: "USR-B118",
    name: "Elena Marasigan",
    phone: "+63 920 987 6543",
    regDate: "Feb 05, 2026",
    status: "Active",
    metrics: { loginsThisWeek: 21, avgSession: "12m", alertsTriggered: 1 },
  },
  {
    id: "USR-C882",
    name: "Miguel Santos",
    phone: "+63 919 111 2222",
    regDate: "Apr 20, 2026",
    status: "Disabled",
    metrics: { loginsThisWeek: 0, avgSession: "0m", alertsTriggered: 8 },
    deactivationReason:
      "Repeatedly ignored critical alerts. Account frozen pending medical review.",
  },
];

const initialSystemStaff = [
  {
    id: "MED-01",
    name: "Dr. Sarah Jenkins",
    phone: "+63 917 555 1234",
    role: "Authorized Medical Expert",
    permissions: ["Validate Recipes", "Verify Exercises", "Evaluate Cases"],
    status: "Active",
  },
  {
    id: "SYS-02",
    name: "Alex Reyes",
    phone: "+63 918 888 9999",
    role: "System Admin",
    permissions: ["Manage Content", "Broadcast Alerts", "View Analytics"],
    status: "Active",
  },
];

const Users = () => {
  const [currentUserRole, setCurrentUserRole] = useState("chief_admin");
  const [activeTab, setActiveTab] = useState("app_users");

  const [appUsers, setAppUsers] = useState(initialAppUsers);
  const [systemStaff, setSystemStaff] = useState(initialSystemStaff);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(""); 
  const [activeEntity, setActiveEntity] = useState(null);

  const [deactivationReason, setDeactivationReason] = useState("");

  const handleOpenUser = (user) => {
    setActiveEntity(user);
    setModalMode("view_user");
    setIsModalOpen(true);
  };

  const handleOpenStaff = (staff) => {
    setActiveEntity(staff);
    setModalMode("view_staff");
    setIsModalOpen(true);
  };

  const handleOpenDeactivate = () => {
    setDeactivationReason("");
    setModalMode("deactivate_user");
  };

  const handleCreateStaff = () => {
    setActiveEntity({
      name: "",
      phone: "",
      role: "System Admin",
      permissions: [],
    });
    setModalMode("create_staff");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveEntity(null);
    setModalMode("");
  };

  const handleTabSwitch = (tab) => {
    if (tab === "system_staff" && currentUserRole !== "chief_admin") {
      alert("Access Denied: Only a Chief Admin can view or modify System Staff records.");
      return;
    }
    setActiveTab(tab);
    setSearchQuery("");
  };

  const filteredUsers = appUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" || u.status.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredStaff = systemStaff.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const getStatusBadge = (status) => {
    if (status === "Active")
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <CheckCircle2 size={10} /> Active
        </span>
      );
    if (status === "Disabled")
      return (
        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
          <Ban size={10} /> Disabled
        </span>
      );
    return (
      <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1 w-fit">
        <Archive size={10} /> Archived
      </span>
    );
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400 mb-2">
            System Security
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight leading-[1.1]">
            Account <span className="text-[#0f172a]">Management.</span>
          </h2>
        </div>
      </div>

      {/* Segmented Control (Tabs) */}
      <div className="bg-white p-1.5 rounded-xl inline-flex flex-wrap shadow-sm border border-slate-200 mb-6 w-full sm:w-auto">
        <button
          onClick={() => handleTabSwitch("app_users")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeTab === "app_users"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <User size={14} /> High-Risk Individuals
        </button>

        <button
          onClick={() => handleTabSwitch("system_staff")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
            activeTab === "system_staff"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          } ${currentUserRole !== "chief_admin" ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {currentUserRole !== "chief_admin" ? (
            <Lock size={14} className="text-red-400" />
          ) : (
            <ShieldCheck size={14} />
          )}
          System Staff
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: HIGH-RISK INDIVIDUALS (APP USERS)  */}
      {/* ========================================= */}
      {activeTab === "app_users" && (
        <PatientListView
          patients={filteredUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          onOpenPatient={handleOpenUser}
        />
      )}

      {/* ========================================= */}
      {/* TAB 2: SYSTEM STAFF (ADMINS & EXPERTS)    */}
      {/* ========================================= */}
      {activeTab === "system_staff" && currentUserRole === "chief_admin" && (
        <StaffListView
          staffList={filteredStaff}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenStaff={handleOpenStaff}
          onCreateStaff={handleCreateStaff}
        />
      )}

      {/* Modular Patient Details Modal */}
      <PatientDetailsModal
        isOpen={isModalOpen && modalMode === "view_user"}
        onClose={closeModal}
        patient={activeEntity}
        onDeactivate={handleOpenDeactivate}
        onEnable={() => alert(`Mock: Successfully re-enabled account for ${activeEntity?.name}`)}
      />

      {/* Modular Staff Details Modal */}
      <StaffDetailsModal
        isOpen={isModalOpen && modalMode === "view_staff"}
        onClose={closeModal}
        staff={activeEntity}
        onEdit={() => setModalMode("edit_staff")}
        onRevoke={() => setModalMode("deactivate_user")}
        onRestore={() => alert(`Mock: Successfully restored access for ${activeEntity?.name}`)}
      />

      {/* Modular Staff Form Modal (Create/Edit) */}
      <StaffFormModal
        isOpen={isModalOpen && (modalMode === "create_staff" || modalMode === "edit_staff")}
        onClose={closeModal}
        isEditMode={modalMode === "edit_staff"}
        staff={activeEntity}
      />
    </AdminLayout>
  );
};

export default Users;
