import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../../contexts/useAuth.js";
import AdminLayout from "../../components/layouts/adminLayout.jsx";
import UserListView from "./components/userListView.jsx";
import { apiFetch } from "../../lib/api.js";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import StaffListView from "./components/staffListView.jsx";
import StaffDetailsModal from "./components/staffDetailsModal.jsx";
import StaffFormModal from "./components/staffFormModal.jsx";
import AccountActionModal from "./components/accountActionModal.jsx";
import ConfirmActionModal from "../../components/modals/confirmActionModal.jsx";
import TempPasswordModal from "./components/tempPasswordModal.jsx";
import { WorkspaceHeader } from "../../components/ui/workspaceHeader.jsx";
import { QueryProgress } from "../../components/ui/queryProgress.jsx";
import { UI } from "../../styles/tokens.js";
import "./accounts.css";

// Only account-support fields are returned by the Admin-only directory.
const NO_USERS = [];
const toPatients = (patientsData) => {
  const mappedPatients = (patientsData || [])
    .filter((u) => u.role === "patient")
    .map((r) => {
      return {
        id: r.id,
        name:
          `${r.first_name || ""} ${r.last_name || ""}`.trim() || "App account",
        phone: r.phone || "",
        regDate: r.created_at
          ? new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
              timeZone: "Asia/Manila",
            })
          : "N/A",
        status:
          { active: "Active", disabled: "Disabled", archived: "Archived" }[
            r.account_status
          ] || "Unknown",
        deactivationReason: r.deactivation_reason || "",
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
  const reducedMotion = useReducedMotion();
  const { user, userId } = useAuth();
  const currentUserRole = user?.role;
  const [activeTab, setActiveTab] = useState("app_users");
  const [newStaffCredentials, setNewStaffCredentials] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [activeEntity, setActiveEntity] = useState(null);
  const [reassignExpertType, setReassignExpertType] = useState("");
  const reassignExpertTypeRef = useRef("");

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
    closeModal();
    const isActive =
      (staff.account_status || staff.status)?.toLowerCase() === "active";
    const willDisable = isActive;

    setConfirmConfig({
      isOpen: true,
      title: willDisable ? "Disable staff account?" : "Activate staff account?",
      subtitle: staff.name,
      description: willDisable
        ? "Disabling this staff member will immediately prevent them from signing in and performing assigned workspace actions."
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
            "Privileged requests are denied while this account is disabled.",
            "Account status is set to disabled.",
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
            `Staff account ${willDisable ? "disabled" : "activated"} successfully.`,
          );
          closeModal();
          closeConfirmModal();
        } catch (e) {
          console.error("Failed to toggle staff status", e);
          toast.error(e.data?.detail || "Failed to update staff status.");
          throw e;
        }
      },
    });
  };

  // 2. Staff Role Change (with confirmation)
  const requestChangeStaffRole = (
    staffId,
    currentRole,
    newRoleLabel,
    staffObj,
  ) => {
    closeModal();
    const isTargetExpert =
      newRoleLabel.includes("Expert") ||
      newRoleLabel === "Authorized Medical Expert";

    setReassignExpertType("");
    reassignExpertTypeRef.current = "";

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
            "Grants only the content-review actions permitted for the selected specialty.",
            "Revokes system configuration and administrative account provisioning rights.",
          ]
        : [
            "Grants system administration, audit log visibility, and support permissions.",
            "Does not grant specialty content approval or consumer health-record access.",
          ],
      onConfirm: async () => {
        const specialization = reassignExpertTypeRef.current;
        if (isTargetExpert && !specialization.trim()) {
          toast.error("Please select an expert specialization.");
          throw new Error("Missing expert specialization");
        }
        try {
          const bodyPayload = { role: newRoleLabel };
          if (isTargetExpert) {
            bodyPayload.expert_type = specialization;
          }
          await apiFetch(`/api/admin/staff/${staffId}/role`, {
            method: "PUT",
            body: JSON.stringify(bodyPayload),
          });
          toast.success(
            `Role updated to ${
              isTargetExpert
                ? `Expert Reviewer (${specialization})`
                : "System Admin"
            }.`,
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

  // 5. Patient Account Status Toggle (Direct from AccountActionModal)
  // HL-073: the reason picked when disabling is saved and shown on the account until it is enabled again
  const handleToggleAppUserStatus = async (entityId, reason) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/status`, {
        method: "PUT",
        body: JSON.stringify(reason ? { reason } : {}),
      });
      toast.success("App account status updated successfully.");
      closeModal();
    } catch (e) {
      console.error("Failed to toggle user status", e);
      toast.error(e.data?.detail || "Failed to change user status.");
      throw e;
    }
  };

  // HL-084: give a patient Premium for a number of days (testers, the panel), or remove it after a confirm
  const savePlan = async (entityId, premium, days) => {
    try {
      await apiFetch(`/api/admin/users/${entityId}/plan`, {
        method: "PUT",
        body: JSON.stringify(
          premium ? { premium: true, days } : { premium: false },
        ),
      });
      toast.success(
        premium ? `Premium given for ${days} days.` : "Premium removed.",
      );
      closeModal();
      closeConfirmModal();
    } catch (e) {
      toast.error(e.data?.detail || "Couldn't change the plan.");
      throw e;
    }
  };

  const handleChangePlan = (entity, premium, days) =>
    savePlan(entity.id, premium, days);

  // 6. Save/Provision Staff Account
  const handleSaveStaff = async (staffData) => {
    try {
      const created = await apiFetch(`/api/admin/staff`, {
        method: "POST",
        body: JSON.stringify(staffData),
      });
      if (
        created?.status !== "success" ||
        typeof created.id !== "string" ||
        !created.id.trim() ||
        typeof created.temp_password !== "string" ||
        !created.temp_password.trim()
      ) {
        throw new Error(
          "Provisioning was not confirmed. The complete account and one-time-password response was not received. Check the staff directory before retrying; an account may already exist.",
        );
      }
      const isExpert = staffData.role?.toLowerCase().includes("expert");
      toast.success("Staff account provisioned", {
        description: `${staffData.name} has been enrolled as a ${
          isExpert ? "Medical Expert" : "System Admin"
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
      throw e;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveEntity(null);
    setModalMode("");
  };

  const handleTabSwitch = (tab) => {
    if (tab === "system_staff" && currentUserRole !== "admin") {
      toast.error(
        "Access denied: Only admins can view or modify System Staff records.",
      );
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
      <div className="workspace workspace--operations accounts-workspace mx-auto w-full max-w-[1440px] space-y-5 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <WorkspaceHeader
          icon={ShieldCheck}
          title="Accounts & staff"
          description="Manage sign-in access, optional Premium and staff permissions. Consumer health records stay outside this workspace."
        >
          <button
            type="button"
            onClick={fetchUsers}
            disabled={refreshing}
            className={UI.button.secondary}
          >
            <RefreshCw size={15} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
            <span>Refresh directory</span>
          </button>
        </WorkspaceHeader>

        {/* ─── 2. DIRECTORY MODE SWITCHER (CAL.COM NAV-PILL-GROUP) ──────────── */}
        <div
          role="tablist"
          aria-label="Directory section"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            const tabs = [
              ...event.currentTarget.querySelectorAll('[role="tab"]'),
            ];
            const current = tabs.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (current +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            tabs[next].focus();
            tabs[next].click();
          }}
          className="accounts-directory-tabs"
        >
          <button
            type="button"
            role="tab"
            id="app-accounts-tab"
            tabIndex={activeTab === "app_users" ? 0 : -1}
            aria-controls="app-accounts-panel"
            aria-selected={activeTab === "app_users"}
            onClick={() => handleTabSwitch("app_users")}
            className={`group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer select-none ${
              activeTab === "app_users"
                ? "text-white font-semibold"
                : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
            }`}
          >
            <User size={16} aria-hidden="true" className="relative z-10 shrink-0" />
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
              id="system-staff-tab"
              tabIndex={activeTab === "system_staff" ? 0 : -1}
              aria-controls="system-staff-panel"
              aria-selected={activeTab === "system_staff"}
              onClick={() => handleTabSwitch("system_staff")}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer select-none ${
                activeTab === "system_staff"
                  ? "text-white font-semibold"
                  : "text-cal-muted hover:text-cal-ink active:scale-[0.98]"
              }`}
            >
              <ShieldCheck size={16} aria-hidden="true" className="relative z-10 shrink-0" />
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
        <QueryProgress active={refreshing && !patientsQuery.isPending && !staffQuery.isPending} label="Updating directory…" />
        <AnimatePresence>
          {activeTab === "app_users" && (
            <motion.div
              key="app_users"
              id="app-accounts-panel"
              role="tabpanel"
              aria-labelledby="app-accounts-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.14 }}
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
              id="system-staff-panel"
              role="tabpanel"
              aria-labelledby="system-staff-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.14 }}
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
        {isModalOpen && modalMode === "view_app_user" && <AccountActionModal
          key={activeEntity?.id || "no-account"}
          isOpen={isModalOpen && modalMode === "view_app_user"}
          onClose={closeModal}
          user={activeEntity}
          onToggleStatus={handleToggleAppUserStatus}
          onChangePlan={handleChangePlan}
        />}

        {/* Staff Detail View Modal */}
        <StaffDetailsModal
          isOpen={isModalOpen && modalMode === "view_staff"}
          onClose={closeModal}
          staff={activeEntity}
          currentUserRole={currentUserRole}
          currentUserId={userId}
          onToggleStatus={requestToggleStaffStatus}
          onChangeRole={requestChangeStaffRole}
        />

        {/* Provision Staff Modal */}
        {isModalOpen && modalMode === "create_staff" && <StaffFormModal
          isOpen={isModalOpen && modalMode === "create_staff"}
          onClose={closeModal}
          staff={activeEntity}
          onSave={handleSaveStaff}
        />}

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
                  onChange={(e) => {
                    setReassignExpertType(e.target.value);
                    reassignExpertTypeRef.current = e.target.value;
                  }}
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
