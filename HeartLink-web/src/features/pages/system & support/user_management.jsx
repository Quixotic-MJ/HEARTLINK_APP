import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Crown,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
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
        // HL-084: Premium counts only until its end date
        isPremium:
          r.plan === "premium" &&
          !!r.premium_until &&
          new Date(r.premium_until) > new Date(),
        premiumUntil: r.premium_until || null,
        premiumSource: r.premium_source || null,
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
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Saves through apiFetch refresh both lists by themselves; staff load for admins
  const patientsQuery = useApiQuery("/api/users/", { select: toPatients });
  const staffQuery = useApiQuery("/api/admin/staff", {
    select: (d) => d || NO_USERS,
    enabled: currentUserRole === "admin",
  });
  const appUsers = patientsQuery.data ?? NO_USERS;
  const systemStaff = staffQuery.data ?? NO_USERS;
  const refreshing = patientsQuery.isFetching || staffQuery.isFetching;
  const fetchUsers = () =>
    Promise.all([
      patientsQuery.refetch(),
      staffQuery.isEnabled && staffQuery.refetch(),
    ]);

  // A ?search= link (e.g. from a notification) fills the search box; noticed during render, not in an effect
  const searchParam = searchParams.get("search");
  const [seenSearchParam, setSeenSearchParam] = useState(null);
  if (searchParam !== seenSearchParam) {
    setSeenSearchParam(searchParam);
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }

  const clearSearch = () => {
    setSearchQuery("");
    if (searchParams.has("search")) {
      setSearchParams({});
    }
  };

  const handleOpenUser = (u) => {
    if (currentUserRole === "admin") {
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
      title: willDisable ? "Disable staff account?" : "Activate staff account?",
      subtitle: staff.name,
      description: willDisable
        ? "Disabling this staff member will immediately prevent them from signing in and performing administrative or clinical actions."
        : "Re-activating this account restores full access to their assigned staff permissions.",
      confirmText: willDisable ? "Disable account" : "Activate account",
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
          "Can be re-enabled at any time by an administrator.",
        ]
        : [
          "Sign-in credentials and access will be restored immediately.",
          "Assigned role privileges reactivated.",
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
      title: "Confirm role reassignment",
      subtitle: `${currentRole} → ${isTargetExpert ? "Expert Reviewer" : "System Admin"}`,
      description: `Reassigning permissions for ${staffObj?.name || "this staff member"}. Authorization boundaries update immediately.`,
      confirmText: "Update role",
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
          "Grants clinical case evaluation, meal plan, and exercise validation access.",
          "Revokes system configuration and administrative account provisioning rights.",
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
            `Role updated to ${isTargetExpert
              ? `Expert Reviewer (${reassignExpertType})`
              : "System Admin"
            }.`
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
      title: "Permanently delete staff account?",
      subtitle: staffName,
      description: `Are you sure you want to permanently delete the staff record for "${staffName}"? This action cannot be undone.`,
      confirmText: "Delete permanently",
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
  const requestDeleteUser = (targetUserId, userName) => {
    setConfirmConfig({
      isOpen: true,
      title: "Permanently delete patient account?",
      subtitle: userName,
      description: `Are you sure you want to permanently purge all data for "${userName}"? All patient telemetry, health scores, and records will be deleted.`,
      confirmText: "Delete patient record",
      variant: "danger",
      icon: Trash2,
      entityInfo: {
        name: userName,
        id: targetUserId,
        badge: "Patient",
      },
      impactDetails: [
        "All recorded heart vitals, symptom logs, and check-ins will be purged.",
        "Authentication identity and patient profile permanently removed.",
        "This operation cannot be reversed.",
      ],
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin/users/${targetUserId}`, {
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

  // HL-084: give a patient Premium for a number of days (testers, the panel), or remove it after a confirm
  const savePlan = async (entityId, premium, days) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/plan`, {
        method: "PUT",
        body: JSON.stringify(premium ? { premium: true, days } : { premium: false }),
      });
      toast.success(premium ? `Premium given for ${days} days.` : "Premium removed.");
      closeModal();
      closeConfirmModal();
    } catch (e) {
      toast.error(e.data?.detail || "Couldn't change the plan.");
    }
  };

  const handleChangePlan = (entity, premium, days) => {
    if (premium) return savePlan(entity.id, true, days);
    setConfirmConfig({
      isOpen: true,
      title: "Remove Premium?",
      subtitle: entity.name,
      description: `${entity.name} goes back to the free plan straight away. Their logs and safety features aren't affected.`,
      confirmText: "Remove Premium",
      variant: "danger",
      icon: Crown,
      entityInfo: { name: entity.name, id: entity.id, badge: "Patient" },
      impactDetails: [
        "Premium features stop working for this patient now.",
        "They can start Premium again from the mobile app.",
      ],
      onConfirm: () => savePlan(entity.id, false),
    });
  };

  // HL-058: an admin marks a medical expert as a verified clinician (their reviews then count in Model Check)
  const handleToggleClinician = async (staff) => {
    const verified = !staff.is_verified_clinician;
    try {
      await apiFetch(`/api/admin/staff/${staff.id}/clinician-verification`, {
        method: "PUT",
        body: JSON.stringify({ verified }),
      });
      toast.success(
        verified
          ? `${staff.name} is now a verified clinician.`
          : `Verification removed for ${staff.name}.`
      );
      setActiveEntity((prev) =>
        prev && prev.id === staff.id
          ? {
            ...prev,
            is_verified_clinician: verified,
            clinician_verified_at: verified ? new Date().toISOString() : null,
          }
          : prev
      );
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
      toast.success("Staff account provisioned", {
        description: `${staffData.name} has been enrolled as a ${isExpert ? "Medical Expert" : "System Admin"
          }.`,
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
    if (tab === "system_staff" && currentUserRole !== "admin") {
      toast.error("Access denied: Only admins can view or modify System Staff records.");
      return;
    }
    setActiveTab(tab);
    clearSearch();
  };

  const filteredUsers = appUsers.filter((u) => {
    const matchSearch =
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "premium"
        ? u.isPremium
        : filterStatus === "free"
          ? !u.isPremium
          : (u.status || "").toLowerCase() === filterStatus);
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <ShieldCheck size={13.5} className="text-cal-ink" />
              <span>User governance · Accounts &amp; permissions</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              User &amp; staff directory
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              Manage patient mobile access, Premium entitlements, staff provisioning, and clinician verification states.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-card transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh directory</span>
          </button>
        </div>

        {/* ─── 2. DIRECTORY MODE SWITCHER (CAL.COM NAV-PILL-GROUP) ──────────── */}
        <div
          role="tablist"
          aria-label="Directory section"
          className="relative inline-flex flex-wrap items-center gap-1 rounded-full border border-cal-hairline bg-cal-canvas p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] select-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "app_users"}
            onClick={() => handleTabSwitch("app_users")}
            className={`group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer select-none ${
              activeTab === "app_users"
                ? "text-white font-semibold"
                : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
            }`}
          >
            {activeTab === "app_users" && (
              <motion.div
                layoutId="user-dir-active-tab"
                className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                }}
              />
            )}
            <User size={14.5} className="relative z-10 shrink-0" />
            <span className="relative z-10">User accounts</span>
            <span
              className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums rounded-full px-2 py-0.5 transition-colors ${
                activeTab === "app_users"
                  ? "bg-white/20 text-white font-medium border border-white/20"
                  : "bg-cal-surface-card text-cal-muted-soft"
              }`}
            >
              {patientsQuery.isPending ? "—" : appUsers.length}
            </span>
          </button>

          {currentUserRole === "admin" && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "system_staff"}
              onClick={() => handleTabSwitch("system_staff")}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer select-none ${
                activeTab === "system_staff"
                  ? "text-white font-semibold"
                  : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
              }`}
            >
              {activeTab === "system_staff" && (
                <motion.div
                  layoutId="user-dir-active-tab"
                  className="absolute inset-0 rounded-full bg-cal-primary shadow-[0_1px_3px_rgba(59,130,246,0.35)]"
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34,
                  }}
                />
              )}
              <ShieldCheck size={14.5} className="relative z-10 shrink-0" />
              <span className="relative z-10">System staff</span>
              <span
                className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums rounded-full px-2 py-0.5 transition-colors ${
                  activeTab === "system_staff"
                    ? "bg-white/20 text-white font-medium border border-white/20"
                    : "bg-cal-surface-card text-cal-muted-soft"
                }`}
              >
                {staffQuery.isPending ? "—" : systemStaff.length}
              </span>
            </button>
          )}
        </div>

        {/* ─── 3. TAB CONTENT ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === "app_users" && (
            <motion.div
              key="app_users"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            >
              <UserListView
                users={filteredUsers}
                allUsers={appUsers}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClearSearch={clearSearch}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                onOpenUser={handleOpenUser}
                loading={patientsQuery.isPending}
                error={patientsQuery.isError}
                onRetry={fetchUsers}
              />
            </motion.div>
          )}

          {activeTab === "system_staff" && currentUserRole === "admin" && (
            <motion.div
              key="system_staff"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            >
              <StaffListView
                staffList={systemStaff}
                loading={staffQuery.isPending}
                error={staffQuery.isError}
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
          onChangePlan={handleChangePlan}
          canDelete={currentUserRole === "admin"}
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
              <label
                htmlFor="reassign-expert-specialization"
                className="mb-1.5 block text-[13px] font-semibold text-cal-ink"
              >
                Expert specialization <span className="text-cal-error">*</span>
              </label>
              <div className="relative">
                <select
                  id="reassign-expert-specialization"
                  value={reassignExpertType}
                  onChange={(e) => setReassignExpertType(e.target.value)}
                  className="h-10 w-full appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3.5 pr-9 text-[13.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none cursor-pointer"
                >
                  <option value="">Select specialization…</option>
                  <option value="Physical Therapist">Physical Therapist</option>
                  <option value="Dietitian">Dietitian</option>
                  <option value="Cardiologist">Cardiologist</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>
            </div>
          )}
        </ConfirmActionModal>
      </div>
    </AdminLayout>
  );
};

export default Users;
