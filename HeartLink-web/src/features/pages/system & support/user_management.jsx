import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useAuth } from "../../../contexts/AuthContext";
import AdminLayout from "../../../components/layouts/adminLayout";
import UserListView from "../../../components/lists/UserListView";
import { apiFetch } from "../../../api";
import StaffListView from "../../../components/lists/StaffListView";
import StaffDetailsModal from "../../../components/modals/StaffDetailsModal";
import StaffFormModal from "../../../components/modals/StaffFormModal";
import AccountActionModal from "../../../components/modals/AccountActionModal";

// Initial Mock Fallbacks
const initialAppUsers = [
  {
    id: "USR-A492",
    name: "Robert Villanueva",
    phone: "+63 917 123 4567",
    regDate: "Mar 12, 2026",
    status: "Active",
    metrics: { loginsThisWeek: 14, avgSession: "8m", alertsTriggered: 3 },
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
];

const Users = () => {
  const { user, userId } = useAuth();
  const currentUserRole = user?.role || (userId === "usr-super-admin-001" ? "super_admin" : (userId === "usr-chief-admin-001" ? "admin" : "medical_expert"));
  const [activeTab, setActiveTab] = useState("app_users");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [appUsers, setAppUsers] = useState([]);
  const [systemStaff, setSystemStaff] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [activeEntity, setActiveEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      
      const patientsData = await apiFetch("/api/users/");
      const mappedPatients = patientsData.filter(u => u.role === "patient").map((r) => {
        return {
          id: r.id,
          name: `${r.first_name} ${r.last_name}`,
          phone: r.phone || "",
          regDate: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
          status: r.account_status === "active" ? "Active" : "Disabled",
          onboardingStatus: r.onboarding_status,
          hssScore: r.hss_score,
          hssTier: r.hss_tier,
          activityStatus: r.activity_status,
          reviewStatus: r.review_status,
        };
      });
      setAppUsers(mappedPatients);

      if (currentUserRole === "super_admin") {
        try {
          const staffData = await apiFetch("/api/admin/staff");
          setSystemStaff(staffData);
        } catch (e) {
          console.error("Failed to fetch staff directory", e);
          setFetchError(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, [currentUserRole]);

  React.useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handleOpenUser = (user) => {
    if (currentUserRole === "admin" || currentUserRole === "super_admin") {
      setActiveEntity(user);
      setModalMode("view_app_user");
      setIsModalOpen(true);
    } else {
      navigate(`/users/${user.id}`);
    }
  };

  const handleOpenStaff = (staff) => {
    setActiveEntity(staff);
    setModalMode("view_staff");
    setIsModalOpen(true);
  };

  const handleCreateStaff = () => {
    setActiveEntity({
      name: "",
      email: "",
      phone: "",
      role: "Authorized Medical Expert",
    });
    setModalMode("create_staff");
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (staff) => {
    const isStaff = staff.role?.includes("Admin") || staff.role?.includes("Expert") || staff.db_role === "super_admin";
    let confirmMsg = "Change user status?";
    
    if (isStaff) {
      const isActive = (staff.account_status || staff.status)?.toLowerCase() === "active";
      if (isActive) {
        confirmMsg = "Disable this staff account?\n\nThe account will lose access to protected HeartLink administrative features.";
      } else {
        confirmMsg = "Enable this staff account?";
      }
    } else {
      confirmMsg = `Are you sure you want to ${staff.status === "Active" ? "disable" : "enable"} this user account?`;
    }
    
    if (window.confirm(confirmMsg)) {
      try {
        await apiFetch(`/api/admin/users/${staff.id}/status`, { method: "PUT" });
        alert("Account status updated successfully.");
        await fetchUsers();
        closeModal();
      } catch (e) {
        console.error("Failed to toggle status", e);
        alert(e.data?.detail || "Failed to change account status.");
      }
    }
  };

  const handleToggleAppUserStatus = async (entityId, reason) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/status`, { method: "PUT" });
      alert("User account status toggled successfully.");
      await fetchUsers();
      closeModal();
    } catch (e) {
      console.error("Failed to toggle user status", e);
      alert("Failed to change user status.");
    }
  };

  const handleChangeStaffRole = async (staffId, currentRole, newRoleLabel) => {
    const effectText = newRoleLabel === "Authorized Medical Expert"
      ? "Changing this account to Medical Expert will replace its current administrative permissions with expert-review permissions."
      : "Changing this account to System Admin will replace its current expert-review permissions with administrative permissions.";
      
    if (window.confirm(`Change role?\n\nCurrent Role: ${currentRole}\nNew Role: ${newRoleLabel}\n\n${effectText}`)) {
      try {
        await apiFetch(`/api/admin/staff/${staffId}/role`, {
          method: "PUT",
          body: JSON.stringify({ role: newRoleLabel })
        });
        alert("Staff role updated successfully.");
        await fetchUsers();
        closeModal();
      } catch (e) {
        console.error("Failed to change staff role", e);
        alert(e.data?.detail || "Failed to change staff role.");
      }
    }
  };

  const handleSaveStaff = async (staffData) => {
    try {
      await apiFetch(`/api/admin/staff`, {
        method: "POST",
        body: JSON.stringify(staffData)
      });
      const isExpert = staffData.role?.toLowerCase().includes("expert");
      alert(`${isExpert ? "Medical Expert" : "Admin"} account created.`);
      await fetchUsers();
      closeModal();
    } catch (e) {
      console.error("Failed to save staff", e);
      alert(e.data?.detail || "Failed to create staff member.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveEntity(null);
    setModalMode("");
  };

  const handleTabSwitch = (tab) => {
    if (tab === "system_staff" && currentUserRole !== "super_admin") {
      alert("Access Denied: Only a Super Admin can view or modify System Staff records.");
      return;
    }
    setActiveTab(tab);
    setSearchQuery("");
  };

  const filteredUsers = appUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" || u.status.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

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
          <User size={14} /> User Accounts
        </button>

        {currentUserRole === "super_admin" && (
          <button
            onClick={() => handleTabSwitch("system_staff")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === "system_staff"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck size={14} />
            System Staff
          </button>
        )}
      </div>

      {/* TAB 1: Users */}
      {activeTab === "app_users" && (
        <UserListView
          users={filteredUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          onOpenUser={handleOpenUser}
        />
      )}

      {/* TAB 2: Staff Accounts */}
      {activeTab === "system_staff" && currentUserRole === "super_admin" && (
        <StaffListView
          staffList={systemStaff}
          loading={loading}
          error={fetchError}
          onRetry={fetchUsers}
          onOpenStaff={handleOpenStaff}
          onCreateStaff={handleCreateStaff}
        />
      )}

      {/* User Account Actions Modal */}
      <AccountActionModal
        isOpen={isModalOpen && modalMode === "view_app_user"}
        onClose={closeModal}
        user={activeEntity}
        onToggleStatus={handleToggleAppUserStatus}
      />

      {/* Staff Detail View Modal */}
      <StaffDetailsModal
        isOpen={isModalOpen && modalMode === "view_staff"}
        onClose={closeModal}
        staff={activeEntity}
        currentUserRole={currentUserRole}
        currentUserId={userId}
        onToggleStatus={handleToggleStatus}
        onChangeRole={handleChangeStaffRole}
      />

      {/* Provision Staff Modal */}
      <StaffFormModal
        isOpen={isModalOpen && modalMode === "create_staff"}
        onClose={closeModal}
        staff={activeEntity}
        onSave={handleSaveStaff}
      />
    </AdminLayout>
  );
};

export default Users;
