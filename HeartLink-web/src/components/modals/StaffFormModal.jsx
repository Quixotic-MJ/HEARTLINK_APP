import React, { useState, useEffect } from "react";
import { X, UserPlus, Save } from "lucide-react";

const StaffFormModal = ({ isOpen, onClose, isEditMode, staff }) => {
  if (!isOpen) return null;

  // Local state to manage form fields
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "Authorized Medical Expert",
    permissions: ["Validate Recipes & Exercises", "Evaluate High-Risk Cases"],
  });

  // Populate data when edit mode changes
  useEffect(() => {
    if (isEditMode && staff) {
      setFormData({
        name: staff.name || "",
        phone: staff.phone || "",
        role: staff.role || "Authorized Medical Expert",
        permissions: staff.permissions || [],
      });
    } else {
      // Reset for create
      setFormData({
        name: "",
        phone: "",
        role: "Authorized Medical Expert",
        permissions: ["Validate Recipes & Exercises", "Evaluate High-Risk Cases"],
      });
    }
  }, [isEditMode, staff]);

  const handlePermissionChange = (perm) => {
    setFormData((prev) => {
      const perms = new Set(prev.permissions);
      if (perms.has(perm)) {
        perms.delete(perm);
      } else {
        perms.add(perm);
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const availablePermissions = [
    "Validate Recipes & Exercises",
    "Evaluate High-Risk Cases",
    "Manage App Users",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isEditMode ? "Edit Staff Permissions" : "Register System Staff"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Define administrative access controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:outline-none shadow-sm"
                  placeholder="e.g. Dr. Jane Doe"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:outline-none shadow-sm"
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>

              {!isEditMode && (
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 text-sm font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none shadow-sm"
                    value="TempPass2026!"
                    readOnly
                  />
                </div>
              )}

              <div className="col-span-2 mt-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
                  Role Assignment
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="Authorized Medical Expert">Authorized Medical Expert</option>
                  <option value="System Admin">System Admin</option>
                </select>
              </div>
              <div className="col-span-2 mt-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
                  Granular Permissions
                </label>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  {availablePermissions.map((perm) => (
                    <label key={perm} className="flex items-center gap-3 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm)}
                        onChange={() => handlePermissionChange(perm)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm"
            style={{ backgroundColor: "#0f172a" }}
          >
            {isEditMode ? <Save size={14} /> : <UserPlus size={14} />}
            {isEditMode ? "Save Changes" : "Provision Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;
