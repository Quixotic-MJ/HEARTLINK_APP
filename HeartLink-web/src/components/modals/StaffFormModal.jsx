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
  phone: z.string().min(6, "Phone number is required."),
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Provision Staff Account
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
                  label="Mobile Number"
                  placeholder="e.g. +639XXXXXXXXX"
                  error={errors.phone}
                  {...register("phone")}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Role Assignment
                </label>
                <select
                  {...register("role")}
                  className={`w-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border ${errors.role ? 'border-red-400 focus:ring-red-500/10' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/5'} rounded-xl focus:ring-2 focus:outline-none shadow-sm cursor-pointer`}
                >
                  <option value="Authorized Medical Expert">Expert Reviewer</option>
                  <option value="System Admin">System Admin</option>
                </select>
                {errors.role && <p className="text-[11px] text-red-500 mt-1.5">{errors.role.message}</p>}
              </div>

              {/* Notice Banner */}
              <div className="col-span-2 mt-2 bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-start gap-2.5 shadow-inner">
                <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed m-0 uppercase tracking-wider">
                  Account created. Initial credentials are managed by the administrator.
                </p>
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
            loadingText="Provisioning..."
          >
            <UserPlus size={14} /> Provision Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;
