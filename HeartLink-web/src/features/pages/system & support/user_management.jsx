import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Users as UsersIcon,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import AdminLayout from "../../../components/layouts/adminLayout";
import UserListView from "../../../components/lists/UserListView";
import { apiFetch } from "../../../api";
import StaffListView from "../../../components/lists/StaffListView";
import StaffDetailsModal from "../../../components/modals/StaffDetailsModal";
import StaffFormModal from "../../../components/modals/StaffFormModal";
import AccountActionModal from "../../../components/modals/AccountActionModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";

const Users = () => {
  const { user, userId } = useAuth();
  const currentUserRole = user?.role || "admin";
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

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: null,
    entityInfo: null,
    impactDetails: [],
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setFetchError(false);

      const patientsData = await apiFetch("/api/users/");
      const mappedPatients = (patientsData || [])
        .filter((u) => u.role === "patient")
        .map((r) => {
          return {
            id: r.id,
            name:
              `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
              "Anonymized Patient",
            phone: r.phone || "",
            regDate: r.created_at
              ? new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })
              : "N/A",
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
          setSystemStaff(staffData || []);
        } catch (e) {
          console.error("Failed to fetch staff directory", e);
          setFetchError(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      setFetchError(true);
      toast.error("Failed to load user directory");
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

  const handleOpenUser = (u) => {
    if (currentUserRole === "admin" || currentUserRole === "super_admin") {
      setActiveEntity(u);
      setModalMode("view_app_user");
      setIsModalOpen(true);
    } else {
      navigate(`/users/${u.id}`);
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

  // 1. Staff Status Toggle (with confirmation)
  const requestToggleStaffStatus = (staff) => {
    const isActive =
      (staff.account_status || staff.status)?.toLowerCase() === "active";
    const willDisable = isActive;

    setConfirmConfig({
      isOpen: true,
      title: willDisable ? "Disable Staff Account" : "Activate Staff Account",
      subtitle: staff.name,
      description: willDisable
        ? "Disabling this staff member will immediately prevent them from logging in and executing administrative actions."
        : "Re-activating this account will restore full access to their designated staff role features.",
      confirmText: willDisable ? "Disable Account" : "Activate Account",
      variant: willDisable ? "warning" : "success",
      icon: willDisable ? Ban : CheckCircle2,
      entityInfo: {
        name: staff.name,
        email: staff.email,
        badge: staff.role,
        id: staff.id,
      },
      impactDetails: willDisable
        ? [
            "Active session tokens will be invalidated.",
            "Account status set to inactive.",
            "Can be re-enabled at any time by a Super Admin.",
          ]
        : [
            "User credentials and login access will be immediately restored.",
            "Role privileges reactivated.",
          ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/users/${staff.id}/status`, {
            method: "PUT",
          });
          toast.success(
            `Staff account ${willDisable ? "disabled" : "activated"} successfully.`
          );
          await fetchUsers();
          closeModal();
          closeConfirmModal();
        } catch (e) {
          console.error("Failed to toggle staff status", e);
          toast.error(e.data?.detail || "Failed to update staff status.");
        }
      },
    });
  };

  // 2. Staff Role Change (with confirmation)
  const requestChangeStaffRole = (staffId, currentRole, newRoleLabel, staffObj) => {
    const isTargetExpert =
      newRoleLabel.includes("Expert") || newRoleLabel === "Authorized Medical Expert";

    setConfirmConfig({
      isOpen: true,
      title: "Confirm Role Reassignment",
      subtitle: `${currentRole} → ${isTargetExpert ? "Expert Reviewer" : "System Admin"}`,
      description: `Reassigning permissions for ${staffObj?.name || "this staff member"}. This modification updates authorization boundaries immediately.`,
      confirmText: "Update Role",
      variant: "warning",
      icon: ShieldAlert,
      entityInfo: {
        name: staffObj?.name || "Staff Member",
        email: staffObj?.email,
        badge: currentRole,
        id: staffId,
      },
      impactDetails: isTargetExpert
        ? [
            "Grants clinical case evaluation, meal plan and exercise validation access.",
            "Revokes system configuration & administrative account provisioning rights.",
          ]
        : [
            "Grants system administration, audit log visibility, and support permissions.",
            "Removes direct clinical decision signing.",
          ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/staff/${staffId}/role`, {
            method: "PUT",
            body: JSON.stringify({ role: newRoleLabel }),
          });
          toast.success(
            `Role updated to ${isTargetExpert ? "Expert Reviewer" : "System Admin"}.`
          );
          await fetchUsers();
          closeModal();
          closeConfirmModal();
        } catch (e) {
          console.error("Failed to change staff role", e);
          toast.error(e.data?.detail || "Failed to update staff role.");
        }
      },
    });
  };

  // 3. Delete Staff Account (with confirmation)
  const requestDeleteStaff = (staffId, staffName, staffObj) => {
    setConfirmConfig({
      isOpen: true,
      title: "Permanently Delete Staff Account",
      subtitle: staffName,
      description: `Are you sure you want to permanently delete the staff record for "${staffName}"? This action is permanent and cannot be undone.`,
      confirmText: "Delete Permanently",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: staffName,
        email: staffObj?.email,
        badge: staffObj?.role,
        id: staffId,
      },
      impactDetails: [
        "Staff profile and administrative access credentials will be permanently erased.",
        "Active authentication tokens will be immediately destroyed.",
        "Action is logged for compliance and security auditing.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/staff/${staffId}`, {
            method: "DELETE",
          });
          toast.success(`Staff account for ${staffName} permanently deleted.`);
          await fetchUsers();
          closeModal();
          closeConfirmModal();
        } catch (e) {
          console.error("Failed to delete staff", e);
          toast.error(e.data?.detail || "Failed to delete staff account.");
        }
      },
    });
  };

  // 4. Delete Patient Account (with confirmation)
  const requestDeleteUser = (userId, userName, userObj) => {
    setConfirmConfig({
      isOpen: true,
      title: "Permanently Delete Patient Account",
      subtitle: userName,
      description: `Are you sure you want to permanently purge all data for "${userName}"? All patient telemetry, health scores, and records will be deleted.`,
      confirmText: "Delete Patient Record",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: userName,
        id: userId,
        badge: "Patient",
      },
      impactDetails: [
        "All recorded heart vitals, symptom logs, and ECG snapshots will be purged.",
        "Supabase Auth identity and patient profile permanently removed.",
        "This operation cannot be reversed.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          });
          toast.success(`Patient record for ${userName} has been purged.`);
          await fetchUsers();
          closeModal();
          closeConfirmModal();
        } catch (e) {
          console.error("Failed to delete user", e);
          toast.error(e.data?.detail || "Failed to delete user record.");
        }
      },
    });
  };

  // 5. Patient Account Status Toggle (Direct from AccountActionModal)
  const handleToggleAppUserStatus = async (entityId, reason) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/status`, { method: "PUT" });
      toast.success("Patient account status updated successfully.");
      await fetchUsers();
      closeModal();
    } catch (e) {
      console.error("Failed to toggle user status", e);
      toast.error(e.data?.detail || "Failed to change user status.");
    }
  };

  // 6. Save/Provision Staff Account
  const handleSaveStaff = async (staffData) => {
    try {
      await apiFetch(`/api/admin/staff`, {
        method: "POST",
        body: JSON.stringify(staffData),
      });
      const isExpert = staffData.role?.toLowerCase().includes("expert");
      toast.success("Staff Account Provisioned Successfully", {
        description: `${staffData.name} has been enrolled as a ${isExpert ? "Medical Expert" : "System Admin"} (Default Password: TempPass2026!).`,
      });
      await fetchUsers();
      closeModal();
    } catch (e) {
      console.error("Failed to save staff", e);
      toast.error(e.data?.detail || "Failed to provision staff member.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveEntity(null);
    setModalMode("");
  };

  const handleTabSwitch = (tab) => {
    if (tab === "system_staff" && currentUserRole !== "super_admin") {
      toast.error("Access Denied: Only a Super Admin can view or modify System Staff records.");
      return;
    }
    setActiveTab(tab);
    setSearchQuery("");
  };

  const filteredUsers = appUsers.filter((u) => {
    const matchSearch =
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" || (u.status || "").toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── PAGE HEAD ── */}
        <div className="flex flex-wrap gap-4 justify-between items-end mb-6">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5">
              <UsersIcon size={13} className="text-[#E8532E]" /> User governance
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              User & staff directory
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]">
              Manage patient health access, account authorization states, and medical review permissions.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 bg-[#FFFFFF] hover:bg-[#EDF1EF] text-[#152131] border border-[#DCE3DF] px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#E8532E]" : ""} />
            <span>Refresh Directory</span>
          </button>
        </div>

        {/* ── SEGMENTED TAB BUTTONS ── */}
        <div className="bg-[#FFFFFF] p-1 rounded-[10px] inline-flex flex-wrap border border-[#DCE3DF] mb-6 shadow-2xs">
          <button
            onClick={() => handleTabSwitch("app_users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-all cursor-pointer ${
              activeTab === "app_users" 
                ? "bg-[#E8532E] text-white shadow-2xs" 
                : "text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF]"
            }`}
          >
            <User size={14} />
            <span>User accounts ({appUsers.length})</span>
          </button>

          {currentUserRole === "super_admin" && (
            <button
              onClick={() => handleTabSwitch("system_staff")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-all cursor-pointer ${
                activeTab === "system_staff" 
                  ? "bg-[#E8532E] text-white shadow-2xs" 
                  : "text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF]"
              }`}
            >
              <ShieldCheck size={14} />
              <span>System staff ({systemStaff.length})</span>
            </button>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          {activeTab === "app_users" && (
            <motion.div
              key="tab_users"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <UserListView
                users={filteredUsers}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                onOpenUser={handleOpenUser}
                loading={loading}
              />
            </motion.div>
          )}

          {activeTab === "system_staff" && currentUserRole === "super_admin" && (
            <motion.div
              key="tab_staff"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <StaffListView
                staffList={systemStaff}
                loading={loading}
                error={fetchError}
                onRetry={fetchUsers}
                onOpenStaff={handleOpenStaff}
                onCreateStaff={handleCreateStaff}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Account Actions Modal */}
        <AccountActionModal
          isOpen={isModalOpen && modalMode === "view_app_user"}
          onClose={closeModal}
          user={activeEntity}
          onToggleStatus={handleToggleAppUserStatus}
          canDelete={currentUserRole === "super_admin"}
          onDeleteUser={requestDeleteUser}
        />

        {/* Staff Detail View Modal */}
        <StaffDetailsModal
          isOpen={isModalOpen && modalMode === "view_staff"}
          onClose={closeModal}
          staff={activeEntity}
          currentUserRole={currentUserRole}
          currentUserId={userId}
          onToggleStatus={requestToggleStaffStatus}
          onChangeRole={requestChangeStaffRole}
          onDeleteStaff={requestDeleteStaff}
        />

        {/* Provision Staff Modal */}
        <StaffFormModal
          isOpen={isModalOpen && modalMode === "create_staff"}
          onClose={closeModal}
          staff={activeEntity}
          onSave={handleSaveStaff}
        />

        {/* Reusable Confirmation Modal */}
        <ConfirmActionModal
          isOpen={confirmConfig.isOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          subtitle={confirmConfig.subtitle}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          variant={confirmConfig.variant}
          icon={confirmConfig.icon}
          entityInfo={confirmConfig.entityInfo}
          impactDetails={confirmConfig.impactDetails}
        />
      </div>
    </AdminLayout>
  );
};

export default Users;
