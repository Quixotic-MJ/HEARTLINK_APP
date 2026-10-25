import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";

const staffSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters.").trim(),
    email: z.string().email("Must be a valid email address."),
    phone: z.string().optional().or(z.literal("")),
    role: z.string().min(1, "Role is required."),
    expert_type: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "Authorized Medical Expert") {
      if (!data.expert_type || !data.expert_type.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expert_type"],
          message: "Expert specialization is required for Medical Experts.",
        });
      }
    }
  });

const StaffFormModal = ({ isOpen, onClose, onSave }) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Authorized Medical Expert",
      expert_type: "",
    },
    mode: "onTouched",
  });

  const selectedRole = watch("role");
  const isExpertRole = selectedRole === "Authorized Medical Expert";

  useEffect(() => {
    if (!isExpertRole) {
      setValue("expert_type", "");
    }
  }, [isExpertRole, setValue]);

  useEffect(() => {
    reset({
      name: "",
      email: "",
      phone: "",
      role: "Authorized Medical Expert",
      expert_type: "",
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
          className="relative w-full max-w-lg bg-ds-canvas max-h-full rounded-2xl shadow-2xl border border-ds-hairline flex flex-col overflow-hidden text-ds-ink z-10"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas z-10">
            <div>
              <h3 className="text-[17px] font-bold text-ds-ink leading-tight">
                Provision Staff Account
              </h3>
              <p className="text-[11px] text-ds-steel mt-0.5 font-medium">
                Define administrative access controls and role boundaries.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-ds-slate hover:text-ds-ink p-1.5 rounded-lg hover:bg-ds-surface transition-colors cursor-pointer"
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
                  <label className="block text-[13px] font-medium text-ds-ink mb-1">
                    Role Assignment
                  </label>
                  <select
                    {...register("role")}
                    className={`w-full px-3.5 py-2 text-[13px] font-semibold text-ds-ink bg-ds-canvas border ${errors.role ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'} rounded-[8px] focus:outline-none cursor-pointer`}
                  >
                    <option value="Authorized Medical Expert">Expert Reviewer</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                  {errors.role && <p className="text-[11px] text-ds-danger mt-1">{errors.role.message}</p>}
                </div>

                {isExpertRole && (
                  <div className="col-span-2">
                    <label className="block text-[13px] font-medium text-ds-ink mb-1">
                      Expert Specialization <span className="text-ds-danger">*</span>
                    </label>
                    <select
                      {...register("expert_type")}
                      className={`w-full px-3.5 py-2 text-[13px] font-semibold text-ds-ink bg-ds-canvas border ${errors.expert_type ? 'border-ds-danger' : 'border-ds-hairline-strong focus:border-ds-line'} rounded-[8px] focus:outline-none cursor-pointer`}
                    >
                      <option value="">Select Specialization...</option>
                      <option value="Physical Therapist">Physical Therapist</option>
                      <option value="Dietitian">Dietitian</option>
                      <option value="Cardiologist">Cardiologist</option>
                    </select>
                    {errors.expert_type && <p className="text-[11px] text-ds-danger mt-1">{errors.expert_type.message}</p>}
                  </div>
                )}

                {/* Notice Banner */}
                <div className="col-span-2 mt-1 bg-ds-mint p-3.5 rounded-[8px] border border-ds-mint flex items-start gap-2.5">
                  <Info size={14} className="text-ds-charcoal mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-ds-charcoal font-medium leading-relaxed m-0">
                    A one-time temporary password will be generated and shown to you once. The new staff member must choose their own password the first time they sign in.
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 border-t border-ds-hairline bg-ds-canvas flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="staff-provision-form"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4.5 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
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
