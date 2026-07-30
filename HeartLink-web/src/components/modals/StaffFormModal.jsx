import React, { useEffect } from "react";
import { X, UserPlus, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { Button } from "../ui/Button";

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^\+63 \d{3} \d{3} \d{4}$/, "Must follow +63 xxx xxx xxxx format."),
  role: z.string().min(1, "Role is required."),
  permissions: z.array(z.string()).min(1, "Select at least one permission."),
});

const StaffFormModal = ({ isOpen, onClose, isEditMode, staff }) => {
  if (!isOpen) return null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      phone: "",
      role: "Authorized Medical Expert",
      permissions: ["Validate Recipes & Exercises", "Evaluate High-Risk Cases"],
    },
    mode: "onTouched",
  });

  const selectedPermissions = watch("permissions");

  // Populate data when edit mode changes
  useEffect(() => {
    if (isEditMode && staff) {
      reset({
        name: staff.name || "",
        phone: staff.phone || "",
        role: staff.role || "Authorized Medical Expert",
        permissions: staff.permissions || [],
      });
    } else {
      // Reset for create
      reset({
        name: "",
        phone: "",
        role: "Authorized Medical Expert",
        permissions: ["Validate Recipes & Exercises", "Evaluate High-Risk Cases"],
      });
    }
  }, [isEditMode, staff, reset]);

  const handlePermissionChange = (perm) => {
    const current = new Set(selectedPermissions);
    if (current.has(perm)) {
      current.delete(perm);
    } else {
      current.add(perm);
    }
    setValue("permissions", Array.from(current), { shouldValidate: true });
  };

  const availablePermissions = [
    "Validate Recipes & Exercises",
    "Evaluate High-Risk Cases",
    "Manage App Users",
  ];

  const onSubmit = async (data) => {
    // Simulate async API call to demonstrate loading state
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log(data);
    onClose();
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <InputField
                  id="name"
                  label="Full Name"
                  placeholder="e.g. Dr. Jane Doe"
                  error={errors.name}
                  {...register("name")}
                />
              </div>
              <div className="col-span-2">
                <InputField
                  id="phone"
                  type="tel"
                  label="Mobile Number"
                  placeholder="+63 9xx xxx xxxx"
                  error={errors.phone}
                  {...register("phone")}
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
                  {...register("role")}
                  className={`w-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border ${errors.role ? 'border-red-400 focus:ring-red-500/10' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/5'} rounded-xl focus:ring-2 focus:outline-none shadow-sm cursor-pointer`}
                >
                  <option value="Authorized Medical Expert">Authorized Medical Expert</option>
                  <option value="System Admin">System Admin</option>
                </select>
                {errors.role && <p className="text-[11px] text-red-500 mt-1.5">{errors.role.message}</p>}
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
                        checked={selectedPermissions.includes(perm)}
                        onChange={() => handlePermissionChange(perm)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      {perm}
                    </label>
                  ))}
                </div>
                {errors.permissions && <p className="text-[11px] text-red-500 mt-1.5">{errors.permissions.message}</p>}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            loadingText={isEditMode ? "Saving..." : "Provisioning..."}
          >
            {isEditMode ? <Save size={14} /> : <UserPlus size={14} />}
            {isEditMode ? "Save Changes" : "Provision Account"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;
