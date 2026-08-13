import React, { useEffect } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  PlaySquare,
  PlusCircle,
  Trash2,
  Archive,
  CheckCircle2,
  Save,
  Clock,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InputField } from "../ui/InputField";

const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  duration: z.coerce.number().min(1, "Must be at least 1 minute."),
  hssTarget: z.string().default("Stable (80-100)"),
  mediaUrl: z.string().optional(),
  status: z.string().default("draft"),
  expertValidated: z.boolean().default(false),
  steps: z.array(z.object({ value: z.string().min(1, "Step cannot be empty") })).optional(),
  guideImages: z.array(z.object({ url: z.string().min(1, "URL cannot be empty") })).optional(),
});

const ExerciseFormModal = ({ isOpen, onClose, exercise, userRole = "medical", onSave, onDelete }) => {
  if (!isOpen) return null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 10,
      hssTarget: "Stable (80-100)",
      mediaUrl: "",
      status: "draft",
      expertValidated: false,
      steps: [{ value: "" }],
      guideImages: [],
    },
    mode: "onTouched",
  });

  const { fields: stepsFields, append, remove } = useFieldArray({
    control,
    name: "steps",
  });

  const { fields: guideImageFields, append: appendGuideImage, remove: removeGuideImage } = useFieldArray({
    control,
    name: "guideImages",
  });

  const expertValidated = watch("expertValidated");
  const mediaUrl = watch("mediaUrl");
  const status = watch("status");
  const [isUploading, setIsUploading] = React.useState(false);

  useEffect(() => {
    if (exercise) {
      reset({
        ...exercise,
        description: exercise.description || "",
        mediaUrl: exercise.mediaUrl || "",
        steps: exercise.steps 
          ? exercise.steps.map(step => ({ value: step }))
          : [{ value: "" }],
        guideImages: exercise.guide_images
          ? exercise.guide_images.map(url => ({ url }))
          : [],
      });
    } else {
      reset({
        name: "",
        description: "",
        duration: 10,
        hssTarget: "Stable (80-100)",
        mediaUrl: "",
        status: "draft",
        expertValidated: false,
        steps: [{ value: "" }],
        guideImages: [],
      });
    }
  }, [exercise, isOpen, reset]);

  const onSubmit = (data) => {
    if (onSave) {
      const flatSteps = data.steps ? data.steps.map(s => s.value) : [];
      const flatGuideImages = data.guideImages ? data.guideImages.map(gi => gi.url) : [];
      onSave({ ...data, steps: flatSteps, guideImages: flatGuideImages });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-2xl bg-white max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {exercise ? "Edit Exercise Routine" : "Create New Exercise"}
            </h3>
            <p className="text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase mt-1">
              Manage physical activities and HSS assignments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          {/* Expert Validation Workflow */}
            <div
              className={`p-4 rounded-xl border ${
                expertValidated
                  ? "bg-emerald-50/50 border-emerald-100"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4
                    className={`text-xs font-semibold ${
                      expertValidated ? "text-emerald-700" : "text-slate-900"
                    } flex items-center gap-2 mb-1.5`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-emerald-600" />
                    ) : (
                      <ShieldAlert size={14} className="text-slate-400" />
                    )}
                    Medical Expert Validation
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Only Authorized Medical Experts can officially verify that
                    this routine is safe for the assigned HSS target group.
                  </p>
                </div>
  
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    disabled={userRole !== "medical"}
                    {...register("expertValidated")}
                  />
                  <div
                    className={`w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      userRole !== "medical"
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    } peer-checked:bg-emerald-500`}
                  ></div>
                </label>
              </div>
            </div>

          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Basic Information
            </h4>
            <div className="space-y-4">
              <div className="col-span-1">
                <InputField
                  id="name"
                  label="Routine Name"
                  placeholder="e.g. 15-Minute Chair Yoga"
                  error={errors.name}
                  {...register("name")}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="2"
                  {...register("description")}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none`}
                  placeholder="Short text summary of physical benefits..."
                ></textarea>
                {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description.message}</p>}
              </div>

              <div className="w-1/2 pr-2">
                <InputField
                  id="duration"
                  type="number"
                  label="Duration (Minutes)"
                  left={<Clock size={13} />}
                  error={errors.duration}
                  {...register("duration")}
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Algorithmic Assignment (Critical) */}
          <div>
            <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] border-b pb-2 mb-4 flex items-center gap-2" style={{ color: "#0f172a", borderColor: "rgba(15,23,42,0.1)" }}>
              <Activity size={12} /> Algorithmic Assignment
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-medium text-slate-900 mb-1.5">
                HSS Suitability
              </label>
              <p className="text-[10px] text-slate-500 mb-3">
                Select the cardiovascular stability states this exercise is
                safe for. The engine uses this to filter content for users.
              </p>
              <select
                {...register("hssTarget")}
                className={`w-full px-3 py-2 text-xs bg-white border ${errors.hssTarget ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none transition-colors cursor-pointer`}
              >
                <option value="Stable (80-100)">Stable (80-100)</option>
                <option value="Moderate (60-79)">Moderate (60-79)</option>
                <option value="Elevated Risk (50-59)">Elevated Risk (50-59)</option>
                <option value="Critical (<50)">Critical (&lt;50)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Media & Execution */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-4">
              Media & Execution
            </h4>

            <div className="mb-5">
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Media Image / Video URL
              </label>
              
              <div className="mb-3">
                <InputField
                  id="mediaUrl"
                  type="text"
                  placeholder="Paste a YouTube link, image URL, or video URL..."
                  error={errors.mediaUrl}
                  {...register("mediaUrl")}
                  left={<PlaySquare size={13} />}
                />
              </div>

              {mediaUrl && (
                <div className="mb-3 w-full h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be") ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={mediaUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : mediaUrl.startsWith("data:video") || mediaUrl.endsWith(".mp4") ? (
                    <video src={mediaUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 mt-1">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">OR UPLOAD FILE</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  disabled={isUploading}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setIsUploading(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const response = await fetch("http://localhost:8000/api/upload", {
                          method: "POST",
                          body: formData,
                        });
                        if (!response.ok) throw new Error("Upload failed");
                        const data = await response.json();
                        setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                      } catch (err) {
                        console.error("Upload error:", err);
                        alert("Failed to upload file.");
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
                {isUploading && <p className="text-[10px] text-blue-500 mt-1">Uploading...</p>}
              </div>
            </div>

            {/* Guide Images */}
            <div className="mb-5 border-t border-slate-100 pt-5">
              <label className="block text-[11px] font-medium text-slate-700 mb-2">
                Movement Guide Images
              </label>
              <div className="space-y-3 mb-2">
                {guideImageFields.map((field, index) => (
                  <div key={field.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Image {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGuideImage(index)}
                        className="p-1 hover:bg-white text-slate-400 hover:text-red-500 rounded-lg transition-colors ml-auto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          {...register(`guideImages.${index}.url`)}
                          type="text"
                          placeholder="Paste image URL here..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 mb-2"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  const response = await fetch("http://localhost:8000/api/upload", {
                                    method: "POST",
                                    body: formData,
                                  });
                                  if (!response.ok) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                                    };
                                    reader.readAsDataURL(file);
                                    return;
                                  }
                                  const data = await response.json();
                                  setValue(`guideImages.${index}.url`, data.url, { shouldValidate: true, shouldDirty: true });
                                } catch (err) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                            className="w-full px-2 py-1.5 text-[10px] bg-slate-100 border border-slate-200 rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-medium file:bg-white hover:file:bg-slate-50 cursor-pointer"
                          />
                        </div>
                      </div>
                      
                      <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {watch(`guideImages.${index}.url`) ? (
                          <img src={watch(`guideImages.${index}.url`)} alt="Guide Preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-slate-300">Preview</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => appendGuideImage({ url: "" })}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors py-1 px-2 rounded hover:bg-slate-100 mt-1"
              >
                <PlusCircle size={13} /> Add Guide Image
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                Step-by-Step Instructions
              </label>
              <p className="text-[10px] text-slate-500 mb-3">
                Build the JSON array of instructions for safe execution.
              </p>
              <div className="space-y-2.5 mb-3">
                {stepsFields.map((field, index) => (
                  <div key={field.id} className="flex items-start flex-col gap-1">
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-1 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                        {index + 1}
                      </div>
                      <textarea
                        rows="2"
                        {...register(`steps.${index}.value`)}
                        className={`flex-1 px-3 py-2 text-xs bg-slate-50 border ${errors.steps?.[index]?.value ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'} rounded-xl focus:outline-none focus:bg-white transition-colors resize-none leading-relaxed`}
                        placeholder="Describe this step..."
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors mt-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {errors.steps?.[index]?.value && (
                      <span className="text-[10px] text-red-500 ml-8">
                        {errors.steps[index].value.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => append({ value: "" })}
                className="flex items-center gap-1.5 text-[10px] font-medium hover:opacity-75 transition-opacity"
                style={{ color: "#0f172a" }}
              >
                <PlusCircle size={13} /> Add Step
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            {status === "archived" ? (
              <button
                type="button"
                onClick={() => setValue("status", "draft")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <CheckCircle2 size={14} /> Restore Exercise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setValue("status", "archived")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-orange-500 transition-colors"
              >
                <Archive size={14} /> Archive Exercise
              </button>
            )}

            {exercise && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to permanently delete this exercise routine?")) {
                    onDelete(exercise.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} /> Delete Entry
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ backgroundColor: "#0f172a" }}
            >
              <Save size={14} /> Save to Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseFormModal;
