import { useEffect, useRef } from "react";
import { ChevronDown, Info, Loader2, UserPlus, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";
import { useDialogFocus } from "../../hooks/useDialogFocus";

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
  const dialogRef = useRef(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
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

  useDialogFocus(isOpen, dialogRef, isSubmitting ? null : onClose);

  const selectedRole = useWatch({ control, name: "role" });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-provision-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-cal-hairline bg-cal-canvas px-6 py-4.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <UserPlus size={16} />
            </span>
            <div>
              <h3
                id="staff-provision-title"
                className="font-cal-display text-[20px] font-semibold tracking-[-0.4px] leading-[1.2] text-cal-ink"
              >
                Provision staff account
              </h3>
              <p className="mt-0.5 text-[12.5px] text-cal-muted">
                Define administrative access controls and role boundaries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          id="staff-provision-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <InputField
            id="name"
            label="Full name"
            placeholder="e.g. Dr. Jane Doe"
            error={errors.name}
            {...register("name")}
          />

          <InputField
            id="email"
            type="email"
            label="Email address"
            placeholder="e.g. jane.doe@heartlink.ph"
            error={errors.email}
            {...register("email")}
          />

          <InputField
            id="phone"
            type="tel"
            label="Contact number (optional)"
            placeholder="e.g. 09XXXXXXXXX"
            error={errors.phone}
            {...register("phone")}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="staff-role-select"
              className="block text-[13px] font-semibold text-cal-ink"
            >
              Role assignment
            </label>
            <div className="relative">
              <select
                id="staff-role-select"
                {...register("role")}
                className={`h-10 w-full appearance-none rounded-[8px] border bg-cal-canvas pl-3.5 pr-9 text-[14px] font-medium text-cal-ink outline-none transition-colors cursor-pointer ${
                  errors.role
                    ? "border-cal-error focus:border-cal-error"
                    : "border-cal-hairline focus:border-cal-ink"
                }`}
              >
                <option value="Authorized Medical Expert">Expert Reviewer</option>
                <option value="System Admin">System Admin</option>
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
              />
            </div>
            {errors.role && (
              <p className="text-[12px] font-medium text-cal-error">{errors.role.message}</p>
            )}
          </div>

          {isExpertRole && (
            <div className="space-y-1.5">
              <label
                htmlFor="staff-expert-type"
                className="block text-[13px] font-semibold text-cal-ink"
              >
                Expert specialization <span className="text-cal-error">*</span>
              </label>
              <div className="relative">
                <select
                  id="staff-expert-type"
                  {...register("expert_type")}
                  className={`h-10 w-full appearance-none rounded-[8px] border bg-cal-canvas pl-3.5 pr-9 text-[14px] font-medium text-cal-ink outline-none transition-colors cursor-pointer ${
                    errors.expert_type
                      ? "border-cal-error focus:border-cal-error"
                      : "border-cal-hairline focus:border-cal-ink"
                  }`}
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
              {errors.expert_type && (
                <p className="text-[12px] font-medium text-cal-error">
                  {errors.expert_type.message}
                </p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5 text-[12.5px] leading-[1.45] text-cal-body">
            <Info size={14.5} className="mt-0.5 shrink-0 text-cal-ink" />
            <p className="m-0">
              A one-time temporary password will be generated and shown to you once. The new staff member must choose their own password the first time they sign in.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="staff-provision-form"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Provisioning…</span>
              </>
            ) : (
              <>
                <UserPlus size={15} />
                <span>Provision account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffFormModal;
