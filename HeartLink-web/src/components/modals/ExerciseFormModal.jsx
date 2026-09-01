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
import { BASE_URL, apiUpload } from "../../api";

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  duration: z.coerce.number().min(1, "Must be at least 1 minute."),
  hssTarget: z.string().default("Stable (80-100)"),
  mediaUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  type: z.string().default("General"),
  intensity: z.string().default("Low"),
  goal: z.string().optional(),
  status: z.string().default("draft"),
  expertValidated: z.boolean().default(false),
  steps: z.array(z.object({ value: z.string().min(1, "Step cannot be empty") })).optional(),
  guideImages: z.array(z.object({ url: z.string().min(1, "URL cannot be empty") })).optional(),
});

const ExerciseFormModal = ({ isOpen, onClose, exercise, userRole = "medical", onSave, onDelete }) => {
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
      videoUrl: "",
      type: "General",
      intensity: "Low",
      goal: "",
      status: "draft",
      expertValidated: false,
      steps: [{ value: "" }],
      guideImages: [],
    },
    mode: "onTouched",
  });

  const { fields: stepsFields, append, remove, move } = useFieldArray({
    control,
    name: "steps",
  });

  const moveStepUp = (index) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const moveStepDown = (index) => {
    if (index < stepsFields.length - 1) {
      move(index, index + 1);
    }
  };

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
        videoUrl: exercise.videoUrl || "",
        type: exercise.type || "General",
        intensity: exercise.intensity || "Low",
        goal: exercise.goal || "",
        steps: exercise.steps 
          ? exercise.steps.map(step => {
              if (typeof step === 'string') {
                return { value: step };
              } else if (step && typeof step === 'object') {
                return { value: step.instruction || "" };
              }
              return { value: "" };
            })
          : [{ value: "" }],
        guideImages: exercise.guideImages
          ? exercise.guideImages.map(url => (typeof url === 'string' ? { url } : { url: url.url || "" }))
          : (exercise.guide_images 
              ? exercise.guide_images.map(url => (typeof url === 'string' ? { url } : { url: url.url || "" }))
              : []),
      });
    } else {
      reset({
        name: "",
        description: "",
        duration: 10,
        hssTarget: "Stable (80-100)",
        mediaUrl: "",
        videoUrl: "",
        type: "General",
        intensity: "Low",
        goal: "",
        status: "draft",
        expertValidated: false,
        steps: [{ value: "" }],
        guideImages: [],
      });
    }
  }, [exercise, isOpen, reset]);

  const handleSaveWithStatus = (newStatus) => {
    setValue("status", newStatus, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (data) => {
    if (onSave) {
      const originalSteps = exercise?.steps || [];
      const flatSteps = data.steps ? data.steps.map((s, index) => {
        const originalStep = originalSteps[index];
        if (originalStep && typeof originalStep === 'object') {
          return {
            ...originalStep,
            instruction: s.value
          };
        }
        return s.value;
      }) : [];
      const flatGuideImages = data.guideImages ? data.guideImages.map(gi => gi.url) : [];
      onSave({ ...data, steps: flatSteps, guideImages: flatGuideImages });
    }
    onClose();
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Validation Errors:", errors);
    }
  }, [errors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <form onSubmit={handleSubmit(onSubmit)} className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 text-white max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header (Fixed) */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] shrink-0">
          <div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-[#89899C] uppercase">
              {exercise ? "Edit Exercise" : "Create Exercise"}
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {watch("name") || (exercise ? exercise.name : "New Exercise")}
            </h3>
            <p className="text-[10px] text-[#89899C] font-medium mt-0.5 flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${status === "published" ? "bg-emerald-400" : status === "draft" ? "bg-amber-400" : "bg-slate-500"}`}></span>
              <span className="capitalize">{status}</span>
              <span className="text-slate-600">•</span>
              <span>{watch("hssTarget")}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-7">
          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-4">
              Basic Information
            </h4>
            <div className="space-y-4">
              <div>
                <InputField
                  id="name"
                  label="Routine Name"
                  placeholder="e.g. 15-Minute Chair Yoga"
                  error={errors.name}
                  {...register("name")}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows="2"
                  {...register("description")}
                  className={`w-full px-3 py-2 text-xs bg-[#21202E]/60 border ${errors.description ? 'border-red-500' : 'border-white/10'} rounded-xl focus:outline-none focus:border-[#E55F37] text-white placeholder:text-slate-500 transition-colors resize-none`}
                  placeholder="Short text summary of physical benefits..."
                ></textarea>
                {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                    Exercise Type
                  </label>
                  <select
                    {...register("type")}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#21202E]/60 border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] text-white transition-colors cursor-pointer"
                  >
                    <option value="Breathing" className="bg-[#161616]">Breathing</option>
                    <option value="Light Cardio" className="bg-[#161616]">Light Cardio</option>
                    <option value="Stationary" className="bg-[#161616]">Stationary</option>
                    <option value="General" className="bg-[#161616]">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                    Intensity
                  </label>
                  <select
                    {...register("intensity")}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#21202E]/60 border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] text-white transition-colors cursor-pointer"
                  >
                    <option value="None" className="bg-[#161616]">None</option>
                    <option value="Low" className="bg-[#161616]">Low</option>
                    <option value="Medium" className="bg-[#161616]">Medium</option>
                    <option value="High" className="bg-[#161616]">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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

                <div>
                  <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                    Routine Goal
                  </label>
                  <input
                    type="text"
                    {...register("goal")}
                    className="w-full px-3 py-2 text-xs bg-[#21202E]/60 border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] text-white placeholder:text-slate-500 transition-colors"
                    placeholder="e.g. Builds gentle endurance..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Targeting */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-4">
              Targeting
            </h4>
            <div className="bg-[#21202E]/40 p-4 rounded-xl border border-white/10">
              <label className="block text-xs font-bold text-white mb-0.5">
                HSS Suitability
              </label>
              <p className="text-[10px] text-[#89899C] mb-2.5 font-medium">
                Determines which users may receive this exercise routine based on clinical status.
              </p>
              <select
                {...register("hssTarget")}
                className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-[#1A1A1A] border ${errors.hssTarget ? 'border-red-500' : 'border-white/10 focus:border-[#E55F37]'} rounded-xl focus:outline-none text-white transition-colors cursor-pointer`}
              >
                <option value="Stable (80-100)" className="bg-[#161616]">Stable (80-100)</option>
                <option value="Moderate (60-79)" className="bg-[#161616]">Moderate (60-79)</option>
                <option value="Elevated Risk (50-59)" className="bg-[#161616]">Elevated Risk (50-59)</option>
                <option value="Critical (<50)" className="bg-[#161616]">Critical (&lt;50)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Media */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-4">
              Media Assets
            </h4>
            <div className="space-y-6">
              {/* Thumbnail Image */}
              <div>
                <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                  Thumbnail Image
                </label>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <input
                      {...register("mediaUrl")}
                      type="text"
                      placeholder="Paste image URL..."
                      className="w-full text-xs px-3 py-2 bg-[#21202E]/60 border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] text-white placeholder:text-slate-500"
                    />
                  </div>
                  <label className="px-4 py-2 bg-[#21202E] hover:bg-[#36272B] hover:text-[#E55F37] border border-white/10 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const data = await apiUpload(file, "exercises");
                            setValue("mediaUrl", data.url, { shouldValidate: true, shouldDirty: true });
                          } catch (err) {
                            console.error("Upload error:", err);
                            alert("Failed to upload file: " + (err?.data?.detail || err?.message || "Upload failed"));
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {isUploading && <p className="text-[10px] text-[#E55F37] font-semibold mb-2">Uploading asset...</p>}
                
                {mediaUrl && !mediaUrl.includes("youtube.com") && !mediaUrl.includes("youtu.be") && (
                  <div className="w-40 h-24 rounded-xl overflow-hidden border border-white/10 bg-[#21202E] flex items-center justify-center">
                    {mediaUrl.startsWith("data:video") || mediaUrl.endsWith(".mp4") ? (
                      <video src={resolveMediaUrl(mediaUrl)} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={resolveMediaUrl(mediaUrl)} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Instructional Video */}
              <div>
                <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-1.5">
                  Instructional Video Link
                </label>
                <input
                  {...register("videoUrl")}
                  type="text"
                  placeholder="Paste YouTube video link..."
                  className="w-full text-xs px-3 py-2 bg-[#21202E]/60 border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] text-white placeholder:text-slate-500 mb-3"
                />

                {watch("videoUrl") && (watch("videoUrl").includes("youtube.com") || watch("videoUrl").includes("youtu.be")) && (
                  <div className="w-full max-w-md aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={watch("videoUrl").replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Guide Images */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-4">
              Movement Guide Images
            </h4>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {guideImageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 border border-white/10 rounded-xl p-2.5 bg-[#21202E]/40">
                  <div className="w-12 h-12 rounded-lg bg-[#161616] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {watch(`guideImages.${index}.url`) ? (
                      <img src={resolveMediaUrl(watch(`guideImages.${index}.url`))} alt="Guide Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-600 font-semibold">No Image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      {...register(`guideImages.${index}.url`)}
                      type="text"
                      placeholder="Paste guide image URL..."
                      className="w-full text-xs px-2.5 py-1.5 bg-[#1A1A1A] border border-white/10 rounded-lg focus:outline-none focus:border-[#E55F37] text-white placeholder:text-slate-500"
                    />
                    <div className="relative mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              const data = await apiUpload(file, "exercises");
                              setValue(`guideImages.${index}.url`, data.url, { shouldValidate: true, shouldDirty: true });
                            } catch (err) {
                              console.error("Guide upload error:", err);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setValue(`guideImages.${index}.url`, reader.result, { shouldValidate: true, shouldDirty: true });
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-[10px] text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-[#21202E] file:text-white hover:file:bg-[#36272B] hover:file:text-[#E55F37] cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index > 0) {
                          const currentVal = watch(`guideImages.${index}.url`);
                          const prevVal = watch(`guideImages.${index - 1}.url`);
                          setValue(`guideImages.${index}.url`, prevVal, { shouldDirty: true });
                          setValue(`guideImages.${index - 1}.url`, currentVal, { shouldDirty: true });
                        }
                      }}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < guideImageFields.length - 1) {
                          const currentVal = watch(`guideImages.${index}.url`);
                          const nextVal = watch(`guideImages.${index + 1}.url`);
                          setValue(`guideImages.${index}.url`, nextVal, { shouldDirty: true });
                          setValue(`guideImages.${index + 1}.url`, currentVal, { shouldDirty: true });
                        }
                      }}
                      disabled={index === guideImageFields.length - 1}
                      className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuideImage(index)}
                      className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendGuideImage({ url: "" })}
              className="flex items-center gap-1.5 text-xs font-bold text-[#E55F37] hover:text-[#D4542E] transition-colors py-1.5 mt-2 cursor-pointer"
            >
              <PlusCircle size={14} /> Add Guide Image
            </button>
          </div>

          {/* Section 5: Instructions */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-4">
              Step-by-Step Instructions
            </h4>
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {stepsFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3 w-full border border-white/10 rounded-xl p-3 bg-[#21202E]/40">
                  <div className="mt-1 text-[10px] font-bold text-[#89899C] bg-[#161616] border border-white/10 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <textarea
                      rows="2"
                      {...register(`steps.${index}.value`)}
                      className={`w-full px-3 py-2 text-xs bg-[#1A1A1A] border ${errors.steps?.[index]?.value ? 'border-red-500' : 'border-white/10 focus:border-[#E55F37]'} rounded-xl focus:outline-none text-white placeholder:text-slate-500 transition-colors resize-none leading-relaxed`}
                      placeholder="Describe this instruction step..."
                    />
                    {errors.steps?.[index]?.value && (
                      <span className="text-[10px] text-red-400 mt-1 block font-medium">
                        {errors.steps[index].value.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStepUp(index)}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Step Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStepDown(index)}
                      disabled={index === stepsFields.length - 1}
                      className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      title="Move Step Down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Step"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ value: "" })}
              className="flex items-center gap-1.5 text-xs font-bold text-[#E55F37] hover:text-[#D4542E] transition-colors mt-3 cursor-pointer"
            >
              <PlusCircle size={14} /> Add Step
            </button>
          </div>

          {/* Section 6: Validation Toggle */}
          <div className="border-t border-white/10 pt-6">
            <div
              className={`p-4 rounded-xl border ${
                expertValidated
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-[#21202E]/40 border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4
                    className={`text-xs font-bold ${
                      expertValidated ? "text-emerald-400" : "text-white"
                    } flex items-center gap-2 mb-1`}
                  >
                    {expertValidated ? (
                      <ShieldCheck size={14} className="text-emerald-400" />
                    ) : (
                      <ShieldAlert size={14} className="text-amber-400" />
                    )}
                    Expert Reviewer Validation
                  </h4>
                  <p className="text-[10px] text-[#89899C] leading-relaxed">
                    Reviewed or developed with input from a qualified cardiology or sports medicine expert.
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
                    className={`w-9 h-5 bg-[#161616] border border-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                      userRole !== "medical"
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    } peer-checked:bg-emerald-500`}
                  ></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer / Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex justify-between items-center shrink-0 sticky bottom-0 z-10">
          {/* Left Actions (Delete) */}
          <div>
            {exercise && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to permanently delete this exercise routine?")) {
                    onDelete(exercise.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <Trash2 size={14} /> Delete Exercise
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* If Draft: Save Draft + Publish */}
            {status === "draft" && (
              <>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("draft")}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Publish
                </button>
              </>
            )}

            {/* If Published: Save Changes + Archive */}
            {status === "published" && (
              <>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("archived")}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl transition-colors cursor-pointer"
                >
                  <Archive size={14} /> Archive
                </button>
                <button
                  type="submit"
                  onClick={() => handleSaveWithStatus("published")}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer"
                >
                  <Save size={14} /> Save Changes
                </button>
              </>
            )}

            {/* If Archived: Restore to Draft */}
            {status === "archived" && (
              <button
                type="submit"
                onClick={() => handleSaveWithStatus("draft")}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} /> Restore to Draft
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExerciseFormModal;
