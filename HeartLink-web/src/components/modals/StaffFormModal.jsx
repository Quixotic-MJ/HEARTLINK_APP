import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").trim(),
  email: z.string().email("Must be a valid email address."),
  phone: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "Role is required."),
});

const StaffFormModal = ({ isOpen, onClose, staff, onSave }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Authorized Medical Expert",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    reset({
      name: "",
      email: "",
      phone: "",
      role: "Authorized Medical Expert",
    });
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    if (onSave) {
      await onSave(data);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#E2E8F0] flex flex-col overflow-hidden text-[#0F172A] z-10"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E2E8F0] bg-[#FFFFFF] z-10">
            <div>
              <h3 
                className="text-[17px] font-medium text-[#0F172A] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Provision Staff Account
              </h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">
                Define administrative access controls and role boundaries.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Scrollable Content Area */}
          <form id="staff-provision-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
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
                    id="email"
                    type="email"
                    label="Email Address"
                    placeholder="e.g. jane.doe@heartlink.ph"
                    error={errors.email}
                    {...register("email")}
                  />
                </div>
                <div className="col-span-2">
                  <InputField
                    id="phone"
                    type="tel"
                    label="Contact Number (Optional)"
                    placeholder="e.g. 09XXXXXXXXX"
                    error={errors.phone}
                    {...register("phone")}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                    Role Assignment
                  </label>
                  <select
                    {...register("role")}
                    className={`w-full px-3.5 py-2 text-[13px] font-semibold text-[#0F172A] bg-[#F8FAFC] border ${errors.role ? 'border-[#A93226]' : 'border-[#E2E8F0] focus:border-[#0F172A]'} rounded-[8px] focus:outline-none cursor-pointer`}
                  >
                    <option value="Authorized Medical Expert">Expert Reviewer</option>
                    <option value="System Admin">System Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  {errors.role && <p className="text-[11px] text-[#A93226] mt-1">{errors.role.message}</p>}
                </div>

                {/* Notice Banner */}
                <div className="col-span-2 mt-1 bg-[#E3EFEC] p-3.5 rounded-[8px] border border-[#C5DFD8] flex items-start gap-2.5">
                  <Info size={14} className="text-[#1B6E63] mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-[#1B6E63] font-medium leading-relaxed m-0">
                    Account will be provisioned with default credentials (<span className="text-[#0F172A] font-semibold">Password: </span><code className="text-[#2E9AE8] font-mono bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E2E8F0] font-bold select-all">TempPass2026!</code>) and direct email login.
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#FFFFFF] flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-[#E2E8F0] border border-[#E2E8F0] rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="staff-provision-form"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4.5 py-2 text-[12px] font-semibold text-white bg-[#2E9AE8] hover:bg-[#1C7AC8] rounded-[8px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <UserPlus size={14} /> <span>{isSubmitting ? "Provisioning…" : "Provision account"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StaffFormModal;
