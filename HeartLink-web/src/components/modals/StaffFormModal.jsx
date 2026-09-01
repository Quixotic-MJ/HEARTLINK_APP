import React, { useEffect } from "react";
import { X, UserPlus, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { Button } from "../ui/Button";

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").trim(),
  email: z.string().email("Must be a valid email address."),
  phone: z.string().optional().or(z.literal("")),
  role: z.string().min(1, "Role is required."),
});

const StaffFormModal = ({ isOpen, onClose, staff, onSave }) => {
  if (!isOpen) return null;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Expert Reviewer",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    reset({
      name: "",
      email: "",
      phone: "",
      role: "Expert Reviewer",
    });
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    if (onSave) {
      await onSave(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
          <div>
            <h3 className="text-base font-bold text-white">
              Provision Staff Account
            </h3>
            <p className="text-[11px] text-[#89899C] mt-0.5 font-medium">
              Define administrative access controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">
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
                <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                  Role Assignment
                </label>
                <select
                  {...register("role")}
                  className={`w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#161616] border ${errors.role ? 'border-red-400' : 'border-white/10 focus:border-[#E55F37]'} rounded-xl focus:outline-none cursor-pointer`}
                >
                  <option value="Authorized Medical Expert" className="bg-[#161616]">Expert Reviewer</option>
                  <option value="System Admin" className="bg-[#161616]">System Admin</option>
                  <option value="Super Admin" className="bg-[#161616]">Super Admin</option>
                </select>
                {errors.role && <p className="text-[11px] text-red-400 mt-1.5">{errors.role.message}</p>}
              </div>

              {/* Notice Banner */}
              <div className="col-span-2 mt-2 bg-[#21202E]/40 p-4 rounded-xl border border-white/10 flex items-start gap-2.5">
                <Info size={14} className="text-[#E55F37] mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#89899C] font-semibold leading-relaxed m-0 uppercase tracking-wider">
                  Account will be provisioned with default credentials (Password: TempPass2026!) and direct email login.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <UserPlus size={14} /> {isSubmitting ? "Provisioning..." : "Provision Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;

