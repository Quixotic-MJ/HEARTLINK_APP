import { useState } from "react";
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
import { useAuth } from "../../../contexts/useAuth";
import AdminLayout from "../../../components/layouts/adminLayout";
import UserListView from "../../../components/lists/UserListView";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import StaffListView from "../../../components/lists/StaffListView";
import StaffDetailsModal from "../../../components/modals/StaffDetailsModal";
import StaffFormModal from "../../../components/modals/StaffFormModal";
import AccountActionModal from "../../../components/modals/AccountActionModal";
import ConfirmActionModal from "../../../components/modals/ConfirmActionModal";
import TempPasswordModal from "../../../components/modals/TempPasswordModal";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader } from "../../../styles/designSystem";

// Patients as the directory shows them, from /api/users/ (HL-035: loaded through React Query)
const NO_USERS = [];
const toPatients = (patientsData) => {
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
        deactivationReason: r.deactivation_reason || "",
        onboardingStatus: r.onboarding_status,
        hssScore: r.hss_score,
        hssTier: r.hss_tier,
        activityStatus: r.activity_status,
        reviewStatus: r.review_status,
      };
    });
  return mappedPatients;
};

const Users = () => {
  const { user, userId } = useAuth();
  const currentUserRole = user?.role || "admin";
  const [activeTab, setActiveTab] = useState("app_users");
  const navigate = useNavigate();
  const [newStaffCredentials, setNewStaffCredentials] = useState(null);
  const [searchParams] = useSearchParams();


  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [activeEntity, setActiveEntity] = useState(null);
  const [reassignExpertType, setReassignExpertType] = useState("");

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

  // Saves through apiFetch refresh both lists by themselves; staff only load for a Super Admin
  const patientsQuery = useApiQuery("/api/users/", { select: toPatients });
  const staffQuery = useApiQuery("/api/admin/staff", {
    select: (d) => d || NO_USERS,
    enabled: currentUserRole === "super_admin",
  });
  const appUsers = patientsQuery.data ?? NO_USERS;
  const systemStaff = staffQuery.data ?? NO_USERS;
  const loading = patientsQuery.isPending || (staffQuery.isEnabled && staffQuery.isPending);
  const refreshing = patientsQuery.isFetching || staffQuery.isFetching;
  const fetchError = patientsQuery.isError || staffQuery.isError;
  const fetchUsers = () => Promise.all([patientsQuery.refetch(), staffQuery.isEnabled && staffQuery.refetch()]);

  // A ?search= link (e.g. from a notification) fills the search box; noticed during render, not in an effect
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== null && searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    setSearchQuery(searchParam);
  }

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

    setReassignExpertType("");

    setConfirmConfig({
      isOpen: true,
      title: "Confirm Role Reassignment",
      subtitle: `${currentRole} → ${isTargetExpert ? "Expert Reviewer" : "System Admin"}`,
      description: `Reassigning permissions for ${staffObj?.name || "this staff member"}. This modification updates authorization boundaries immediately.`,
      confirmText: "Update Role",
      variant: "warning",
      icon: ShieldAlert,
      isTargetExpert,
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
        if (isTargetExpert && (!reassignExpertType || !reassignExpertType.trim())) {
          toast.error("Please select an expert specialization.");
          throw new Error("Missing expert specialization");
        }
        try {
          const bodyPayload = { role: newRoleLabel };
          if (isTargetExpert) {
            bodyPayload.expert_type = reassignExpertType;
          }
          await apiFetch(`/api/admin/staff/${staffId}/role`, {
            method: "PUT",
            body: JSON.stringify(bodyPayload),
          });
          toast.success(
            `Role updated to ${isTargetExpert ? `Expert Reviewer (${reassignExpertType})` : "System Admin"}.`
          );
          closeModal();
          closeConfirmModal();
        } catch (e) {
          if (e.message !== "Missing expert specialization") {
            console.error("Failed to change staff role", e);
            toast.error(e.data?.detail || "Failed to update staff role.");
          }
          throw e;
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
  const requestDeleteUser = (userId, userName) => {
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
  // HL-073: the reason picked when disabling is saved and shown on the account until it is enabled again
  const handleToggleAppUserStatus = async (entityId, reason) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/status`, {
        method: "PUT",
        body: JSON.stringify(reason ? { reason } : {}),
      });
      toast.success("Patient account status updated successfully.");
      closeModal();
    } catch (e) {
      console.error("Failed to toggle user status", e);
      toast.error(e.data?.detail || "Failed to change user status.");
    }
  };

  // HL-058: Super Admin marks a medical expert as a verified clinician (their reviews then count in Model Check)
  const handleToggleClinician = async (staff) => {
    const verified = !staff.is_verified_clinician;
    try {
      await apiFetch(`/api/admin/staff/${staff.id}/clinician-verification`, {
        method: "PUT",
        body: JSON.stringify({ verified }),
      });
      toast.success(verified ? `${staff.name} is now a verified clinician.` : `Verification removed for ${staff.name}.`);
      setActiveEntity((prev) => (prev && prev.id === staff.id
        ? { ...prev, is_verified_clinician: verified, clinician_verified_at: verified ? new Date().toISOString() : null }
        : prev));
    } catch (e) {
      toast.error(e.data?.detail || "Couldn't update the clinician verification.");
    }
  };

  // 6. Save/Provision Staff Account
  const handleSaveStaff = async (staffData) => {
    try {
      const created = await apiFetch(`/api/admin/staff`, {
        method: "POST",
        body: JSON.stringify(staffData),
      });
      const isExpert = staffData.role?.toLowerCase().includes("expert");
      toast.success("Staff Account Provisioned Successfully", {
        description: `${staffData.name} has been enrolled as a ${isExpert ? "Medical Expert" : "System Admin"}.`,
      });
      closeModal();
      // HL-044: the one-time temporary password is only available in this response
      setNewStaffCredentials({
        name: staffData.name,
        email: staffData.email,
        password: created?.temp_password,
      });
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
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="User governance"
          eyebrowIcon={UsersIcon}
          title="User & staff directory"
          description="Manage patient health access, account authorization states, and medical review permissions."
          actions={
            <button
              onClick={fetchUsers}
              disabled={refreshing}
              className={UI.button.secondary}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-ds-primary" : ""} />
              <span>Refresh Directory</span>
            </button>
          }
        />

        {/* ── SEGMENTED TAB BUTTONS ── */}
        <div className="bg-ds-canvas p-1 rounded-xl inline-flex flex-wrap border border-ds-hairline mb-6 ">
          <button
            onClick={() => handleTabSwitch("app_users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-[7px] text-[12.5px] font-semibold transition-all cursor-pointer ${
              activeTab === "app_users" 
                ? "bg-ds-ink text-white " 
                : "text-ds-slate hover:text-ds-ink hover:bg-ds-surface"
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
                  ? "bg-ds-ink text-white " 
                  : "text-ds-slate hover:text-ds-ink hover:bg-ds-surface"
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
          onToggleClinician={handleToggleClinician}
        />

        {/* Provision Staff Modal */}
        <StaffFormModal
          isOpen={isModalOpen && modalMode === "create_staff"}
          onClose={closeModal}
          staff={activeEntity}
          onSave={handleSaveStaff}
        />

        {/* One-time temporary password for a new staff account */}
        <TempPasswordModal
          isOpen={!!newStaffCredentials?.password}
          onClose={() => setNewStaffCredentials(null)}
          staffName={newStaffCredentials?.name}
          staffEmail={newStaffCredentials?.email}
          password={newStaffCredentials?.password}
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
        >
          {confirmConfig.isTargetExpert && (
            <div className="my-4 text-left">
              <label className="block text-[13px] font-medium text-ds-ink mb-1.5">
                Expert Specialization <span className="text-ds-danger">*</span>
              </label>
              <select
                value={reassignExpertType}
                onChange={(e) => setReassignExpertType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[13px] font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline-strong focus:border-ds-line rounded-[8px] focus:outline-none cursor-pointer"
              >
                <option value="">Select Specialization...</option>
                <option value="Physical Therapist">Physical Therapist</option>
                <option value="Dietitian">Dietitian</option>
                <option value="Cardiologist">Cardiologist</option>
              </select>
            </div>
          )}
        </ConfirmActionModal>
      </div>
    </AdminLayout>
  );
};

export default Users;
